// VBR_NOTES_V1 + VBR_NOTES_CLUSTER: "What people are saying" — Insider Notes on venue profiles.
// Editorial cards (no emoji, no stars), a quiet Useful, and a composer that nudges with a question
// but lets people write anything. Every note is checked and lightly polished before it posts.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, ActionSheetIOS, Animated, Easing, AccessibilityInfo, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage'; // VBR_PROFILE_V3
import { ensureSession, setHandle } from '../../services/vibe';
import Avatar from '../profile/Avatar'; // VBR_PROFILE_V1
import { loadNotes, previewNote, postNote, sendFeedback, toggleUseful, reportNote, deleteNote, hiddenAuthors, hideAuthor,
  type NotesData, type Note, type Preview, type Question } from '../../services/notes';

const C = { ground: '#09090B', sheet: '#0F0F11', card: '#1C1C1E', card2: '#2C2C2E', ivory: '#F3F0E9', soft: 'rgba(243,240,233,0.86)', muted: 'rgba(243,240,233,0.56)', faint: 'rgba(243,240,233,0.34)', line: 'rgba(243,240,233,0.10)', tint: '#0A84FF' };
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const tick = () => Haptics.selectionAsync().catch(() => {});
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
const ease = () => LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));

export default function NotesSection({ venueId, venueName }: { venueId: number | string; venueName: string }) {
  const [d, setD] = useState<NotesData | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [compose, setCompose] = useState(false);
  const [all, setAll] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const load = useCallback(() => {
    Promise.all([loadNotes(venueId), hiddenAuthors()]).then(([x, h]) => {
      setHidden(h); if (x) { setD(x); Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start(); }
    }).catch(() => {});
  }, [venueId, fade]);
  useEffect(() => { load(); }, [load]);
  if (!d) return null;

  const notes = d.notes.filter((n) => !hidden.includes(n.author) || n.mine);
  const q = d.questions[0];
  const open = () => { tick(); setCompose(true); };
  const onChange = (n: Note, patch: Partial<Note> | null) => setD((x) => x ? { ...x, notes: patch ? x.notes.map((m) => m.id === n.id ? { ...m, ...patch } : m) : x.notes.filter((m) => m.id !== n.id) } : x);
  const onHide = async (n: Note) => { await hideAuthor(n.author); setHidden(await hiddenAuthors()); };

  return (
    <Animated.View style={[st.wrap, { opacity: fade }]}>
      <TouchableOpacity activeOpacity={notes.length > 2 ? 0.7 : 1} onPress={() => notes.length > 2 && (tick(), setAll(true))} style={st.head} accessibilityRole="header">
        <Text style={st.h2}>What people are saying</Text>
        {notes.length > 2 ? <Text style={st.seeAll}>See all</Text> : null}
      </TouchableOpacity>

      {notes.length ? (<>
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {notes.slice(0, 2).map((n) => <NoteCard key={n.id} n={n} onChange={onChange} onHide={onHide} />)}
        </View>
        <TouchableOpacity style={st.invite} onPress={open} activeOpacity={0.8} accessibilityLabel="Leave a note">
          <View style={{ flex: 1 }}>
            <Text style={st.inviteTitle}>Been here?</Text>
            <Text style={st.inviteSub} numberOfLines={1}>{q ? q.q : 'Leave a note for the next guest.'}</Text>
          </View>
          <View style={st.pill}><Text style={st.pillText}>Leave a note</Text></View>
        </TouchableOpacity>
      </>) : (
        <TouchableOpacity style={st.empty} onPress={open} activeOpacity={0.85} accessibilityLabel="Leave a note">
          <Text style={st.eyebrow}>INSIDER NOTES</Text>
          <Text style={st.emptyQ}>{q ? q.q : 'What should the next guest know?'}</Text>
          <Text style={st.emptySub}>Been to {venueName}? Leave a note for the next guest.</Text>
          <View style={[st.pill, { alignSelf: 'flex-start', marginTop: 16 }]}><Text style={st.pillText}>Leave a note</Text></View>
        </TouchableOpacity>
      )}

      <Modal visible={all} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAll(false)}>
        <View style={{ flex: 1, backgroundColor: C.ground }}>
          <View style={st.bar}>
            <View style={{ width: 60 }} />
            <Text style={st.barTitle}>What people are saying</Text>
            <TouchableOpacity onPress={() => setAll(false)} hitSlop={10} style={{ width: 60, alignItems: 'flex-end' }}><Text style={st.barDone}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 48 }}>
            {notes.map((n) => <NoteCard key={n.id} n={n} onChange={onChange} onHide={onHide} />)}
            <TouchableOpacity onPress={() => { setAll(false); setTimeout(open, 400); }} style={[st.pill, { alignSelf: 'center', marginTop: 12 }]}><Text style={st.pillText}>Leave a note</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Composer visible={compose} d={d} venueId={venueId} venueName={venueName} onClose={() => setCompose(false)} onPosted={() => load()} />
    </Animated.View>
  );
}

