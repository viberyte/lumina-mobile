// VIBERYTE_PLACES_V2: cinematic featured pick, compact rows, curated map.
// source=collection → the exact list from Home; source=query → the exact verified API query.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, ActivityIndicator, Linking, TextInput, Keyboard, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import luminaApi from '../services/luminaApi';
import { getPhotoUrl } from '../utils/photoHelper';
import { INTENT_MAP, fmtDistance, distanceRange, qualityScore, reasonLine } from '../constants/intents';
import { getCollection } from '../services/collectionStore';
import tasteTracker from '../services/tasteTracker';
import * as Location from 'expo-location';
import { API_BASE } from '../config';

const { width: W } = Dimensions.get('window');
const CARD_W = W - 48;
const GAP = 12;
const MAX_PINS = 20;
const IVORY = '#F5F1EA';
const MUTED = 'rgba(245,241,234,0.55)';
const FAINT = 'rgba(245,241,234,0.38)';
const BG = '#000000';
const SURFACE = '#141417';
// VIBERYTE_MAP_STAGE2 (v2: explicit modes, instant cancel, time notes)
const CHAMP = '#C5A36B';
const INK = '#09090B';
const DISTANCE_RE = /\b(near me|nearby|close by|closest|around me|around here)\b|\d\s*(mi|mile|miles)\b/i;
type MapRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
type SearchHit = {
  id: number; name: string; type: string; neighborhood: string | null; image_url: string | null;
  latitude: number; longitude: number; distance_mi: number | null; vibe: string | null; has_reel: boolean;
};
// Three explicit search modes, never mixed:
//   city: your Explore area (hood/region). Never sends your location.
//   near: "near me"/"within N mi" (or a list opened as Near you). Only your location; no area, no map center.
//   area: "Search this area". Only the visible map bounds; never your location.
type SearchMode = 'city' | 'near' | 'area';
type SearchRes = {
  ok: boolean; query: string; understood: string[]; origin: string | null; area: string | null; mood: string | null;
  needs_location: boolean; unsupported?: string; time_note?: string | null; total: number; results: SearchHit[]; mode: SearchMode;
  wider_total?: number; // VIBERYTE_MAP_STAGE3: matches across all areas when the Explore area has none
  place?: string | null; what?: string | null; elsewhere_total?: number; // VIBERYTE_MAP_STAGE4: named place with no matches
};
// Honest empty state: we only say what we know (nothing listed here yet), never that something is coming.
const growing = (where: string, what?: string | null) => `We’re still growing ${where}. No ${what || 'matches'} here yet.`;

type Coord = { latitude: number; longitude: number };
const coordOf = (v: any): Coord | null => {
  const lat = Number(v?.latitude);
  const lng = Number(v?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0.1 && Math.abs(lng) > 0.1) return { latitude: lat, longitude: lng };
  return null;
};
const catOf = (v: any) => String(v?.standardized_category || v?.category || '').replace(/^\w/, (c: string) => c.toUpperCase());
const metaOf = (v: any) => [v?.neighborhood, catOf(v)].filter(Boolean).join(' · ');
const distOf = (v: any) => (typeof v?.distance_mi === 'number' ? fmtDistance(v.distance_mi) : null);
const subOf = (v: any) => [reasonLine(v) ? v?.neighborhood : catOf(v) || null, distOf(v)].filter(Boolean).join(' · ');
const str = (x: any) => (Array.isArray(x) ? String(x[0] ?? '') : String(x ?? ''));
const withScheme = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const openUrl = (url: string) => { Linking.openURL(url).catch(() => {}); };

const Action = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <TouchableOpacity style={s.action} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} activeOpacity={0.8}>
    <Ionicons name={icon as any} size={15} color={IVORY} />
    <Text style={s.actionText}>{label}</Text>
  </TouchableOpacity>
);

