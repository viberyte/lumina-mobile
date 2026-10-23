// app/saved.tsx — Viberyte Saved V1
// One list for every heart in the app (cards, venue page, map), grouped by area.
// Brand palette, honest empty states, undo on remove, pull to refresh.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
  RefreshControl, Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { getSaved, saveVenue, unsaveVenue, SavedVenue } from '../lib/saved';

const C = {
  bg: '#09090B', card: 'rgba(243,240,233,0.04)', line: 'rgba(243,240,233,0.08)',
  ivory: '#F3F0E9', dim: 'rgba(243,240,233,0.55)', faint: 'rgba(243,240,233,0.32)',
  gold: '#C5A36B',
};
const API = 'https://viberyte.com';
type Tab = 'venues' | 'events' | 'flows';

async function resolveUid(): Promise<number | null> {
  // Same rule the app always used (parseInt), plus fallbacks to the stored user/profile.
  const num = (x: any) => { const n = parseInt(String(x ?? '').replace(/"/g, ''), 10); return Number.isFinite(n) && n > 0 ? n : null; };
  try {
    const raw = await AsyncStorage.getItem('@lumina_user_id');
    const a = num(raw); if (a) return a;
    for (const k of ['@lumina_user', '@lumina_profile']) {
      try {
        const o = JSON.parse((await AsyncStorage.getItem(k)) || 'null');
        const b = num(o?.user_id) || num(o?.userId) || num(o?.id); if (b) return b;
      } catch {}
    }
  } catch {}
  return null;
}
const numericUid = resolveUid;

function fmtDate(s?: string) {
  if (!s) return '';
  const d = new Date(String(s).length <= 10 ? `${s}T12:00:00` : s);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('venues');
  const [venues, setVenues] = useState<SavedVenue[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [canSync, setCanSync] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [undo, setUndo] = useState<SavedVenue | null>(null);
  const undoAnim = useRef(new Animated.Value(0)).current;
  const undoTimer = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const [v, uid, flowsRaw] = await Promise.all([
        getSaved(), numericUid(), AsyncStorage.getItem('@lumina_saved_flows').catch(() => null),
      ]);
      setVenues(v);
      setCanSync(!!uid);
      try { setFlows(flowsRaw ? JSON.parse(flowsRaw) : []); } catch { setFlows([]); }
      if (uid) {
        try {
          const r = await fetch(`${API}/api/favorites?userId=${uid}&type=event`);
          const d = await r.json();
          setEvents(Array.isArray(d?.saved) ? d.saved : []);
        } catch { setEvents([]); }
      } else setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const groups = useMemo(() => {
    const m = new Map<string, SavedVenue[]>();
    for (const v of venues) {
      const k = v.neighborhood || v.city || 'Other';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(v);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [venues]);

  const showUndo = (v: SavedVenue) => {
    setUndo(v);
    Animated.timing(undoAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      Animated.timing(undoAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setUndo(null));
    }, 4000);
  };

  const removeVenue = async (v: SavedVenue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVenues(list => list.filter(x => x.id !== v.id));
    await unsaveVenue(v.id);
    showUndo(v);
  };

  const undoRemove = async () => {
    if (!undo) return;
    const v = undo;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    Animated.timing(undoAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setUndo(null));
    await saveVenue(v);
    setVenues(list => (list.some(x => x.id === v.id) ? list : [v, ...list]));
  };

  const eventId = (it: any) => it?.item_id ?? it?.itemId ?? it?.details?.id ?? it?.id;

  const removeEvent = async (it: any) => {
    const uid = await numericUid();
    const eid = eventId(it);
    if (!uid || eid === undefined) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEvents(list => list.filter(x => eventId(x) !== eid));
    fetch(`${API}/api/favorites?userId=${uid}&itemType=event&itemId=${eid}`, { method: 'DELETE' }).catch(() => {});
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const counts = { venues: venues.length, events: events.length, flows: flows.length };

  const Empty = ({ icon, title, text, cta }: { icon: any; title: string; text: string; cta?: boolean }) => (
    <View style={s.empty}>
      <View style={s.emptyIcon}><Ionicons name={icon} size={22} color={C.gold} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
      {cta && (
        <TouchableOpacity style={s.cta} onPress={() => router.push('/(tabs)/explore')} activeOpacity={0.8}>
          <Text style={s.ctaText}>Open Explore</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderVenues = () => {
    if (!venues.length) return <Empty icon="bookmark-outline" title="Nothing saved yet" text="Tap the bookmark on any spot and it lands here, sorted by area." cta />;
    return groups.map(([area, list]) => (
      <View key={area} style={s.group}>
        <View style={s.groupHead}>
          <Text style={s.groupTitle}>{area}</Text>
          <Text style={s.groupCount}>{list.length}</Text>
        </View>
        {list.map(v => (
          <TouchableOpacity key={v.id} style={s.row} activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/venue/${v.id}` as any); }}>
            {v.photo ? (
              <Image source={{ uri: v.photo }} style={s.thumb} contentFit="cover" transition={150} />
            ) : (
              <View style={[s.thumb, s.mono]}><Text style={s.monoText}>{v.name.charAt(0).toUpperCase()}</Text></View>
            )}
            <View style={s.rowBody}>
              <Text style={s.rowTitle} numberOfLines={1}>{v.name}</Text>
              <Text style={s.rowMeta} numberOfLines={1}>
                {[v.category, v.city && v.city !== area ? v.city : null].filter(Boolean).join(' · ') || 'Saved'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeVenue(v)} hitSlop={12} style={s.iconBtn}
              accessibilityLabel={`Remove ${v.name} from Saved`}>
              <Ionicons name="bookmark" size={18} color={C.gold} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  const renderEvents = () => {
    if (!canSync) return <Empty icon="ticket-outline" title="Sign in to save events" text="Saved events live on your account so they follow you across devices." />;
    if (!events.length) return <Empty icon="ticket-outline" title="No events saved" text="Save an event from its page and it shows up here." cta />;
    return (
      <View style={s.group}>
        {events.map(it => {
          const d = it?.details || it?.event || it;
          const eid = eventId(it);
          const img = d?.image_url || d?.cover_image_url;
          const title = d?.name || d?.title || 'Event';
          const meta = [fmtDate(d?.date || d?.event_date), d?.venue_name || d?.venue_name_cache].filter(Boolean).join(' · ');
          return (
            <TouchableOpacity key={String(eid)} style={s.row} activeOpacity={0.85} onPress={() => router.push(`/event/${eid}` as any)}>
              {img ? <Image source={{ uri: img }} style={s.thumb} contentFit="cover" transition={150} />
                   : <View style={[s.thumb, s.mono]}><Ionicons name="ticket-outline" size={18} color={C.gold} /></View>}
              <View style={s.rowBody}>
                <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
                {!!meta && <Text style={s.rowMeta} numberOfLines={1}>{meta}</Text>}
              </View>
              <TouchableOpacity onPress={() => removeEvent(it)} hitSlop={12} style={s.iconBtn} accessibilityLabel={`Remove ${title} from Saved`}>
                <Ionicons name="bookmark" size={18} color={C.gold} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderFlows = () => {
    if (!flows.length) return <Empty icon="git-branch-outline" title="No saved flows" text="Save a night plan and it appears here." />;
    return (
      <View style={s.group}>
        {flows.map((f: any, i: number) => (
          <TouchableOpacity key={(f.slug || '') + i} style={s.row} activeOpacity={0.85} onPress={() => router.push(`/flow/${f.slug}` as any)}>
            <View style={[s.thumb, s.mono]}><Ionicons name="git-branch-outline" size={18} color={C.gold} /></View>
            <View style={s.rowBody}>
              <Text style={s.rowTitle} numberOfLines={1}>{f.title || 'Flow'}</Text>
              <Text style={s.rowMeta}>{f.savedAt ? `Saved ${fmtDate(f.savedAt)}` : 'Saved'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.faint} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={back} hitSlop={12} style={s.backBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={C.ivory} />
        </TouchableOpacity>
        <Text style={s.title}>Saved</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.tabs}>
        {(['venues', 'events', 'flows'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} activeOpacity={0.8}
            onPress={() => { Haptics.selectionAsync(); setTab(t); }}>
            <Text style={[s.tabText, tab === t && s.tabTextOn]}>
              {t === 'venues' ? 'Spots' : t === 'events' ? 'Events' : 'Flows'}
              {counts[t] ? `  ${counts[t]}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.gold} />}
      >
        {loading ? (
          <View style={s.empty}><ActivityIndicator color={C.gold} /></View>
        ) : tab === 'venues' ? renderVenues() : tab === 'events' ? renderEvents() : renderFlows()}
      </ScrollView>

      {undo && (
        <Animated.View style={[s.undo, { bottom: insets.bottom + 24, opacity: undoAnim,
          transform: [{ translateY: undoAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
          <Text style={s.undoText} numberOfLines={1}>Removed {undo.name}</Text>
          <TouchableOpacity onPress={undoRemove} hitSlop={10}><Text style={s.undoBtn}>Undo</Text></TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.ivory, fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, padding: 3, borderRadius: 12, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabOn: { backgroundColor: 'rgba(197,163,107,0.16)' },
  tabText: { color: C.dim, fontSize: 14, fontWeight: '500' },
  tabTextOn: { color: C.ivory, fontWeight: '600' },
  group: { marginTop: 14 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  groupTitle: { color: C.gold, fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  groupCount: { color: C.faint, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, borderRadius: 14, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: 'rgba(243,240,233,0.06)' },
  mono: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(197,163,107,0.35)' },
  monoText: { color: C.gold, fontSize: 20, fontWeight: '600' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: C.ivory, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  rowMeta: { color: C.dim, fontSize: 13 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(197,163,107,0.12)', marginBottom: 16 },
  emptyTitle: { color: C.ivory, fontSize: 17, fontWeight: '600', marginBottom: 6 },
  emptyText: { color: C.dim, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  cta: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 22, borderWidth: 1, borderColor: C.gold },
  ctaText: { color: C.gold, fontSize: 14, fontWeight: '600' },
  undo: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1A1A1D', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  undoText: { color: C.ivory, fontSize: 14, flex: 1, marginRight: 12 },
  undoBtn: { color: C.gold, fontSize: 14, fontWeight: '700' },
});