function NoteCard({ n, preview, onChange, onHide }: { n: Note; preview?: boolean; onChange?: (n: Note, p: Partial<Note> | null) => void; onHide?: (n: Note) => void }) {
  const [busy, setBusy] = useState(false);
  const useful = async () => {
    if (preview || n.mine || busy) return;
    tick(); setBusy(true);
    const was = { useful: n.useful, usefulByMe: n.usefulByMe };
    onChange?.(n, { usefulByMe: !n.usefulByMe, useful: n.useful + (n.usefulByMe ? -1 : 1) });
    try { const s = await ensureSession(); if (!s) throw new Error(); const r = await toggleUseful(s.token, n.id); onChange?.(n, { useful: r.useful, usefulByMe: r.on }); }
    catch { onChange?.(n, was); }
    setBusy(false);
  };
  const more = () => {
    const opts = n.mine ? ['Delete note', 'Cancel'] : ['Report', 'Hide notes from this person', 'Cancel'];
    const run = async (i: number) => {
      try {
        if (n.mine && i === 0) {
          Alert.alert('Delete this note?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
            const s = await ensureSession(); if (s) { await deleteNote(s.token, n.id); onChange?.(n, null); } } }]);
        } else if (!n.mine && i === 0) {
          const s = await ensureSession(); if (s) { await reportNote(s.token, n.id, 'user_report'); onChange?.(n, null); Alert.alert('Thanks for letting us know', 'We’ll review this note.'); }
        } else if (!n.mine && i === 1) { onHide?.(n); }
      } catch {}
    };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: opts.length - 1, destructiveButtonIndex: 0, userInterfaceStyle: 'dark' }, run);
    else Alert.alert('Note', undefined, [...opts.slice(0, -1).map((o, i) => ({ text: o, onPress: () => { run(i); } })), { text: 'Cancel', style: 'cancel' as const }]);
  };
  return (
    <View style={st.card}>
      <View style={st.cardTop}>
        <Text style={st.eyebrow}>{n.label.toUpperCase()}</Text>
        {!preview ? <TouchableOpacity onPress={more} hitSlop={12} accessibilityLabel="More"><Ionicons name="ellipsis-horizontal" size={16} color={C.faint} /></TouchableOpacity> : null}
      </View>
      <Text style={st.quote}>“{n.text}”</Text>
      <View style={st.cardFoot}>
        {n.avatar || n.initials ? <Avatar uri={n.avatar} initials={n.initials} size={22} /> : null}
        <Text style={st.by} numberOfLines={1}>{n.by} · {n.when}</Text>
        {!preview && !n.mine ? (
          <TouchableOpacity onPress={useful} hitSlop={10} style={st.useful} accessibilityLabel="Useful" accessibilityState={{ selected: n.usefulByMe }}>
            <Ionicons name={n.usefulByMe ? 'checkmark-circle' : 'checkmark-circle-outline'} size={15} color={n.usefulByMe ? C.ivory : C.faint} />
            <Text style={[st.usefulText, n.usefulByMe && { color: C.ivory }]}>Useful{n.useful >= 3 ? ` · ${n.useful}` : ''}</Text>
          </TouchableOpacity>
        ) : n.mine && n.useful > 0 && !preview ? <Text style={st.usefulText}>Helped {n.useful}</Text> : null}
      </View>
    </View>
  );
}

