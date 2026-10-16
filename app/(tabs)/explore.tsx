// VIBERYTE_EXPLORE_V2: cinematic Explore. Data: GET /api/explore/feed
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Pressable, RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: W } = Dimensions.get('window');
const API = 'https://viberyte.com';
const STORE = '@viberyte_explore';
const C = {
  ground: '#09090B', surface: '#141416', raise: '#1C1C1E', line: 'rgba(243,240,233,0.08)',
  ivory: '#F3F0E9', ink: '#09090B', soft: '#DCD8D0', muted: '#A7A4A0', champ: '#C5A36B',
};
const HERO_W = W - 40;
const HERO_H = Math.round(HERO_W * 1.25);

type VCard = { id: number; name: string; type: string; neighborhood: string | null; image_url: string | null; vibe: string | null };
type ECard = { id: number; title: string; date: string; time: string | null; venue_name: string | null; image_url: string | null };
type Section = { key: string; kind: 'venues' | 'events'; size: 'medium' | 'compact'; title: string; sub: string | null; items: any[]; mood?: string };
type Feed = {
  region: string; neighborhood: string | null; mood: string | null; regions: string[];
  neighborhoods: { name: string; count: number }[]; moods: { key: string; label: string }[];
  hero: (VCard & { video: string | null; poster: string | null; why: string | null }) | null;
  sections: Section[];
};

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
const img = (u?: string | null) => (u ? (u.startsWith('/') ? API + u : u) : null);
function dayLabel(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, dd] = d.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, dd || 1);
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Tonight';
  if (diff === 1) return 'Tomorrow';
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function HeroVideo({ uri, playing }: { uri: string; playing: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; });
  useEffect(() => { try { playing ? player.play() : player.pause(); } catch {} }, [playing, player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

function VenueCard({ c, size }: { c: VCard; size: 'medium' | 'compact' }) {
  const w = size === 'medium' ? 264 : 148;
  const h = size === 'medium' ? 196 : 108;
  const u = img(c.image_url);
  return (
    <TouchableOpacity activeOpacity={0.85} style={{ width: w }} onPress={() => { tap(); router.push(`/venue/${c.id}`); }}>
      <View style={{ width: w, height: h, borderRadius: size === 'medium' ? 14 : 10, overflow: 'hidden', backgroundColor: C.raise }}>
        {u ? <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          : <Text style={s.initial}>{c.name.slice(0, 1)}</Text>}
      </View>
      {size === 'medium' ? (
        <>
          <Text style={[s.eyebrowSm, { marginTop: 10 }]} numberOfLines={1}>{[c.type, c.neighborhood].filter(Boolean).join(' · ').toUpperCase()}</Text>
          <Text style={s.nameM} numberOfLines={2}>{c.name}</Text>
          {c.vibe ? <Text style={s.meta} numberOfLines={1}>{c.vibe}</Text> : null}
        </>
      ) : (
        <>
          <Text style={s.nameS} numberOfLines={2}>{c.name}</Text>
          <Text style={s.meta} numberOfLines={1}>{[c.type, c.neighborhood].filter(Boolean).join(' · ')}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function EventCard({ e }: { e: ECard }) {
  const u = img(e.image_url);
  return (
    <TouchableOpacity activeOpacity={0.85} style={{ width: 264 }} onPress={() => { tap(); router.push(`/event/${e.id}`); }}>
      <View style={{ width: 264, height: 196, borderRadius: 14, overflow: 'hidden', backgroundColor: C.raise }}>
        {u ? <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} /> : null}
      </View>
      <Text style={[s.eyebrowSm, { marginTop: 10 }]} numberOfLines={1}>{dayLabel(e.date).toUpperCase()}{e.time ? `  ·  ${e.time.slice(0, 5)}` : ''}</Text>
      <Text style={s.nameM} numberOfLines={2}>{e.title}</Text>
      {e.venue_name ? <Text style={s.meta} numberOfLines={1}>{e.venue_name}</Text> : null}
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState<string | null>(null);
  const [hood, setHood] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [focused, setFocused] = useState(true);
  const [heroInView, setHeroInView] = useState(true);
  const reqId = useRef(0);

  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));

  useEffect(() => {
    (async () => {
      try {
        const saved = JSON.parse((await AsyncStorage.getItem(STORE)) || 'null');
        if (saved?.region) { setRegion(saved.region); setHood(saved.neighborhood || null); return; }
        const city = await AsyncStorage.getItem('@lumina_selected_city');
        setRegion(city && city !== 'Near Me' ? city : 'Manhattan');
      } catch { setRegion('Manhattan'); }
    })();
  }, []);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!region) return;
    const my = ++reqId.current;
    if (!opts?.quiet) setLoading(true);
    setFailed(false);
    try {
      const q = new URLSearchParams({ region });
      if (hood) q.set('neighborhood', hood);
      if (mood) q.set('mood', mood);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(`${API}/api/explore/feed?${q.toString()}`, { signal: ctrl.signal });
      clearTimeout(t);
      const json = await res.json();
      if (my !== reqId.current) return;
      if (!json?.ok) throw new Error('bad');
      setFeed(json);
      if (json.region !== region) setRegion(json.region);
      if (hood && !json.neighborhood) setHood(null);
    } catch {
      if (my === reqId.current) setFailed(true);
    } finally {
      if (my === reqId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [region, hood, mood]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (region) AsyncStorage.setItem(STORE, JSON.stringify({ region, neighborhood: hood })).catch(() => {});
  }, [region, hood]);

  const chooseArea = (r: string, n: string | null) => { tap(); setRegion(r); setHood(n); setAreaOpen(false); };
  const chooseMood = (m: string | null) => { tap(); setMood(m); };
  const areaLabel = hood ? `${hood}` : region || 'Manhattan';
  // VIBERYTE_MAP_STAGE1: open the existing Places map with the current Explore selection
  // Only moods with an exact, verified Places filter carry over; others open the area unfiltered.
  const MOOD_TO_INTENT: Record<string, string> = { date_night: 'dateNight', dinner: 'dinner', drinks: 'drinks' };
  const openMap = () => {
    tap();
    const label = mood && MOOD_TO_INTENT[mood] ? feed?.moods.find((m) => m.key === mood)?.label : undefined;
    const where = hood || region || 'Manhattan';
    router.push({ pathname: '/places', params: {
      source: 'query', mode: 'map', city: region || 'Manhattan',
      ...(hood ? { neighborhood: hood } : {}),
      ...(mood && MOOD_TO_INTENT[mood] ? { intent: MOOD_TO_INTENT[mood] } : {}),
      title: label ? `${label} · ${where}` : where,
    } });
  };
  const hero = feed?.hero;

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const vis = e.nativeEvent.contentOffset.y < HERO_H * 0.9;
          setHeroInView((p) => (p === vis ? p : vis));
        }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.ivory} onRefresh={() => { setRefreshing(true); load({ quiet: true }); }} />}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}>

        <View style={[s.pad, s.headRow]}>
          <Text style={s.title}>Explore</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={s.mapBtn} onPress={openMap} accessibilityLabel="Open map">
              <Ionicons name="map-outline" size={16} color={C.champ} />
              <Text style={s.mapBtnText}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.circle} onPress={() => { tap(); router.push('/search'); }} accessibilityLabel="Search">
              <Ionicons name="search" size={18} color={C.ivory} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[s.pad, s.areaRow]} onPress={() => { tap(); setAreaOpen(true); }} accessibilityLabel="Change area">
          <Ionicons name="location" size={14} color={C.champ} />
          <Text style={s.areaText} numberOfLines={1}>{areaLabel}{hood && region ? `, ${region}` : ''}</Text>
          <Ionicons name="chevron-down" size={14} color={C.muted} />
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moodRow}>
          {[{ key: null as string | null, label: 'For you' }, ...(feed?.moods || [])].map((m) => {
            const on = mood === m.key;
            return (
              <TouchableOpacity key={m.key || 'all'} onPress={() => chooseMood(m.key)} style={[s.mood, on && s.moodOn]}>
                <Text style={[s.moodText, on && s.moodTextOn]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading && !feed ? (
          <View style={s.pad}>
            <View style={[s.skel, { height: HERO_H, borderRadius: 20 }]} />
            <View style={[s.skel, { height: 18, width: '50%', marginTop: 28 }]} />
          </View>
        ) : failed && !feed ? (
          <View style={[s.pad, s.center]}>
            <Text style={s.h2}>Couldn't load Explore</Text>
            <TouchableOpacity style={[s.ghost, { marginTop: 14 }]} onPress={() => load()}><Text style={s.ghostText}>Try again</Text></TouchableOpacity>
          </View>
        ) : feed && !hero && feed.sections.length === 0 ? (
          <View style={[s.pad, s.center]}>
            <Text style={s.h2}>Nothing confirmed here yet</Text>
            <Text style={[s.meta, { marginTop: 6, textAlign: 'center' }]}>Try another mood or a wider area.</Text>
            <TouchableOpacity style={[s.ghost, { marginTop: 14 }]} onPress={() => { setMood(null); setHood(null); }}><Text style={s.ghostText}>Show everything</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={{ opacity: loading ? 0.5 : 1 }}>
            {hero ? (
              <Pressable style={s.hero} onPress={() => { tap(); router.push(`/venue/${hero.id}`); }}>
                {img(hero.poster) ? <Image source={{ uri: img(hero.poster)! }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : null}
                {hero.video ? <HeroVideo key={hero.video} uri={hero.video} playing={focused && heroInView && !areaOpen} /> : null}
                <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill}
                  colors={['rgba(9,9,11,0)', 'rgba(9,9,11,0)', 'rgba(9,9,11,0.85)']} locations={[0, 0.45, 1]} />
                <View style={s.heroText} pointerEvents="none">
                  <Text style={s.eyebrow}>{['Viberyte pick', hero.neighborhood].filter(Boolean).join(' · ').toUpperCase()}</Text>
                  <Text style={s.heroName} numberOfLines={2}>{hero.name}</Text>
                  {hero.why ? <Text style={s.why} numberOfLines={2}>{hero.why}</Text> : null}
                </View>
              </Pressable>
            ) : null}

            {feed?.sections.map((sec) => (
              <View key={sec.key} style={s.section}>
                <View style={[s.pad, s.secHead]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{sec.title}</Text>
                    {sec.sub ? <Text style={s.sub}>{sec.sub}</Text> : null}
                  </View>
                  {sec.mood && !mood ? (
                    <TouchableOpacity onPress={() => chooseMood(sec.mood!)}><Text style={s.link}>See all</Text></TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast"
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingTop: 12 }}>
                  {sec.kind === 'events'
                    ? sec.items.map((e: ECard) => <EventCard key={`e-${e.id}`} e={e} />)
                    : sec.items.map((c: VCard) => <VenueCard key={`v-${c.id}`} c={c} size={sec.size} />)}
                </ScrollView>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={areaOpen} transparent animationType="slide" onRequestClose={() => setAreaOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setAreaOpen(false)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.grabber} />
          <Text style={[s.h2, { marginBottom: 12 }]}>Where</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
            {(feed?.regions || ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'North Jersey']).map((r) => {
              const on = r === region;
              return (
                <TouchableOpacity key={r} onPress={() => chooseArea(r, null)} style={[s.mood, on && s.moodOn]}>
                  <Text style={[s.moodText, on && s.moodTextOn]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={s.hoodRow} onPress={() => chooseArea(region || 'Manhattan', null)}>
              <Text style={s.hoodText}>All of {region}</Text>
              {!hood ? <Ionicons name="checkmark" size={18} color={C.ivory} /> : null}
            </TouchableOpacity>
            {(feed?.neighborhoods || []).map((n) => (
              <TouchableOpacity key={n.name} style={s.hoodRow} onPress={() => chooseArea(region || 'Manhattan', n.name)}>
                <Text style={s.hoodText}>{n.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={s.meta}>{n.count}</Text>
                  {hood === n.name ? <Ionicons name="checkmark" size={18} color={C.ivory} /> : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ground },
  pad: { paddingHorizontal: 20 },
  center: { alignItems: 'center', paddingTop: 80 },
  skel: { backgroundColor: C.raise, borderRadius: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: C.ivory, fontSize: 34, fontWeight: '700', letterSpacing: -0.8 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: C.raise, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.14)',
  },
  mapBtnText: { color: C.ivory, fontSize: 15, fontWeight: '600' },
  circle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.raise, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.14)',
  },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start', paddingVertical: 6 },
  areaText: { color: C.soft, fontSize: 15, fontWeight: '500', maxWidth: W - 100 },
  moodRow: { paddingHorizontal: 20, gap: 8, paddingTop: 10, paddingBottom: 22 },
  mood: { paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  moodOn: { backgroundColor: C.raise, borderColor: 'rgba(243,240,233,0.35)' },
  moodText: { color: C.muted, fontSize: 15, fontWeight: '500' },
  moodTextOn: { color: C.ivory, fontWeight: '600' },
  hero: { marginHorizontal: 20, height: HERO_H, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface, marginBottom: 34 },
  heroText: { position: 'absolute', left: 18, right: 18, bottom: 20, gap: 6 },
  eyebrow: { color: '#C9C5BE', fontSize: 12, fontWeight: '600', letterSpacing: 1.4 },
  heroName: { color: C.ivory, fontSize: 32, lineHeight: 35, fontWeight: '700', letterSpacing: -0.7 },
  why: { color: C.soft, fontSize: 15, lineHeight: 21 },
  section: { paddingBottom: 32 },
  secHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  h2: { color: C.ivory, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  sub: { color: C.muted, fontSize: 14, marginTop: 3 },
  link: { color: C.champ, fontSize: 15, fontWeight: '600' },
  eyebrowSm: { color: C.champ, fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  nameM: { color: C.ivory, fontSize: 18, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2, marginTop: 4 },
  nameS: { color: C.ivory, fontSize: 15, fontWeight: '600', marginTop: 8 },
  meta: { color: C.muted, fontSize: 13, marginTop: 3 },
  initial: { color: C.muted, fontSize: 28, fontWeight: '600', textAlign: 'center', marginTop: '22%' },
  ghost: { height: 44, paddingHorizontal: 20, borderRadius: 12, backgroundColor: C.raise, justifyContent: 'center' },
  ghostText: { color: C.ivory, fontSize: 15, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line,
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(243,240,233,0.2)', marginBottom: 14 },
  hoodRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line,
  },
  hoodText: { color: C.ivory, fontSize: 16 },
});
