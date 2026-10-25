// VBR_PIN_POOL: fixed marker slots (MapPins.tsx), identity-keyed taps, per-slot redraws.
// VBR_DISCOVER_APP: typed Places searches → /api/map/discover (places + events ranked together, All · Places · Events).
// VIBERYTE_EXPLORE_MAP_V1: map-first Explore. Venues: /api/venues + /api/map/search. Events: /api/map/events.
// Honesty rules: counts shown only from the API's real totals; zero results say so plainly; nothing implies a venue is open or busy.
// V1.1: List shows the current results; location sits top right; typing cancels in-flight requests at once;
//       Tonight/Tomorrow use New York time (same as the server); a capped event list says how many are shown.
// VIBERYTE_EXPLORE_MAP_V2: reel cards (selected card plays its approved reel muted after a short pause; others show a still;
//       no reel → venue photo, same layout), Directions on every located card, muted map, name on the selected pin,
//       zoom to the results once the map is ready. For you uses /api/map/search too (same reels + real totals).
// VIBERYTE_EXPLORE_MAP_V3: the map sets the area. Panning or zooming searches what's on screen (after a short pause),
//       and the area pill names it (Apple's place name, or the nearest known area offline). Picking an area jumps there.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, ActivityIndicator, TextInput, Keyboard, ScrollView, Modal, Pressable,
  AppState, AccessibilityInfo, Linking, Animated, PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { PinPool, PIN_POOL, indexForKey, type PinIn } from './MapPins'; // VBR_PIN_POOL
import { getPhotoUrl } from '../../utils/photoHelper';
import { API_BASE } from '../../config';