// All questions at once, each floating gently on its own rhythm while the guest decides.
// Still while they write; Reduce Motion keeps everything still. The first one (least answered here) gets a dot.
function Float({ i, still, children }: { i: number; still: boolean; children: React.ReactNode }) {
  const y = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: 320, delay: i * 60, useNativeDriver: true }).start();
    if (still) return;
    const d = 2100 + ((i * 370) % 900), amp = 2.5 + (i % 3) * 0.6;
    y.setValue(i % 2 ? amp : -amp);
    const a = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: i % 2 ? -amp : amp, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(y, { toValue: i % 2 ? amp : -amp, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const t = setTimeout(() => a.start(), (i * 230) % 700);
    return () => { clearTimeout(t); a.stop(); };
  }, [i, still, y, o]);
  return <Animated.View style={{ opacity: o, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}
function Cluster({ items, onPick }: { items: string[]; onPick: (i: number) => void }) {
  const [still, setStill] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {}); }, []);
  return (
    <View>
      <Text style={st.driftLabel}>NEED A NUDGE? TAP A QUESTION</Text>
      <View style={st.cluster}>
        {items.map((t, i) => (
          <Float key={t} i={i} still={still}>
            <TouchableOpacity onPress={() => onPick(i)} activeOpacity={0.7} style={st.drift} accessibilityLabel={i === 0 ? `${t} — least answered here` : t}>
              {i === 0 ? <View style={st.dot} /> : null}
              <Text style={st.driftText}>{t}</Text>
            </TouchableOpacity>
          </Float>
        ))}
      </View>
    </View>
  );
}

