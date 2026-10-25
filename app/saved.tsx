// app/saved.tsx — Viberyte Saved V2 (VBR_SAVED_V2)
// Spots and Events in one place. iOS-native: large title, segmented control, inset grouped lists.
// Black and ivory only. Undo on remove, pull to refresh.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { getSaved, saveVenue, unsaveVenue, SavedVenue } from '../lib/saved';

const C = {
  bg: '#09090B', group: '#1C1C1E', seg: '#1C1C1E', segOn: '#3A3A3C', line: 'rgba(243,240,233,0.10)',
  ivory: '#F3F0E9', dim: 'rgba(243,240,233,0.58)', faint: 'rgba(243,240,233,0.34)',
};
const API = 'https://viberyte.com';
type Tab = 'venues' | 'events';

async function resolveUid(): Promise<number | null> {
  const num = (x: any) => { const n = parseInt(String(x ?? '').replace(/"/g, ''), 10); return Number.isFinite(n) && n > 0 ? n : null; };
  try {
    const a = num(await AsyncStorage.getItem('@lumina_user_id')); if (a) return a;
    for (const k of ['@lumina_user', '@lumina_profile']) {
      try { const o = JSON.parse((await AsyncStorage.getItem(k)) || 'null'); const b = num(o?.user_id) || num(o?.userId) || num(o?.id); if (b) return b; } catch {}
    }
  } catch {}
  return null;
}

function fmtDate(s?: string) {
  if (!s) return '';
  const d = new Date(String(s).length <= 10 ? `${s}T12:00:00` : s);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('venues');
  const [venues, setVenues] = useState<SavedVenue[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [canSync, setCanSync] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [undo, setUndo] = useState<SavedVenue | null>(null);
  const undoAnim = useRef(new Animated.Value(0)).current;
  const undoTimer = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const [v, uid] = await Promise.all([getSaved(), resolveUid()]);
      setVenues(v); setCanSync(!!uid);
      if (uid) {
        try { const r = await fetch(`${API}/api/favorites?userId=${uid}&type=event`); const d = await r.json(); setEvents(Array.isArray(d?.saved) ? d.saved : []); }
        catch { setEvents([]); }
      } else setEvents([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const groups = useMemo(() => {
    const m = new Map<string, SavedVenue[]>();
    for (const v of venues) { const k = v.neighborhood || v.city || 'Other'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(v); }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [venues]);

  const showUndo = (v: SavedVenue) => {
    setUndo(v);
    Animated.timing(undoAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => Animated.timing(undoAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setUndo(null)), 4000);
  };
  const removeVenue = async (v: SavedVenue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setVenues((l) => l.filter((x) => x.id !== v.id));
    await unsaveVenue(v.id); showUndo(v);
  };
  const undoRemove = async () => {
    if (!undo) return; const v = undo;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (undoTimer.current) clearTimeout(undoTimer.current);
    Animated.timing(undoAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setUndo(null));
    await saveVenue(v);
    setVenues((l) => (l.some((x) => x.id === v.id) ? l : [v, ...l]));
  };
  const eventId = (it: any) => it?.item_id ?? it?.itemId ?? it?.details?.id ?? it?.id;
  const removeEvent = async (it: any) => {
    const uid = await resolveUid(); const eid = eventId(it);
    if (!uid || eid === undefined) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setEvents((l) => l.filter((x) => eventId(x) !== eid));
    fetch(`${API}/api/favorites?userId=${uid}&itemType=event&itemId=${eid}`, { method: 'DELETE' }).catch(() => {});
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const Empty = ({ icon, title, text, cta }: { icon: any; title: string; text: string; cta?: boolean }) => (
    <View style={s.empty}>
      <Ionicons name={icon} size={40} color={C.faint} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
      {cta ? (
        <TouchableOpacity style={s.cta} onPress={() => router.push('/(tabs)/explore')} activeOpacity={0.85}>
          <Text style={s.ctaText}>Explore</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const Row = ({ img, letter, icon, title, meta, onPress, onRemove, last }: { img?: string; letter?: string; icon?: any; title: string; meta?: string; onPress: () => void; onRemove: () => void; last: boolean }) => (
    <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}>
      {img ? <Image source={{ uri: img }} style={s.thumb} contentFit="cover" transition={150} />
        : <View style={[s.thumb, s.mono]}>{icon ? <Ionicons name={icon} size={18} color={C.dim} /> : <Text style={s.monoText}>{letter}</Text>}</View>}
      <View style={[s.rowBody, !last && s.hair]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
          {meta ? <Text style={s.rowMeta} numberOfLines={1}>{meta}</Text> : null}
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={12} style={s.iconBtn} accessibilityLabel={`Remove ${title} from Saved`}>
          <Ionicons name="bookmark" size={18} color={C.ivory} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderVenues = () => {
    if (!venues.length) return <Empty icon="bookmark-outline" title="Nothing saved yet" text="Tap the bookmark on any spot and it lands here, sorted by area." cta />;
    return groups.map(([area, list]) => (
      <View key={area} style={s.section}>
        <Text style={s.sectionHead}>{area.toUpperCase()}  <Text style={{ color: C.faint }}>{list.length}</Text></Text>
        <View style={s.group}>
          {list.map((v, i) => (
            <Row key={v.id} img={v.photo || undefined} letter={v.name.charAt(0).toUpperCase()} title={v.name}
              meta={[v.category, v.city && v.city !== area ? v.city : null].filter(Boolean).join(' · ')}
              onPress={() => router.push(`/venue/${v.id}` as any)} onRemove={() => removeVenue(v)} last={i === list.length - 1} />
          ))}
        </View>
      </View>
    ));
  };
  const renderEvents = () => {
    if (!canSync) return <Empty icon="ticket-outline" title="Sign in to save events" text="Saved events live on your account so they follow you across devices." />;
    if (!events.length) return <Empty icon="ticket-outline" title="No events saved" text="Save an event from its page and it shows up here." cta />;
    return (
      <View style={s.section}>
        <View style={s.group}>
          {events.map((it, i) => {
            const d = it?.details || it?.event || it; const eid = eventId(it);
            const title = d?.name || d?.title || 'Event';
            const meta = [fmtDate(d?.date || d?.event_date), d?.venue_name || d?.venue_name_cache].filter(Boolean).join(' · ');
            return <Row key={String(eid)} img={d?.image_url || d?.cover_image_url} icon="ticket-outline" title={title} meta={meta}
              onPress={() => router.push(`/event/${eid}` as any)} onRemove={() => removeEvent(it)} last={i === events.length - 1} />;
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.nav, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={back} hitSlop={12} style={s.backBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={C.ivory} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.ivory} />}>
        <Text style={s.largeTitle}>Saved</Text>
        <View style={s.seg}>
          {(['venues', 'events'] as Tab[]).map((t) => {
            const n = t === 'venues' ? venues.length : events.length;
            return (
              <TouchableOpacity key={t} style={[s.segItem, tab === t && s.segOn]} activeOpacity={0.85} onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(t); }}>
                <Text style={[s.segText, tab === t && s.segTextOn]}>{t === 'venues' ? 'Spots' : 'Events'}{n ? ` · ${n}` : ''}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {loading ? <View style={s.empty}><ActivityIndicator color={C.ivory} /></View> : tab === 'venues' ? renderVenues() : renderEvents()}
      </ScrollView>

      {undo ? (
        <Animated.View style={[s.undo, { bottom: insets.bottom + 24, opacity: undoAnim, transform: [{ translateY: undoAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
          <Text style={s.undoText} numberOfLines={1}>Removed {undo.name}</Text>
          <TouchableOpacity onPress={undoRemove} hitSlop={10}><Text style={s.undoBtn}>Undo</Text></TouchableOpacity>
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  nav: { paddingHorizontal: 8, paddingBottom: 2 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  largeTitle: { color: C.ivory, fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginTop: 2, marginBottom: 14, marginLeft: 4 },
  seg: { flexDirection: 'row', padding: 2, borderRadius: 9, backgroundColor: C.seg, marginBottom: 6 },
  segItem: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
  segOn: { backgroundColor: C.segOn },
  segText: { color: C.dim, fontSize: 14, fontWeight: '500' },
  segTextOn: { color: C.ivory, fontWeight: '600' },
  section: { marginTop: 22 },
  sectionHead: { color: C.dim, fontSize: 12.5, fontWeight: '500', letterSpacing: 0.4, marginBottom: 8, marginLeft: 16 },
  group: { backgroundColor: C.group, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  thumb: { width: 48, height: 48, borderRadius: 9, backgroundColor: '#2C2C2E', marginVertical: 9 },
  mono: { alignItems: 'center', justifyContent: 'center' },
  monoText: { color: C.dim, fontSize: 18, fontWeight: '600' },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12, paddingRight: 8, alignSelf: 'stretch' },
  hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { color: C.ivory, fontSize: 16, fontWeight: '500' },
  rowMeta: { color: C.dim, fontSize: 13.5, marginTop: 2 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 28 },
  emptyTitle: { color: C.ivory, fontSize: 20, fontWeight: '600', marginTop: 14, letterSpacing: -0.3 },
  emptyText: { color: C.dim, fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 6 },
  cta: { marginTop: 20, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 100, backgroundColor: C.ivory },
  ctaText: { color: '#000', fontSize: 15, fontWeight: '600' },
  undo: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2C2C2E' },
  undoText: { color: C.ivory, fontSize: 14, flex: 1, marginRight: 12 },
  undoBtn: { color: C.ivory, fontSize: 14, fontWeight: '700' },
});
