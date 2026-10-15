// VIBERYTE_VENUE_V3: cinematic venue page + Inside the vibe. Data: GET /api/venues/:id/detail
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Linking, Share,
  ScrollView, StatusBar, Platform, Pressable, Modal, FlatList, ViewToken,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { requireAuth } from '../../utils/authGate';
import { api, trackBehavior } from '../../lib/api';
import tasteTracker from '../../services/tasteTracker';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H = Math.round(H * 0.64);
const API = 'https://viberyte.com';
const C = {
  ground: '#09090B', surface: '#141416', raise: '#1C1C1E', line: 'rgba(243,240,233,0.08)',
  ivory: '#F3F0E9', ink: '#09090B', soft: '#DCD8D0', muted: '#A7A4A0', champ: '#C5A36B',
};

type Card = { id: number; name: string; type: string; neighborhood: string | null; image_url: string | null; distance_mi: number | null; vibe: string | null };
type Reel = { url: string; poster: string | null; duration: number; width?: number; height?: number };
type Detail = {
  venue: {
    id: number; name: string; type: string; neighborhood: string | null; borough: string | null; address: string | null;
    latitude: number | null; longitude: number | null; phone: string | null; website: string | null;
    instagram_handle: string | null; image_url: string | null; why: string | null;
    feel: { label: string; value: string }[]; reels: Reel[]; distance_from_you_mi: number | null;
  };
  rails: { next_stop: Card[]; nearby: Card[]; same_feel: Card[] };
};

const fmtMi = (d: number | null) => (d == null ? null : d < 0.1 ? 'Under 0.1 mi' : `${d.toFixed(1)} mi`);
const img = (u?: string | null) => (u ? (u.startsWith('/') ? API + u : u) : null);
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

