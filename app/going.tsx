// app/going.tsx — VBR_PLAN_V2: Your plans (who's in + new-join banner), your list, 3-step Make a plan (headline first).
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Image, Pressable, TextInput, ScrollView, Share, ActivityIndicator, Platform, StyleSheet, Linking, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const KEY = '@vbr_going_v1', NAME_KEY = '@vbr_name', PLANS = '@vbr_plans_v1', SEEN = '@vbr_plans_seen_v1';
const IVORY = '#F3F0E9', MUTED = 'rgba(243,240,233,0.62)', FAINT = 'rgba(243,240,233,0.38)', LINE = 'rgba(243,240,233,0.10)', CARD = '#141416', BG = '#09090B';
const WHO = ['I’m going', 'We’re going', 'Date night', 'Birthday', 'Girls night', 'Guys night'];
const WHEN = ['Tonight', 'Tomorrow', 'Friday', 'Saturday', 'Sunday'];
type Item = { slug: string; name: string; sub?: string | null; href: string; image?: string | null; at: number };
type MyPlan = { id: string; headline: string; at: number };
type Status = { ins: { name: string; at: string }[]; line: string; first_image: string | null };

const readJ = async (k: string, d: any) => { try { const v = JSON.parse((await AsyncStorage.getItem(k)) || ''); return v ?? d; } catch { return d; } };
const tap = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} };

const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
  <Pressable onPress={() => { tap(); onPress(); }} style={[s.chip, on && s.chipOn]}><Text style={[s.chipT, on && s.chipTOn]}>{label}</Text></Pressable>
);
const Lbl = ({ t }: { t: string }) => <Text style={s.lbl}>{t}</Text>;
const Step = ({ n, t, done }: { n: number; t: string; done?: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 26, marginBottom: 10 }}>
    <View style={[s.stepN, done && s.stepNOn]}><Text style={{ color: done ? BG : FAINT, fontSize: 11, fontWeight: '800' }}>{n}</Text></View>
    <Text style={[s.lbl, { marginTop: 0, marginBottom: 0, color: done ? IVORY : FAINT }]}>{t}</Text>
  </View>
);

