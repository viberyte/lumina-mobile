import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import luminaApi from '../../services/luminaApi';
import FlowCard from '../../components/FlowCard';
import { getPhotoUrl, parseVibeTags } from '../../utils/photoHelper';
import { usePersona } from '../../hooks/usePersona';
import StretchCitySelector from '../../components/StretchCitySelector';
import personaService, { sortEventsByMusicPreference } from '../../services/personaService';
import { useUserFollows } from '../../hooks/useFollow';
import favoritesService from '../../services/favorites';
import tasteTracker from '../../services/tasteTracker';
import { INTENT_MAP, intentOrder, fmtDistance, distanceRange, venueMeta, qualityScore, intentHeadline, homeDayCopy, reasonLine } from '../../constants/intents';
import type { LocStatus } from '../../constants/intents';
import { putCollection } from '../../services/collectionStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Layout constants ──────────────────────────────────────────────
const SIDE_PAD = 16;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - SIDE_PAD * 2 - CARD_GAP) / 2.15;
const CARD_IMAGE_HEIGHT = CARD_WIDTH;
const HERO_HEIGHT = Math.round((SCREEN_WIDTH - 32) * 1.05); // VBR_HOME_EDITORIAL_V1: the image carries the screen
const SECTION_GAP = 28;
const FLOW_CARD_WIDTH = SCREEN_WIDTH * 0.82;
const FOLLOW_SIZE = 64;

// Intent pills, copy and helpers live in constants/intents.ts (VIBERYTE_PLACES_V2)

// ─── Helpers ───────────────────────────────────────────────────────
const safeGetTags = (vibeTags: any): string[] => {
  if (!vibeTags) return [];
  if (Array.isArray(vibeTags)) return vibeTags;
  if (typeof vibeTags === 'string') {
    try {
      const parsed = JSON.parse(vibeTags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return vibeTags.split(',').map((t: string) => t.trim());
    }
  }
  return [];
};

const getDailySeed = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const seededShuffle = (arr: any[], seed: number) => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Tonight';
};

const getContextLine = () => {
  const h = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 5 || day === 6;
  if (h < 12) return isWeekend ? 'Brunch plans?' : 'Start the day right';
  if (h < 17) return isWeekend ? 'Where to next?' : 'Planning tonight?';
  if (h < 21) return 'The night is calling';
  return 'Still going strong';
};

// ─── VBR_HOME_V3: Tonight's pick ──────────────────────────────────
// Fits the hour (dinner → drinks/lounges → late), quality first, distance ignored. Same pick all day.
const CASUAL = /fast food|hot ?dog|hamburger|burger|deli|sandwich|pizza|coffee|cafe|bakery|bagel|donut|ice cream|dessert|juice|grocery|market/i;
const catText = (v: any) => `${v?.standardized_category || ''} ${v?.category || ''} ${v?.type || ''}`.toLowerCase();
const pickTonight = (list: any[], h: number): any | null => {
  const fit = (v: any) => {
    const c = catText(v);
    if (h >= 21 || h < 4) {
      if (/lounge|cocktail|speakeasy|wine|rooftop|bar|club|live/.test(c)) return 3;
      if (h < 4 && /pizza|diner|taco|burger/.test(c)) return 1.5;
      return /restaurant/.test(c) ? 0.5 : 0;
    }
    if (h >= 17) {
      if (/restaurant|steak|bistro|sushi|italian|dining/.test(c)) return 3;
      if (/lounge|cocktail|wine|bar/.test(c)) return 2;
      return 0;
    }
    return /brunch|restaurant|cafe|bakery|coffee/.test(c) ? 2 : 0.5;
  };
  const noCasual = h >= 17;
  const scored = (list || [])
    .filter((v: any) => getPhotoUrl(v) && Number(v?.google_rating || v?.rating || 0) >= 4.2 && !(noCasual && CASUAL.test(catText(v))))
    .map((v: any) => ({ v, sc: fit(v) * 2 + qualityScore(v) + (v?.reel || v?.reel_count || v?.has_reels ? 1 : 0) }))
    .sort((a: any, b: any) => b.sc - a.sc)
    .slice(0, 5);
  if (scored.length === 0) return null;
  return scored[getDailySeed() % scored.length].v;
};
const AUTO_NEAR = false; // Home opens on Tonight's pick, not "closest"

