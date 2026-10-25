// VBR_VIBE_V3: "What People Are Saying" — App Store-style review cards, a tap-to-vibe row,
// and one bottom sheet of expressive reactions (Apple Music picker feel). One skippable follow-up,
// then an instant payoff. Categories stay on the server; users never see a form.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Modal, ScrollView, Switch, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { loadVibe, ensureSession, setHandle, deleteVibe, shareVibe } from '../../services/vibe';

const W = Dimensions.get('window').width;
const C = { ground: '#09090B', sheet: '#131315', card: '#1C1C1E', card2: '#2C2C2E', ivory: '#F3F0E9', soft: 'rgba(243,240,233,0.82)', muted: 'rgba(243,240,233,0.55)', faint: 'rgba(243,240,233,0.32)', line: 'rgba(243,240,233,0.10)', tint: '#0A84FF' };
const SF = Platform.OS === 'ios' ? { fontFamily: 'System' } : {};
type Preset = { key: string; emoji: string; label: string; ask?: string; dl?: string; options?: string[] };
type Item = { key?: string; emoji: string; label: string; detail: string | null; detailLabel?: string | null };
type Row = { handle: string; initial: string; when: string; mine?: boolean; items: Item[] };
type Take = { items: { key: string; detail: string | null }[]; is_public: boolean; visit_when?: string | null };
type Vibe = {
  reactions?: Preset[]; catalog: Preset[]; when: string[]; need?: Record<string, number>;
  kbyg: { label: string; value: string; people: number }[]; people: number; recentPeople?: number; feed: Row[];
  saying?: { items: { key: string; emoji: string; text: string; n: number; strong: boolean }[]; people: number } | null;
  me: { handle: string | null; take: Take | null } | null;
};
type Echo = { key: string; emoji: string; label: string; n: number } | null;
const tick = () => Haptics.selectionAsync().catch(() => {});
const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function VibeSection({ venueId, venueName }: { venueId: number | string; venueName: string }) {
  const [d, setD] = useState<Vibe | null>(null);
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const load = useCallback(() => { loadVibe(venueId).then((x) => { setD(x); Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start(); }).catch(() => {}); }, [venueId, fade]);
  useEffect(() => { load(); }, [load]);
  if (!d) return null;

  const reactions = d.reactions?.length ? d.reactions : d.catalog;
  const take = d.me?.take;
  const start = (k: string | null = null) => { tick(); setSeed(k); setOpen(true); };
  const privateCount = Math.max(0, (d.people || 0) - d.feed.length);

  return (
    <Animated.View style={[st.wrap, { opacity: fade }]}>
      <TouchableOpacity activeOpacity={d.feed.length ? 0.7 : 1} onPress={() => d.feed.length && (tick(), setAll(true))} style={st.head} accessibilityRole="header">
        <Text style={st.h2}>What people are saying</Text>
        {d.feed.length ? <Text style={st.seeAll}>See All</Text> : null}
      </TouchableOpacity>

      {d.saying ? (
        <View style={st.summary}>
          <Text style={st.eyebrow}>{d.saying.items.some((x) => x.strong) ? 'CONSISTENTLY' : 'PEOPLE ARE SAYING'}</Text>
          <Text style={st.summaryLine}>{cap(d.saying.items.map((x) => x.text).join(' · '))}</Text>
          <Text style={st.summaryFoot}>From {d.saying.people} {d.saying.people === 1 ? 'person' : 'people'} in the last 3 months</Text>
        </View>
      ) : null}

      {d.kbyg.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.kbygRow}>
          {d.kbyg.map((k) => (
            <View key={k.label} style={st.kbygPill}>
              <Text style={st.kbygLabel}>{k.label.toUpperCase()}</Text>
              <Text style={st.kbygValue} numberOfLines={1}>{k.value}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {d.feed.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={CARD_W + 12} snapToAlignment="start"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
          {d.feed.slice(0, 8).map((r, i) => <Card key={`${r.handle}-${i}`} r={r} onEdit={() => start()} />)}
        </ScrollView>
      ) : null}
      {d.feed.length && privateCount > 0 ? <Text style={st.private}>+ {privateCount} more shared privately</Text> : null}

      {take ? (
        <TouchableOpacity style={st.tapRow} onPress={() => start()} activeOpacity={0.8} accessibilityLabel="Edit your take">
          <View style={{ flex: 1 }}>
            <Text style={st.tapTitle}>Your take</Text>
            <Text style={st.tapSub} numberOfLines={1}>{take.items.map((x) => reactions.find((p) => p.key === x.key)?.emoji || '').join('  ')}{take.is_public ? '' : '   ·  Private'}</Text>
          </View>
          <Text style={st.tapEdit}>Edit</Text>
        </TouchableOpacity>
      ) : (
        <View style={[st.tapRow, !d.people && st.tapRowEmpty]}>
          <View style={{ flex: 1 }}>
            <Text style={st.tapTitle}>{d.people ? 'Been here?' : 'Be the first to share the vibe'}</Text>
            <Text style={st.tapSub}>{d.people ? 'Tap what stood out.' : 'Your take helps the next person decide.'}</Text>
          </View>
          <View style={st.bubbles}>
            {reactions.slice(0, 3).map((p) => (
              <TouchableOpacity key={p.key} onPress={() => start(p.key)} style={st.bubble} activeOpacity={0.7} accessibilityLabel={p.label}>
                <Text style={st.bubbleEmoji}>{p.emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => start()} style={st.bubble} activeOpacity={0.7} accessibilityLabel="What’s the vibe?">
              <Ionicons name="add" size={20} color={C.ivory} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={all} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAll(false)}>
        <View style={{ flex: 1, backgroundColor: C.ground }}>
          <View style={st.allTop}>
            <View style={{ width: 50 }} />
            <Text style={st.allTitle}>What people are saying</Text>
            <TouchableOpacity onPress={() => setAll(false)} hitSlop={10} style={{ width: 50, alignItems: 'flex-end' }}><Text style={st.done}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
            {d.feed.map((r, i) => <Card key={`${r.handle}-${i}`} r={r} wide onEdit={() => { setAll(false); setTimeout(() => start(), 400); }} />)}
            {privateCount > 0 ? <Text style={[st.private, { marginLeft: 0 }]}>+ {privateCount} more shared privately</Text> : null}
          </ScrollView>
        </View>
      </Modal>

      <VibeSheet visible={open} seed={seed} vibe={d} reactions={reactions} venueId={venueId} venueName={venueName}
        onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </Animated.View>
  );
}

const CARD_W = Math.min(W - 56, 340);
function Card({ r, wide, onEdit }: { r: Row; wide?: boolean; onEdit: () => void }) {
  const [first, ...rest] = r.items;
  const details = r.items.filter((it) => it.detail && it.detailLabel);
  return (
    <View style={[st.card, { width: wide ? undefined : CARD_W }]}>
      <View style={st.cardTop}>
        <Text style={st.cardTitle} numberOfLines={1}>{first ? `${first.emoji}  ${first.label}` : ''}</Text>
        <Text style={st.cardWhen}>{r.when}</Text>
      </View>
      {rest.length ? <Text style={st.cardRest} numberOfLines={2}>{rest.map((it) => `${it.emoji} ${it.label}`).join('   ')}</Text> : null}
      {details.length ? <Text style={st.cardDetail} numberOfLines={2}>{details.map((it) => `${it.detailLabel} · ${it.detail}`).join('    ')}</Text> : null}
      <View style={st.cardFoot}>
        <View style={st.avatar}><Text style={st.avatarText}>{r.initial}</Text></View>
        <Text style={st.cardHandle} numberOfLines={1}>@{r.handle}</Text>
        {r.mine ? <TouchableOpacity onPress={onEdit} hitSlop={10}><Text style={st.cardEdit}>Edit</Text></TouchableOpacity> : null}
      </View>
    </View>
  );
}

function Tile({ p, on, onPress }: { p: Preset; on: boolean; onPress: () => void }) {
  const s = useRef(new Animated.Value(1)).current;
  const bump = () => { s.setValue(0.9); Animated.spring(s, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }).start(); };
  return (
    <Pressable onPress={() => { bump(); onPress(); }} style={st.tileWrap} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={p.label}>
      <Animated.View style={[st.tile, on && st.tileOn, { transform: [{ scale: s }] }]}>
        <Text style={st.tileEmoji}>{p.emoji}</Text>
        <Text style={[st.tileLabel, on && st.tileLabelOn]} numberOfLines={2}>{p.label}</Text>
        {on ? <View style={st.check}><Ionicons name="checkmark" size={12} color={C.ivory} /></View> : null}
      </Animated.View>
    </Pressable>
  );
}

function VibeSheet({ visible, seed, vibe, reactions, venueId, venueName, onClose, onDone }: {
  visible: boolean; seed: string | null; vibe: Vibe; reactions: Preset[]; venueId: number | string; venueName: string; onClose: () => void; onDone: () => void;
}) {
  const byKey = useMemo(() => Object.fromEntries(reactions.map((p) => [p.key, p])) as Record<string, Preset>, [reactions]);
  const [step, setStep] = useState<'pick' | 'more' | 'done'>('pick');
  const [picked, setPicked] = useState<string[]>([]);
  const [detail, setDetail] = useState<Record<string, string | null>>({});
  const [when, setWhen] = useState<string | null>(null);
  const [pub, setPub] = useState(false);
  const [handle, setH] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [full, setFull] = useState(false);
  const [echo, setEcho] = useState<Echo>(null);
  const [ask, setAsk] = useState<Preset | null>(null);
  const pop = useRef(new Animated.Value(0)).current;
  const closeTimer = useRef<any>(null);

  useEffect(() => {
    if (!visible) { clearTimeout(closeTimer.current); return; }
    const t = vibe.me?.take;
    setStep('pick'); setErr(''); setBusy(false); setFull(false); setEcho(null);
    const keys = t ? t.items.map((x) => x.key).filter((k) => byKey[k]) : [];
    if (seed && !keys.includes(seed) && keys.length < 3) keys.push(seed);
    setPicked(keys);
    setDetail(t ? Object.fromEntries(t.items.map((x) => [x.key, x.detail])) : {});
    setPub(!!t?.is_public); setWhen(t?.visit_when || null); setH(vibe.me?.handle || '');
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const follow = useMemo(() => {
    const asks = picked.map((k) => byKey[k]).filter((p) => p?.ask && p.options?.length && !detail[p.key]);
    if (!asks.length) return null;
    return asks.slice().sort((a, b) => (vibe.need?.[b.key] ?? 50) - (vibe.need?.[a.key] ?? 50))[0];
  }, [picked, byKey, vibe.need, detail]);

  const toggle = (k: string) => {
    if (picked.includes(k)) { tick(); setFull(false); setPicked(picked.filter((x) => x !== k)); return; }
    if (picked.length >= 3) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); setFull(true); return; }
    tick(); setFull(false); setPicked([...picked, k]);
  };

  const submit = async (extra?: Record<string, string | null>) => {
    setErr(''); setBusy(true);
    const det = { ...detail, ...(extra || {}) };
    try {
      const s = await ensureSession();
      if (!s) throw new Error('Sign in to share.');
      if (pub && !s.account.handle) {
        if (!handle.trim()) throw new Error('Choose a name to show, or turn off Show my name.');
        await setHandle(s.token, handle.trim());
      }
      const res = await shareVibe(s.token, venueId, { items: picked.map((k) => ({ key: k, detail: det[k] || null })), visit_when: when, public: pub });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setEcho(res?.echo || null); setStep('done');
      pop.setValue(0); Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
      closeTimer.current = setTimeout(onDone, 2600);
    } catch (e: any) {
      if (!String(e?.code || '').includes('ERR_REQUEST_CANCELED')) { setErr(e?.message || 'Something went wrong.'); setStep('pick'); }
    }
    setBusy(false);
  };
  const remove = () => Alert.alert('Remove your take?', 'It will no longer count toward this place.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { const s = await ensureSession(); if (s) await deleteVibe(s.token, venueId); onDone(); } catch (e: any) { setErr(e?.message || 'Couldn’t remove it.'); }
      setBusy(false);
    } },
  ]);
  const primary = () => { if (follow) { tick(); setAsk(follow); setStep('more'); } else submit(); };
  const needHandle = pub && !vibe.me?.handle;
  const echoText = echo ? (echo.n > 1 ? `You’re the ${ord(echo.n)} person this week to say “${echo.label}.”` : `You’re the first this week to say “${echo.label}.”`) : 'This helps the next person decide.';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={step === 'done' ? onDone : onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.sheet}>
            <View style={st.grabber} />

            {step === 'done' ? (
              <View style={st.doneWrap}>
                <Animated.View style={[st.doneBadge, { transform: [{ scale: pop }] }]}>
                  <Text style={{ fontSize: 46 }}>{echo?.emoji || '✨'}</Text>
                </Animated.View>
                <Text style={st.doneTitle}>Thanks for the vibe</Text>
                <Text style={st.doneSub}>{echoText}</Text>
                <TouchableOpacity onPress={() => { clearTimeout(closeTimer.current); onDone(); }} style={[st.primary, { alignSelf: 'stretch', marginTop: 28 }]} activeOpacity={0.9}>
                  <Text style={st.primaryText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : step === 'more' && ask ? (<>
              <View style={st.navRow}>
                <TouchableOpacity onPress={() => setStep('pick')} hitSlop={12} style={st.roundBtn} accessibilityLabel="Back"><Ionicons name="chevron-back" size={18} color={C.ivory} /></TouchableOpacity>
                <TouchableOpacity onPress={() => submit()} hitSlop={12} disabled={busy}><Text style={st.skip}>Skip</Text></TouchableOpacity>
              </View>
              <Text style={st.followEmoji}>{ask.emoji}</Text>
              <Text style={st.bigTitle}>{ask.ask}</Text>
              <Text style={st.sub}>{ask.label} · optional</Text>
              <View style={st.list}>
                {ask.options!.map((o, i) => (
                  <TouchableOpacity key={o} disabled={busy} onPress={() => { tick(); setDetail({ ...detail, [ask.key]: o }); submit({ [ask.key]: o }); }}
                    style={[st.listRow, i < ask.options!.length - 1 && st.listHair]} activeOpacity={0.6}>
                    <Text style={st.listText}>{o}</Text>
                    {detail[ask.key] === o ? <Ionicons name="checkmark" size={18} color={C.tint} /> : <Ionicons name="chevron-forward" size={16} color={C.faint} />}
                  </TouchableOpacity>
                ))}
              </View>
              {busy ? <ActivityIndicator color={C.ivory} style={{ marginTop: 16 }} /> : null}
              {err ? <Text style={st.err}>{err}</Text> : null}
              <View style={{ height: Platform.OS === 'ios' ? 34 : 20 }} />
            </>) : (<>
              <View style={st.navRow}>
                <View>
                  <Text style={st.bigTitle}>What’s the vibe?</Text>
                  <Text style={st.sub} numberOfLines={1}>{venueName} · {full ? 'up to 3 — tap one to swap' : 'tap 1 to 3'}</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={12} style={st.roundBtn} accessibilityLabel="Close"><Ionicons name="close" size={18} color={C.ivory} /></TouchableOpacity>
              </View>
              <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={st.grid}>
                  {reactions.map((p) => <Tile key={p.key} p={p} on={picked.includes(p.key)} onPress={() => toggle(p.key)} />)}
                </View>

                <Text style={st.miniLabel}>WHEN DID YOU GO? <Text style={{ color: C.faint }}>OPTIONAL</Text></Text>
                <View style={st.seg}>
                  {vibe.when.map((w) => (
                    <TouchableOpacity key={w} onPress={() => { tick(); setWhen(when === w ? null : w); }} style={[st.segItem, when === w && st.segOn]} activeOpacity={0.8}>
                      <Text style={[st.segText, when === w && st.segTextOn]} numberOfLines={1}>{w}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={st.nameRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.nameTitle}>Show my name</Text>
                    <Text style={st.nameSub}>{pub ? (vibe.me?.handle ? `Posting as @${vibe.me.handle}` : 'Choose how you appear') : 'Off · still counts, privately'}</Text>
                  </View>
                  <Switch value={pub} onValueChange={(v) => { tick(); setPub(v); }} />
                </View>
                {needHandle ? (
                  <View style={st.handleBox}>
                    <Text style={st.at}>@</Text>
                    <TextInput value={handle} onChangeText={(t) => setH(t.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase())} placeholder="yourname" placeholderTextColor={C.faint}
                      autoCapitalize="none" autoCorrect={false} maxLength={24} style={st.handleInput} />
                  </View>
                ) : null}
                {err ? <Text style={st.err}>{err}</Text> : null}
              </ScrollView>
              <View style={st.bottom}>
                <TouchableOpacity disabled={!picked.length || busy} onPress={primary} style={[st.primary, (!picked.length || busy) && { opacity: 0.3 }]} activeOpacity={0.9}>
                  {busy ? <ActivityIndicator color="#000" /> : <Text style={st.primaryText}>{picked.length ? 'Share the vibe' : 'Tap 1 to 3'}</Text>}
                </TouchableOpacity>
                {vibe.me?.take ? <TouchableOpacity onPress={remove} style={{ alignSelf: 'center', marginTop: 14 }} hitSlop={8}><Text style={st.remove}>Remove my take</Text></TouchableOpacity> : null}
              </View>
            </>)}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const TILE = (Math.min(W, 500) - 40 - 16) / 3;
const st = StyleSheet.create({
  wrap: { paddingBottom: 34 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  h2: { ...SF, color: C.ivory, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  seeAll: { color: C.muted, fontSize: 16 },
  summary: { paddingHorizontal: 20, marginBottom: 16 },
  eyebrow: { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  summaryLine: { ...SF, color: C.ivory, fontSize: 24, lineHeight: 29, fontWeight: '600', letterSpacing: -0.5, marginTop: 6 },
  summaryFoot: { color: C.faint, fontSize: 13, marginTop: 6 },
  kbygRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  kbygPill: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, maxWidth: 220 },
  kbygLabel: { color: C.faint, fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  kbygValue: { color: C.ivory, fontSize: 15, fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, minHeight: 132 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { ...SF, flex: 1, color: C.ivory, fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  cardWhen: { color: C.faint, fontSize: 13 },
  cardRest: { color: C.soft, fontSize: 15, lineHeight: 21, marginTop: 6 },
  cardDetail: { color: C.muted, fontSize: 14, marginTop: 6 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 14 },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.ivory, fontSize: 11, fontWeight: '700' },
  cardHandle: { flex: 1, color: C.muted, fontSize: 13 },
  cardEdit: { color: C.tint, fontSize: 14 },
  private: { color: C.faint, fontSize: 13, marginLeft: 20, marginTop: 10 },
  tapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  tapRowEmpty: { borderTopWidth: 0, marginTop: 0, backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 0 },
  tapTitle: { ...SF, color: C.ivory, fontSize: 16, fontWeight: '600' },
  tapSub: { color: C.muted, fontSize: 14, marginTop: 2 },
  tapEdit: { color: C.tint, fontSize: 16 },
  bubbles: { flexDirection: 'row', gap: 6 },
  bubble: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  bubbleEmoji: { fontSize: 18 },
  allTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  allTitle: { color: C.ivory, fontSize: 17, fontWeight: '600' },
  done: { color: C.tint, fontSize: 17, fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: C.sheet, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8, maxHeight: '94%' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(243,240,233,0.2)', marginBottom: 14 },
  navRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  roundBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { ...SF, color: C.ivory, fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  sub: { color: C.muted, fontSize: 15, marginTop: 3 },
  skip: { color: C.tint, fontSize: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tileWrap: { width: TILE },
  tile: { height: 92, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  tileOn: { backgroundColor: C.ivory },
  tileEmoji: { fontSize: 28 },
  tileLabel: { color: C.soft, fontSize: 12.5, fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 15 },
  tileLabelOn: { color: '#000' },
  check: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  miniLabel: { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginTop: 22, marginBottom: 8 },
  seg: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, padding: 2 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segOn: { backgroundColor: C.card2 },
  segText: { color: C.muted, fontSize: 13, fontWeight: '500' },
  segTextOn: { color: C.ivory, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  nameTitle: { color: C.ivory, fontSize: 15 },
  nameSub: { color: C.muted, fontSize: 12.5, marginTop: 2 },
  handleBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14 },
  at: { color: C.muted, fontSize: 16 },
  handleInput: { flex: 1, color: C.ivory, fontSize: 16, paddingVertical: 12, paddingLeft: 4 },
  followEmoji: { fontSize: 40, marginBottom: 8 },
  list: { backgroundColor: C.card, borderRadius: 14, marginTop: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
  listHair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  listText: { color: C.ivory, fontSize: 17 },
  err: { color: '#FF453A', fontSize: 14, marginTop: 14 },
  bottom: { paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  primary: { backgroundColor: C.ivory, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#000', fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  remove: { color: C.muted, fontSize: 14 },
  doneWrap: { alignItems: 'center', paddingTop: 18, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  doneBadge: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { ...SF, color: C.ivory, fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 18 },
  doneSub: { color: C.muted, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8, paddingHorizontal: 12 },
});
