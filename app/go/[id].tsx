// app/go/[id].tsx — Make a Plan: the plan, natively. Opened from Your plans, a push tap, or a viberyte.com/go/… link.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, TextInput, Share, Alert, Modal, Linking, ActivityIndicator, Platform, StyleSheet, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API, KEY, NAME_KEY, PLANS, INKEY, readJ, writeJ, fetchPlan, ownerKeyFor, inLine, type PlanData, type Item, type MyPlan } from '../../lib/plans';

const IVORY = '#F3F0E9', MUTED = 'rgba(243,240,233,0.62)', FAINT = 'rgba(243,240,233,0.38)', LINE = 'rgba(243,240,233,0.10)', CARD = '#141416', BG = '#09090B';
const tap = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} };

export default function GoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pid = String(id || '').toLowerCase();
  const [plan, setPlan] = useState<PlanData | null>(null); const [state, setState] = useState<'loading' | 'ok' | 'gone' | 'missing'>('loading');
  const [me, setMe] = useState(''); const [name, setName] = useState(''); const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const r = await fetchPlan(pid);
    if (r.status === 200 && r.data?.id) { setPlan(r.data); setState('ok'); if (r.data.owner && r.data.from_name) setMe(r.data.from_name); } else if (r.status === 410) setState('gone'); else if (r.status === 404) setState('missing'); else if (!plan) setState('missing');
    try { const m = (await readJ<Record<string, string>>(INKEY, {}))[pid]; if (m) setMe(m); const n = await AsyncStorage.getItem(NAME_KEY); if (n) setName(n); } catch {}
  }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mine = plan?.ins.find((i) => i.name.toLowerCase() === me.toLowerCase());
  const inY = !!me && !!mine && mine.status !== 'out'; const outY = !!me && mine?.status === 'out';
  const outs = plan?.ins.filter((i) => i.status === 'out') || [];

  const send = async (status: 'in' | 'out') => {
    const n = (me || name).trim(); if (!n) { setErr('Add your first name so they know who’s in.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${API}/api/go/${pid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n, status }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Try again');
      setPlan(j); setMe(n); setAsking(false); try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      await AsyncStorage.setItem(NAME_KEY, n).catch(() => {}); const m = await readJ<Record<string, string>>(INKEY, {}); m[pid] = n; await writeJ(INKEY, m);
      if (status === 'in') { const mp = await readJ<MyPlan[]>(PLANS, []); if (!mp.some((x) => x.id === pid)) await writeJ(PLANS, [{ id: pid, headline: j.headline, at: Date.now(), from_name: j.from_name, role: 'in' as const }, ...mp].slice(0, 60)); }
      if (status === 'in') { const l = await readJ<Item[]>(KEY, []); const have = new Set(l.map((x) => x.slug)); const add: Item[] = j.stops.filter((s: any) => !have.has(s.slug)).map((s: any) => ({ slug: s.slug, name: s.name, sub: s.sub, href: s.href, image: s.image, at: Date.now() })); if (add.length) await writeJ(KEY, [...add, ...l].slice(0, 60)); }
    } catch (e: any) { setErr(e?.message || 'Try again'); } finally { setBusy(false); }
  };
  const share = async () => { if (!plan) return; try { await Share.share(Platform.OS === 'ios' ? { url: plan.url, message: plan.headline } : { message: `${plan.headline}\n${plan.url}` }); } catch {} };
  const openStop = (href: string) => { if (/^\/(venue|event)\/\d+/.test(href)) router.push(href as any); else Linking.openURL(API + href); };
  const del = () => Alert.alert('Take this plan down?', 'The link stops working for everyone.', [{ text: 'Keep it', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
    const k = await ownerKeyFor(pid); const r = await fetch(`${API}/api/go/${pid}`, { method: 'DELETE', headers: { 'x-owner-key': k } });
    if (r.ok) { const l = (await readJ<MyPlan[]>(PLANS, [])).filter((p) => p.id !== pid); await writeJ(PLANS, l); router.back(); } else Alert.alert('Couldn’t delete', 'Try again in a moment.');
  } }]);

  const Back = <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/going' as any))} hitSlop={12} style={{ alignSelf: 'flex-start', marginBottom: 14 }}><Ionicons name="chevron-back" size={26} color={IVORY} /></Pressable>;
  if (state === 'loading') return <View style={[s.fill, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={IVORY} /></View>;
  if (state !== 'ok' || !plan) return (
    <View style={[s.fill, { padding: 20, paddingTop: Platform.OS === 'ios' ? 64 : 36 }]}>{Back}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={s.eyebrow}>VIBERYTE</Text><Text style={[s.h1, { textAlign: 'center' }]}>{state === 'gone' ? 'This plan was taken down.' : 'Plan not found.'}</Text>
        <Text style={[s.sub, { textAlign: 'center' }]}>Plans change. Make your own in ten seconds.</Text>
        <Pressable onPress={() => router.replace('/going' as any)} style={[s.pill, { marginTop: 20 }]}><Text style={s.pillT}>Make a plan</Text></Pressable>
      </View>
    </View>
  );
  const who = inLine(plan.ins, me);
  return (
    <View style={s.fill}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 64 : 36, paddingBottom: 150 }}>
        {Back}
        {plan.owner ? (
          <View style={s.ownerBar}><Text style={{ color: MUTED, fontSize: 13, flex: 1 }}>Your plan</Text>
            <Pressable onPress={() => { tap(); router.push({ pathname: '/going', params: { edit: pid } } as any); }} style={s.smallBtn}><Text style={s.smallBtnT}>Edit</Text></Pressable>
            <Pressable onPress={del} style={s.smallBtn}><Text style={[s.smallBtnT, { color: MUTED }]}>Delete</Text></Pressable>
          </View>
        ) : null}
        <Text style={s.eyebrow}>{plan.from_name ? `FROM ${plan.from_name.toUpperCase()}` : 'A PLAN'}</Text>
        <Text style={s.h1}>{plan.headline}</Text>
        {plan.note ? <Text style={s.note}>“{plan.note}”</Text> : null}
        {who ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <View style={{ flexDirection: 'row' }}>{plan.ins.filter((i) => i.status === 'in').slice(0, 4).map((i, k) => <View key={k} style={[s.avatar, k > 0 && { marginLeft: -8 }]}><Text style={{ color: IVORY, fontSize: 11, fontWeight: '800' }}>{i.name[0]?.toUpperCase()}</Text></View>)}</View>
            <Text style={{ color: IVORY, fontSize: 14, fontWeight: '600', flex: 1 }}>{who}</Text>
          </View>
        ) : null}
        {outs.length ? <Text style={{ color: FAINT, fontSize: 13, marginTop: 8 }}>Can’t make it: {outs.map((o) => o.name).join(', ')}</Text> : null}

        <View style={{ marginTop: 26 }}>
          {plan.stops.map((st, i) => (
            <View key={st.slug}>
              {i > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14, marginLeft: 20 }}><View style={{ width: 1, height: 20, backgroundColor: LINE, marginLeft: 9 }} /><Text style={{ color: FAINT, fontSize: 12, fontWeight: '600' }}>then</Text></View> : null}
              <Pressable onPress={() => openStop(st.href)} style={{ flexDirection: 'row', gap: 14 }}>
                <View style={s.stopImg}>{st.image ? <Image source={{ uri: st.image.startsWith('http') ? st.image : API + st.image }} style={{ width: '100%', height: '100%' }} /> : null}</View>
                <View style={{ flex: 1, paddingTop: 6 }}>
                  <Text style={{ color: IVORY, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>{st.time ? `${st.time} · ` : ''}STOP {i + 1}</Text>
                  <Text style={{ color: IVORY, fontSize: 19, fontWeight: '700', letterSpacing: -0.3, marginTop: 4 }}>{st.name}</Text>
                  {st.sub ? <Text style={{ color: MUTED, fontSize: 13, marginTop: 3 }}>{st.sub}</Text> : null}
                  <Text style={{ color: IVORY, fontSize: 13, fontWeight: '600', marginTop: 10 }}>Details & directions →</Text>
                </View>
              </Pressable>
            </View>
          ))}
        </View>

        {plan.owner ? (
          <View style={s.card}>
            <Text style={{ color: IVORY, fontSize: 16, fontWeight: '700' }}>Your plan.</Text>
            <Text style={{ color: MUTED, fontSize: 14, marginTop: 4 }}>{plan.ins.filter((i) => i.status === 'in' && i.name.toLowerCase() !== me.toLowerCase()).length ? inLine(plan.ins.filter((i) => i.name.toLowerCase() !== me.toLowerCase()), '') : 'No one’s in yet — share it.'}</Text>
          </View>
        ) : null}
        {inY && !plan.owner ? (
          <View style={s.card}><Text style={{ color: IVORY, fontSize: 16, fontWeight: '700' }}>You’re in, {me}.</Text>
            <Text style={{ color: MUTED, fontSize: 14, marginTop: 4 }}>{plan.from_name || 'They'} can see you’re coming. These places are on your list now.</Text>
            <Pressable onPress={() => send('out')} disabled={busy} style={{ marginTop: 12 }}><Text style={{ color: FAINT, fontSize: 14, fontWeight: '600' }}>Can’t make it</Text></Pressable>
          </View>
        ) : null}
        {outY ? (
          <View style={s.card}><Text style={{ color: IVORY, fontSize: 16, fontWeight: '700' }}>You’re out, {me}.</Text>
            <Pressable onPress={() => send('in')} disabled={busy} style={{ marginTop: 8 }}><Text style={{ color: IVORY, fontSize: 14, fontWeight: '600' }}>I’m in after all →</Text></Pressable>
          </View>
        ) : null}
        {err && !asking ? <Text style={s.err}>{err}</Text> : null}
      </ScrollView>

      <Modal visible={asking && !inY} transparent animationType="slide" onRequestClose={() => setAsking(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setAsking(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable onPress={() => {}} style={s.sheet}>
              <Text style={{ color: IVORY, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>Who’s in?</Text>
              <Text style={{ color: MUTED, fontSize: 14, marginTop: 4 }}>Your first name goes on the plan so {plan.from_name || 'they'} know you’re coming.</Text>
              <TextInput autoFocus value={name} onChangeText={(v) => setName(v.slice(0, 30))} onSubmitEditing={() => send('in')} placeholder="First name" placeholderTextColor={FAINT} style={s.inp} />
              {err ? <Text style={s.err}>{err}</Text> : null}
              <Pressable onPress={() => send('in')} disabled={busy} style={[s.cta, { marginTop: 14 }, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={BG} /> : <Text style={s.ctaT}>I’m in</Text>}</Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <View style={s.bar}>
        {plan.owner ? (
          <Pressable onPress={share} style={[s.cta, { flex: 1 }]}><Text style={s.ctaT}>Share plan</Text></Pressable>
        ) : (<>
        <Pressable onPress={inY ? undefined : () => { tap(); me ? send('in') : setAsking(true); }} style={[s.cta, { flex: 1 }, inY && s.ctaDone]}><Text style={[s.ctaT, inY && { color: IVORY }]}>{inY ? '✓  You’re in' : 'I’m in'}</Text></Pressable>
        <Pressable onPress={share} style={s.shareBtn}><Text style={{ color: IVORY, fontSize: 13, fontWeight: '700' }}>Share</Text></Pressable>
        </>)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: BG },
  eyebrow: { color: FAINT, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  h1: { color: IVORY, fontSize: 36, fontWeight: '800', letterSpacing: -1.2, lineHeight: 40, marginTop: 10 },
  sub: { color: MUTED, fontSize: 15, marginTop: 8 },
  note: { color: MUTED, fontSize: 17, fontStyle: 'italic', marginTop: 12, lineHeight: 24 },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: CARD, borderWidth: 1.5, borderColor: BG, alignItems: 'center', justifyContent: 'center' },
  stopImg: { width: 112, aspectRatio: 4 / 5, borderRadius: 16, overflow: 'hidden', backgroundColor: CARD },
  card: { marginTop: 30, padding: 18, borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: LINE },
  ownerBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: CARD, borderWidth: 1, borderColor: LINE },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: LINE, backgroundColor: 'rgba(243,240,233,0.06)' }, smallBtnT: { color: IVORY, fontSize: 13, fontWeight: '600' },
  sheet: { backgroundColor: '#111113', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, paddingBottom: 34, borderTopWidth: 1, borderColor: LINE },
  inp: { marginTop: 16, backgroundColor: BG, borderWidth: 1, borderColor: LINE, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, color: IVORY, fontSize: 17 },
  err: { color: '#E0544C', fontSize: 14, marginTop: 10 },
  pill: { paddingVertical: 13, paddingHorizontal: 22, borderRadius: 999, backgroundColor: IVORY }, pillT: { color: BG, fontSize: 14, fontWeight: '700' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 16, backgroundColor: BG },
  cta: { padding: 17, borderRadius: 16, backgroundColor: IVORY, alignItems: 'center', justifyContent: 'center', minHeight: 56 }, ctaDone: { backgroundColor: 'rgba(243,240,233,0.08)', borderWidth: 1, borderColor: LINE },
  ctaT: { color: BG, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  shareBtn: { width: 72, borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: 'rgba(243,240,233,0.08)', alignItems: 'center', justifyContent: 'center' },
});