const { width: W } = Dimensions.get('window');
const CARD_W = W - 64; // VBR_CARDS_V2
const GAP = 12;
const MAX_VENUE_PINS = 20;
const CARD_H = 184;
const MEDIA_W = Math.round(CARD_W * 0.42);
const EVENT_LIMIT = 200; // server maximum per request
import { typeLabel } from '../../theme/editorial'; // VBR_EDITORIAL_EXPLORE_V1
const C = {
  ground: '#09090B', glass: 'rgba(10,10,11,0.95)', raise: '#1C1C1E', line: 'rgba(243,240,233,0.14)',
  ivory: '#F3F0E9', ink: '#09090B', muted: 'rgba(243,240,233,0.6)', faint: 'rgba(243,240,233,0.38)', champ: '#C5A36B',
};
// Fallback names when Apple's place lookup is unavailable: nearest known area to the map center.
const AREAS: [string, number, number][] = [
  ['Lower Manhattan', 40.7128, -74.006], ['SoHo', 40.7233, -74.003], ['East Village', 40.7265, -73.9815], ['West Village', 40.7358, -74.0036],
  ['Chelsea', 40.7465, -74.0014], ['Midtown', 40.7549, -73.984], ['Upper East Side', 40.7736, -73.9566], ['Upper West Side', 40.787, -73.9754],
  ['Harlem', 40.8116, -73.9465], ['Williamsburg', 40.7081, -73.9571], ['DUMBO', 40.7033, -73.9881], ['Bushwick', 40.6944, -73.9213],
  ['Fort Greene', 40.6892, -73.9742], ['Park Slope', 40.671, -73.9814], ['Bed-Stuy', 40.6872, -73.9418], ['Crown Heights', 40.6694, -73.9422],
  ['Long Island City', 40.7447, -73.9485], ['Astoria', 40.7644, -73.9235], ['Flushing', 40.7675, -73.833], ['The Bronx', 40.8448, -73.8648],
  ['Jersey City', 40.7178, -74.0431], ['Hoboken', 40.744, -74.0324], ['Weehawken', 40.7695, -74.0204], ['Union City', 40.7795, -74.0238],
  ['Edgewater', 40.827, -73.9757], ['Fort Lee', 40.8509, -73.9701], ['Newark', 40.7357, -74.1724], ['Montclair', 40.8259, -74.209],
];
const nearestArea = (lat: number, lng: number) => {
  let best = AREAS[0][0], bd = Infinity;
  for (const [n, a, b] of AREAS) { const d = (a - lat) ** 2 + ((b - lng) * 0.76) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
};
const placeCache = new Map<string, string>();
async function placeName(lat: number, lng: number, delta: number): Promise<string> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${delta < 0.06 ? 'n' : 'c'}`;
  const hit = placeCache.get(key); if (hit) return hit;
  let name = '';
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (r) {
      const city = r.city === 'New York' ? 'Manhattan' : r.city || r.subregion || '';
      name = (delta < 0.06 && r.district) ? r.district : city;
    }
  } catch {}
  if (!name) name = nearestArea(lat, lng);
  placeCache.set(key, name);
  return name;
}
const DISTANCE_RE = /\b(near me|nearby|close by|closest|around me|around here)\b|\d\s*(mi|mile|miles)\b/i;
// Mood keys are the shared ones from lib/viberyte/discovery on the server.
const CATS: { key: string | null; label: string }[] = [
  { key: 'date_night', label: 'Date night' }, { key: 'drinks', label: 'Drinks' },
  { key: 'dinner', label: 'Dinner' }, { key: 'late_night', label: 'Nightlife' }, { key: 'events', label: 'Events' },
];
type Coord = { latitude: number; longitude: number };
type Region = Coord & { latitudeDelta: number; longitudeDelta: number };
type When = 'upcoming' | 'tonight' | 'weekend' | '7d';
type Ev = {
  id: number; title: string; date: string; time: string | null; venue_name: string | null; latitude: number | null; longitude: number | null;
  image_url: string | null; price_low: number | null; is_free: boolean; genre: string | null; genre_label: string | null;
};
type EvRes = {
  ok: boolean; window: { key: string; label: string; from: string; to: string }; area: string | null; genre: string | null;
  total: number; located: number; list_only: number; genres: { key: string; label: string; count: number }[]; results: Ev[];
};
type VRes = {
  ok: boolean; total: number; results: any[]; needs_location: boolean; unsupported?: string; time_note?: string | null;
  area: string | null; place?: string | null; what?: string | null; wider_total?: number; elsewhere_total?: number;
};
// VBR_DISCOVER_APP: a typed search in Places reads music, date and place together (server /api/map/discover) and returns
// places and events in one ranked list. All · Places · Events filters it without switching the screen to Events.
type Mix = { order: string; notes: string[]; places: number; events: number; eventsTotal: number; items: any[] };
type MixFilter = 'all' | 'places' | 'events';
const MAX_MIX_EVENTS = 40;
const isEv = (x: any) => !!x?.__ev;
const kid = (x: any) => `${x?.__ev ? 'e' : 'v'}${x?.id}`;
type Notice = { text: string; action?: { label: string; run: () => void }; action2?: { label: string; run: () => void } };

const tap = () => Haptics.selectionAsync().catch(() => {});
// VBR_APP_EVENTS_MODE: Places · Events switch + search that reads event intent ("tonight", "Friday", "party", "DJ", "Halloween").
const EV_TIME: [RegExp, When][] = [[/\b(tonight|tonite|today|this evening)\b/i, 'tonight'], [/\b(this )?weekend\b/i, 'weekend'], [/\b(this|next) week\b|\bnext 7 days\b/i, '7d']];
const EV_WORDS = /\b(part(y|ies)|events?|shows?|concerts?|djs?|gigs?|lineup|tickets?|happening|halloween|open mic|comedy|karaoke|festival|rave)\b/i;
const EV_STRIP = /\b(part(y|ies)|events?|shows?|concerts?|djs?|gigs?|lineup|tickets?|happening|this|next|on|in|at|a|the|night|nights|for|with)\b/gi;
const DOWS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const evYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// VBR_EVENT_PINS: a place and an event are the same venue only on a clear name match (and close by when both have coordinates).
const vkey = (x: string | null | undefined) => String(x || '').toLowerCase().replace(/['’`]/g, '').replace(/\b(nyc|ny|nj|the|bar|lounge|restaurant|brooklyn|manhattan)\b/g, '').replace(/[^a-z0-9]/g, '');
const kmApart = (a: Coord, b: Coord) => Math.hypot((a.latitude - b.latitude) * 111, (a.longitude - b.longitude) * 84);
function sameVenue(e: any, v: any) {
  const a = vkey(e.venue_name), b = vkey(v.name);
  if (a.length < 4 || b.length < 4) return false;
  const ce = coordOf(e), cv = coordOf(v);
  const close = ce && cv ? kmApart(ce, cv) < 0.35 : null;
  if (a === b) return close !== false;
  return (a.startsWith(b) || b.startsWith(a)) && Math.min(a.length, b.length) >= 6 && close === true;
}
// VBR_COVERAGE: where Viberyte actually curates, from real venue density (server /api/map/coverage), never from empty results.
type Cov = 'active' | 'limited' | 'outside';
// VBR_PLACE_SEARCH: place names outside NYC/NJ we recognise in a search; coverage itself still decides (from real venue density).
const PLACE_RE = new RegExp('\\b(washington d\\.c\\.|washington state|south carolina|north carolina|salt lake city|massachusetts|san francisco|washington dc|new hampshire|west virginia|pennsylvania|indianapolis|rhode island|north dakota|philadelphia|south dakota|minneapolis|mexico city|new orleans|kansas city|los angeles|mississippi|connecticut|st\\. louis|puerto rico|new mexico|pittsburgh|providence|sacramento|california|cincinnati|baltimore|milwaukee|rochester|minnesota|nashville|cleveland|tennessee|las vegas|louisiana|san diego|wisconsin|charlotte|kentucky|michigan|nebraska|arkansas|oklahoma|san juan|portland|honolulu|illinois|delaware|maryland|richmond|san jose|missouri|colorado|montreal|virginia|hartford|columbus|st louis|syracuse|montana|indiana|detroit|florida|toronto|seattle|orlando|chicago|wyoming|vermont|arizona|buffalo|houston|atlanta|alabama|phoenix|georgia|norfolk|hawaii|london|oregon|boston|albany|cancun|kansas|philly|alaska|denver|nevada|austin|dallas|paris|dubai|maine|texas|tampa|vegas|miami|idaho|iowa|utah|ohio|dc)\\b', 'i');
const COV_ACTIVE = 12;      // venues around the view center for full coverage
const COV_MAX_DELTA = 0.9;
// VBR_FAST: recent answers are reused for 3 minutes, so Places ↔ Events and chip switches show instantly.
const RESP = new Map<string, { at: number; d: any }>();  // zoomed out further than this (a whole region) → no coverage state at all
function eventIntent(t: string): { isEvent: boolean; when: When | null; day: string | null; q: string } {
  let s = ` ${t.toLowerCase()} `; let when: When | null = null; let day: string | null = null;
  s = s.replace(/\bday ?part(y|ies)\b/, ' day part ');
  for (const [rx, w] of EV_TIME) if (rx.test(s)) { when = w; s = s.replace(rx, ' '); break; }
  if (!when) {
    if (/\btomorrow\b/.test(s)) { const d = new Date(); d.setDate(d.getDate() + 1); day = evYmd(d); s = s.replace(/\btomorrow\b/, ' '); }
    else {
      const m = s.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b/);
      if (m) { const d = new Date(); d.setDate(d.getDate() + ((DOWS.indexOf(m[1]) - d.getDay() + 7) % 7)); day = evYmd(d); s = s.replace(m[0], ' '); }
    }
  }
  const isEvent = !!when || !!day || EV_WORDS.test(s);
  return { isEvent, when, day, q: isEvent ? s.replace(EV_STRIP, ' ').replace(/\s+/g, ' ').trim() : t };
}
const coordOf = (v: any): Coord | null => {
  const lat = Number(v?.latitude); const lng = Number(v?.longitude);
  return v?.latitude != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0.1 && Math.abs(lng) > 0.1 ? { latitude: lat, longitude: lng } : null;
};
const img = (u?: string | null) => (u ? (u.startsWith('/') ? API_BASE + u : u) : null);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
// "Today" is New York's date, matching the server's event windows, wherever the phone is.
const nyToday = () => {
  try {
    const v = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  } catch {}
  return ymd(new Date());
};
const addDays = (s: string, n: number) => { const d = parseDay(s); d.setDate(d.getDate() + n); return ymd(d); };
const dayDiff = (s: string) => Math.round((parseDay(s).getTime() - parseDay(nyToday()).getTime()) / 86400000);
const shortDay = (s: string) => parseDay(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const pinDay = (s: string) => { const n = dayDiff(s); if (n === 0) return 'Tonight'; if (n === 1) return 'Tmrw'; return parseDay(s).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }); };
const evDay = (s: string) => { const n = dayDiff(s); if (n === 0) return 'Tonight'; if (n === 1) return 'Tomorrow'; return shortDay(s); };
const fmtTime = (t: string | null) => {
  if (!t) return null; const [h, m] = t.split(':').map(Number); if (!Number.isFinite(h)) return null;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`;
};
const priceOf = (e: Ev) => (e.is_free ? 'Free' : e.price_low != null && e.price_low > 0 ? `From $${Math.round(e.price_low)}` : null);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const growing = (where: string, what?: string | null) => `We’re still growing ${where}. No ${what || 'matches'} here yet.`;

type Props = { region: string; hood: string | null; nearYou?: boolean; initialMood: string | null; moodSignal?: string | null; onOpenArea: () => void; onShowList: () => void };

export default function ExploreMap({ region, hood, nearYou = false, initialMood, moodSignal, onOpenArea, onShowList }: Props) {
  const insets = useSafeAreaInsets();
  const tabH = useBottomTabBarHeight();
  const [cat, setCat] = useState<string | null>(CATS.some((c) => c.key === initialMood) ? initialMood : null);
  const [when, setWhen] = useState<When>('upcoming');
  const [day, setDay] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [bbox, setBbox] = useState<string | null>(null); // set by moving the map
  const bboxRef = useRef<string | null>(null);
  const [scopeAll, setScopeAll] = useState(false);       // set only by "Show N in other areas"
  const [userLoc, setUserLoc] = useState<Coord | null>(null);
  const locRef = useRef<Coord | null>(null); // read by requests without re-running them
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [vres, setVres] = useState<VRes | null>(null);
  const [eres, setEres] = useState<EvRes | null>(null);
  const [mix, setMix] = useState<Mix | null>(null); // VBR_DISCOVER_APP
  const [mixFilter, setMixFilter] = useState<MixFilter>('all');
  const [elsewhere, setElsewhere] = useState(0);
  const [hint, setHint] = useState('');
  const [selected, setSelected] = useState(0);
  const [sheet, setSheet] = useState<'genre' | 'date' | null>(null);
  const [retry, setRetry] = useState(0);
  const mapRef = useRef<MapView | null>(null);
  const [weekEv, setWeekEv] = useState<any[]>([]);
  const [covCells, setCovCells] = useState<{ size: number; m: Map<string, number> } | null>(null);
  const [cov, setCov] = useState<Cov | null>(null);
  const covPrev = useRef<Cov | null | undefined>(undefined);
  const covBuzz = useRef(0);
  const [suggested, setSuggested] = useState<string | null>(null);
  const tint = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList<any> | null>(null);
  const regionRef = useRef<Region | null>(null);
  const touchRef = useRef(false);
  const progAt = useRef(0); // VBR_PIN_STEADY: last time we moved the camera ourselves
  const fitNext = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [topH, setTopH] = useState(180);
  const isEvents = cat === 'events';
  // VBR_HOME_SHORTCUTS: a Home pill tap switches the mode even when Explore is already open
  useEffect(() => {
    if (!moodSignal || !initialMood || !CATS.some((c) => c.key === initialMood)) return;
    setCat(initialMood); setQuery(''); setSubmitted('');
  }, [moodSignal]);
  const where = nearYou ? 'Near you' : hood || region; // VBR_NEAR_YOU
  bboxRef.current = bbox;
  const [mapReady, setMapReady] = useState(false);
  const [mapPlace, setMapPlace] = useState<string | null>(null); // name of what's on screen once the map leads
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reels play only while this screen is visible, the app is in the foreground and Reduce Motion is off.
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const a = AppState.addEventListener('change', (st) => setAppActive(st === 'active'));
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const r = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { a.remove(); r.remove(); };
  }, []);

  // Area or category changes start fresh: drop map-area and other-areas scopes.
  // Picking an area starts fresh and zooms to its results; a map-led area survives category changes.
  useEffect(() => { setBbox(null); setMapPlace(null); setScopeAll(false); fitNext.current = true; }, [region, hood, nearYou]);
  useEffect(() => { setScopeAll(false); if (!bboxRef.current) fitNext.current = true; }, [cat]);
  useEffect(() => { setGenre(null); }, [region, hood]);

  // Quietly use a recent location fix if already allowed. Never prompts here.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 200 });
        if (alive && last) { locRef.current = { latitude: last.coords.latitude, longitude: last.coords.longitude }; setUserLoc(locRef.current); }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  // One request in flight; any newer request makes older results impossible to land.
  const reqId = useRef(0);
  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const live = () => id === reqId.current;
    setLoading(true); setFailed(false); setHint(''); setElsewhere(0);
    const q = submitted.trim().slice(0, 80);
    const get = async (path: string, p: URLSearchParams) => {
      const url = `${API_BASE}${path}?${p.toString()}`;
      const hit = RESP.get(url);
      if (hit && Date.now() - hit.at < 180000) return hit.d;
      const r = await fetch(url, { signal: ctrl.signal });
      const d = await r.json();
      if (!r.ok || !d || d.ok !== true) throw new Error('bad');
      RESP.set(url, { at: Date.now(), d }); if (RESP.size > 60) RESP.delete(RESP.keys().next().value as string);
      return d;
    };
    (async () => {
      try {
        if (isEvents) {
          const p = new URLSearchParams({ limit: String(EVENT_LIMIT) });
          if (day) p.set('date', day); else p.set('when', when);
          if (genre) p.set('genre', genre);
          if (q && !DISTANCE_RE.test(q)) p.set('q', q);
          if (bbox) p.set('bbox', bbox); else if (scopeAll) p.set('scope', 'all'); else p.set('region', region);
          const d: EvRes = await get('/api/map/events', p);
          if (!live()) return;
          setEres(d); setVres(null); setVenues([]); setMix(null);
          if (q && DISTANCE_RE.test(q)) setHint('For events near you, move the map there. It searches what’s on screen.');
          if (d.total === 0 && !bbox && !scopeAll) {
            p.delete('region'); p.set('scope', 'all'); p.set('limit', '1');
            const all: EvRes = await get('/api/map/events', p);
            if (live()) setElsewhere(all.total);
          }
        } else {
          const p = new URLSearchParams({ limit: '60' });
          if (q) p.set('q', q);
          if (cat) p.set('mood', cat);
          if (bbox) {
            p.set('bbox', bbox);
            const r = regionRef.current;
            if (r) { p.set('clat', r.latitude.toFixed(5)); p.set('clng', r.longitude.toFixed(5)); }
          } else if (q && DISTANCE_RE.test(q)) {
            const here = locRef.current;
            if (here) { p.set('lat', here.latitude.toFixed(5)); p.set('lng', here.longitude.toFixed(5)); }
          } else if (scopeAll) { p.set('scope', 'all'); if (vres?.place) p.set('ignore_place', '1'); }
          else if (nearYou && locRef.current) { p.set('lat', locRef.current.latitude.toFixed(5)); p.set('lng', locRef.current.longitude.toFixed(5)); } // VBR_NEAR_YOU: around you, closest first
          else if (hood) p.set('hood', hood); else p.set('region', region);
          // VBR_DISCOVER_APP: a typed search (not "near me") goes to discover with the same scope: places + events together.
          if (q && !DISTANCE_RE.test(q)) {
            let dd: any = null;
            try { dd = await get('/api/map/discover', p); } catch (e) { if (ctrl.signal.aborted) throw e; } // discover down → plain place search below
            if (!live()) return;
            if (dd && dd.places && dd.places.ok) {
              const d: VRes = dd.places;
              let ne = 0;
              const items = (dd.items || []).flatMap((x: any) => {
                if (x.kind === 'event') { if (ne >= MAX_MIX_EVENTS) return []; ne += 1; return [{ ...x, __ev: true }]; }
                return [{ ...x, category: x.type }];
              });
              const placeN = items.filter((x: any) => !isEv(x)).length;
              setMix({ order: String(dd.intent?.order || 'mixed'), notes: Array.isArray(dd.notes) ? dd.notes : [], places: placeN, events: ne, eventsTotal: Number(dd.counts?.events_total) || ne, items });
              setVres(d); setVenues(items.filter((x: any) => !isEv(x))); setEres(null);
              return;
            }
          }
          const d: VRes = await get('/api/map/search', p);
          if (!live()) return;
          setVres(d); setVenues(d.results.map((x: any) => ({ ...x, category: x.type }))); setEres(null); setMix(null);
        }
      } catch {
        if (live()) setFailed(true);
      } finally {
        clearTimeout(timer);
        if (live()) setLoading(false);
      }
    })();
    return () => { ctrl.abort(); clearTimeout(timer); };
    // vres is read only to carry ignore_place into "other areas"; it must not re-trigger the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEvents, cat, when, day, genre, submitted, bbox, scopeAll, region, hood, retry, nearYou, userLoc]);

  // Every keystroke kills the request in flight at once, so an older result can never land while typing.
  // After a pause, the new text (or no text, under 3 letters) is searched; same text as before → re-run it.
  // event-sounding searches open Events (time words become the date filter); anything else searches places.
  const routeQuery = (t: string) => {
    if (isEvents) { // Events tab: dates in the search become the date filter, as before
      const r = eventIntent(t);
      if (r.isEvent) { if (r.day) setDay(r.day); else { setDay(null); setWhen(r.when || 'upcoming'); } return r.q; }
      return t;
    }
    setCat(null); return t; // VBR_DISCOVER_APP: Places stays Places — the server reads music, dates and place, events come back mixed in
  };
  useEffect(() => { setMixFilter('all'); }, [submitted]);
  const pickMode = (m: 'places' | 'events') => { tap(); Keyboard.dismiss(); if (m === 'events' && !isEvents) setCat('events'); if (m === 'places' && isEvents) setCat(null); };
  const onChangeQuery = (t: string) => {
    setQuery(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    reqId.current += 1;
    abortRef.current?.abort();
    setLoading(true);
    const trimmed = t.trim();
    const next = trimmed.length >= 3 ? trimmed : '';
    debounceRef.current = setTimeout(() => {
      const nx = next ? routeQuery(next) : next; // VBR_SEARCH_CLEARS_CHIP + VBR_APP_EVENTS_MODE
      fitNext.current = true; setBbox(null); setMapPlace(null); setScopeAll(false);
      if (nx === submitted) setRetry((n) => n + 1); else setSubmitted(nx);
    }, trimmed.length === 0 ? 0 : 380);
  };
  const submit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    tap(); Keyboard.dismiss(); fitNext.current = true; setBbox(null); setMapPlace(null); setScopeAll(false);
    const nx = query.trim().length >= 3 ? routeQuery(query.trim()) : query.trim();
    if (nx === submitted) setRetry((n) => n + 1); else setSubmitted(nx);
  };
  const clearQuery = () => { tap(); if (debounceRef.current) clearTimeout(debounceRef.current); Keyboard.dismiss(); setQuery(''); setSubmitted(''); setBbox(null); setMapPlace(null); setScopeAll(false); fitNext.current = true; };
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // The map leads: search exactly what's on screen and name it. Never runs while the map is zoomed out past a city.
  const searchArea = () => {
    const r = regionRef.current;
    if (!r) return;
    if (r.latitudeDelta > 1.2 || r.longitudeDelta > 1.2) { setHint('Zoom in to see places here.'); return; }
    setHint('');
    fitNext.current = false; setScopeAll(false);
    setBbox([r.latitude - r.latitudeDelta / 2, r.longitude - r.longitudeDelta / 2, r.latitude + r.latitudeDelta / 2, r.longitude + r.longitudeDelta / 2].map((n) => n.toFixed(5)).join(','));
    placeName(r.latitude, r.longitude, r.latitudeDelta).then((n) => { if (regionRef.current === r) setMapPlace(n); });
  };
  const scheduleArea = (ms = 600) => {
    if (__DEV__) console.log('[area search] scheduled in', ms, 'ms'); // VBR_CAM_LOG
    if (autoRef.current) clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => { autoRef.current = null; searchArea(); }, ms);
  };
  useEffect(() => () => { if (autoRef.current) clearTimeout(autoRef.current); }, []);
  const showElsewhere = () => { tap(); fitNext.current = true; setBbox(null); setMapPlace(null); setScopeAll(true); };
  const locate = useCallback(async (): Promise<Coord | null> => {
    setHint('');
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setHint('Location is off for Viberyte. Turn it on in Settings to search near you.'); return null; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      locRef.current = c;
      setUserLoc(c);
      return c;
    } catch { setHint('Couldn’t find your location. Try again.'); return null; }
  }, []);
  const recenter = async () => {
    tap();
    const c = await locate();
    if (c && mapRef.current) {
      touchRef.current = false;
      regionRef.current = { ...c, latitudeDelta: 0.03, longitudeDelta: 0.03 };
      mapRef.current.animateToRegion(regionRef.current, 400);
      scheduleArea(500);
    }
  };

  // Cards: located items first (they have pins), then list-only events at the end so every result is reachable.
  const cards = useMemo(() => {
    if (isEvents) {
      const r = eres?.results || [];
      return [...r.filter((e) => coordOf(e)), ...r.filter((e) => !coordOf(e))];
    }
    if (mix) { // VBR_DISCOVER_APP: ranked order kept; places capped like before; events without a pin go last
      const f = mix.items.filter((x: any) => mixFilter === 'all' || (mixFilter === 'events') === isEv(x));
      let np = 0; const out: any[] = []; const tail: any[] = [];
      for (const x of f) {
        if (!coordOf(x)) { if (isEv(x)) tail.push(x); continue; }
        if (!isEv(x)) { if (np >= MAX_VENUE_PINS) continue; np += 1; }
        out.push(x);
      }
      return [...out, ...tail];
    }
    return venues.filter((v) => coordOf(v)).slice(0, MAX_VENUE_PINS);
  }, [isEvents, eres, venues, mix, mixFilter]);
  // Events at the same venue share one date pin; the pin opens the first card for that spot.
  const pins = useMemo(() => {
    const seen = new Map<string, { c: Coord; first: number; n: number; label: string; ev: boolean }>();
    cards.forEach((x: any, i: number) => {
      const c = coordOf(x); if (!c) return;
      const k = `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`;
      const g = seen.get(k);
      const ev = isEvents || isEv(x);
      if (g) g.n += 1; else seen.set(k, { c, first: i, n: 1, label: ev ? pinDay(x.date) : '', ev });
    });
    return [...seen.values()];
  }, [cards, isEvents]);
  const pinOfCard = useMemo(() => {
    const m: number[] = [];
    cards.forEach((x: any, i: number) => {
      const c = coordOf(x);
      m[i] = c ? pins.findIndex((p) => p.c.latitude.toFixed(4) === c.latitude.toFixed(4) && p.c.longitude.toFixed(4) === c.longitude.toFixed(4)) : -1;
    });
    return m;
  }, [cards, pins]);

  // VBR_PIN_STEADY: when results refresh, stay on the same item instead of jumping to the first one
  const selIdRef = useRef<any>(null);
  useEffect(() => {
    const keep = selIdRef.current != null ? cards.findIndex((x: any) => kid(x) === selIdRef.current) : -1;
    const i = keep >= 0 ? keep : 0;
    setSelected(i);
    carouselRef.current?.scrollToOffset({ offset: i * (CARD_W + GAP), animated: false });
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { selIdRef.current = cards[selected] ? kid(cards[selected]) : null; }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  // VBR_FAST: start downloading the first cards' pictures right away
  useEffect(() => {
    const urls = cards.slice(0, 8).map((x: any) => (isEvents || isEv(x) ? img(x.image_url) : x?.reel?.poster ? img(x.reel.poster) : getPhotoUrl(x))).filter(Boolean) as string[];
    if (urls.length) (Image as any).prefetch?.(urls, 'memory-disk')?.catch?.(() => {});
  }, [cards]);
  // VBR_EVENT_PINS: this week's events around the places on screen → gold pins + an "Event Sat" line on cards
  useEffect(() => {
    if (isEvents || !venues.length) { setWeekEv([]); return; }
    const cs = venues.map(coordOf).filter(Boolean) as Coord[];
    if (!cs.length) return;
    const la = cs.map((c) => c.latitude), lo = cs.map((c) => c.longitude);
    const box = [Math.min(...la) - 0.01, Math.min(...lo) - 0.01, Math.max(...la) + 0.01, Math.max(...lo) + 0.01];
    if (box[2] - box[0] > 1.4 || box[3] - box[1] > 1.4) { setWeekEv([]); return; }
    let on = true;
    fetch(`${API_BASE}/api/map/events?when=7d&limit=200&bbox=${box.map((n) => n.toFixed(4)).join(',')}`)
      .then((r) => r.json()).then((d) => { if (on) setWeekEv(d?.ok ? d.results || [] : []); }).catch(() => { if (on) setWeekEv([]); });
    return () => { on = false; };
  }, [isEvents, venues]);
  const evAt = useMemo(() => {
    const m = new Map<number, any>();
    if (!weekEv.length) return m;
    for (const v of venues) { const e = weekEv.find((x) => sameVenue(x, v)); if (e) m.set(v.id, e); }
    return m;
  }, [weekEv, venues]);
  // VBR_COVERAGE: load the coverage grid once
  useEffect(() => {
    let on = true;
    fetch(`${API_BASE}/api/map/coverage`).then((r) => r.json()).then((d) => {
      if (!on || !d?.ok) return;
      const m = new Map<string, number>(); (d.cells || []).forEach(([a, b, n]: number[]) => m.set(`${a},${b}`, n));
      setCovCells({ size: d.size, m });
    }).catch(() => {});
    return () => { on = false; };
  }, []);
  const covFor = useCallback((r: Region | null): Cov | null => {
    if (!covCells || !r) return null;
    if (r.latitudeDelta > COV_MAX_DELTA) { // VBR_PLACE_SEARCH: zoomed out — outside only if no covered cell is on screen at all
      const sz0 = covCells.size, la0 = r.latitude - r.latitudeDelta / 2, la1 = r.latitude + r.latitudeDelta / 2, lo0 = r.longitude - r.longitudeDelta / 2, lo1 = r.longitude + r.longitudeDelta / 2;
      for (const k of Array.from(covCells.m.keys())) { const [a, b] = k.split(',').map(Number); const la = (a + 0.5) * sz0, lo = (b + 0.5) * sz0; if (la >= la0 && la <= la1 && lo >= lo0 && lo <= lo1) return null; }
      return 'outside';
    }
    const half = Math.min(0.12, Math.max(r.latitudeDelta, 0.04) / 2), sz = covCells.size;
    let n = 0;
    for (let a = Math.floor((r.latitude - half) / sz); a <= Math.floor((r.latitude + half) / sz); a++)
      for (let b = Math.floor((r.longitude - half * 1.3) / sz); b <= Math.floor((r.longitude + half * 1.3) / sz); b++) n += covCells.m.get(`${a},${b}`) || 0;
    return n >= COV_ACTIVE ? 'active' : n > 0 ? 'limited' : 'outside';
  }, [covCells]);
  const checkCoverage = useCallback((r: Region | null) => {
    const next = covFor(r);
    const prev = covPrev.current;
    covPrev.current = next;
    setCov(next);
    // one gentle pulse only when crossing into "outside" — never on first load, never more than once a minute
    if (next === 'outside' && prev !== undefined && prev !== 'outside' && Date.now() - covBuzz.current > 60000) {
      covBuzz.current = Date.now();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [covFor]);
  useEffect(() => { if (covCells && regionRef.current) { covPrev.current = covFor(regionRef.current); setCov(covPrev.current); } }, [covCells]);
  useEffect(() => { Animated.timing(tint, { toValue: cov === 'outside' ? 1 : 0, duration: 450, useNativeDriver: true }).start(); }, [cov]);
  const backToCovered = () => {
    tap(); const r = regionRef.current; if (!covCells || !r || !mapRef.current) return;
    let bLat = 0, bLng = 0, bd = 1e9;
    for (const [k, n] of Array.from(covCells.m.entries())) {
      if (n < 3) continue;
      const [a, b] = k.split(',').map(Number); const lat = (a + 0.5) * covCells.size, lng = (b + 0.5) * covCells.size;
      const d = Math.hypot(lat - r.latitude, (lng - r.longitude) * 0.76); if (d < bd) { bd = d; bLat = lat; bLng = lng; }
    }
    if (bd < 1e9) mapRef.current.animateToRegion({ latitude: bLat, longitude: bLng, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 600);
  };
  const suggestArea = async () => {
    tap(); const r = regionRef.current; if (!r) return;
    const place = await placeName(r.latitude, r.longitude, r.latitudeDelta).catch(() => '');
    setSuggested(place || 'this area');
    fetch(`${API_BASE}/api/coverage/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: r.latitude, lng: r.longitude, place, mode: isEvents ? 'events' : 'places' }) }).catch(() => {});
  };
  useEffect(() => { if (cov !== 'outside') setSuggested(null); }, [cov]);
  // VBR_PLACE_SEARCH: searching "Detroit", "Maryland"… flies the map there; if we don't cover it, say so and offer to request it.
  const [placeQ, setPlaceQ] = useState<string | null>(null);
  useEffect(() => {
    const m = submitted ? submitted.match(PLACE_RE) : null;
    if (!m) { setPlaceQ(null); return; }
    const name = m[1].replace(/\b\w/g, (c) => c.toUpperCase());
    let on = true;
    Location.geocodeAsync(m[1]).then((g) => {
      if (!on || !g?.[0] || !mapRef.current) return;
      const r = { latitude: g[0].latitude, longitude: g[0].longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 } as Region;
      if (covFor(r) !== 'outside') { setPlaceQ(null); return; }
      setPlaceQ(name); fitNext.current = false; touchRef.current = false; progAt.current = Date.now();
      regionRef.current = r; mapRef.current.animateToRegion(r, 650); checkCoverage(r);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }).catch(() => {});
    return () => { on = false; };
  }, [submitted, covCells]); // eslint-disable-line react-hooks/exhaustive-deps
  // Zoom to the results whenever a new result set arrives (not after "Search this area"), once the map exists.
  // VBR_COVERAGE_HONEST: "Near you" outside our coverage → stay on the person and show the coverage banner,
  // instead of flying to the closest results hundreds of miles away.
  const outsideHere = (): Region | null => {
    const here = locRef.current;
    if (!nearYou || !here || !covCells) return null;
    const r = { latitude: here.latitude, longitude: here.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 } as Region;
    return covFor(r) === 'outside' ? r : null;
  };
  useEffect(() => {
    const r = outsideHere();
    if (!mapReady || !r || !mapRef.current) return;
    fitNext.current = false; touchRef.current = false; progAt.current = Date.now();
    regionRef.current = r; mapRef.current.animateToRegion(r, 450); checkCoverage(r);
  }, [mapReady, nearYou, userLoc, covCells, pins]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapReady || !fitNext.current || pins.length === 0 || !mapRef.current || outsideHere() || placeQ) return;
    fitNext.current = false; touchRef.current = false;
    const edgePadding = { top: topH + 30, right: 50, bottom: tabH + (mode === 'map' ? CARD_H + 70 : 40), left: 50 };
    if (pins.length === 1) mapRef.current.animateToRegion({ ...pins[0].c, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 350);
    else mapRef.current.fitToCoordinates(pins.slice(0, PIN_POOL).map((p) => p.c), { edgePadding, animated: true });
  }, [pins, mapReady, tabH, topH, mode]);

  const focusCard = (i: number) => {
    const c = cards[i] ? coordOf(cards[i]) : null;
    if (c && mapRef.current) { touchRef.current = false; progAt.current = Date.now(); mapRef.current.animateCamera({ center: c }, { duration: 300 }); }
  };
  const lastPinAt = useRef(0);
  const progTarget = useRef<{ i: number; at: number } | null>(null);
  const selectedRef = useRef(0); selectedRef.current = selected;
  const onPin = (key: string) => { // VBR_PIN_POOL: identity, never a list index
    if (Date.now() - lastPinAt.current < 250) return; // VBR_PIN_LIGHT: debounce machine-gun taps
    const i = indexForKey(cards, key, kid);
    if (__DEV__) console.log('[pin tap]', key, i, i >= 0 ? (cards[i]?.name || cards[i]?.title) : '(stale — ignored)', i >= 0 ? coordOf(cards[i]) : null);
    if (i < 0) return;
    lastPinAt.current = Date.now();
    tap();
    setSelected(i);
    // VBR_CAROUSEL_GUARD: the strip moves because of the pin, not the other way round
    progTarget.current = { i, at: Date.now() };
    carouselRef.current?.scrollToOffset({ offset: i * (CARD_W + GAP), animated: Math.abs(i - selectedRef.current) <= 2 });
    selectedRef.current = i;
    focusCard(i);
  };
  const onPinRef = useRef(onPin); onPinRef.current = onPin;
  const pinPress = useCallback((key: string) => onPinRef.current(key), []);
  // What the pool shows: the first PIN_POOL pins, as plain values (so unchanged pins don't re-render).
  const pinsIn = useMemo((): PinIn[] => pins.slice(0, PIN_POOL).map((p) => {
    const first = cards[p.first];
    return { key: kid(first), lat: p.c.latitude, lng: p.c.longitude, kind: p.ev ? 'event' : 'place',
      label: p.ev ? `${p.label}${p.n > 1 ? ` +${p.n - 1}` : ''}` : '', name: String(first?.name || ''), gold: !p.ev && evAt.has(first?.id) };
  }), [pins, cards, evAt]);
  const onCarouselEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP));
    const p = progTarget.current;
    if (p && Date.now() - p.at < 1500) {
      if (__DEV__) console.log('[card swipe] ignored — pin tap', p.i, 'landed', i);
      if (i !== p.i) carouselRef.current?.scrollToOffset({ offset: p.i * (CARD_W + GAP), animated: false });
      progTarget.current = null; return;
    }
    progTarget.current = null;
    if (__DEV__) console.log('[card swipe]', i, cards[i] ? (cards[i].name || cards[i].title) : '(none)'); // VBR_CAM_LOG
    if (i >= 0 && i < cards.length && i !== selectedRef.current) { setSelected(i); focusCard(i); }
  };
  const onCarouselDrag = () => { progTarget.current = null; }; // a finger on the strip always wins
  const openSheet = (x: any) => router.push(isEvents || isEv(x) ? `/event-sheet/${x.id}` : `/venue-sheet/${x.id}`); // VBR_SWIPE_SHEET
  const open = (x: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(isEvents || isEv(x) ? `/event/${x.id}` : `/venue/${x.id}`);
  };

  const windowWords = day ? `on ${shortDay(day)}` : when === 'tonight' ? 'tonight' : when === 'weekend' ? 'this weekend' : when === '7d' ? 'in the next 7 days' : 'coming up';
  const placeWords = bbox ? (mapPlace ? `around ${mapPlace}` : 'in this map area') : scopeAll ? 'across all areas' : nearYou ? 'near you' : `in ${where}`;
  const genreLabel = genre ? eres?.genres.find((g) => g.key === genre)?.label || null : null;

  // Status line: only real totals from the API.
  const status = useMemo(() => {
    if (loading || failed) return '';
    if (isEvents && eres) {
      if (eres.total === 0) return '';
      const base = `${plural(eres.total, `${genreLabel ? `${genreLabel} ` : ''}event`)}${bbox || scopeAll ? ` ${placeWords}` : ''} ${windowWords}`;
      if (eres.results.length < eres.total) return `${base} · showing the first ${eres.results.length}`;
      return eres.list_only > 0 ? `${base} · ${eres.located} on the map` : base;
    }
    if (mix) { // VBR_DISCOVER_APP
      const parts = [mix.places ? plural(vres?.total || mix.places, 'place') : null, mix.eventsTotal ? plural(mix.eventsTotal, 'event') : null].filter(Boolean);
      if (!parts.length || mode !== 'map') return '';
      const onMap = cards.filter((x: any) => coordOf(x)).length;
      return `${parts.join(' · ')} · ${onMap} on map`;
    }
    if (!vres || vres.total === 0) return '';
    const curatedNow = !cat && !submitted;
    const all = curatedNow ? `${plural(vres.total, 'place')} ${placeWords}` : plural(vres.total, 'match', 'matches');
    // The map pins the top 20; List shows every result returned (up to 60).
    if (mode === 'map') return vres.total > cards.length ? `${all} · ${cards.length} on map` : all;
    return ''; // VBR_LIST_V2: the list has its own header
  }, [loading, failed, isEvents, eres, vres, cards, venues.length, mode, cat, submitted, genreLabel, windowWords, placeWords, bbox, scopeAll, mix]);

  const notice = useMemo((): Notice | null => {
    if (hint) return { text: hint };
    if (failed) return { text: 'Couldn’t load this right now.', action: { label: 'Try again', run: () => setRetry((n) => n + 1) } };
    if (loading) return null;
    if (isEvents && eres && eres.total === 0) {
      const what = `${genreLabel ? `${genreLabel} ` : ''}events`;
      const text = `No ${what} ${placeWords} ${windowWords}.`;
      if (elsewhere > 0) return { text, action: { label: `Show ${elsewhere} in other areas`, run: showElsewhere } };
      return { text: genre ? text : `${text} Try another date.`, action: genre ? { label: 'All genres', run: () => setGenre(null) } : undefined };
    }
    if (vres) {
      if (vres.unsupported) return { text: vres.unsupported };
      if (vres.needs_location) return {
        text: 'Turn on location to search near you, or search the area on screen.',
        action: { label: 'Use my location', run: () => { locate().then((c) => { if (c) setRetry((n) => n + 1); }); } }, action2: { label: 'Search the map', run: () => { tap(); searchArea(); } },
      };
      if (mix && mix.events > 0) return mix.notes.length ? { text: mix.notes[0] } : null; // VBR_DISCOVER_APP
      if (vres.total === 0 && vres.place && (vres.elsewhere_total || 0) > 0) return { text: growing(vres.place, vres.what), action: { label: `Show ${vres.elsewhere_total} in other areas`, run: showElsewhere } };
      if (vres.total === 0 && vres.area && (vres.wider_total || 0) > 0) return { text: growing(vres.area, vres.what), action: { label: `Show ${vres.wider_total} in other areas`, run: showElsewhere } };
      if (vres.total === 0) return { text: 'No matches. Try a neighborhood, cuisine or venue type.' };
      if (mix && mix.notes.length) return { text: mix.notes[0] };
      if (vres.time_note) return { text: vres.time_note };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, failed, loading, isEvents, eres, vres, elsewhere, genre, genreLabel, placeWords, windowWords, cards.length, mix]);

  const pickCat = (k: string | null) => { if (k === cat) k = null; /* VBR_NO_FOR_YOU: tap the active chip again to clear it */ tap(); Keyboard.dismiss(); setCat(k); };
  const toggleWeekend = () => { tap(); setDay(null); setWhen((w) => (w === 'weekend' ? 'upcoming' : 'weekend')); };
  const dateLabel = day ? shortDay(day) : when === 'tonight' ? 'Tonight' : when === '7d' ? 'Next 7 days' : 'Date';
  const days = sheet === 'date' ? Array.from({ length: 21 }, (_, i) => addDays(nyToday(), i)) : [];
  const initialRegion = useMemo(() => ({ latitude: 40.7306, longitude: -73.9866, latitudeDelta: 0.12, longitudeDelta: 0.12 }), []);
  const carouselBottom = tabH + 12;
  // VBR_MAP_STABLE: pins keep one key per slot (never re-keyed on select / same address), so the native map
  // only updates pins in place instead of removing + re-inserting them (fixes AIRMap insertReactSubview crash).
  // Pins redraw for a moment after selection or results change, then freeze again for smooth panning.
  // VBR_PIN_LIGHT: redrawing every pin on each tap (up to 200 event pins) overloaded the native map and could close the app.
  // All pins redraw only when results change; on a tap, only the old and new selected pins redraw, briefly.
  // VBR_PIN_POOL: each pin slot redraws its own bitmap briefly when what it shows changes (see MapPins.tsx).
  const playable = isFocused && appActive && !reduceMotion && mode === 'map' && sheet == null;
  const listPlay = isFocused && appActive && !reduceMotion && mode === 'list' && sheet == null;
  const directions = (x: any) => {
    const c = coordOf(x); if (!c) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Linking.openURL(`http://maps.apple.com/?daddr=${c.latitude},${c.longitude}&q=${encodeURIComponent(String((isEvents || isEv(x) ? x.venue_name || x.title : x.name) || ''))}`).catch(() => {});
  };
  // List = the same results as the map (all of them, including events without a map pin).
  const listItems = isEvents ? cards : mix ? mix.items.filter((x: any) => mixFilter === 'all' || (mixFilter === 'events') === isEv(x)) : venues;
  const toggleMode = () => {
    tap(); Keyboard.dismiss();
    // VBR_LIST_IS_RESULTS: List always shows the places on the map (never the old For you feed)
    setMode(mode === 'map' ? 'list' : 'map');
  };

  return (
    <View style={s.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        userInterfaceStyle="dark"
        showsUserLocation={userLoc != null}
        showsPointsOfInterests={false}
        mapType="mutedStandard"
        initialRegion={initialRegion}
        onMapReady={() => {
          regionRef.current = initialRegion; setMapReady(true);
          // VBR_CAM_LOG: dev builds only — wrap the camera calls so each move logs its caller.
          const m: any = mapRef.current;
          if (__DEV__ && m && !m.__vbrCamLog) {
            m.__vbrCamLog = true;
            for (const k of ['animateCamera', 'animateToRegion', 'fitToCoordinates']) {
              const f = m[k]?.bind(m); if (!f) continue;
              m[k] = (...a: any[]) => {
                const where = String(new Error().stack || '').split('\n').slice(2, 4).map((x) => x.trim()).join(' ← ');
                console.log(`[camera] ${k}`, JSON.stringify(a[0]).slice(0, 140), '·', where);
                return f(...a);
              };
            }
          }
        }}
        onTouchStart={() => { touchRef.current = true; Keyboard.dismiss(); if (autoRef.current) clearTimeout(autoRef.current); }}
        onMarkerPress={() => { touchRef.current = false; progAt.current = Date.now(); }}
        onPress={() => { touchRef.current = false; }}
        onRegionChangeComplete={(r: Region) => { regionRef.current = r; checkCoverage(r); if (touchRef.current) { touchRef.current = false; if (mode === 'map' && Date.now() - progAt.current > 900) scheduleArea(); } }}
      >
        <PinPool pins={pinsIn} selectedSlot={pinOfCard[selected] ?? -1} onPress={pinPress} styles={s} />
      </MapView>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.covTint, { opacity: tint }]} />

      {mode === 'list' ? (
        <FlatList
          style={[StyleSheet.absoluteFill, { backgroundColor: C.ground }]}
          data={listItems}
          keyExtractor={(x: any) => `l-${isEvents ? `e${x.id}` : kid(x)}`}
          contentContainerStyle={{ paddingTop: topH + 4, paddingBottom: tabH + 130 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item, index }) => <ListRow x={item} isEvent={isEvents || isEv(item)} onPress={() => open(item)} ev={isEvents || isEv(item) ? undefined : evAt.get(item.id)} featured={!isEvents && !isEv(item) && index === 0} play={listPlay && index === 0 && !isEv(item)} />}
          ListHeaderComponent={!isEvents && mix ? <View style={s.listHead}><Text style={s.listTitle} numberOfLines={2}>{`“${submitted}”`}</Text><Text style={s.meta}>{[mix.places ? plural(vres?.total || mix.places, 'place') : null, mix.eventsTotal ? plural(mix.eventsTotal, 'event') : null].filter(Boolean).join(' · ') || 'No results yet'}</Text></View> : !isEvents && vres && vres.total > 0 ? <View style={s.listHead}><Text style={s.listTitle}>{`Discover ${placeWords}`}</Text><Text style={s.meta}>{`${plural(vres.total, 'place')} to explore`}</Text></View> : null}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      <View style={[s.top, { paddingTop: insets.top + 6 }, mode === 'list' && { backgroundColor: C.ground, paddingBottom: 8 }]} pointerEvents="box-none" onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color={C.muted} />
            <TextInput
              style={s.input} value={query} onChangeText={onChangeQuery} onSubmitEditing={submit}
              placeholder={isEvents ? 'Search events' : 'Search places'}
              placeholderTextColor={C.faint} returnKeyType="search" autoCorrect={false} autoCapitalize="none" maxLength={80}
              selectionColor={C.ivory} accessibilityLabel="Search the map"
            />
            {loading ? <ActivityIndicator size="small" color={C.muted} /> : query ? (
              <TouchableOpacity onPress={clearQuery} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={C.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={s.areaBtnTop} onPress={() => {
            tap(); Keyboard.dismiss();
            // Leaving the map-led area: go back to the chosen area (so picking the same one jumps back there too).
            if (bbox) { setBbox(null); setMapPlace(null); fitNext.current = true; }
            onOpenArea();
          }} accessibilityLabel={`Area: ${bbox && mapPlace ? mapPlace : where}. Change area`}>
            <Ionicons name={bbox ? 'navigate-circle' : 'location'} size={14} color={C.ivory} />
            <Text style={s.areaBtnTopText} numberOfLines={1}>{bbox ? mapPlace || 'This area' : where}</Text>
            <Ionicons name="chevron-down" size={12} color={C.muted} />
          </TouchableOpacity>
        </View>

        <View style={s.modeRow}>
          <View style={s.seg} accessibilityRole="tablist">
            {(['places', 'events'] as const).map((m) => {
              const on = (m === 'events') === isEvents;
              return (
                <TouchableOpacity key={m} style={[s.segBtn, on && s.segOn]} activeOpacity={0.85} onPress={() => pickMode(m)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <Text style={[s.segText, on && s.segTextOn]}>{m === 'places' ? 'Places' : 'Events'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.pillRow}>
          {isEvents ? (
            <>
          <TouchableOpacity style={[s.chip, when === 'weekend' && !day && s.chipOn]} onPress={toggleWeekend}>
            <Text style={[s.chipText, when === 'weekend' && !day && s.chipTextOn]}>This weekend</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.chip, !!genre && s.chipOn]} onPress={() => { tap(); setSheet('genre'); }}>
            <Text style={[s.chipText, !!genre && s.chipTextOn]}>{genreLabel || 'Genre'}</Text>
            <Ionicons name="chevron-down" size={11} color={genre ? C.ink : C.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.chip, (!!day || when === 'tonight' || when === '7d') && s.chipOn]} onPress={() => { tap(); setSheet('date'); }}>
            <Text style={[s.chipText, (!!day || when === 'tonight' || when === '7d') && s.chipTextOn]}>{dateLabel}</Text>
            <Ionicons name="chevron-down" size={11} color={day || when === 'tonight' || when === '7d' ? C.ink : C.muted} />
          </TouchableOpacity>
            </>
          ) : mix && mix.places > 0 && mix.events > 0 ? (
            ([['all', 'All', null], ['places', 'Places', vres?.total || mix.places], ['events', 'Events', mix.eventsTotal]] as [MixFilter, string, number | null][]).map(([k, label, n]) => {
              const on = mixFilter === k;
              return (
                <TouchableOpacity key={k} style={[s.pill, on && s.pillOn]} onPress={() => { tap(); Keyboard.dismiss(); fitNext.current = true; setMixFilter(k); }}
                  accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={n != null ? `${label}, ${n}` : label}>
                  <Text style={[s.pillText, on && s.pillTextOn]}>{label}{n != null ? <Text style={[s.pillCount, on && s.pillTextOn]}>{`  ${n}`}</Text> : null}</Text>
                </TouchableOpacity>
              );
            })
          ) : CATS.filter((c) => c.key !== 'events').map((c) => {
            const on = cat === c.key;
            return (
              <TouchableOpacity key={c.key || 'all'} style={[s.pill, on && s.pillOn]} onPress={() => pickCat(c.key)}>
                <Text style={[s.pillText, on && s.pillTextOn]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {status ? <Text style={s.status} numberOfLines={1}>{status}</Text> : null}
        {cov === 'outside' && mode === 'map' ? (
          <View style={s.covBanner}>
            <Text style={s.covTitle}>{placeQ ? `We’re not in ${placeQ} yet` : 'Outside our service area'}</Text>
            <Text style={s.covSub}>{suggested ? `Thanks, we noted interest in ${suggested}.` : 'Viberyte curates NYC and North Jersey right now.'}</Text>
            <View style={s.bannerActions}>
              <TouchableOpacity onPress={backToCovered}><Text style={s.bannerAction}>Back to covered areas</Text></TouchableOpacity>
              {!suggested ? <TouchableOpacity onPress={suggestArea}><Text style={s.bannerAction}>{placeQ ? `Request ${placeQ}` : 'Request this area'}</Text></TouchableOpacity> : null}
            </View>
          </View>
        ) : cov === 'limited' && mode === 'map' ? <Text style={s.covLimited} numberOfLines={1}>Limited picks here so far — we’re still curating this area.</Text> : null}
        {notice ? (
          <View style={s.banner}>
            <Text style={s.bannerText}>{notice.text}</Text>
            {notice.action || notice.action2 ? (
              <View style={s.bannerActions}>
                {notice.action ? <TouchableOpacity onPress={notice.action.run}><Text style={s.bannerAction}>{notice.action.label}</Text></TouchableOpacity> : null}
                {notice.action2 ? <TouchableOpacity onPress={notice.action2.run}><Text style={s.bannerAction}>{notice.action2.label}</Text></TouchableOpacity> : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {mode === 'map' ? (
        <TouchableOpacity style={[s.recenter, { bottom: carouselBottom + (cards.length ? CARD_H + 12 : 4) }]} onPress={recenter}
          activeOpacity={0.85} accessibilityLabel="Center on my location">
          <Ionicons name={userLoc ? 'navigate' : 'navigate-outline'} size={18} color={userLoc ? C.champ : C.ivory} />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={[s.toggle, { bottom: carouselBottom + (mode === 'map' && cards.length ? CARD_H + 14 : 4) }]} onPress={toggleMode}
        activeOpacity={0.85} accessibilityLabel={mode === 'map' ? 'Show as list' : 'Show on map'}>
        <Ionicons name={mode === 'map' ? 'list' : 'map-outline'} size={15} color={C.ink} />
        <Text style={s.toggleText}>{mode === 'map' ? 'List' : 'Map'}</Text>
      </TouchableOpacity>

      {mode === 'map' && cards.length > 0 && !(cov === 'outside' && (nearYou || placeQ)) ? (
        <FlatList
          ref={carouselRef}
          data={cards}
          horizontal
          style={[s.carousel, { bottom: carouselBottom }]}
          contentContainerStyle={{ paddingHorizontal: 24, gap: GAP }}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + GAP}
          decelerationRate="fast"
          keyExtractor={(x: any) => (isEvents ? `e-${x.id}` : kid(x))}
          onMomentumScrollEnd={onCarouselEnd}
          onScrollBeginDrag={onCarouselDrag}
          getItemLayout={(_: any, index: number) => ({ length: CARD_W + GAP, offset: 24 + index * (CARD_W + GAP), index })}
          initialNumToRender={4}
          windowSize={5}
          extraData={selected + (playable ? 1000 : 0)}
          renderItem={({ item, index }) => (
            <ReelCard x={item} isEvent={isEvents || isEv(item)} active={playable && index === selected} onOpen={() => openSheet(item)} onDirections={() => directions(item)} ev={isEvents || isEv(item) ? undefined : evAt.get(item.id)} />
          )}
        />
      ) : null}

      <Modal visible={sheet != null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={s.backdrop} onPress={() => setSheet(null)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.grabber} />
          {sheet === 'genre' ? (
            <>
              <Text style={s.sheetTitle}>Genre</Text>
              <Text style={s.sheetSub}>{`Events ${placeWords} ${windowWords}`}</Text>
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <SheetRow label="All genres" on={!genre} onPress={() => { tap(); setGenre(null); setSheet(null); }} />
                {(eres?.genres || []).map((g) => (
                  <SheetRow key={g.key} label={g.label} count={g.count} on={genre === g.key} onPress={() => { tap(); setGenre(g.key); setSheet(null); }} />
                ))}
                {(eres?.genres || []).length === 0 ? <Text style={[s.sheetSub, { paddingVertical: 14 }]}>No genre tags for these events yet.</Text> : null}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={s.sheetTitle}>When</Text>
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {([['upcoming', 'Any date'], ['tonight', 'Tonight'], ['weekend', 'This weekend'], ['7d', 'Next 7 days']] as [When, string][]).map(([k, l]) => (
                  <SheetRow key={k} label={l} on={!day && when === k} onPress={() => { tap(); setDay(null); setWhen(k); setSheet(null); }} />
                ))}
                <Text style={[s.sheetSub, { marginTop: 14 }]}>Pick a day</Text>
                {days.map((d) => (
                  <SheetRow key={d} label={evDay(d)} on={day === d} onPress={() => { tap(); setDay(d); setSheet(null); }} />
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

function SheetRow({ label, count, on, onPress }: { label: string; count?: number; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.sheetRow} onPress={onPress}>
      <Text style={[s.sheetRowText, on && { fontWeight: '600' }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {count != null ? <Text style={s.meta}>{count}</Text> : null}
        {on ? <Ionicons name="checkmark" size={18} color={C.ivory} /> : null}
      </View>
    </TouchableOpacity>
  );
}

// VBR_LIST_V2: first result = editorial card; the rest = compact rows with a reason to go (vibe · cuisine), distance, events.
const ListRow = React.memo(function ListRow({ x, isEvent, onPress, ev, featured, play }: { x: any; isEvent: boolean; onPress: () => void; ev?: any; featured?: boolean; play?: boolean }) {
  const u = isEvent ? img(x.image_url) : (x?.reel?.poster ? img(x.reel.poster) : getPhotoUrl(x));
  if (!isEvent) {
    const t = String(x?.type || x?.category || '').replace(/_/g, ' ');
    const eyebrow = [typeLabel(t), x.neighborhood, x.distance_mi != null ? `${x.distance_mi} mi` : null].filter(Boolean).join(' · ');
    const why = x.vibe || (x.cuisine && String(x.cuisine).toLowerCase() !== t.toLowerCase() ? x.cuisine : '');
    const evText = ev ? `Event ${pinDay(ev.date)} · ${ev.title}` : null;
    if (featured) return (
      <TouchableOpacity style={s.feat} onPress={onPress} activeOpacity={0.9}>
        <View style={s.featImg}>{/* VBR_LIST_HERO_REEL: the top pick plays its reel, muted */}
          {u ? <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} /> : null}
          {play && x?.reel?.video ? <ReelVideo key={x.reel.video} uri={img(x.reel.video) as string} /> : null}
        </View>
        <Text style={[s.featName, { marginTop: 12 }]} numberOfLines={1}>{x.name}</Text>
        <Text style={s.eyebrow} numberOfLines={1}>{eyebrow}</Text>
        {why ? <Text style={s.meta} numberOfLines={1}>{why}</Text> : null}
        {evText ? <Text style={s.evLine} numberOfLines={1}>{evText}</Text> : null}
      </TouchableOpacity>
    );
    return (
      <TouchableOpacity style={s.listRow} onPress={onPress} activeOpacity={0.8}>
        {/* VBR_THUMB_FALLBACK: a date tile sits underneath, so a missing or broken image never leaves a blank square */}
        <View style={[s.thumb, s.thumbBack]}>
          {isEvent && x?.date ? (<>
            <Text style={s.thumbMon}>{new Date(`${String(x.date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
            <Text style={s.thumbDay}>{Number(String(x.date).slice(8, 10)) || ''}</Text>
          </>) : <Ionicons name={isEvent ? 'musical-notes' : 'location'} size={22} color={C.faint} />}
          {u ? <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={120} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{x.name}</Text>
          <Text style={s.eyebrow} numberOfLines={1}>{eyebrow}</Text>
          {why ? <Text style={s.meta} numberOfLines={1}>{why}</Text> : null}
          {evText ? <Text style={s.evLine} numberOfLines={1}>{evText}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  }
  const type = String(x?.type || x?.standardized_category || x?.category || '').replace(/_/g, ' ');
  return (
    <TouchableOpacity style={s.listRow} onPress={onPress} activeOpacity={0.8}>
      {u ? <Image source={{ uri: u }} style={s.thumb} contentFit="cover" cachePolicy="memory-disk" transition={120} /> : <View style={[s.thumb, { backgroundColor: C.raise }]} />}
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>{isEvent ? x.title : x.name}</Text>
        {isEvent ? <Text style={s.eyebrow} numberOfLines={1}>{[evDay(x.date), fmtTime(x.time)].filter(Boolean).join(' · ')}</Text> : null}
        <Text style={s.meta} numberOfLines={1}>{isEvent
          ? [x.venue_name, x.genre_label, priceOf(x)].filter(Boolean).join(' · ')
          : [x.neighborhood, type ? type.replace(/^\w/, (c: string) => c.toUpperCase()) : null].filter(Boolean).join(' · ')}</Text>
        {isEvent && !coordOf(x) ? <Text style={s.faint} numberOfLines={1}>Not on the map yet</Text> : null}
      </View>
    </TouchableOpacity>
  );
});

// Reel plays only on the selected card, muted and looping, after a short pause. The still stays underneath.
function ReelVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (pl) => { pl.loop = true; pl.muted = true; pl.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

const ReelCard = React.memo(function ReelCard({ x, isEvent, active, onOpen, onDirections, ev }: {
  x: any; isEvent: boolean; active: boolean; onOpen: () => void; onDirections: () => void; ev?: any;
}) {
  // VBR_SWIPE_SHEET: swipe the card up to open the full profile as a sheet (swipe down there to come back). Sideways still moves between cards.
  const lift = useRef(new Animated.Value(0)).current;
  const openRef = useRef(onOpen); openRef.current = onOpen;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_e, g) => lift.setValue(Math.max(-90, Math.min(0, g.dy * 0.55))),
    onPanResponderRelease: (_e, g) => {
      const go = g.dy < -45 || g.vy < -0.45;
      if (go) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); openRef.current(); }
      Animated.spring(lift, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(lift, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  const video = !isEvent && x?.reel?.video ? img(x.reel.video) : null;
  const still = isEvent ? img(x.image_url) : (x?.reel?.poster ? img(x.reel.poster) : getPhotoUrl(x));
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!active || !video) { setLive(false); return; }
    const t = setTimeout(() => setLive(true), 400);
    return () => clearTimeout(t);
  }, [active, video]);
  const type = String(x?.type || x?.standardized_category || x?.category || '').replace(/_/g, ' ');
  // VBR_EDITORIAL_EXPLORE_V1: no eyebrow. Name, then plain facts, then at most one verified detail.
  const sub = isEvent
    ? [evDay(x.date), fmtTime(x.time)].filter(Boolean).join(' · ')
    : [typeLabel(type), x.neighborhood].filter(Boolean).join(' · ');
  const known = !isEvent && x.cuisine && String(x.cuisine).toLowerCase() !== type.toLowerCase() ? x.cuisine : null;
  const tags = isEvent ? [x.venue_name, x.genre_label, priceOf(x)].filter(Boolean).join(' · ') : (x.vibe || known || '');
  const located = coordOf(x) != null;
  return (
    <Animated.View style={[s.card, { transform: [{ translateY: lift }] }]} {...pan.panHandlers}>
      <View style={s.cardGrabber} pointerEvents="none" />
      <Pressable style={s.media} onPress={onOpen} accessibilityLabel={`Open ${isEvent ? x.title : x.name}`}>
        {still ? <Image source={{ uri: still }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} /> : null}
        {live && video ? <ReelVideo key={video} uri={video} /> : null}
      </Pressable>
      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={2}>{isEvent ? x.title : x.name}</Text>
        {sub ? <Text style={s.cardSub} numberOfLines={1}>{sub}</Text> : null}
        {tags ? <Text style={s.meta} numberOfLines={1}>{tags}</Text> : null}
        {ev ? <Text style={s.evLine} numberOfLines={1}>{`Event ${pinDay(ev.date)} · ${ev.title}`}</Text> : null}
        {isEvent && !located ? <Text style={s.faint} numberOfLines={1}>Not on the map yet</Text> : null}
        <View style={s.cardActions}>
          <TouchableOpacity style={s.primaryBtn} onPress={onOpen} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>{isEvent ? 'View event' : 'View venue'}</Text>
          </TouchableOpacity>
          {located ? (
            <TouchableOpacity style={s.iconBtn} onPress={onDirections} activeOpacity={0.85} accessibilityLabel="Directions">
              <Ionicons name="navigate" size={16} color={C.ivory} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ground },
  top: { position: 'absolute', top: 0, left: 0, right: 0, gap: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 22,
    backgroundColor: C.glass,
  },
  input: { flex: 1, color: C.ivory, fontSize: 15, paddingVertical: 0 },
  areaBtnTop: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 44, paddingHorizontal: 12, borderRadius: 22, maxWidth: 150,
    backgroundColor: C.glass,
  },
  areaBtnTopText: { color: C.ivory, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  toggle: {
    position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 18,
    borderRadius: 20, backgroundColor: C.ivory,
  },
  toggleText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 9 },
  feat: { marginHorizontal: 16, marginBottom: 14 },
  featImg: { width: '100%', height: 230, borderRadius: 18, overflow: 'hidden', backgroundColor: C.raise },
  featName: { color: C.ivory, fontSize: 24, fontWeight: '700', marginTop: 3, letterSpacing: -0.3 },
  listHead: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  listTitle: { color: C.ivory, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(243,240,233,0.08)', marginLeft: 108 },
  pillRow: { paddingHorizontal: 16, gap: 8 },
  modeRow: { paddingHorizontal: 16 },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 22, backgroundColor: C.glass },
  segBtn: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.ivory },
  segText: { color: C.muted, fontSize: 15, fontWeight: '600' },
  segTextOn: { color: C.ink },
  pill: { height: 32, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center', backgroundColor: C.glass },
  pillOn: { backgroundColor: C.ivory, borderColor: C.ivory },
  pillText: { color: C.ivory, fontSize: 14, fontWeight: '500' },
  pillTextOn: { color: C.ink, fontWeight: '600' },
  pillCount: { color: C.muted, fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 12, borderRadius: 15,
    backgroundColor: C.glass,
  },
  chipOn: { backgroundColor: C.ivory },
  chipText: { color: C.ivory, fontSize: 14, fontWeight: '500' },
  chipTextOn: { color: C.ink },
  status: {
    alignSelf: 'flex-start', marginLeft: 16, color: C.muted, fontSize: 11, fontWeight: '500', overflow: 'hidden',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(10,10,11,0.88)', fontVariant: ['tabular-nums'],
  },
  banner: { marginHorizontal: 16, padding: 12, borderRadius: 14, backgroundColor: 'rgba(20,20,23,0.96)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.1)' },
  bannerText: { color: C.ivory, fontSize: 13, lineHeight: 18 },
  bannerActions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  bannerAction: { color: C.ivory, fontSize: 13, fontWeight: '600' },
  recenter: {
    position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line,
  },
  carousel: { position: 'absolute', left: 0, right: 0 },
  card: {
    width: CARD_W, height: CARD_H, flexDirection: 'row', borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(10,10,11,0.98)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.08)',
  },
  media: { width: MEDIA_W, height: '100%', backgroundColor: C.raise },
  cardGrabber: { position: 'absolute', top: 6, alignSelf: 'center', left: '50%', marginLeft: -18, width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,241,234,0.35)', zIndex: 5 },
  reelBadge: {
    position: 'absolute', left: 8, top: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(9,9,11,0.6)',
  },
  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 14 },
  cardName: { color: C.ivory, fontSize: 19, lineHeight: 23, fontWeight: '600', letterSpacing: -0.3, marginTop: 6 },
  cardSub: { color: C.muted, fontSize: 14, lineHeight: 19, marginTop: 4 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto' },
  primaryBtn: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ivory },
  primaryBtnText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.35)' },
  pinWrap: { alignItems: 'center' },
  pinLabel: { maxWidth: 160, paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: C.ivory, marginBottom: 4 },
  pinLabelText: { color: C.ink, fontSize: 12, fontWeight: '700' },
  thumb: { width: 78, height: 78, borderRadius: 12 },
  thumbBack: { backgroundColor: C.raise, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbMon: { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  thumbDay: { color: C.ivory, fontSize: 26, fontWeight: '600', marginTop: -2 },
  eyebrow: { color: C.muted, fontSize: 13, marginTop: 2 }, // VBR_EDITORIAL_EXPLORE_V1: facts line (no gold caps)
  name: { color: C.ivory, fontSize: 16, fontWeight: '600', marginTop: 1 },
  meta: { color: C.muted, fontSize: 13, marginTop: 2 },
  faint: { color: C.faint, fontSize: 12, marginTop: 2 },
  pin: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(243,240,233,0.88)', borderWidth: 2, borderColor: '#000' },
  pinEv: { backgroundColor: C.champ },
  evLine: { color: C.ivory, fontSize: 13, fontWeight: '500', marginTop: 4 },
  covTint: { backgroundColor: 'rgba(150,70,35,0.16)' },
  covBanner: { marginHorizontal: 16, padding: 12, borderRadius: 14, backgroundColor: 'rgba(20,20,23,0.96)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(197,163,107,0.45)' },
  covTitle: { color: C.ivory, fontSize: 14, fontWeight: '600' },
  covSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  covLimited: { color: C.champ, fontSize: 12, paddingHorizontal: 18 },
  pinSel: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.ivory, borderWidth: 3, borderColor: C.ink },
  datePin: { paddingHorizontal: 8, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: C.ground, borderWidth: 1.5, borderColor: C.champ },
  datePinSel: { backgroundColor: C.champ, borderColor: C.ivory, height: 28, borderRadius: 14, paddingHorizontal: 10 },
  datePinText: { color: C.ivory, fontSize: 11, fontWeight: '700' },
  datePinTextSel: { color: C.ink, fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: '#141416', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(243,240,233,0.2)', marginBottom: 14 },
  sheetTitle: { color: C.ivory, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  sheetSub: { color: C.muted, fontSize: 13, marginTop: 3, marginBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(243,240,233,0.08)' },
  sheetRowText: { color: C.ivory, fontSize: 16 },
});