export default function GoingScreen() {
  const [list, setList] = useState<Item[] | null>(null);
  const [plans, setPlans] = useState<MyPlan[]>([]); const [status, setStatus] = useState<Record<string, Status>>({}); const [seen, setSeen] = useState<Record<string, number>>({});
  const [banner, setBanner] = useState<{ id: string; text: string } | null>(null);
  const [mode, setMode] = useState<'list' | 'plan'>('list');
  const [order, setOrder] = useState<string[]>([]); const [times, setTimes] = useState<Record<string, string>>({});
  const [who, setWho] = useState(''); const [when, setWhen] = useState('');
  const [note, setNote] = useState(''); const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      const l = await readJ(KEY, []); setList(Array.isArray(l) ? l : []);
      try { const n = await AsyncStorage.getItem(NAME_KEY); if (n) setName(n); } catch {}
      const p: MyPlan[] = await readJ(PLANS, []); const sn: Record<string, number> = await readJ(SEEN, {}); setPlans(p); setSeen(sn);
      const st: Record<string, Status> = {};
      await Promise.all(p.map(async (x) => { try { const r = await fetch(`https://viberyte.com/api/go/${x.id}`); const j = await r.json(); if (j?.ins) st[x.id] = j; } catch {} }));
      setStatus(st);
      const fresh = p.find((x) => (st[x.id]?.ins.length ?? 0) > (sn[x.id] ?? 0));
      if (fresh) { const ins = st[fresh.id].ins; const latest = ins[ins.length - 1]?.name; setBanner({ id: fresh.id, text: `${latest} is in · ${fresh.headline}` }); try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} }
    })();
  }, []));

  const markSeen = async (id: string) => { const sn = { ...seen, [id]: status[id]?.ins.length ?? 0 }; setSeen(sn); try { await AsyncStorage.setItem(SEEN, JSON.stringify(sn)); } catch {} };
  const openPlan = (id: string) => { markSeen(id); setBanner(null); Linking.openURL(`https://viberyte.com/go/${id}`); };
  const headline = [who, when].filter(Boolean).join(' · ');
  const toggle = (slug: string) => { tap(); setOrder((o) => (o.includes(slug) ? o.filter((x) => x !== slug) : [...o, slug])); };
  const reset = () => { setOrder([]); setTimes({}); setWho(''); setWhen(''); setNote(''); setErr(''); };
  const remove = async (slug: string) => { const next = (list || []).filter((x) => x.slug !== slug); setList(next); try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {} };

  const share = async () => {
    if (!list) return; setErr('');
    if (!headline) { setErr('Step 1 — pick a headline first.'); return; }
    const stops = order.map((slug) => list.find((x) => x.slug === slug)).filter(Boolean).map((x: any) => ({ slug: x.slug, name: x.name, sub: x.sub, href: x.href, image: x.image, time: (times[x.slug] || '').trim() || null }));
    if (!stops.length) { setErr('Step 2 — tap the places in the order you want them.'); return; }
    setBusy(true);
    try {
      try { await AsyncStorage.setItem(NAME_KEY, name.trim()); } catch {}
      const r = await fetch('https://viberyte.com/api/go', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stops, who, when_label: when, note, from_name: name.trim() }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not make the plan');
      const mine = [{ id: j.id, headline, at: Date.now() }, ...plans].slice(0, 40); setPlans(mine); try { await AsyncStorage.setItem(PLANS, JSON.stringify(mine)); } catch {}
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      await Share.share(Platform.OS === 'ios' ? { url: j.url, message: headline } : { message: `${headline}\n${j.url}` });
      setMode('list'); reset();
    } catch (e: any) { setErr(e?.message || 'Something went wrong'); } finally { setBusy(false); }
  };

  const Header = (
    <View>
      <Pressable onPress={() => (mode === 'plan' ? (setMode('list'), reset()) : router.back())} hitSlop={12} style={{ alignSelf: 'flex-start', marginBottom: 14 }}><Ionicons name="chevron-back" size={26} color={IVORY} /></Pressable>
      <Text style={s.eyebrow}>{mode === 'list' ? 'VIBERYTE' : 'YOUR LIST'}</Text>
      <Text style={s.h1}>{mode === 'list' ? 'Your list' : 'Make a plan'}</Text>
      <Text style={s.sub}>{mode === 'list' ? 'Places you said you’re going. Kept on this phone.' : 'Three steps. Takes ten seconds.'}</Text>

      {mode === 'list' && plans.length ? (
        <View style={{ marginTop: 16 }}>
          <Lbl t="YOUR PLANS" />
          {plans.map((p) => { const st = status[p.id]; const n = st?.ins.length ?? 0; const fresh = n > (seen[p.id] ?? 0); return (
            <Pressable key={p.id} onPress={() => openPlan(p.id)} style={s.row}>
              <View style={s.thumb}>{st?.first_image ? <Image source={{ uri: st.first_image }} style={{ width: '100%', height: '100%' }} /> : null}{fresh ? <View style={s.dot} /> : null}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.name}>{p.headline}</Text>
                <Text numberOfLines={1} style={[s.meta, fresh && { color: IVORY, fontWeight: '600' }]}>{st ? (n ? st.line : 'No one’s in yet — share it again') : ' '}</Text>
              </View>
              <Text style={{ color: FAINT, fontSize: 13, fontWeight: '600' }}>{n ? `${n} in` : ''}</Text>
            </Pressable>
          ); })}
        </View>
      ) : null}

      {mode === 'plan' ? (
        <View>
          <Step n={1} t="PICK A HEADLINE" done={!!headline} />
          <View style={[s.preview, !!headline && { borderColor: IVORY }]}>
            <Text style={s.eyebrow}>{name.trim() ? `FROM ${name.trim().toUpperCase()}` : 'YOUR PLAN'}</Text>
            <Text style={[s.previewT, !headline && { color: FAINT }]}>{headline || 'Who · When'}</Text>
            {!headline ? <Text style={{ color: MUTED, fontSize: 13, marginTop: 6 }}>Tap one from each row below. This is the title your friends see.</Text> : null}
          </View>
          <Lbl t="WHO" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{WHO.map((w) => <Chip key={w} label={w} on={who === w} onPress={() => setWho(who === w ? '' : w)} />)}</ScrollView>
          <Lbl t="WHEN" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{WHEN.map((w) => <Chip key={w} label={w} on={when === w} onPress={() => setWhen(when === w ? '' : w)} />)}</ScrollView>
          <Step n={2} t="TAP PLACES IN ORDER" done={order.length > 0} />
        </View>
      ) : <Lbl t="PLACES" />}
    </View>
  );
  const Footer = mode === 'plan' ? (
    <View style={{ paddingBottom: 8 }}>
      <Step n={3} t="SIGN IT" done={!!name.trim()} />
      <Lbl t="YOUR NAME" /><TextInput value={name} onChangeText={(v) => setName(v.slice(0, 30))} placeholder="So they know who it’s from" placeholderTextColor={FAINT} style={s.inp} />
      <Lbl t="A NOTE (OPTIONAL)" /><TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 80))} placeholder="Wear something nice." placeholderTextColor={FAINT} style={[s.inp, !!note && { fontStyle: 'italic' }]} />
      {err ? <Text style={s.err}>{err}</Text> : null}
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <FlatList
        data={list || []} keyExtractor={(x) => x.slug} ListHeaderComponent={Header} ListFooterComponent={Footer}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 64 : 36, paddingBottom: 150 }} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={list === null ? null : (
          <View style={s.empty}>
            <Text style={{ color: IVORY, fontSize: 17, fontWeight: '700' }}>Nothing here yet</Text>
            <Text style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>Tap “I’m going” on any place and it shows up here.</Text>
            <Pressable onPress={() => router.push('/explore' as any)} style={s.pill}><Text style={s.pillT}>Find somewhere</Text></Pressable>
          </View>
        )}
        renderItem={({ item: x }) => { const n = order.indexOf(x.slug); return (
          <Pressable onPress={() => (mode === 'plan' ? toggle(x.slug) : router.push(x.href as any))} style={s.row}>
            {mode === 'plan' ? <View style={[s.num, n >= 0 && s.numOn]}>{n >= 0 ? <Text style={s.numT}>{n + 1}</Text> : null}</View> : null}
            <View style={s.thumb}>{x.image ? <Image source={{ uri: x.image }} style={{ width: '100%', height: '100%' }} /> : null}</View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={s.name}>{x.name}</Text>
              {x.sub ? <Text numberOfLines={1} style={s.meta}>{x.sub}</Text> : null}
              {mode === 'plan' && n >= 0 ? <TextInput value={times[x.slug] || ''} onChangeText={(v) => setTimes({ ...times, [x.slug]: v.slice(0, 12) })} placeholder="Time (optional)" placeholderTextColor={FAINT} style={s.time} /> : null}
            </View>
            {mode === 'list' ? <Pressable onPress={() => remove(x.slug)} hitSlop={10}><Text style={s.remove}>Remove</Text></Pressable> : null}
          </Pressable>
        ); }}
      />
      {banner ? (
        <Pressable onPress={() => openPlan(banner.id)} style={s.banner}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: IVORY }} />
          <Text numberOfLines={1} style={{ color: IVORY, fontSize: 14, fontWeight: '700', flex: 1 }}>{banner.text}</Text>
          <Pressable onPress={() => { setBanner(null); markSeen(banner.id); }} hitSlop={10}><Ionicons name="close" size={18} color={MUTED} /></Pressable>
        </Pressable>
      ) : null}
      {list && list.length ? (
        <View style={s.bar}>
          {mode === 'list' ? (
            <Pressable onPress={() => { tap(); reset(); setMode('plan'); }} style={s.cta}><Text style={s.ctaT}>{plans.length ? 'Make another plan' : 'Make a plan'}</Text></Pressable>
          ) : (
            <Pressable onPress={share} disabled={busy} style={[s.cta, busy && { opacity: 0.6 }]}>
              {busy ? <ActivityIndicator color={BG} /> : <Text style={s.ctaT}>{!headline ? 'Pick a headline first' : !order.length ? 'Tap places in order' : `Share plan · ${order.length}`}</Text>}
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  eyebrow: { color: FAINT, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  h1: { color: IVORY, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 8 },
  sub: { color: MUTED, fontSize: 15, marginTop: 6, marginBottom: 10 },
  lbl: { color: FAINT, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 20, marginBottom: 10 },
  stepN: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: FAINT, alignItems: 'center', justifyContent: 'center' },
  stepNOn: { backgroundColor: IVORY, borderColor: IVORY },
  chips: { gap: 8, paddingRight: 20 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: LINE },
  chipOn: { backgroundColor: IVORY, borderColor: IVORY },
  chipT: { color: MUTED, fontSize: 13.5, fontWeight: '600' }, chipTOn: { color: BG, fontWeight: '700' },
  preview: { padding: 18, borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: LINE },
  previewT: { color: IVORY, fontSize: 26, fontWeight: '800', letterSpacing: -0.7, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: LINE },
  num: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: FAINT, alignItems: 'center', justifyContent: 'center' },
  numOn: { backgroundColor: IVORY, borderColor: IVORY }, numT: { color: BG, fontSize: 13, fontWeight: '800' },
  thumb: { width: 56, height: 70, borderRadius: 12, overflow: 'hidden', backgroundColor: CARD },
  dot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: IVORY },
  name: { color: IVORY, fontSize: 16, fontWeight: '700' }, meta: { color: MUTED, fontSize: 13, marginTop: 2 },
  time: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: LINE, color: IVORY, fontSize: 13, minWidth: 130 },
  remove: { color: FAINT, fontSize: 13, fontWeight: '600', paddingVertical: 6 },
  inp: { backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, color: IVORY, fontSize: 15 },
  err: { color: '#E0544C', fontSize: 14, marginTop: 14 },
  empty: { marginTop: 28, padding: 22, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: LINE },
  pill: { alignSelf: 'flex-start', marginTop: 16, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, backgroundColor: IVORY }, pillT: { color: BG, fontSize: 14, fontWeight: '700' },
  banner: { position: 'absolute', top: Platform.OS === 'ios' ? 58 : 20, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#1C1C1F', borderWidth: 1, borderColor: 'rgba(243,240,233,0.18)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 16, backgroundColor: BG },
  cta: { padding: 17, borderRadius: 16, backgroundColor: IVORY, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  ctaT: { color: BG, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
});