type Mode = 'write' | 'review' | 'done' | 'feedback' | 'feedbackDone';
function Composer({ visible, d, venueId, venueName, onClose, onPosted }: { visible: boolean; d: NotesData; venueId: number | string; venueName: string; onClose: () => void; onPosted: () => void }) {
  const [mode, setMode] = useState<Mode>('write');
  const [sel, setSel] = useState<number | null>(null); // no question until they tap one
  const [open, setOpen] = useState(true); // question cluster showing
  const [text, setText] = useState('');
  const [pub, setPub] = useState(false);
  const [handle, setH] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pv, setPv] = useState<Preview | null>(null);
  const [token, setToken] = useState('');
  const [myHandle, setMyHandle] = useState<string | null>(null);
  const [fb, setFb] = useState('');
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!visible) { clearTimeout(timer.current); return; }
    setMode('write'); setSel(null); setOpen(true); setText(''); setErr(''); setBusy(false); setPv(null); setFb('');
    setMyHandle(d.me?.handle || null); setH(d.me?.handle || ''); setPub(false);
    AsyncStorage.getItem('@vbr_notes_default_public').then((v) => { if (v === '1') setPub(true); }).catch(() => {});
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const q: Question | undefined = sel == null ? undefined : d.questions[sel];
  const by = pub && (myHandle || handle) ? `@${myHandle || handle}` : 'A Viberyte guest';
  const addChip = (c: string) => { tick(); setText((t) => (t.trim() ? `${t.trim().replace(/[.!]?$/, '.')} ${c}` : c)); };

  const review = async () => {
    setErr(''); setBusy(true);
    try {
      const s = await ensureSession(); if (!s) throw new Error('Sign in to leave a note.');
      setToken(s.token);
      let h = s.account.handle;
      if (pub && !h) {
        if (!handle.trim()) throw new Error('Choose a name to show, or turn off Show my name.');
        h = (await setHandle(s.token, handle.trim())).handle;
      }
      setMyHandle(h || null);
      const p = await previewNote(s.token, venueId, text, q || null);
      setPv(p); setMode('review'); tick();
    } catch (e: any) { if (!String(e?.code || '').includes('ERR_REQUEST_CANCELED')) setErr(e?.message || 'Something went wrong.'); }
    setBusy(false);
  };
  const post = async () => {
    if (!pv?.draft) return;
    setBusy(true); setErr('');
    try {
      await postNote(token, venueId, pv.draft, pub);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMode('done'); onPosted();
      timer.current = setTimeout(onClose, 2400);
    } catch (e: any) { setErr(e?.message || 'Couldn’t post it.'); }
    setBusy(false);
  };
  const sendFb = async () => {
    setBusy(true); setErr('');
    try {
      const s = await ensureSession(); if (!s) throw new Error('Sign in to send feedback.');
      await sendFeedback(s.token, venueId, fb);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMode('feedbackDone'); timer.current = setTimeout(onClose, 2400);
    } catch (e: any) { if (!String(e?.code || '').includes('ERR_REQUEST_CANCELED')) setErr(e?.message || 'Couldn’t send it.'); }
    setBusy(false);
  };

  const bar = ({ left, title, right, onLeft, onRight, rightOn }: { left: string; title: string; right?: string; onLeft: () => void; onRight?: () => void; rightOn?: boolean }) => (
    <View style={st.bar}>
      <TouchableOpacity onPress={onLeft} hitSlop={10} style={{ width: 80 }}><Text style={st.barLink}>{left}</Text></TouchableOpacity>
      <Text style={st.barTitle}>{title}</Text>
      <View style={{ width: 80, alignItems: 'flex-end' }}>
        {right ? (busy ? <ActivityIndicator color={C.ivory} /> : (
          <TouchableOpacity onPress={onRight} disabled={!rightOn} hitSlop={10}><Text style={[st.barDone, !rightOn && { opacity: 0.35 }]}>{right}</Text></TouchableOpacity>
        )) : null}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.sheet }}>
        {mode === 'write' ? (<>
          {bar({ left: "Cancel", title: "Leave a note", right: "Review", onLeft: onClose, onRight: review, rightOn: text.trim().length >= 6, })}
          <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
            {d.questions.length && sel == null && open ? (
              <Cluster items={d.questions.map((x) => x.q)} onPick={(i) => { tick(); ease(); setSel(i); }} />
            ) : d.questions.length && sel == null ? (
              <TouchableOpacity onPress={() => { tick(); ease(); setOpen(true); }} style={st.nudge} activeOpacity={0.7}>
                <Ionicons name="sparkles-outline" size={14} color={C.muted} />
                <Text style={st.nudgeText}>Need a nudge? <Text style={{ color: C.soft }}>{d.questions.length} questions</Text></Text>
              </TouchableOpacity>
            ) : null}
            <Text style={[st.eyebrow, { marginTop: sel == null ? 22 : 4 }]}>{venueName.toUpperCase()}</Text>
            <View style={st.titleRow}>
              <Text style={[st.question, { flex: 1 }]}>{q ? q.q : 'Say it your way.'}</Text>
            </View>
            {q ? (
              <TouchableOpacity onPress={() => { tick(); ease(); setSel(null); setOpen(true); }} style={st.another} hitSlop={8}>
                <Ionicons name="swap-horizontal" size={14} color={C.muted} /><Text style={st.anotherText}>Change question</Text>
              </TouchableOpacity>
            ) : null}
            <TextInput value={text} onChangeText={(t) => { if (!text && t && sel == null && open) { ease(); setOpen(false); } setText(t); }} autoFocus multiline maxLength={300}
              placeholder={q ? 'Write it like you’d tell a friend…' : 'Tips, timing, what to expect — anything that helps the next guest.'}
              placeholderTextColor={C.faint} style={st.input} selectionColor={C.ivory} />
            {q?.chips?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={st.chips}>
                {q.chips.map((c) => <TouchableOpacity key={c} onPress={() => addChip(c)} style={st.chip} activeOpacity={0.7}><Text style={st.chipText}>{c}</Text></TouchableOpacity>)}
              </ScrollView>
            ) : null}
            <View style={st.row}>
              <View style={{ flex: 1 }}>
                <Text style={st.rowTitle}>Show my name</Text>
                <Text style={st.rowSub}>{pub ? (myHandle ? `Shown as @${myHandle}` : 'Choose how you appear') : 'Shown as “A Viberyte guest”'}</Text>
              </View>
              <Switch value={pub} onValueChange={(v) => { tick(); setPub(v); }} />
            </View>
            {pub && !myHandle ? (
              <View style={st.handleBox}>
                <Text style={st.at}>@</Text>
                <TextInput value={handle} onChangeText={(t) => setH(t.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase())} placeholder="yourname" placeholderTextColor={C.faint}
                  autoCapitalize="none" autoCorrect={false} maxLength={24} style={st.handleInput} />
              </View>
            ) : null}
            {err ? <Text style={st.err}>{err}</Text> : null}
            <TouchableOpacity onPress={() => { tick(); setFb(text); setErr(''); setMode('feedback'); }} style={{ marginTop: 26 }} hitSlop={8}>
              <Text style={st.private}>Something go wrong? <Text style={{ color: C.soft }}>Tell us privately</Text></Text>
            </TouchableOpacity>
          </ScrollView>
        </>) : mode === 'review' && pv ? (<>
          {bar({ left: "Edit", title: "Preview", onLeft: () => setMode('write'), })}
          <ScrollView contentContainerStyle={st.body}>
            {pv.outcome === 'post' || pv.outcome === 'fixable' ? (<>
              <Text style={st.eyebrow}>HERE’S HOW IT’LL READ</Text>
              <View style={{ marginTop: 14 }}>
                <NoteCard preview n={{ id: 0, kind: pv.kind, label: pv.label, text: pv.text, by, author: '', when: 'This week', avatar: pub ? d.me?.avatar : null, initials: pub ? (d.me?.initials || (myHandle || handle || 'V').slice(0, 1).toUpperCase()) : null, useful: 0, usefulByMe: false, mine: false }} />
              </View>
              {pv.notice ? <View style={st.notice}><Ionicons name="information-circle-outline" size={16} color={C.muted} /><Text style={st.noticeText}>{pv.notice}</Text></View> : null}
              <Text style={st.fine}>We tidy the wording so every note reads well. Your meaning stays the same.</Text>
              {err ? <Text style={st.err}>{err}</Text> : null}
              <TouchableOpacity onPress={post} disabled={busy} style={[st.primary, busy && { opacity: 0.4 }]} activeOpacity={0.9}>
                {busy ? <ActivityIndicator color="#000" /> : <Text style={st.primaryText}>Post note</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('write')} style={st.secondary}><Text style={st.secondaryText}>Edit</Text></TouchableOpacity>
            </>) : pv.outcome === 'private' ? (<>
              <Text style={st.question}>Tell us privately?</Text>
              <Text style={st.msg}>{pv.message}</Text>
              <TouchableOpacity onPress={() => { setFb(text); setMode('feedback'); }} style={st.primary} activeOpacity={0.9}><Text style={st.primaryText}>Send privately</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('write')} style={st.secondary}><Text style={st.secondaryText}>Edit my note</Text></TouchableOpacity>
            </>) : (<>
              <Text style={st.question}>Let’s try that again</Text>
              <Text style={st.msg}>{pv.message}</Text>
              <TouchableOpacity onPress={() => setMode('write')} style={st.primary} activeOpacity={0.9}><Text style={st.primaryText}>Edit my note</Text></TouchableOpacity>
            </>)}
          </ScrollView>
        </>) : mode === 'feedback' ? (<>
          {bar({ left: "Cancel", title: "Private feedback", right: "Send", onLeft: onClose, onRight: sendFb, rightOn: fb.trim().length >= 3, })}
          <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
            <Text style={st.eyebrow}>{venueName.toUpperCase()}</Text>
            <Text style={st.question}>What happened?</Text>
            <Text style={st.msg}>Only the Viberyte team sees this. It’s never posted.</Text>
            <TextInput value={fb} onChangeText={setFb} autoFocus multiline maxLength={2000} placeholder="Tell us about your visit…" placeholderTextColor={C.faint} style={st.input} selectionColor={C.ivory} />
            {err ? <Text style={st.err}>{err}</Text> : null}
          </ScrollView>
        </>) : (
          <View style={st.doneWrap}>
            <View style={st.doneIcon}><Ionicons name="checkmark" size={30} color={C.ivory} /></View>
            <Text style={st.doneTitle}>{mode === 'done' ? 'Your note is live' : 'Thanks for telling us'}</Text>
            <Text style={st.doneSub}>{mode === 'done' ? 'The next guest will be glad you did.' : 'We read every message.'}</Text>
            <TouchableOpacity onPress={() => { clearTimeout(timer.current); onClose(); }} style={[st.primary, { alignSelf: 'stretch', marginHorizontal: 20 }]}><Text style={st.primaryText}>Done</Text></TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { paddingBottom: 34 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  h2: { color: C.ivory, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  seeAll: { color: C.muted, fontSize: 16 },
  eyebrow: { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.3 },
  card: { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quote: { fontFamily: SERIF, color: C.ivory, fontSize: 19, lineHeight: 27, marginTop: 10 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  by: { flex: 1, color: C.muted, fontSize: 13 },
  useful: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  usefulText: { color: C.faint, fontSize: 13, fontWeight: '500' },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  inviteTitle: { color: C.ivory, fontSize: 16, fontWeight: '600' },
  inviteSub: { color: C.muted, fontSize: 14, marginTop: 2 },
  pill: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.35)' },
  pillText: { color: C.ivory, fontSize: 14, fontWeight: '600' },
  empty: { marginHorizontal: 20, backgroundColor: C.card, borderRadius: 18, padding: 20 },
  emptyQ: { fontFamily: SERIF, color: C.ivory, fontSize: 24, lineHeight: 31, marginTop: 10 },
  emptySub: { color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  barTitle: { color: C.ivory, fontSize: 17, fontWeight: '600' },
  barLink: { color: C.ivory, fontSize: 17 },
  barDone: { color: C.ivory, fontSize: 17, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 60 },
  cluster: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 4 },
  nudgeText: { color: C.muted, fontSize: 14 },
  driftLabel: { color: C.faint, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.2, marginBottom: 10 },
  drift: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.22)' },
  driftText: { color: C.soft, fontSize: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.ivory },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  clear: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  question: { color: C.ivory, fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.6, marginTop: 8 },
  another: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  anotherText: { color: C.muted, fontSize: 14 },
  input: { fontFamily: SERIF, color: C.ivory, fontSize: 20, lineHeight: 28, minHeight: 120, marginTop: 18, textAlignVertical: 'top', paddingTop: 0 },
  chips: { gap: 8, paddingVertical: 6 },
  chip: { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.card },
  chipText: { color: C.soft, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  rowTitle: { color: C.ivory, fontSize: 16 },
  rowSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  handleBox: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14 },
  at: { color: C.muted, fontSize: 16 },
  handleInput: { flex: 1, color: C.ivory, fontSize: 16, paddingVertical: 12, paddingLeft: 4 },
  private: { color: C.muted, fontSize: 14 },
  err: { color: '#FF453A', fontSize: 14, marginTop: 14 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14 },
  noticeText: { flex: 1, color: C.muted, fontSize: 14, lineHeight: 19 },
  fine: { color: C.faint, fontSize: 12.5, lineHeight: 17, marginTop: 14 },
  msg: { color: C.muted, fontSize: 16, lineHeight: 23, marginTop: 10 },
  primary: { backgroundColor: C.ivory, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 26 },
  primaryText: { color: '#000', fontSize: 17, fontWeight: '600' },
  secondary: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  secondaryText: { color: C.ivory, fontSize: 16 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  doneIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(243,240,233,0.5)', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: C.ivory, fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 20 },
  doneSub: { color: C.muted, fontSize: 16, marginTop: 6, marginBottom: 24 },
});