function HeroVideo({ uri, playing, muted = true }: { uri: string; playing: boolean; muted?: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = muted; });
  useEffect(() => {
    try { playing ? player.play() : player.pause(); } catch {}
  }, [playing, player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

function RailCard({ c, size }: { c: Card; size: 'medium' | 'compact' }) {
  const w = size === 'medium' ? 264 : 148;
  const h = size === 'medium' ? 196 : 108;
  const u = img(c.image_url);
  const dist = fmtMi(c.distance_mi);
  return (
    <TouchableOpacity activeOpacity={0.85} style={{ width: w }} onPress={() => { tap(); router.push(`/venue/${c.id}`); }}>
      <View style={{ width: w, height: h, borderRadius: size === 'medium' ? 14 : 10, overflow: 'hidden', backgroundColor: C.raise }}>
        {u ? <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          : <Text style={s.initial}>{c.name.slice(0, 1)}</Text>}
      </View>
      {size === 'medium' ? (
        <>
          <View style={s.metaLine}>
            {dist ? <Text style={[s.cardEyebrow, s.noShrink]}>{dist.toUpperCase()}</Text> : null}
            {dist && (c.vibe || c.type) ? <Text style={[s.cardEyebrow, s.noShrink]}>  ·  </Text> : null}
            <Text style={[s.cardEyebrow, s.shrink]} numberOfLines={1}>{(c.vibe || c.type || '').toUpperCase()}</Text>
          </View>
          <Text style={s.cardNameM} numberOfLines={2}>{c.name}</Text>
          {c.neighborhood ? <Text style={s.cardMeta} numberOfLines={1}>{c.neighborhood}</Text> : null}
        </>
      ) : (
        <>
          <Text style={s.cardNameS} numberOfLines={2}>{c.name}</Text>
          <View style={s.metaLine}>
            <Text style={[s.cardMeta, s.shrink]} numberOfLines={1}>{c.type}</Text>
            {dist ? <Text style={[s.cardMeta, s.noShrink]}>{c.type ? '  ·  ' : ''}{dist}</Text> : null}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

function InsideRail({ reels, onOpen }: { reels: Reel[]; onOpen: (i: number) => void }) {
  if (reels.length < 2) return null;
  return (
    <View style={s.section}>
      <Text style={[s.h2, s.pad]}>Inside the vibe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingTop: 12 }}>
        {reels.map((r, i) => (
          <TouchableOpacity key={r.url} activeOpacity={0.85} onPress={() => { tap(); onOpen(i); }}
            accessibilityLabel={`Play reel ${i + 1} of ${reels.length}`} style={s.reelThumb}>
            <Image source={{ uri: r.poster! }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
            <LinearGradient pointerEvents="none" colors={['rgba(9,9,11,0)', 'rgba(9,9,11,0.7)']} style={s.thumbScrim} />
            <View style={s.playDot}><Ionicons name="play" size={11} color={C.ivory} style={{ marginLeft: 1 }} /></View>
            <Text style={s.dur}>{fmtDur(r.duration)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function ReelViewer({ reels, start, handle, onClose }: { reels: Reel[]; start: number; handle: string | null; onClose: () => void }) {
  const [active, setActive] = useState(start);
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index != null) setActive(first.index);
  }).current;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={reels}
          keyExtractor={(r) => r.url}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: H, offset: H * i, index: i })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          windowSize={3}
          renderItem={({ item, index }) => (
            <View style={{ width: W, height: H, backgroundColor: '#000' }}>
              {item.poster ? <Image source={{ uri: item.poster }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              {index === active ? <HeroVideo uri={item.url} playing muted={false} /> : null}
            </View>
          )}
        />
        <View style={s.viewerTop} pointerEvents="box-none">
          <Text style={s.meta}>{handle ? `@${handle.replace('@', '')}  ·  ` : ''}{active + 1} / {reels.length}</Text>
          <TouchableOpacity onPress={onClose} style={s.circle} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={C.ivory} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Rail({ title, sub, items, size }: { title: string; sub?: string; items: Card[]; size: 'medium' | 'compact' }) {
  if (!items?.length) return null;
  return (
    <View style={s.section}>
      <Text style={[s.h2, s.pad]}>{title}</Text>
      {sub ? <Text style={[s.sub, s.pad]}>{sub}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingTop: 12 }}>
        {items.map((c) => <RailCard key={c.id} c={c} size={size} />)}
      </ScrollView>
    </View>
  );
}

export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [reelIdx, setReelIdx] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);
  const [saved, setSaved] = useState(false);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  const load = useCallback(async () => {
    setFailed(false);
    let q = '';
    try {
      // Distance only in Near Me mode, from a fresh GPS fix (VIBERYTE_LOC_MODE_V1)
      const mode = await AsyncStorage.getItem('@viberyte_loc_mode');
      const perm = await Location.getForegroundPermissionsAsync();
      if (mode !== 'city' && perm.granted) {
        let pos = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000, requiredAccuracy: 500 });
        if (!pos) {
          pos = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<null>((r) => setTimeout(() => r(null), 4000)),
          ]);
        }
        if (pos) q = `?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`;
      }
    } catch {}
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(`${API}/api/venues/${id}/detail${q}`, { signal: ctrl.signal });
      clearTimeout(t);
      const json = await res.json();
      if (!json?.ok) throw new Error('bad');
      setData(json);
      setReelIdx(0);
      trackBehavior(Number(json.venue.id), 'view', 'detail');
      tasteTracker.recordDetailView(json.venue.id, json.venue.type || '');
      api.isVenueSaved(Number(json.venue.id)).then(setSaved).catch(() => {});
    } catch {
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    setData(null);
    load();
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [id]);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
    listener: (e: any) => {
      const vis = e.nativeEvent.contentOffset.y < HERO_H * 0.75;
      setHeroVisible((prev) => (prev === vis ? prev : vis));
    },
  });

  const barOpacity = scrollY.interpolate({ inputRange: [HERO_H * 0.55, HERO_H * 0.8], outputRange: [0, 1], extrapolate: 'clamp' });
  const heroScale = scrollY.interpolate({ inputRange: [-120, 0], outputRange: [1.12, 1], extrapolate: 'clamp' });

  if (failed) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.h2}>Couldn't load this place</Text>
        <TouchableOpacity style={[s.btnGhost, { marginTop: 16, paddingHorizontal: 24 }]} onPress={load}>
          <Text style={s.btnGhostText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 14 }} onPress={() => router.back()}><Text style={s.link}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={s.root}>
        <View style={{ height: HERO_H, backgroundColor: C.surface }} />
        <View style={{ padding: 20, gap: 12 }}>
          <View style={[s.skel, { width: '35%', height: 12 }]} />
          <View style={[s.skel, { width: '70%', height: 30 }]} />
          <View style={[s.skel, { width: '90%', height: 14 }]} />
        </View>
        <TouchableOpacity onPress={() => router.back()} style={[s.circle, { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 32, left: 16 }]}>
          <Ionicons name="chevron-back" size={20} color={C.ivory} />
        </TouchableOpacity>
      </View>
    );
  }

  const v = data.venue;
  const reels = v.reels || [];
  const thumbReels = reels.filter((r, i, a) => !!r.poster && a.findIndex((x) => x.url === r.url) === i);
  const reel = reels.length ? reels[reelIdx % reels.length] : null;
  const photo = img(v.image_url);
  const eyebrow = [v.type, v.neighborhood].filter(Boolean).join(' · ');
  const dist = fmtMi(v.distance_from_you_mi);

  const directions = () => {
    tap();
    const q = v.latitude != null && v.longitude != null ? `${v.latitude},${v.longitude}` : encodeURIComponent(v.address || v.name);
    Linking.openURL(`https://maps.apple.com/?daddr=${q}&q=${encodeURIComponent(v.name)}`);
  };
  const call = () => { tap(); if (v.phone) Linking.openURL(`tel:${v.phone.replace(/[^\d+]/g, '')}`); };
  const site = () => { tap(); if (v.website) Linking.openURL(v.website.startsWith('http') ? v.website : `https://${v.website}`); };
  const share = () => { tap(); Share.share({ message: `${v.name}, ${v.neighborhood || ''}\nhttps://viberyte.com/venue/${v.id}` }).catch(() => {}); };
  const toggleSave = async () => {
    if (!(await requireAuth('save places'))) return;
    const next = !saved;
    setSaved(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      next ? await api.saveFavorite(Number(v.id)) : await api.removeFavorite(Number(v.id));
      if (next) tasteTracker.recordSave(v.id, v.type || '');
    } catch { setSaved(!next); }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View pointerEvents="box-none" style={[s.bar, { opacity: barOpacity }]}>
        <Text style={s.barTitle} numberOfLines={1}>{v.name}</Text>
      </Animated.View>
      <View style={s.topRow} pointerEvents="box-none">
        <TouchableOpacity onPress={() => router.back()} style={s.circle} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={C.ivory} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={toggleSave} style={s.circle} accessibilityLabel="Save">
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? C.champ : C.ivory} />
          </TouchableOpacity>
          <TouchableOpacity onPress={share} style={s.circle} accessibilityLabel="Share">
            <Ionicons name="share-outline" size={19} color={C.ivory} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16}
        showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>

        <Pressable style={{ height: HERO_H, backgroundColor: C.surface }}
          onPress={() => { if (reels.length > 1) { tap(); setReelIdx((i) => i + 1); } }}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: heroScale }] }]}>
            {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : null}
            {reel ? <HeroVideo key={reel.url} uri={reel.url} playing={heroVisible && viewerAt === null} /> : null}
          </Animated.View>
          <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill}
            colors={['rgba(9,9,11,0.5)', 'rgba(9,9,11,0)', 'rgba(9,9,11,0)', 'rgba(9,9,11,0.85)', C.ground]}
            locations={[0, 0.22, 0.45, 0.8, 1]} />
          <View style={s.heroText} pointerEvents="none">
            {eyebrow ? <Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
            <Text style={s.h1}>{v.name}</Text>
            {v.why ? <Text style={s.why}>{v.why}</Text> : null}
            <View style={s.metaRow}>
              {dist ? <Text style={s.meta}>{dist} from you</Text> : null}
              {reel && v.instagram_handle ? (
                <View style={s.credit}>
                  <View style={s.dot} />
                  <Text style={s.meta}>@{v.instagram_handle.replace('@', '')}{reels.length > 1 ? `  ${(reelIdx % reels.length) + 1}/${reels.length}` : ''}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>

        <View style={s.actions}>
          <TouchableOpacity style={s.btnPrimary} onPress={directions} activeOpacity={0.9}>
            <Ionicons name="navigate" size={16} color={C.ink} />
            <Text style={s.btnPrimaryText}>Directions</Text>
          </TouchableOpacity>
          {v.phone ? (
            <TouchableOpacity style={s.btnGhost} onPress={call} activeOpacity={0.85}>
              <Ionicons name="call-outline" size={16} color={C.ivory} /><Text style={s.btnGhostText}>Call</Text>
            </TouchableOpacity>
          ) : null}
          {v.website ? (
            <TouchableOpacity style={s.btnGhost} onPress={site} activeOpacity={0.85}>
              <Ionicons name="globe-outline" size={16} color={C.ivory} /><Text style={s.btnGhostText}>Website</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {v.feel?.length ? (
          <View style={[s.section, s.pad]}>
            <Text style={[s.h2, { marginBottom: 6 }]}>The feel</Text>
            {v.feel.map((f, i) => (
              <View key={f.label} style={[s.feelRow, i < v.feel.length - 1 && s.hair]}>
                <Text style={s.feelLabel}>{f.label}</Text>
                <Text style={s.feelValue}>{f.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <InsideRail reels={thumbReels} onOpen={setViewerAt} />
        <Rail title="Nearby" items={data.rails.nearby} size="compact" />
        <Rail title="Next stop" sub="Where the night can go from here" items={data.rails.next_stop} size="medium" />

        {v.latitude != null && v.longitude != null ? (
          <View style={[s.section, s.pad]}>
            <Text style={[s.h2, { marginBottom: 12 }]}>Location</Text>
            <TouchableOpacity activeOpacity={0.9} onPress={directions} style={s.mapCard}>
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <MapView provider={PROVIDER_DEFAULT} style={StyleSheet.absoluteFill} userInterfaceStyle="dark"
                  scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} toolbarEnabled={false}
                  initialRegion={{ latitude: Number(v.latitude), longitude: Number(v.longitude), latitudeDelta: 0.006, longitudeDelta: 0.006 }}>
                  <Marker coordinate={{ latitude: Number(v.latitude), longitude: Number(v.longitude) }}>
                    <View style={s.pin} />
                  </Marker>
                </MapView>
              </View>
            </TouchableOpacity>
            <View style={s.addrRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.addr} numberOfLines={1}>{v.address?.split(',')[0] || v.name}</Text>
                <Text style={s.meta} numberOfLines={1}>{[v.neighborhood, v.borough].filter(Boolean).join(', ')}</Text>
              </View>
              <TouchableOpacity onPress={directions}><Text style={s.link}>Directions</Text></TouchableOpacity>
            </View>
          </View>
        ) : null}

        <Rail title="Same feel" items={data.rails.same_feel} size="compact" />
      </Animated.ScrollView>

      {viewerAt !== null ? (
        <ReelViewer reels={thumbReels} start={viewerAt} handle={v.instagram_handle} onClose={() => setViewerAt(null)} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ground },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  pad: { paddingHorizontal: 20 },
  skel: { backgroundColor: C.raise, borderRadius: 6 },
  bar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(9,9,11,0.94)',
    paddingTop: Platform.OS === 'ios' ? 60 : 36, paddingBottom: 14, paddingHorizontal: 72,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line,
  },
  barTitle: { color: C.ivory, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  topRow: {
    position: 'absolute', top: Platform.OS === 'ios' ? 52 : 28, left: 16, right: 16, zIndex: 11,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  circle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(9,9,11,0.55)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 22, gap: 8 },
  eyebrow: { color: '#C9C5BE', fontSize: 12, fontWeight: '600', letterSpacing: 1.4 },
  h1: { color: C.ivory, fontSize: 38, lineHeight: 41, fontWeight: '700', letterSpacing: -0.9 },
  why: { color: C.soft, fontSize: 16, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  meta: { color: C.muted, fontSize: 13 },
  credit: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.champ },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28 },
  btnPrimary: {
    flex: 1.5, height: 50, borderRadius: 14, backgroundColor: C.ivory,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnPrimaryText: { color: C.ink, fontSize: 16, fontWeight: '600' },
  btnGhost: {
    flex: 1, height: 50, borderRadius: 14, backgroundColor: C.raise, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(243,240,233,0.14)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  btnGhostText: { color: C.ivory, fontSize: 15, fontWeight: '600' },
  section: { paddingBottom: 34 },
  h2: { color: C.ivory, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  sub: { color: C.muted, fontSize: 14, marginTop: 3 },
  feelRow: { flexDirection: 'row', gap: 16, paddingVertical: 13 },
  hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  feelLabel: { width: 92, color: C.muted, fontSize: 15 },
  feelValue: { flex: 1, color: C.ivory, fontSize: 15, lineHeight: 20 },
  mapCard: { height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: C.surface },
  pin: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.ivory, borderWidth: 3, borderColor: C.ink },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  addr: { color: C.ivory, fontSize: 15 },
  link: { color: C.champ, fontSize: 15, fontWeight: '600' },
  initial: { color: C.muted, fontSize: 28, fontWeight: '600', textAlign: 'center', marginTop: '22%' },
  cardEyebrow: { color: C.champ, fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  cardNameM: { color: C.ivory, fontSize: 18, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2, marginTop: 4 },
  cardNameS: { color: C.ivory, fontSize: 15, fontWeight: '600', marginTop: 8 },
  cardMeta: { color: C.muted, fontSize: 13, marginTop: 3 },
  metaLine: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  shrink: { flexShrink: 1 },
  noShrink: { flexShrink: 0 },
  reelThumb: { width: 132, height: 176, borderRadius: 12, overflow: 'hidden', backgroundColor: C.raise },
  thumbScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 64 },
  playDot: {
    position: 'absolute', left: 10, bottom: 10, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(9,9,11,0.55)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  dur: { position: 'absolute', right: 10, bottom: 13, color: C.ivory, fontSize: 12, fontWeight: '600' },
  viewerTop: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 32, left: 20, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
});