const Featured = ({ v, onOpen }: { v: any; onOpen: () => void }) => {
  const photo = getPhotoUrl(v);
  const c = coordOf(v);
  const reason = reasonLine(v, 3);
  return (
    <View style={s.featured}>
      <TouchableOpacity onPress={onOpen} activeOpacity={0.92}>
        <View style={s.featuredImageWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={s.featuredImage} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          ) : (
            <View style={[s.featuredImage, { backgroundColor: SURFACE }]} />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} locations={[0.45, 1]} style={StyleSheet.absoluteFillObject} />
          <View style={s.featuredOverlay}>
            <Text style={s.featuredName} numberOfLines={2}>{v.name}</Text>
            <Text style={s.featuredReason} numberOfLines={1}>{reason || metaOf(v)}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <Text style={s.featuredMeta} numberOfLines={1}>{[v.neighborhood, distOf(v)].filter(Boolean).join(' · ')}</Text>
      <View style={s.actions}>
        {c ? (
          <Action icon="navigate-outline" label="Directions"
            onPress={() => openUrl(`http://maps.apple.com/?daddr=${c.latitude},${c.longitude}&q=${encodeURIComponent(String(v.name || ''))}`)} />
        ) : null}
        {v.phone ? <Action icon="call-outline" label="Call" onPress={() => openUrl(`tel:${String(v.phone).replace(/[^0-9+]/g, '')}`)} /> : null}
        {v.website ? <Action icon="globe-outline" label="Website" onPress={() => openUrl(withScheme(String(v.website)))} /> : null}
      </View>
    </View>
  );
};