// ─── Animated press wrapper ────────────────────────────────────────
const AnimatedPressable = ({ children, style, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ─── VBR_HOME_V4: /api/home helpers ───────────────────────────────
const HOME_API = 'https://viberyte.com/api/home';
const homeToVenue = (x: any) => ({
  id: x.id, name: x.name, neighborhood: x.neighborhood, distance_mi: x.distance_mi,
  standardized_category: x.label, google_photos: x.image ? [x.image] : [], image_url: x.image,
  highlights: x.reason ? String(x.reason).split(' · ') : [],
});
const EV_LABEL: Record<string, string> = {
  hiphop: 'Hip-Hop', rnb: 'R&B', house: 'House', afrobeats: 'Afrobeats', amapiano: 'Amapiano', reggaeton: 'Reggaeton', latin: 'Latin',
  dancehall: 'Dancehall', techno: 'Techno', edm: 'EDM', disco: 'Disco', pop: 'Pop', jazz: 'Jazz', open_format: 'Open Format', live_music: 'Live',
  dj_set: 'DJ Set', party: 'Party', concert: 'Live', karaoke: 'Karaoke', drag: 'Drag', comedy: 'Comedy', screening: 'Screening',
  market: 'Market', cruise: 'Boat Party', crawl: 'Bar Crawl', trivia: 'Trivia', skate: 'Skate', festival: 'Festival', dance_class: 'Dance Class',
};
const fmtClock = (t?: string | null) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`;
};
const shortDay = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
type EvDay = 'tonight' | 'tomorrow' | 'weekend';
const EV_TABS: { key: EvDay; label: string }[] = [
  { key: 'tonight', label: 'Tonight' }, { key: 'tomorrow', label: 'Tomorrow' }, { key: 'weekend', label: 'This Weekend' },
];

// Hero reel: one player, muted, fades in only when ready; still image stays underneath.
function HomeReel({ uri, playing }: { uri: string; playing: boolean }) {
  const player = useVideoPlayer(uri, (pl) => { pl.loop = true; pl.muted = true; });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sub = player.addListener('statusChange', (e: any) => { if (e?.status === 'readyToPlay') setReady(true); });
    return () => { try { sub.remove(); } catch {} };
  }, [player]);
  useEffect(() => { try { playing ? player.play() : player.pause(); } catch {} }, [playing, player]);
  return <VideoView player={player} style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]} contentFit="cover" nativeControls={false} />;
}

// VBR_CARD_REELS: venue cards play their reel. Only the lead card of a row that's on screen plays (≤1 player per row).
const REEL_API = 'https://viberyte.com/api/reels';
const reelCache = new Map<number, { url: string; poster: string | null } | null>();
const reelSubs = new Set<() => void>();
async function loadReels(ids: number[]) {
  const need = [...new Set(ids)].filter((id) => id && !reelCache.has(id));
  if (!need.length) return;
  for (let i = 0; i < need.length; i += 150) {
    const chunk = need.slice(i, i + 150);
    chunk.forEach((id) => reelCache.set(id, null));
    try {
      const r = await fetch(`${REEL_API}?ids=${chunk.join(',')}`);
      const d = await r.json();
      for (const [k, v] of Object.entries(d?.reels || {})) reelCache.set(Number(k), v as any);
    } catch { chunk.forEach((id) => reelCache.delete(id)); }
  }
  reelSubs.forEach((fn) => fn());
}
function useReel(id: number) {
  const [, bump] = useState(0);
  useEffect(() => { const fn = () => bump((x) => x + 1); reelSubs.add(fn); return () => { reelSubs.delete(fn); }; }, []);
  return reelCache.get(Number(id)) || null;
}
const scrollBus = { subs: new Set<() => void>() };

// VBR_HERO_CAROUSEL: up to 3 picks, swipe between them; only the front card plays its reel.
const HERO_CARD_W = SCREEN_WIDTH - SIDE_PAD * 2;
function HeroCarousel({ picks, playing, onOpen }: { picks: any[]; playing: boolean; onOpen: (p: any) => void }) {
  const [active, setActive] = useState(0);
  return (
    <View style={{ marginBottom: SECTION_GAP }}>
      <FlatList
        data={picks}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={HERO_CARD_W + 10}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: 10 }}
        keyExtractor={(p) => `hp-${p.id}`}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / (HERO_CARD_W + 10));
          if (i !== active) { setActive(i); Haptics.selectionAsync(); }
        }}
        renderItem={({ item, index }) => (
          <AnimatedPressable style={{ width: HERO_CARD_W }} onPress={() => onOpen(item)}>
            <View style={s.heroImageWrap}>
              <Image source={{ uri: item.still || item.image }} style={s.heroImage} contentFit="cover" cachePolicy="memory-disk" transition={300} />
              {index === active && item.video ? <HomeReel key={item.video} uri={item.video} playing={playing} /> : null}
            </View>
            <View style={s.heroInfo}>
              <Text style={s.heroLabel}>{index === 0 ? "TONIGHT'S PICK" : 'ALSO TONIGHT'}</Text>
              <Text style={s.heroName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.heroMeta} numberOfLines={1}>
                {[item.neighborhood, item.label, typeof item.distance_mi === 'number' ? fmtDistance(item.distance_mi) : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </AnimatedPressable>
        )}
      />
      {picks.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {picks.map((p, i) => (
            <View key={p.id} style={{ width: i === active ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === active ? '#F5F1EA' : 'rgba(245,241,234,0.3)' }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────
const SkeletonHome = () => (
  <View style={{ flex: 1, paddingHorizontal: SIDE_PAD, paddingTop: 20 }}>
    <View style={{ width: 180, height: 22, backgroundColor: '#1a1a1f', borderRadius: 8, marginBottom: 6 }} />
    <View style={{ width: 120, height: 14, backgroundColor: '#1a1a1f', borderRadius: 6, marginBottom: 20 }} />
    <View style={{ width: '100%', height: 44, backgroundColor: '#1a1a1f', borderRadius: 12, marginBottom: 16 }} />
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: 72, height: 36, backgroundColor: '#1a1a1f', borderRadius: 20 }} />
      ))}
    </View>
    <View style={{ width: '100%', height: HERO_HEIGHT, backgroundColor: '#1a1a1f', borderRadius: 14, marginBottom: 28 }} />
    <View style={{ width: 130, height: 20, backgroundColor: '#1a1a1f', borderRadius: 6, marginBottom: 14 }} />
    <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
      <View style={{ width: CARD_WIDTH, height: CARD_IMAGE_HEIGHT + 44, backgroundColor: '#1a1a1f', borderRadius: 12 }} />
      <View style={{ width: CARD_WIDTH, height: CARD_IMAGE_HEIGHT + 44, backgroundColor: '#1a1a1f', borderRadius: 12 }} />
    </View>
  </View>
);

// ─── Compact Venue Card ────────────────────────────────────────────
const CompactVenueCard = React.memo(({ venue, onPress, play }: { venue: any; onPress: () => void; play?: boolean }) => {
  const reel = useReel(venue?.id);
  const photoUrl = getPhotoUrl(venue) || reel?.poster || null;
  const category = (venue.standardized_category || venue.category || '').replace(/^\w/, (c: string) => c.toUpperCase());

  return (
    <AnimatedPressable style={s.compactCard} onPress={onPress}>
      <View style={s.compactImageWrap}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={s.compactImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[s.compactImage, { backgroundColor: '#1a1a1f' }]} />
        )}
        {play && reel?.url ? <HomeReel key={reel.url} uri={reel.url} playing={!!play} /> : null}
      </View>
      <Text style={s.compactName} numberOfLines={1}>{venue.name}</Text>
      <Text style={s.compactMeta} numberOfLines={1}>
        {reasonLine(venue) || [venue.neighborhood, category].filter(Boolean).join(' · ') || venue.city}
      </Text>
      {reasonLine(venue) || typeof venue.distance_mi === 'number' ? (
        <Text style={s.compactDistance} numberOfLines={1}>
          {[reasonLine(venue) ? venue.neighborhood : null, typeof venue.distance_mi === 'number' ? fmtDistance(venue.distance_mi) : null].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
});

// ─── Compact Event Card ────────────────────────────────────────────
const CompactEventCard = React.memo(({ event, onPress }: { event: any; onPress: () => void }) => {
  const imageUrl = event.image_url || event.cover_image_url;
  const genre = event.genre || event.music_genre || '';

  return (
    <AnimatedPressable style={s.compactCard} onPress={onPress}>
      <View style={[s.compactImageWrap, s.flyerWrap]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={s.compactImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[s.compactImage, { backgroundColor: '#1a1a1f' }]} />
        )}
      </View>
      <Text style={s.compactName} numberOfLines={1}>{event.title || event.name}</Text>
      <Text style={s.compactMeta} numberOfLines={1}>
        {event.venue_name || genre}
      </Text>
    </AnimatedPressable>
  );
});

// ─── Section Header ────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) => (
  <View style={s.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={s.seeAll}>See all</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Horizontal Collection Row ─────────────────────────────────────
const CollectionRow = React.memo(({ data, renderItem, keyPrefix = 'v' }: { data: any[]; renderItem: (item: any, active?: boolean) => React.ReactNode; keyPrefix?: string }) => {
  const ref = useRef<View>(null);
  const focused = useIsFocused();
  const [onScreen, setOnScreen] = useState(false);
  const [lead, setLead] = useState<number | null>(data?.[0]?.id ?? null);
  useEffect(() => { loadReels((data || []).map((d: any) => Number(d?.id)).filter(Boolean)); }, [data]);
  useEffect(() => {
    const check = () => ref.current?.measureInWindow((_x, y, _w, h) => {
      const H = Dimensions.get('window').height;
      const vis = h > 0 && y < H - h * 0.4 && y + h * 0.6 > 0;
      setOnScreen((p) => (p === vis ? p : vis));
    });
    scrollBus.subs.add(check);
    const t = setTimeout(check, 700);
    return () => { scrollBus.subs.delete(check); clearTimeout(t); };
  }, []);
  const onViewable = useRef(({ viewableItems }: any) => { const f = viewableItems.find((v: any) => v.isViewable); if (f) setLead(f.item?.id ?? null); }).current;
  const viewCfg = useRef({ itemVisiblePercentThreshold: 70 }).current;
  return (
    <View ref={ref} collapsable={false}>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: CARD_GAP }}
        decelerationRate="fast"
        keyExtractor={(item) => `${keyPrefix}-${item.id}`}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={viewCfg}
        extraData={`${lead}-${onScreen}-${focused}`}
        renderItem={({ item }) => <>{renderItem(item, focused && onScreen && item.id === lead)}</>}
      />
    </View>
  );
});

// ─── Quick Intent Pill ─────────────────────────────────────────────
const IntentPill = React.memo(({ intentKey, active, onPress }: { intentKey: string; active: boolean; onPress: () => void }) => {
  const intent = INTENT_MAP[intentKey];
  if (!intent) return null;
  return (
    <TouchableOpacity
      style={[s.intentPill, active && s.intentPillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.intentPillText, active && s.intentPillTextActive]}>
        {intent.label}
      </Text>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════
// VBR_AUTO_NEAR_ME: Home opens on the curated picks; Near Me is one tap away (it always showed the single closest venue).
const VBR_AUTO_NEAR_ME = false;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { persona, isLoading: personaLoading } = usePersona();

  // ── Core state ──────────────────────────────────────────────────
  const [userName, setUserName] = useState('');
  const [userCity, setUserCity] = useState('Manhattan');
  const [heroVenue, setHeroVenue] = useState<any>(null);
  const [pickedForYou, setPickedForYou] = useState<any[]>([]);
  const [yourKindVenues, setYourKindVenues] = useState<any[]>([]);
  const [intentResults, setIntentResults] = useState<any[]>([]);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [happeningNow, setHappeningNow] = useState<any[]>([]);
  const [flowsData, setFlowsData] = useState<any[]>([]);
  const [dateNightPicks, setDateNightPicks] = useState<any[]>([]);
  const [lateNightSpots, setLateNightSpots] = useState<any[]>([]);
  const [nearYouVenues, setNearYouVenues] = useState<any[]>([]);
  const [nearPool, setNearPool] = useState<any[]>([]); // VBR_HOME_V3
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [home, setHome] = useState<any>(null); // VBR_HOME_V4
  const [evDay, setEvDay] = useState<EvDay>('tonight');
  const [reduceMotion, setReduceMotion] = useState(false);
  const isFocused = useIsFocused();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>('pending');
  const [cityChoice, setCityChoice] = useState<string | null | undefined>(undefined); // undefined = storage not read yet
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState(false);
  const intentReqRef = useRef(0);       // bump to invalidate any in-flight pill request
  const autoNearRef = useRef(false);    // Near Me auto-selected already
  const userTouchedRef = useRef(false); // user tapped a pill this session
  const [allVenues, setAllVenues] = useState<any[]>([]); // cache for intent filtering
  const [hasTaste, setHasTaste] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadingCity, setReloadingCity] = useState('');
  const [refreshSeed, setRefreshSeed] = useState(0);
  const reloadOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { follows, refresh: refreshFollows } = useUserFollows();

  // Location vs city mode. Never silently swap a city in for Near Me.
  const wantsLocation = cityChoice === null || cityChoice === 'Near Me';
  const locationMode = wantsLocation && locStatus === 'granted' && coords != null;
  const locationBlocked = wantsLocation && (locStatus === 'denied' || locStatus === 'unavailable');
  // VIBERYTE_LOC_MODE_V1: venue pages show distance only in Near Me mode
  useEffect(() => {
    if (cityChoice === undefined) return;
    AsyncStorage.setItem('@viberyte_loc_mode', wantsLocation ? 'near' : 'city').catch(() => {});
  }, [cityChoice, wantsLocation]);
  const cityLabel = userCity === 'Near Me' || userCity === '' ? 'Manhattan' : userCity;

  // ── Lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    loadProfile();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if ((status === 'granted') === false) { setLocStatus('denied'); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocStatus('granted');
        Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
          .then((g) => { const pl = g?.[0]; setPlaceName(pl?.city || pl?.district || pl?.subregion || null); })
          .catch(() => {});
        fetch(`https://viberyte.com/api/venues?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&limit=80&sort=distance&radius=12&include=highlights`)
          .then(r => r.json()).then(r => { if (r?.venues?.length) setNearPool(r.venues); }).catch(() => {});
        const res = await fetch(
          `https://viberyte.com/api/venues?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&limit=10&sort=distance&include=highlights`
        ).then(r => r.json()).catch(() => null);
        if (res?.venues?.length) {
          setNearYouVenues(res.venues.filter((v: any) => getPhotoUrl(v)).slice(0, 8));
        }
      } catch {
        setLocStatus((prev) => (prev === 'granted' ? prev : 'unavailable'));
      }
    })();
  }, []);

  useEffect(() => {
    if (!personaLoading) loadContent();
  }, [personaLoading]);

  const loadProfile = async () => {
    try {
      const profile = await AsyncStorage.getItem('@lumina_profile');
      const savedCity = await AsyncStorage.getItem('@lumina_selected_city');
      setCityChoice(savedCity);
      if (profile) { const d = JSON.parse(profile); setUserName(d.name || ''); }
      if (savedCity && savedCity !== 'Near Me') setUserCity(savedCity);
    } catch {}
  };

  // ── Build "Your Kind of Places" from taste + favorites + persona ─
  const buildYourKindSection = async (sortedVenues: any[], heroId: any) => {
    try {
      const [topCats, recentIds, hasData, favs] = await Promise.all([
        tasteTracker.getTopCategories(3),
        tasteTracker.getRecentlyViewed(),
        tasteTracker.hasTasteData(),
        favoritesService.getFavorites(),
      ]);
      setHasTaste(hasData);

      if (!hasData && favs.length < 2) {
        // New user fallback: show persona-sorted top picks (not duplicating Tonight's Picks)
        setYourKindVenues([]);
        return;
      }

      // Score each venue based on: fav match, top-category match, recent view, persona sort position
      const favIds = new Set(favs.map(f => String(f.id)));
      const recentSet = new Set(recentIds);
      const topCatSet = new Set(topCats);

      const scored = sortedVenues
        .filter((v: any) => v.id !== heroId && getPhotoUrl(v))
        .map((v: any, idx: number) => {
          let score = 0;
          const cat = (v.standardized_category || v.category || '').toLowerCase();
          if (topCatSet.has(cat)) score += 5;
          if (favIds.has(String(v.id))) score += 4;
          if (recentSet.has(String(v.id))) score += 2;
          // Persona position bonus (higher ranked = higher score)
          score += Math.max(0, 20 - idx) * 0.1;
          return { ...v, _kindScore: score };
        })
        .filter((v: any) => v._kindScore > 0)
        .sort((a: any, b: any) => b._kindScore - a._kindScore)
        .slice(0, 8);

      setYourKindVenues(scored);
    } catch {
      setYourKindVenues([]);
    }
  };

  // ── Data loading (preserves all backend logic) ──────────────────
  const loadContent = async (cityOverride?: string, seedOverride?: number) => {
    // Always read saved city from storage to avoid race with useState
    const savedCity = await AsyncStorage.getItem('@lumina_selected_city').catch(() => null);
    const rawCity = cityOverride || (savedCity && savedCity !== 'Near Me' ? savedCity : null) || userCity;
    const activeCity = (!rawCity || rawCity === 'Near Me') ? 'Manhattan' : rawCity;
    // Sync state if storage had a different city
    if (savedCity && savedCity !== 'Near Me' && savedCity !== userCity) setUserCity(savedCity);
    try {
      setLoading(true);
      const [venues, events, flowsRes, featuredRes] = await Promise.all([
        luminaApi.getVenues(activeCity || 'Manhattan'),
        luminaApi.getEvents(activeCity || 'New York'),
        Promise.resolve({ ok: false, flows: [] }), // Flows hidden for now (VIBERYTE_PLACES_V2)
        fetch('https://viberyte.com/api/events?city=' + encodeURIComponent(activeCity || 'New York') + '&limit=15').then(r => r.json()).catch(() => ({ events: [] })),
      ]);

      const seed = (seedOverride != null && seedOverride > 0) ? seedOverride : (refreshSeed > 0 ? refreshSeed : getDailySeed());
      const shuffledVenues = seededShuffle(venues, seed);
      const shuffledEvents = seededShuffle(events, seed + 1);
      const sortedVenues = personaService.sortVenuesByPersona(shuffledVenues, persona);

      // Cache all venues for intent filtering
      setAllVenues(sortedVenues);

      // Hero — single standout venue
      const hero = pickTonight(sortedVenues, new Date().getHours()) || sortedVenues.find((v: any) => (v.google_rating || v.rating) >= 4.3 && getPhotoUrl(v));
      setHeroVenue(hero || null);

      // Tonight's picks (skip hero)
      const heroId = hero?.id;
      const picked = sortedVenues
        .filter((v: any) => v.id !== heroId && getPhotoUrl(v))
        .slice(0, 10);
      setPickedForYou(picked);

      // Build "Your Kind of Places"
      await buildYourKindSection(sortedVenues, heroId);

      // Date night
      const dateSpots = sortedVenues
        .filter((v: any) => {
          const tags = safeGetTags(v.vibe_tags);
          const ctx = v.contextual_tags || {};
          return (
            tags.some((t: string) => /romantic|intimate|cozy/i.test(t)) ||
            ctx.date_spot || ctx.conversation_friendly
          ) && getPhotoUrl(v) && v.id !== heroId;
        }).slice(0, 8);
      setDateNightPicks(dateSpots);

      // Late night
      const lateNight = sortedVenues
        .filter((v: any) => {
          const tags = safeGetTags(v.vibe_tags);
          const cat = (v.category || '').toLowerCase();
          return (
            tags.some((t: string) => /late|club|dance/i.test(t)) ||
            /nightclub|lounge|bar/.test(cat)
          ) && getPhotoUrl(v) && v.id !== heroId;
        }).slice(0, 8);
      setLateNightSpots(lateNight);

      // Events
      const musicPrefs = (persona as any)?.music_preferences || [];
      const musicSorted = sortEventsByMusicPreference(shuffledEvents, musicPrefs);
      setHappeningNow(musicSorted.filter((e: any) => e.image_url || e.cover_image_url).slice(0, 8));
      setFeaturedEvents((featuredRes?.events || []).slice(0, 10));
      if (flowsRes?.ok && flowsRes?.flows) setFlowsData(flowsRes.flows);

      // Prefetch key images
      const imgs = [
        hero && getPhotoUrl(hero),
        ...picked.slice(0, 4).map((v: any) => getPhotoUrl(v)),
      ].filter(Boolean);
      if (imgs.length) Image.prefetch(imgs);

    } catch (err) {
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Intent pill tap → filter venues from cached data ────────────
  // Runs a pill's verified queries. Every run bumps the request id; stale results are dropped.
  const runIntent = useCallback(async (key: string) => {
    const intent = INTENT_MAP[key];
    if (intent == null) return;
    intentReqRef.current += 1;
    const reqId = intentReqRef.current;
    const isCurrent = () => reqId === intentReqRef.current;
    setIntentResults([]);
    setIntentError(false);
    setIntentLoading(true);
    try {
      const c = locationMode ? coords : null;
      const base: Record<string, string | number> = c
        ? { lat: c.lat, lng: c.lng, sort: 'distance', radius: 15 }
        : { city: cityLabel };
      const limit = key === 'surprise' ? 60 : 30;
      const results = await Promise.all(
        intent.queries.map((q) => luminaApi.queryVenues({ ...base, ...q, limit, include: 'highlights', highlight_for: key }))
      );
      if (isCurrent() === false) return;
      if (results.some((r) => r.ok) === false) {
        setIntentError(true);
        return;
      }
      const seen = new Set<string>();
      let merged: any[] = [];
      results.forEach((r) => r.venues.forEach((v: any) => {
        const id = String(v.id);
        if (seen.has(id) || getPhotoUrl(v) == null) return;
        seen.add(id);
        merged.push(v);
      }));
      if (key === 'surprise') {
        let recent = new Set<string>();
        try {
          const ids = await tasteTracker.getRecentlyViewed();
          if (Array.isArray(ids)) recent = new Set(ids.map(String));
        } catch {}
        if (isCurrent() === false) return;
        merged = seededShuffle(merged.filter((v: any) => recent.has(String(v.id)) === false), Date.now());
      } else if (c) {
        merged.sort((a: any, b: any) => (a.distance_mi ?? 99) - (b.distance_mi ?? 99));
      } else {
        merged.sort((a: any, b: any) => qualityScore(b) - qualityScore(a));
      }
      setIntentResults(merged.slice(0, 8));
    } catch {
      if (isCurrent()) setIntentError(true);
    } finally {
      if (isCurrent()) setIntentLoading(false);
    }
  }, [locationMode, coords, cityLabel]);

  // Pill tap. Any manual tap (select or deselect) disables the Near Me auto-default for the session.
  const handleIntentPress = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // VBR_HOME_SHORTCUTS: these pills jump straight into Explore with that mood (Events → Explore Events)
    const EXPLORE_MOOD: Record<string, string> = { dinner: 'dinner', drinks: 'drinks', nightlife: 'late_night', dateNight: 'date_night', events: 'events' };
    if (EXPLORE_MOOD[key]) { router.push(`/explore?mood=${EXPLORE_MOOD[key]}&t=${Date.now()}` as any); return; }
    userTouchedRef.current = true;
    if (activeIntent === key) {
      intentReqRef.current += 1;
      setActiveIntent(null);
      setIntentResults([]);
      setIntentLoading(false);
      setIntentError(false);
      return;
    }
    setActiveIntent(key);
    runIntent(key);
  }, [activeIntent, runIntent]);

  // Near Me becomes the default only in location mode, once, and never over a manual choice.
  useEffect(() => {
    if (VBR_AUTO_NEAR_ME && AUTO_NEAR && locationMode && activeIntent === null && userTouchedRef.current === false && autoNearRef.current === false) {
      autoNearRef.current = true;
      setActiveIntent('nearMe');
      runIntent('nearMe');
    }
  }, [locationMode, activeIntent, runIntent]);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {}); }, []);
  const homeKey = locationMode && coords ? `lat=${coords.lat.toFixed(3)}&lng=${coords.lng.toFixed(3)}` : `region=${encodeURIComponent(cityLabel)}`;
  useEffect(() => {
    if (cityChoice === undefined) return;
    if (wantsLocation && locStatus === 'pending') return;
    let alive = true;
    let tz = 'America/New_York';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch {}
    fetch(`${HOME_API}?${homeKey}&hour=${new Date().getHours()}&tz=${encodeURIComponent(tz)}&seed=${refreshSeed || 0}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setHome(d?.ok ? { ...d, __key: homeKey } : null); })
      .catch(() => { if (alive) setHome(null); });
    return () => { alive = false; };
  }, [cityChoice, wantsLocation, locStatus, homeKey, refreshSeed]);

  // Invalidate in-flight pill requests on unmount
  useEffect(() => () => { intentReqRef.current += 1; }, []);

  // ── City change ─────────────────────────────────────────────────
  const handleCityChange = async (newCity: string) => {
    Haptics.selectionAsync().catch(() => {}); // VBR_HOME_EDITORIAL_V1
    setShowCitySelector(false);
    if (newCity === userCity) return;
    setIsReloading(true);
    setReloadingCity(newCity);
    reloadOpacity.setValue(1);
    setHeroVenue(null);
    setPickedForYou([]);
    setYourKindVenues([]);
    setIntentResults([]);
    setActiveIntent(null);
    setDateNightPicks([]);
    setLateNightSpots([]);
    setFeaturedEvents([]);
    setHappeningNow([]);
    setLoading(true);
    await new Promise<void>(r => setTimeout(r, 50));
    setUserCity(newCity);
    setCityChoice(newCity);
    intentReqRef.current += 1;
    setIntentLoading(false);
    setIntentError(false);
    if (newCity === 'Near Me') { userTouchedRef.current = false; autoNearRef.current = false; }
    if (newCity !== 'Near Me') await AsyncStorage.setItem('@lumina_selected_city', newCity);
    await loadContent(newCity);
    await new Promise<void>(r => setTimeout(r, 800));
    await new Promise<void>(r => {
      Animated.timing(reloadOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => r());
    });
    setIsReloading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSeed = Math.floor(Math.random() * 999999);
    setRefreshSeed(newSeed);
    intentReqRef.current += 1;
    setIntentLoading(false);
    setIntentError(false);
    setActiveIntent(null);
    setIntentResults([]);
    await loadContent(undefined, newSeed);
    setRefreshing(false);
  };

  const handleVenuePress = useCallback((venue: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Record taste signal
    const cat = venue.standardized_category || venue.category || '';
    tasteTracker.recordDetailView(venue.id, cat);
    router.push(`/venue/${venue.id}`);
  }, [router]);

  const handleEventPress = useCallback((event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  }, [router]);

  // ── Dynamic section ordering ────────────────────────────────────
  const hour = new Date().getHours();
  const isLateNight = hour >= 22 || hour < 4;
  const isEvening = hour >= 18 && hour < 22;
  const isDaytime = hour >= 6 && hour < 18;

  const orderedSections = useMemo(() => {
    type Section =
      | 'intentResults'
      | 'yourKind'
      | 'following'
      | 'tonightPicks'
      | 'nearYou'
      | 'flows'
      | 'events'
      | 'contextual';

    const sections: Section[] = [];

    // Intent results always first when active
    if (activeIntent && intentResults.length > 0) sections.push('intentResults');

    // Around You: proximity-ranked, directly under the hero (skipped when the Near Me pill already shows it)
    if (nearYouVenues.length > 0 && (activeIntent === 'nearMe') === false) sections.push('nearYou');

    // "Your Kind of Places" — when user has taste data
    if (yourKindVenues.length > 0) sections.push('yourKind');

    // Following — if user follows anyone
    if (follows.venues.length > 0) sections.push('following'); // VIBERYTE_CONSUMER_ONLY_V1

    // Time-based ordering of main content
    if (isLateNight) {
      // Late night: contextual first (Still Going), then events, then picks
      sections.push('contextual', 'events', 'tonightPicks');
    } else if (isEvening) {
      // Evening: picks first, then events, then date night (contextual)
      sections.push('tonightPicks', 'events', 'contextual');
    } else {
      // Daytime: picks, nearby, events
      sections.push('tonightPicks', 'events');
    }

    // Flows — always present if available
    if (flowsData.length > 0) sections.push('flows');

    return sections;
  }, [activeIntent, intentResults, yourKindVenues, follows, nearYouVenues, flowsData, isLateNight, isEvening, hour]);

  const localPick = useMemo(() => (locationMode && nearPool.length > 0 ? pickTonight(nearPool, hour) : null), [locationMode, nearPool, hour]);
  const localRail = useMemo(() => (locationMode && nearPool.length > 0
    ? nearPool.filter((v: any) => v.id !== localPick?.id && getPhotoUrl(v)).sort((a: any, b: any) => qualityScore(b) - qualityScore(a)).slice(0, 10)
    : null), [locationMode, nearPool, localPick]);
  const localLate = useMemo(() => (locationMode && nearPool.length > 0
    ? nearPool.filter((v: any) => v.id !== localPick?.id && getPhotoUrl(v) && /lounge|cocktail|bar|club|live/.test(catText(v))).slice(0, 8)
    : null), [locationMode, nearPool, localPick]);

  // ── Loading state ───────────────────────────────────────────────
  if (personaLoading || (loading && !heroVenue && pickedForYou.length === 0)) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <SkeletonHome />
      </View>
    );
  }

  // ── See All → Places (exact collection or exact verified query) ──
  const openCollection = (key: string, title: string, venues: any[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    putCollection(key, venues);
    router.push({ pathname: '/places', params: { source: 'collection', key, title, city: cityLabel } } as any);
  };
  const openNear = () => {
    if (coords) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/places', params: { source: 'query', title: 'Around you', intent: '', lat: String(coords.lat), lng: String(coords.lng) } } as any);
    } else {
      openCollection('aroundYou', 'Around you', nearYouVenues);
    }
  };
  const openIntent = (key: string | null) => {
    if (key == null) return;
    const title = key === 'nearMe' ? 'Around you' : INTENT_MAP[key]?.label || 'Results';
    if (key === 'surprise') {
      openCollection('surprise', title, intentResults);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const c = locationMode ? coords : null;
    router.push({
      pathname: '/places',
      params: c
        ? { source: 'query', title, intent: key, lat: String(c.lat), lng: String(c.lng) }
        : { source: 'query', title, intent: key, city: cityLabel },
    } as any);
  };
  const dayCopy = homeDayCopy(new Date());

  // Hero follows the selected pill; otherwise the editorial pick
  const homeLive = home && home.__key === homeKey ? home : null; // never show another market's results
  const homePick = homeLive?.pick ? { ...homeLive.pick, __home: true } : null;
  const heroPicks: any[] = !activeIntent && Array.isArray(homeLive?.picks) ? homeLive.picks.slice(0, 3) : [];
  const heroCarousel = heroPicks.length > 1;
  const displayHero = activeIntent ? (intentResults[0] || null) : (homeLive ? homePick : (localPick || heroVenue));
  const noCoverage = !!homeLive && !homeLive.pick && !(homeLive.aroundYou || []).length && !(homeLive.worthGoing || []).length;
  const homeWorth = homeLive?.worthGoing?.length ? homeLive.worthGoing.map(homeToVenue) : null;
  const homeAround = homeLive?.aroundYou?.length ? homeLive.aroundYou.map(homeToVenue) : null;
  const aroundData = homeLive ? (homeAround || []) : nearYouVenues;
  const picksData = homeLive ? (homeWorth || []) : (localRail || pickedForYou);
  const lateData = localLate || lateNightSpots;
  const placeLabel = locationMode ? (placeName || 'Near you') : cityLabel;

  // ── Render sections by dynamic order ────────────────────────────
  const renderSection = (key: string, index: number) => {
    switch (key) {
      case 'intentResults': {
        const rail = intentResults.slice(1, 8);
        if (rail.length === 0) return null;
        const label = activeIntent ? INTENT_MAP[activeIntent]?.label || 'Results' : 'Results';
        return (
          <View key="intent-results" style={s.section}>
            <SectionHeader
              title={intentHeadline(activeIntent, intentResults)}
              subtitle={distanceRange(rail) || `In ${cityLabel}`}
              onSeeAll={() => openIntent(activeIntent)}
            />
            <CollectionRow
              data={rail}
              keyPrefix="ir"
              renderItem={(venue, active) => (
                <CompactVenueCard venue={venue} play={active} onPress={() => handleVenuePress(venue)} />
              )}
            />
          </View>
        );
      }

      case 'yourKind':
        return (
          <View key="your-kind" style={s.section}>
            <SectionHeader
              title="For you" // VBR_COPY_V1
              subtitle="Based on what you've saved and opened"
              onSeeAll={() => openCollection('yourKind', 'You might love these', yourKindVenues)}
            />
            <CollectionRow
              data={yourKindVenues}
              keyPrefix="yk"
              renderItem={(venue, active) => (
                <CompactVenueCard venue={venue} play={active} onPress={() => handleVenuePress(venue)} />
              )}
            />
          </View>
        );

      case 'following':
        return (
          <View key="following" style={s.section}>
            <SectionHeader title="Following" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: 16 }}
            >
              {follows.venues.map((v: any) => {
                const photo = v.professional_photo_url || (v.google_photos?.[0]) || v.image_url;
                return (
                  <TouchableOpacity
                    key={`fv-${v.id}`}
                    style={s.followItem}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/venue/${v.id}`); }}
                    activeOpacity={0.8}
                  >
                    <View style={s.followAvatarWrap}>
                      <Image source={{ uri: photo }} style={s.followAvatar} contentFit="cover" cachePolicy="memory-disk" />
                    </View>
                    <Text style={s.followName} numberOfLines={1}>{v.name}</Text>
                  </TouchableOpacity>
                );
              })}
              {follows.promoters.filter(() => false).map((p: any) => {
                const photo = p.profile_picture || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200';
                return (
                  <TouchableOpacity
                    key={`fp-${p.id}`}
                    style={s.followItem}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/promoter/${p.instagram_handle}`); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.followAvatarWrap, { borderColor: colors.lux.champagne }]}>
                      <Image source={{ uri: photo }} style={s.followAvatar} contentFit="cover" cachePolicy="memory-disk" />
                    </View>
                    <Text style={s.followName} numberOfLines={1}>{p.business_name || p.instagram_handle}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      case 'tonightPicks':
        if (picksData.length === 0) return null;
        return (
          <View key="tonight-picks" style={s.section}>
            <SectionHeader
              title="Worth going out for"
              subtitle="Places worth getting dressed for"
              onSeeAll={() => openCollection('tonight', 'Worth going out for', picksData)}
            />
            <CollectionRow
              data={picksData}
              keyPrefix="tp"
              renderItem={(venue, active) => (
                <CompactVenueCard venue={venue} play={active} onPress={() => handleVenuePress(venue)} />
              )}
            />
          </View>
        );

      case 'nearYou':
        if (nearYouVenues.length === 0 || locationMode === false) return null; // Around you only in Near Me mode (VIBERYTE_TRUST_V1)
        return (
          <View key="near-you" style={s.section}>
            <SectionHeader title="Around you" subtitle={distanceRange(aroundData)} onSeeAll={openNear} />
            <CollectionRow
              data={aroundData}
              keyPrefix="ny"
              renderItem={(venue, active) => (
                <CompactVenueCard venue={venue} play={active} onPress={() => handleVenuePress(venue)} />
              )}
            />
          </View>
        );

      case 'flows':
        if (flowsData.length === 0) return null;
        return (
          <View key="flows" style={s.section}>
            <SectionHeader
              title="Plan the whole night"
              subtitle="Dinner, drinks, then somewhere to dance"
              onSeeAll={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/all-flows' as any); }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SIDE_PAD, paddingRight: 40 }}
              decelerationRate="fast"
              snapToInterval={FLOW_CARD_WIDTH + 14}
              snapToAlignment="start"
            >
              {flowsData.slice(0, 5).map((flow: any) => (
                <FlowCard key={flow.slug} flow={flow} />
              ))}
            </ScrollView>
          </View>
        );

      case 'events': {
        const he = homeLive?.events;
        if (he) {
          const tabs = EV_TABS;
          const day: EvDay = evDay;
          const weekEmpty = EV_TABS.every((t) => (he[t.key] || []).length === 0);
          const list = (he[day] || []).map((e: any) => ({
            id: e.id, title: e.name, image_url: e.image,
            genre: e.recurrence || EV_LABEL[e.genre] || EV_LABEL[e.type] || '',
            venue_name: [day === 'tonight' ? fmtClock(e.time) : shortDay(e.date), e.venue].filter(Boolean).join(' · '),
          }));
          return (
            <View key="events" style={s.section}>
              <SectionHeader title="Happening soon" subtitle="Parties, live music and pop-ups" onSeeAll={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push(`/explore?filter=events&when=${day}` as any); }} />
              <View style={s.dayRow}>
                {tabs.map((t) => (
                  <TouchableOpacity key={t.key} style={[s.dayChip, day === t.key && s.dayChipOn]} activeOpacity={0.8}
                    onPress={() => { Haptics.selectionAsync(); setEvDay(t.key); }}>
                    <Text style={[s.dayChipText, day === t.key && s.dayChipTextOn]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {list.length === 0 ? (
                <Text style={[s.sectionSubtitle, { paddingHorizontal: SIDE_PAD }]}>
                  {weekEmpty ? 'No events listed nearby this week yet.' : `Nothing listed for ${day === 'tonight' ? 'tonight' : day === 'tomorrow' ? 'tomorrow' : 'this weekend'} yet.`}
                </Text>
              ) : null}
              <CollectionRow
                data={list}
                keyPrefix={`ev-${day}`}
                renderItem={(event) => <CompactEventCard event={event} onPress={() => handleEventPress(event)} />}
              />
            </View>
          );
        }
        if (happeningNow.length === 0 && featuredEvents.length === 0) return null;
        const eventsToShow = happeningNow.length > 0 ? happeningNow : featuredEvents.slice(0, 6);
        const eventsTitle = happeningNow.length > 0
          ? (isLateNight ? 'On right now' : 'On tonight')
          : 'Coming up';
        return (
          <View key="events" style={s.section}>
            <SectionHeader title={eventsTitle} onSeeAll={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push('/explore?filter=events'); }} />
            <CollectionRow
              data={eventsToShow}
              keyPrefix="ev"
              renderItem={(event) => (
                <CompactEventCard event={event} onPress={() => handleEventPress(event)} />
              )}
            />
          </View>
        );
      }

      case 'contextual':
        if (isLateNight && lateData.length > 0) {
          return (
            <View key="contextual" style={s.section}>
              <SectionHeader title="Still going" subtitle="Late kitchens and dance floors" onSeeAll={() => openCollection('stillGoing', 'Still going', lateData)} />
              <CollectionRow
                data={lateData}
                keyPrefix="ln"
                renderItem={(venue, active) => (
                  <CompactVenueCard venue={venue} play={active} onPress={() => handleVenuePress(venue)} />
                )}
              />
            </View>
          );
        }
        if (isEvening && dateNightPicks.length > 0) {
          return (
            <View key="contextual" style={s.section}>
              <SectionHeader title="Date night" subtitle="Low light and good wine" onSeeAll={() => openCollection('dateNightRow', 'Date night', dateNightPicks)} />
              <CollectionRow
                data={dateNightPicks}
                keyPrefix="dn"
                renderItem={(venue, active) => (
                  <CompactVenueCard venue={venue} play={active} onPress={() => handleVenuePress(venue)} />
                )}
              />
            </View>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={() => scrollBus.subs.forEach((fn) => fn())}
        scrollEventThrottle={120}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#71717A" />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ───── CONTEXTUAL HEADER ───── */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.dayEyebrow}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</Text>
              <Text style={s.greeting}>{hour >= 5 && hour < 11 ? 'This morning in' : hour >= 11 && hour < 17 ? 'This afternoon in' : 'Tonight in'}</Text>
              <TouchableOpacity style={s.placeRow} onPress={() => { Haptics.selectionAsync().catch(() => {}); setShowCitySelector(true); }} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={`Location: ${placeLabel}. Change`}>
                <Text style={[s.greeting, s.placeText]} numberOfLines={1}>{placeLabel}</Text>
                <Ionicons name="chevron-down" size={24} color="rgba(245,241,234,0.45)" style={{ marginTop: 6 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ───── SEARCH BAR ───── */}
          <TouchableOpacity
            style={s.searchBar}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/search');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color="rgba(245,241,234,0.55)" />
            <Text style={s.searchPlaceholder}>Search places and events</Text>
          </TouchableOpacity>

          {/* ───── QUICK INTENT PILLS ───── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.intentScroll}
            contentContainerStyle={s.intentRow}
            decelerationRate="fast"
          >
            {intentOrder(hour).filter((k) => (INTENT_MAP[k].requiresLocation ? locationMode : true)).map((key) => (
              <IntentPill
                key={key}
                intentKey={key}
                active={activeIntent === key}
                onPress={() => handleIntentPress(key)}
              />
            ))}
          </ScrollView>

          {locationBlocked ? (
            <TouchableOpacity style={s.locNotice} onPress={() => setShowCitySelector(true)} activeOpacity={0.7}>
              <Text style={s.locNoticeText}>Location is off · Showing {cityLabel}</Text>
              <Text style={s.locNoticeAction}>Choose a city</Text>
            </TouchableOpacity>
          ) : null}

          {/* ───── EDITORIAL HERO ───── */}
          {activeIntent && intentLoading ? (
            <View style={[s.heroWrap, { height: HERO_HEIGHT, borderRadius: 14, backgroundColor: '#141417' }]} />
          ) : null}
          {heroCarousel ? (
            <HeroCarousel picks={heroPicks} playing={isFocused && !showCitySelector && !reduceMotion} onOpen={(p) => handleVenuePress(p)} />
          ) : null}
          {!heroCarousel && displayHero && (activeIntent ? intentLoading === false : true) ? (
            <AnimatedPressable style={s.heroWrap} onPress={() => handleVenuePress(displayHero)}>
              <View style={s.heroImageWrap}>
                <Image
                  source={{ uri: displayHero.__home ? (displayHero.still || displayHero.image) : getPhotoUrl(displayHero) }}
                  style={s.heroImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={300}
                />
                {displayHero.__home && displayHero.video && !reduceMotion ? (
                  <HomeReel key={displayHero.video} uri={displayHero.video} playing={isFocused && !showCitySelector} />
                ) : null}
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroLabel}>
                  {activeIntent
                    ? (activeIntent === 'nearMe' ? 'CLOSEST TO YOU' : (INTENT_MAP[activeIntent]?.label || '').toUpperCase())
                    : (hour >= 17 || hour < 4 ? "TONIGHT'S PICK" : "TODAY'S PICK")}
                </Text>
                <Text style={s.heroName}>{displayHero.name}</Text>
                <Text style={s.heroMeta} numberOfLines={1}>
                  {displayHero.__home
                    ? [displayHero.neighborhood, displayHero.label, typeof displayHero.distance_mi === 'number' ? fmtDistance(displayHero.distance_mi) : null].filter(Boolean).join(' · ')
                    : venueMeta(displayHero)}
                </Text>
              </View>
            </AnimatedPressable>
          ) : null}
          {activeIntent && intentError && intentLoading === false ? (
            <TouchableOpacity style={{ paddingHorizontal: SIDE_PAD, marginBottom: 24 }} onPress={() => runIntent(activeIntent)} activeOpacity={0.7}>
              <Text style={s.sectionSubtitle}>Couldn't load {INTENT_MAP[activeIntent]?.label || 'results'}. Tap to retry.</Text>
            </TouchableOpacity>
          ) : null}
          {activeIntent && intentError === false && intentLoading === false && intentResults.length === 0 ? (
            <View style={{ paddingHorizontal: SIDE_PAD, marginBottom: 24 }}>
              <Text style={s.sectionSubtitle}>
                Nothing confirmed for {INTENT_MAP[activeIntent]?.label || 'this'} {locationMode ? 'near you' : `in ${cityLabel}`} yet.
              </Text>
            </View>
          ) : null}

          {noCoverage && !activeIntent ? (
            <View style={{ marginHorizontal: SIDE_PAD, marginBottom: 28, padding: 20, borderRadius: 16, backgroundColor: '#141417' }}>
              <Text style={{ color: '#F5F1EA', fontSize: 18, fontWeight: '700' }}>Viberyte isn't in this area yet</Text>
              <Text style={{ color: 'rgba(245,241,234,0.62)', fontSize: 14, marginTop: 6, lineHeight: 20 }}>We're curating NYC and North Jersey right now. Pick a city to explore.</Text>
              <TouchableOpacity onPress={() => setShowCitySelector(true)} activeOpacity={0.85}
                style={{ alignSelf: 'flex-start', marginTop: 14, height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#F3F0E9', justifyContent: 'center' }}>
                <Text style={{ color: '#0A0A0C', fontSize: 15, fontWeight: '700' }}>Choose a city</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {/* ───── DYNAMIC SECTIONS ───── */}
          {orderedSections.map((section, idx) => renderSection(section, idx))}

        </Animated.View>
      </ScrollView>

      {/* ───── CITY SELECTOR MODAL ───── */}
      <Modal visible={showCitySelector} animationType="fade" transparent onRequestClose={() => setShowCitySelector(false)}>
        <StretchCitySelector currentCity={userCity} onSelectCity={handleCityChange} />
      </Modal>

      {/* ───── CITY SWITCH OVERLAY ───── */}
      {isReloading && (
        <Animated.View style={[s.reloadOverlay, { opacity: reloadOpacity }]}>
          <Text style={s.reloadCity}>{reloadingCity}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Header ─────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SIDE_PAD,
    paddingTop: 14,
    paddingBottom: 22,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 38, lineHeight: 42, fontWeight: '700', color: '#F3F0E9', letterSpacing: -1.1 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  placeText: { flexShrink: 1 },
  contextLine: {
    fontSize: 15,
    color: 'rgba(245,241,234,0.62)',
    fontWeight: '400',
    marginTop: 2,
  },
  moodLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(245,241,234,0.6)', paddingHorizontal: SIDE_PAD, marginBottom: 10 },
  locationPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197, 163, 107, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(197, 163, 107, 0.28)',
  },
  locationText: {
    fontSize: 14,
    color: '#F5F1EA',
    fontWeight: '500',
  },

  // ── Search Bar ──────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIDE_PAD,
    marginBottom: 12,
    height: 46,
    backgroundColor: '#161618',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: 'rgba(245,241,234,0.55)',
    fontWeight: '400',
  },

  // ── Quick Intent Pills ──────────────────────────────────────────
  intentScroll: {
    flexGrow: 0,
    marginHorizontal: -SIDE_PAD,
    marginBottom: 30,
  },
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SIDE_PAD,
  },
  intentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 15,
    borderRadius: 17,
    backgroundColor: '#161618',
  },
  intentPillActive: {
    backgroundColor: '#F3F0E9',
  },
  intentPillText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(245,241,234,0.82)',
    letterSpacing: -0.1,
  },
  intentPillTextActive: {
    color: '#0A0A0B',
    fontWeight: '600',
  },

  // ── Editorial Hero ──────────────────────────────────────────────
  heroWrap: {
    marginHorizontal: SIDE_PAD,
    marginBottom: SECTION_GAP,
  },
  heroImageWrap: {
    width: '100%',
    height: HERO_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1f',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  heroLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(243,240,233,0.5)', letterSpacing: 1.1, marginBottom: 6 },
  heroInfo: {
    paddingTop: 14,
    paddingHorizontal: 2,
  },
  heroHeadline: { fontSize: 13, fontWeight: '600', color: '#C5A36B', letterSpacing: 0.2, marginBottom: 3 },
  dayRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SIDE_PAD, marginTop: -4, marginBottom: 14 },
  dayChip: { height: 32, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center', backgroundColor: '#141417' },
  dayChipOn: { backgroundColor: '#F5F1EA' },
  dayChipText: { fontSize: 14, fontWeight: '500', color: 'rgba(245,241,234,0.7)' },
  dayChipTextOn: { color: '#0A0A0C', fontWeight: '600' },
  heroName: { fontSize: 26, lineHeight: 30, fontWeight: '700', color: '#F3F0E9', letterSpacing: -0.6 },
  heroMeta: { fontSize: 15, color: 'rgba(243,240,233,0.6)', marginTop: 4, fontWeight: '400' },

  // ── Following ───────────────────────────────────────────────────
  followItem: {
    alignItems: 'center',
    width: FOLLOW_SIZE + 8,
  },
  followAvatarWrap: {
    width: FOLLOW_SIZE,
    height: FOLLOW_SIZE,
    borderRadius: FOLLOW_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    marginBottom: 6,
  },
  followAvatar: {
    width: '100%',
    height: '100%',
  },
  followName: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Sections ────────────────────────────────────────────────────
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: SIDE_PAD,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 23, lineHeight: 28, fontWeight: '700', color: '#F3F0E9', letterSpacing: -0.5 },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(243,240,233,0.5)',
    fontWeight: '400',
    marginTop: 2,
  },
  seeAll: { fontSize: 15, color: 'rgba(243,240,233,0.6)', fontWeight: '500' },

  // ── Compact Card (Apple Music style) ────────────────────────────
  dayEyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 1.4, color: 'rgba(245,241,234,0.5)', marginBottom: 6 },
  compactDistance: { fontSize: 12, color: 'rgba(245,241,234,0.5)', marginTop: 2, fontVariant: ['tabular-nums'] },
  locNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SIDE_PAD,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#141417',
  },
  locNoticeText: { fontSize: 13, color: 'rgba(245,241,234,0.65)' },
  locNoticeAction: { fontSize: 13, fontWeight: '600', color: '#F5F1EA' },
  compactCard: {
    width: CARD_WIDTH,
  },
  compactImageWrap: {
    width: CARD_WIDTH,
    height: CARD_IMAGE_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1f',
    marginBottom: 8,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactName: { fontSize: 15, fontWeight: '600', color: '#F3F0E9', letterSpacing: -0.2, marginBottom: 2 },
  compactMeta: { fontSize: 13, color: 'rgba(243,240,233,0.55)', fontWeight: '400' },
  flyerWrap: { height: Math.round(CARD_WIDTH * 1.25) },

  // ── Genre pill on event cards ───────────────────────────────────
  genrePill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genrePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },

  // ── City Reload Overlay ─────────────────────────────────────────
  reloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reloadBrand: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 8,
    marginBottom: 20,
  },
  reloadCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reloadLine: {
    width: 20,
    height: 1,
    backgroundColor: '#3F3F46',
  },
  reloadCity: { fontSize: 34, fontWeight: '700', color: '#F3F0E9', letterSpacing: -0.9 },
});

