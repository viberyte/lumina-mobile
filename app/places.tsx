// VIBERYTE_PLACES_V2: cinematic featured pick, compact rows, curated map.
// source=collection → the exact list from Home; source=query → the exact verified API query.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, ActivityIndicator, Linking } from 'react-native';
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

const { width: W } = Dimensions.get('window');
const CARD_W = W - 48;
const GAP = 12;
const MAX_PINS = 20;
const IVORY = '#F5F1EA';
const MUTED = 'rgba(245,241,234,0.55)';
const FAINT = 'rgba(245,241,234,0.38)';
const BG = '#000000';
const SURFACE = '#141417';

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
  const lat = parseFloat(str(p.lat));
  const lng = parseFloat(str(p.lng));
  const near = Number.isFinite(lat) && Number.isFinite(lng);

  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'list' | 'map'>(str(p.mode) === 'map' ? 'map' : 'list');
  const [selected, setSelected] = useState(0);
  const reqRef = useRef(0);
  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<FlatList<any> | null>(null);

  const load = useCallback(async () => {
    reqRef.current += 1;
    const id = reqRef.current;
    const isCurrent = () => id === reqRef.current;
    setLoading(true);
    setError(false);
    setNote('');
    try {
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
  }, [source, collKey, intentKey, cityParam, hoodParam, near, lat, lng]);

  useEffect(() => {
    load();
    return () => { reqRef.current += 1; };
  }, [load]);

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
  useEffect(() => { setSelected(0); }, [pins]);

  const subtitle = useMemo(() => {
    if (loading) return '';
    const n = venues.length;
    const count = `${n} ${n === 1 ? 'place' : 'places'}`;
    if (mode === 'map' && n > pins.length) return `Top ${pins.length} of ${count}`;
    if (near) {
      const r = distanceRange(venues);
      return r ? `${count} · ${r}` : count;
    }
    if (note) return `${count} · ${note}`;
    return cityParam ? `${count} · In ${hoodParam || cityParam}` : count;
  }, [loading, venues, near, note, cityParam, hoodParam, mode, pins.length]);

  const openVenue = useCallback((v: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { tasteTracker.recordDetailView(v.id, v.standardized_category || v.category || ''); } catch {}
    router.push(`/venue/${v.id}`);
  }, [router]);

  const fitAll = useCallback(() => {
    const coords = pins.map((v: any) => coordOf(v) as Coord);
    if (near) coords.push({ latitude: lat, longitude: lng });
    if (mapRef.current && coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 60, right: 50, bottom: 220, left: 50 }, animated: false });
    }
  }, [pins, near, lat, lng]);

  const focusPin = useCallback((i: number) => {
    const c = pins[i] ? coordOf(pins[i]) : null;
    if (c && mapRef.current) mapRef.current.animateCamera({ center: c }, { duration: 300 });
  }, [pins]);

  const onPinPress = useCallback((i: number) => {
    Haptics.selectionAsync();
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
    if (venues.length === 0) return <View style={s.center}><Text style={s.stateText}>Nothing confirmed here yet.</Text></View>;
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
          showsUserLocation={near}
          showsPointsOfInterest={false}
          initialRegion={initialRegion}
          onMapReady={fitAll}
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
});