const Row = React.memo(({ v, onPress }: { v: any; onPress: () => void }) => {
  const photo = getPhotoUrl(v);
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8}>
      {photo ? (
        <Image source={{ uri: photo }} style={s.thumb} contentFit="cover" cachePolicy="memory-disk" transition={120} />
      ) : (
        <View style={[s.thumb, { backgroundColor: SURFACE }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.rowName} numberOfLines={1}>{v.name}</Text>
        <Text style={s.rowReason} numberOfLines={1}>{reasonLine(v) || metaOf(v)}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>{subOf(v)}</Text>
      </View>
    </TouchableOpacity>
  );
});

const MapCard = React.memo(({ v, onPress }: { v: any; onPress: () => void }) => {
  const photo = getPhotoUrl(v);
  return (
    <TouchableOpacity style={s.mapCard} onPress={onPress} activeOpacity={0.9}>
      {photo ? (
        <Image source={{ uri: photo }} style={s.mapThumb} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[s.mapThumb, { backgroundColor: '#1C1C1E' }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.rowName} numberOfLines={1}>{v.name}</Text>
        <Text style={s.rowReason} numberOfLines={1}>{reasonLine(v) || metaOf(v)}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>{subOf(v)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </TouchableOpacity>
  );
});

export default function PlacesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const p = useLocalSearchParams();

  const source = str(p.source);
  const collKey = str(p.key);
  const title = str(p.title) || 'Places';
  const intentKey = str(p.intent);
  const cityParam = str(p.city);
  const hoodParam = str(p.neighborhood); // VIBERYTE_MAP_STAGE1
  const moodParam = str(p.mood);
  const initialQ = str(p.q).slice(0, 120);
  const lat = parseFloat(str(p.lat));
  const lng = parseFloat(str(p.lng));
  const near = Number.isFinite(lat) && Number.isFinite(lng);

  const [baseVenues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'list' | 'map'>(str(p.mode) === 'map' ? 'map' : 'list');
  const [selected, setSelected] = useState(0);
  const reqRef = useRef(0);
  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<FlatList<any> | null>(null);
  const [query, setQuery] = useState(initialQ);
  const [searchRes, setSearchRes] = useState<SearchRes | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(false);
  const [areaDirty, setAreaDirty] = useState(false);
  const [altered, setAltered] = useState(false);
  const [hint, setHint] = useState('');
  const [userLoc, setUserLoc] = useState<Coord | null>(near ? { latitude: lat, longitude: lng } : null);
  const searchReq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionRef = useRef<MapRegion | null>(null);
  const touchRef = useRef(false);
  const fitOnResults = useRef(false);
  const inflightKey = useRef('');
  const doneKey = useRef('');

  const load = useCallback(async () => {
    reqRef.current += 1;
    const id = reqRef.current;
    const isCurrent = () => id === reqRef.current;
    setLoading(true);
    setError(false);
    setNote('');
    try {
      if (moodParam) { if (isCurrent()) setVenues([]); return; }
      if (source === 'collection') {
        const list = collKey ? getCollection(collKey) : undefined;
        if (list && list.length > 0) {
          if (isCurrent()) setVenues(list);
          return;
        }
        if (isCurrent()) setNote(cityParam ? `Showing ${cityParam}` : 'Showing nearby');
      }
      const base: Record<string, string | number> = near
        ? { lat, lng, sort: 'distance', radius: 15 }
        : { city: cityParam || 'Manhattan', ...(hoodParam ? { neighborhood: hoodParam } : {}) };
      const def = intentKey ? INTENT_MAP[intentKey] : undefined;
      const queries = def ? def.queries : [{}];
      const results = await Promise.all(
        queries.map((q) => luminaApi.queryVenues({ ...base, ...q, limit: 60, include: 'highlights', highlight_for: intentKey }))
      );
      if (isCurrent() === false) return;
      if (results.some((r) => r.ok) === false) {
        setError(true);
        return;
      }
      const seen = new Set<string>();
      const merged: any[] = [];
      results.forEach((r) => r.venues.forEach((v: any) => {
        const k = String(v.id);
        if (seen.has(k) || getPhotoUrl(v) == null) return;
        seen.add(k);
        merged.push(v);
      }));
      if (hoodParam) { for (let i = merged.length - 1; i >= 0; i--) if (merged[i]?.neighborhood !== hoodParam) merged.splice(i, 1); }
      if (near) merged.sort((a: any, b: any) => (a.distance_mi ?? 99) - (b.distance_mi ?? 99));
      else merged.sort((a: any, b: any) => qualityScore(b) - qualityScore(a));
      setVenues(merged);
    } catch {
      if (isCurrent()) setError(true);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [source, collKey, intentKey, cityParam, hoodParam, moodParam, near, lat, lng]);

  useEffect(() => {
    load();
    return () => { reqRef.current += 1; };
  }, [load]);

  // VIBERYTE_MAP_STAGE2: search. Debounced typing, one request in flight, no requests while the map moves.
  const searchVenues = useMemo(() => (searchRes?.results || []).map((r) => ({
    ...r, category: r.type, distance_mi: searchRes?.origin === 'you' ? r.distance_mi : undefined,
  })), [searchRes]);
  const venues = searchRes ? searchVenues : baseVenues;

  const runSearch = useCallback(async (text: string, opts: { area?: boolean; loc?: Coord | null; everywhere?: boolean; ignorePlace?: boolean } = {}) => {
    const q = text.trim().slice(0, 120);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', '60');
    if (moodParam) params.set('mood', moodParam);
    const mode: SearchMode = opts.area ? 'area' : near || DISTANCE_RE.test(q) ? 'near' : 'city';
    if (mode === 'area') {
      const r = regionRef.current;
      if (!r) return;
      if (r.latitudeDelta > 1.5 || r.longitudeDelta > 1.5) { setHint('Zoom in to search this area.'); return; }
      const box = [r.latitude - r.latitudeDelta / 2, r.longitude - r.longitudeDelta / 2, r.latitude + r.latitudeDelta / 2, r.longitude + r.longitudeDelta / 2];
      params.set('bbox', box.map((n) => n.toFixed(5)).join(','));
      params.set('clat', r.latitude.toFixed(5));
      params.set('clng', r.longitude.toFixed(5));
    } else if (mode === 'near') {
      const here = opts.loc !== undefined ? opts.loc : userLoc;
      if (here) { params.set('lat', here.latitude.toFixed(5)); params.set('lng', here.longitude.toFixed(5)); }
    } else {
      if (!q && !moodParam) return;
      if (opts.ignorePlace) params.set('ignore_place', '1');
      if (opts.everywhere || opts.ignorePlace) params.set('scope', 'all');
      else if (hoodParam) params.set('hood', hoodParam);
      else if (cityParam) params.set('region', cityParam);
    }
    const key = params.toString();
    if (key === inflightKey.current || key === doneKey.current) return;
    abortRef.current?.abort();
    inflightKey.current = key;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    searchReq.current += 1;
    const id = searchReq.current;
    setSearching(true);
    setSearchErr(false);
    setHint('');
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(`${API_BASE}/api/map/search?${key}`, { signal: ctrl.signal });
      const d = await res.json();
      if (id !== searchReq.current) return;
      if (!res.ok || !d || d.ok !== true) throw new Error('search failed');
      doneKey.current = key;
      fitOnResults.current = mode !== 'area';
      setSearchRes({ ...(d as SearchRes), mode });
      setAreaDirty(false);
    } catch {
      if (id === searchReq.current) { setSearchErr(true); doneKey.current = ''; }
    } finally {
      clearTimeout(timer);
      if (id === searchReq.current) { setSearching(false); inflightKey.current = ''; }
    }
  }, [moodParam, hoodParam, cityParam, userLoc, near]);
  const runRef = useRef(runSearch);
  runRef.current = runSearch;

  // Any change to the input kills the request in flight at once; its results can never land.
  const cancelInflight = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
    searchReq.current += 1;
    inflightKey.current = '';
    setSearching(false);
  }, []);

  useEffect(() => {
    if (initialQ || moodParam) runSearch(initialQ);
    return () => { abortRef.current?.abort(); if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If location is already allowed, use a recent fix quietly. Never prompts here.
  useEffect(() => {
    if (near) return;
    let alive = true;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 200 });
        if (alive && last) setUserLoc({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      } catch {}
    })();
    return () => { alive = false; };
  }, [near]);

  const onChangeQuery = useCallback((t: string) => {
    setQuery(t);
    setAltered(true);
    cancelInflight();
    if (t.trim().length < 3) return;
    debounceRef.current = setTimeout(() => { runRef.current(t); }, 700);
  }, [cancelInflight]);

  const submitSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    Haptics.selectionAsync();
    runSearch(query);
  }, [query, runSearch]);

  const resetSearch = useCallback(() => {
    Haptics.selectionAsync();
    cancelInflight();
    doneKey.current = '';
    Keyboard.dismiss();
    setQuery('');
    setSearchErr(false);
    setHint('');
    setAreaDirty(false);
    setAltered(false);
    fitOnResults.current = true;
    if (moodParam) runSearch('');
    else setSearchRes(null);
  }, [moodParam, runSearch, cancelInflight]);

  const searchArea = useCallback(() => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    setAltered(true);
    runSearch(query, { area: true });
  }, [query, runSearch]);

  const locate = useCallback(async (): Promise<Coord | null> => {
    setHint('');
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setHint('Location is off for Viberyte. Turn it on in Settings to search near you.'); return null; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserLoc(c);
      return c;
    } catch {
      setHint('Couldn’t find your location. Try again.');
      return null;
    }
  }, []);

  const onRecenter = useCallback(async () => {
    Haptics.selectionAsync();
    const c = await locate();
    if (c && mapRef.current) {
      touchRef.current = false;
      mapRef.current.animateToRegion({ ...c, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
      setAreaDirty(true);
    }
  }, [locate]);

  const locateAndSearch = useCallback(async () => {
    Haptics.selectionAsync();
    setAltered(true);
    const seq = searchReq.current;
    const c = await locate();
    if (c && seq === searchReq.current) runSearch(query, { loc: c }); // skip if the search changed meanwhile
  }, [locate, query, runSearch]);

  const showEverywhere = useCallback(() => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    setAltered(true);
    runSearch(query, { everywhere: true });
  }, [query, runSearch]);

  const showElsewhere = useCallback(() => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    setAltered(true);
    runSearch(query, { ignorePlace: true });
  }, [query, runSearch]);

  const notice = useMemo((): { text: string; kind: 'info' | 'retry' | 'needs_location' | 'wider' | 'elsewhere' } | null => {
    if (hint) return { text: hint, kind: 'info' };
    if (searchErr) return { text: 'Search isn’t available right now.', kind: 'retry' };
    if (!searchRes || searching) return null;
    if (searchRes.unsupported) return { text: searchRes.unsupported, kind: 'info' };
    if (searchRes.needs_location) return { text: 'Turn on location to search near you, or search the area on screen.', kind: 'needs_location' };
    if (searchRes.total === 0 && searchRes.place && (searchRes.elsewhere_total || 0) > 0) return { text: growing(searchRes.place, searchRes.what), kind: 'elsewhere' };
    if (searchRes.total === 0 && searchRes.area && (searchRes.wider_total || 0) > 0) return { text: growing(searchRes.area, searchRes.what), kind: 'wider' };
    if (searchRes.total === 0) return { text: 'No matches. Try a neighborhood, cuisine or venue type.', kind: 'info' };
    if (searchRes.time_note) return { text: searchRes.time_note, kind: 'info' };
    return null;
  }, [hint, searchErr, searchRes, searching]);

  const chips = useMemo(() => {
    if (!searchRes) return [] as string[];
    const c = [...searchRes.understood];
    if (searchRes.mode === 'area' && !c.includes('Near this area')) c.unshift('This map area');
    if (searchRes.mode === 'near' && !c.includes('Near you')) c.unshift('Near you');
    return c;
  }, [searchRes]);

  // Featured: most reasons among the first five results (ties → earlier, i.e. closer or stronger)
  const featuredIdx = useMemo(() => {
    let best = -1;
    let bestN = -1;
    venues.slice(0, 5).forEach((v: any, i: number) => {
      const n = (v?.highlights || []).length;
      if (n > bestN) { best = i; bestN = n; }
    });
    return best;
  }, [venues]);
  const featured = featuredIdx >= 0 ? venues[featuredIdx] : null;
  const rest = useMemo(() => venues.filter((_: any, i: number) => (i === featuredIdx ? false : true)), [venues, featuredIdx]);
  const pins = useMemo(() => {
    const ordered = featured ? [featured, ...rest] : rest;
    return ordered.filter((v: any) => coordOf(v) != null).slice(0, MAX_PINS);
  }, [featured, rest]);
  useEffect(() => { setSelected(0); carouselRef.current?.scrollToOffset({ offset: 0, animated: false }); }, [pins]);

  const subtitle = useMemo(() => {
    if (loading) return '';
    if (searchRes) {
      const t = searchRes.total;
      if (t === 0) return 'No matches';
      const m = `${t} ${t === 1 ? 'match' : 'matches'}`;
      if (mode === 'map' && t > pins.length) return `Top ${pins.length} of ${m}`;
      if (t > venues.length) return `Top ${venues.length} of ${m}`;
      return m;
    }
    if (moodParam) return '';
    const n = venues.length;
    const count = `${n} ${n === 1 ? 'place' : 'places'}`;
    if (mode === 'map' && n > pins.length) return `Top ${pins.length} of ${count}`;
    if (near) {
      const r = distanceRange(venues);
      return r ? `${count} · ${r}` : count;
    }
    if (note) return `${count} · ${note}`;
    return cityParam ? `${count} · In ${hoodParam || cityParam}` : count;
  }, [loading, venues, near, note, cityParam, hoodParam, mode, pins.length, searchRes, moodParam]);

  const openVenue = useCallback((v: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { tasteTracker.recordDetailView(v.id, v.standardized_category || v.category || ''); } catch {}
    router.push(`/venue/${v.id}`);
  }, [router]);

  const fitAll = useCallback(() => {
    const coords = pins.map((v: any) => coordOf(v) as Coord);
    if (near) coords.push({ latitude: lat, longitude: lng });
    if (mapRef.current && coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 150, right: 50, bottom: 220, left: 50 }, animated: false });
    }
  }, [pins, near, lat, lng]);

  useEffect(() => {
    if (!fitOnResults.current || pins.length === 0) return;
    fitOnResults.current = false;
    touchRef.current = false;
    fitAll();
  }, [pins, fitAll]);

  const focusPin = useCallback((i: number) => {
    const c = pins[i] ? coordOf(pins[i]) : null;
    if (c && mapRef.current) mapRef.current.animateCamera({ center: c }, { duration: 300 });
  }, [pins]);

  const onPinPress = useCallback((i: number) => {
    Haptics.selectionAsync();
    touchRef.current = false;
    setSelected(i);
    carouselRef.current?.scrollToOffset({ offset: i * (CARD_W + GAP), animated: true });
    focusPin(i);
  }, [focusPin]);

  const onCarouselEnd = useCallback((e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP));
    if (i >= 0 && i < pins.length) {
      setSelected(i);
      focusPin(i);
    }
  }, [pins.length, focusPin]);

  const initialRegion = useMemo(() => {
    const first = pins[0] ? coordOf(pins[0]) : null;
    const center = near ? { latitude: lat, longitude: lng } : first || { latitude: 40.7306, longitude: -73.9866 };
    return { ...center, latitudeDelta: 0.06, longitudeDelta: 0.06 };
  }, [pins, near, lat, lng]);

  const body = () => {
    if (loading) return <View style={s.center}><ActivityIndicator color={MUTED} /></View>;
    if (error) {
      return (
        <TouchableOpacity style={s.center} onPress={load} activeOpacity={0.7}>
          <Text style={s.stateText}>Couldn't load these places. Tap to retry.</Text>
        </TouchableOpacity>
      );
    }
    if (venues.length === 0 && mode === 'list') {
      if (searching) return <View style={s.center}><ActivityIndicator color={MUTED} /></View>;
      return <View style={s.center}><Text style={s.stateText}>{searchRes ? 'No matches. Try a neighborhood, cuisine or venue type.' : 'Nothing confirmed here yet.'}</Text></View>;
    }
    if (mode === 'list') {
      return (
        <FlatList
          data={rest}
          keyExtractor={(v) => `pl-${v.id}`}
          ListHeaderComponent={featured ? <Featured v={featured} onOpen={() => openVenue(featured)} /> : null}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => <Row v={item} onPress={() => openVenue(item)} />}
          showsVerticalScrollIndicator={false}
        />
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          userInterfaceStyle="dark"
          showsUserLocation={near || userLoc != null}
          showsPointsOfInterests={false}
          initialRegion={initialRegion}
          onMapReady={() => { regionRef.current = initialRegion; fitAll(); }}
          onTouchStart={() => { touchRef.current = true; Keyboard.dismiss(); }}
          onPress={() => { touchRef.current = false; }}
          onRegionChangeComplete={(r: MapRegion) => {
            regionRef.current = r;
            if (touchRef.current) { touchRef.current = false; setAreaDirty(true); }
          }}
        >
          {pins.map((v: any, i: number) => {
            const c = coordOf(v) as Coord;
            const sel = i === selected;
            const isFeatured = featured ? v.id === featured.id : false;
            return (
              <Marker key={`${v.id}-${sel ? 's' : 'n'}`} coordinate={c} onPress={() => onPinPress(i)} tracksViewChanges={false} zIndex={sel ? 20 : isFeatured ? 10 : 1}>
                <View style={sel ? s.pinSel : isFeatured ? s.pinFeatured : s.pin} />
              </Marker>
            );
          })}
        </MapView>
        <View style={s.searchWrap} pointerEvents="box-none">
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color={MUTED} />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={onChangeQuery}
              onSubmitEditing={submitSearch}
              placeholder="Jazz in Harlem, rooftops, sushi…"
              placeholderTextColor={FAINT}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={120}
              selectionColor={CHAMP}
              accessibilityLabel="Search the map"
            />
            {searching ? <ActivityIndicator size="small" color={MUTED} /> : query || altered ? (
              <TouchableOpacity onPress={resetSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Reset search">
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            ) : null}
          </View>
          {chips.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
              {chips.map((c, i) => (
                <View key={`${c}-${i}`} style={s.chip}><Text style={s.chipText}>{c}</Text></View>
              ))}
            </ScrollView>
          ) : null}
          {notice ? (
            <View style={s.banner}>
              <Text style={s.bannerText}>{notice.text}</Text>
              {notice.kind === 'needs_location' ? (
                <View style={s.bannerActions}>
                  <TouchableOpacity onPress={locateAndSearch}><Text style={s.bannerAction}>Use my location</Text></TouchableOpacity>
                  <TouchableOpacity onPress={searchArea}><Text style={s.bannerAction}>Search this area</Text></TouchableOpacity>
                </View>
              ) : notice.kind === 'wider' ? (
                <View style={s.bannerActions}>
                  <TouchableOpacity onPress={showEverywhere}><Text style={s.bannerAction}>{`Show ${searchRes?.wider_total} in other areas`}</Text></TouchableOpacity>
                </View>
              ) : notice.kind === 'elsewhere' ? (
                <View style={s.bannerActions}>
                  <TouchableOpacity onPress={showElsewhere}><Text style={s.bannerAction}>{`Show ${searchRes?.elsewhere_total} in other areas`}</Text></TouchableOpacity>
                </View>
              ) : notice.kind === 'retry' ? (
                <View style={s.bannerActions}>
                  <TouchableOpacity onPress={submitSearch}><Text style={s.bannerAction}>Try again</Text></TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}
          {areaDirty && !searching ? (
            <TouchableOpacity style={s.areaBtn} onPress={searchArea} activeOpacity={0.85} accessibilityLabel="Search this area">
              <Ionicons name="refresh" size={14} color={INK} />
              <Text style={s.areaText}>Search this area</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={[s.recenter, { bottom: insets.bottom + (pins.length > 0 ? 112 : 16) }]} onPress={onRecenter}
          activeOpacity={0.85} accessibilityLabel="Center on my location">
          <Ionicons name={userLoc ? 'navigate' : 'navigate-outline'} size={18} color={userLoc ? CHAMP : IVORY} />
        </TouchableOpacity>
        {pins.length > 0 ? (
          <FlatList
            ref={carouselRef}
            data={pins}
            horizontal
            style={[s.carousel, { bottom: insets.bottom + 16 }]}
            contentContainerStyle={{ paddingHorizontal: 24, gap: GAP }}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + GAP}
            decelerationRate="fast"
            keyExtractor={(v) => `mc-${v.id}`}
            onMomentumScrollEnd={onCarouselEnd}
            renderItem={({ item }) => <MapCard v={item} onPress={() => openVenue(item)} />}
          />
        ) : null}
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={IVORY} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={s.segment}>
          {(['list', 'map'] as const).map((m) => (
            <TouchableOpacity key={m} style={[s.segBtn, mode === m ? s.segBtnActive : null]}
              onPress={() => { Haptics.selectionAsync(); setMode(m); }} activeOpacity={0.8}>
              <Text style={[s.segText, mode === m ? s.segTextActive : null]}>{m === 'list' ? 'List' : 'Map'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {body()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: IVORY, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  segment: { flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 10, padding: 2, marginLeft: 12 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  segBtnActive: { backgroundColor: '#1C1C1E', borderColor: 'rgba(243, 240, 233, 0.35)' },
  segText: { fontSize: 13, fontWeight: '500', color: MUTED },
  segTextActive: { color: IVORY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  stateText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  featured: { paddingHorizontal: 16, marginBottom: 18 },
  featuredImageWrap: { borderRadius: 16, overflow: 'hidden' },
  featuredImage: { width: '100%', height: 230 },
  featuredOverlay: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  featuredName: { fontSize: 24, fontWeight: '700', color: IVORY, letterSpacing: -0.4 },
  featuredReason: { fontSize: 14, color: 'rgba(245,241,234,0.8)', marginTop: 4 },
  featuredMeta: { fontSize: 13, color: MUTED, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: SURFACE },
  actionText: { fontSize: 13, fontWeight: '500', color: IVORY },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  rowName: { fontSize: 16, fontWeight: '600', color: IVORY },
  rowReason: { fontSize: 13, color: 'rgba(245,241,234,0.72)', marginTop: 2 },
  rowMeta: { fontSize: 12, color: FAINT, marginTop: 2, fontVariant: ['tabular-nums'] },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(245,241,234,0.08)', marginLeft: 92 },
  carousel: { position: 'absolute', left: 0, right: 0 },
  mapCard: {
    width: CARD_W, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16,
    backgroundColor: 'rgba(20,20,23,0.96)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(245,241,234,0.08)',
  },
  mapThumb: { width: 64, height: 64, borderRadius: 10 },
  pin: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(245,241,234,0.85)', borderWidth: 2, borderColor: '#000' },
  pinFeatured: { width: 16, height: 16, borderRadius: 8, backgroundColor: IVORY, borderWidth: 3, borderColor: '#C5A36B' },
  pinSel: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#F3F0E9', borderWidth: 3, borderColor: '#09090B' },
  searchWrap: { position: 'absolute', top: 8, left: 16, right: 16, gap: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 22,
    backgroundColor: 'rgba(20,20,23,0.95)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.14)',
  },
  searchInput: { flex: 1, color: IVORY, fontSize: 15, paddingVertical: 0 },
  chips: { gap: 6 },
  chip: {
    height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center',
    backgroundColor: 'rgba(9,9,11,0.88)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(197,163,107,0.55)',
  },
  chipText: { color: CHAMP, fontSize: 12, fontWeight: '600' },
  banner: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(20,20,23,0.96)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.1)' },
  bannerText: { color: IVORY, fontSize: 13, lineHeight: 18 },
  bannerActions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  bannerAction: { color: CHAMP, fontSize: 13, fontWeight: '600' },
  areaBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: IVORY },
  areaText: { color: INK, fontSize: 14, fontWeight: '600' },
  recenter: {
    position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(20,20,23,0.95)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.14)',
  },
});
