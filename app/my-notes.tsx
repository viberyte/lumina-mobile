// VBR_PROFILE_V3: My Insider Notes — everything you've shared, where, and how it's helping.
// Switch a note between your @name and "A Viberyte guest", open the venue, or delete it.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, ActionSheetIOS, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getSession, ensureSession } from '../services/vibe';
import { myNotes, setNotePublic, deleteNote, type MyNote } from '../services/notes';

const C = { bg: '#09090B', card: '#1C1C1E', line: 'rgba(243,240,233,0.10)', ivory: '#F3F0E9', dim: 'rgba(243,240,233,0.58)', faint: 'rgba(243,240,233,0.34)', gold: '#C5A36B' };
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const tap = () => Haptics.selectionAsync().catch(() => {});

export default function MyNotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<MyNote[] | null>(null);
  const [helped, setHelped] = useState(0);
  const [signedIn, setSignedIn] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await getSession();
    if (!s) { setSignedIn(false); setNotes([]); setRefreshing(false); return; }
    setSignedIn(true);
    try { const d = await myNotes(s.token); setNotes(d.notes); setHelped(d.helped); } catch { setNotes((n) => n || []); }
    setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = (n: MyNote) => {
    tap();
    const opts = ['Open ' + n.venue, n.public ? 'Post as “A Viberyte guest”' : 'Show my @name', 'Delete note', 'Cancel'];
    const run = async (i: number) => {
      try {
        const s = await ensureSession(); if (!s) return;
        if (i === 0) router.push(`/venue/${n.venueId}` as any);
        else if (i === 1) {
          await setNotePublic(s.token, n.id, !n.public);
          setNotes((l) => (l || []).map((x) => (x.id === n.id ? { ...x, public: !n.public } : x)));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else if (i === 2) {
          Alert.alert('Delete this note?', 'It will be removed from ' + n.venue + '.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
            await deleteNote(s.token, n.id); setNotes((l) => (l || []).filter((x) => x.id !== n.id));
          } }]);
        }
      } catch (e: any) { Alert.alert('Couldn’t update', e?.message || 'Please try again.'); }
    };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: 3, destructiveButtonIndex: 2, userInterfaceStyle: 'dark' }, run);
    else run(0);
  };

  return (
    <View style={s.container}>
      <View style={[s.nav, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any))} hitSlop={12} style={s.back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={C.ivory} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.ivory} />}>
        <Text style={s.largeTitle}>Insider Notes</Text>
        {notes && notes.length ? <Text style={s.sub}>{notes.length} {notes.length === 1 ? 'note' : 'notes'}{helped ? ` · helped ${helped} ${helped === 1 ? 'person' : 'people'}` : ''}</Text> : null}

        {notes === null ? <View style={s.empty}><ActivityIndicator color={C.ivory} /></View>
          : !signedIn ? (
            <View style={s.empty}>
              <Ionicons name="create-outline" size={40} color={C.faint} />
              <Text style={s.emptyTitle}>Sign in to see your notes</Text>
              <Text style={s.emptyText}>Notes you leave for the next guest live here.</Text>
              <TouchableOpacity style={s.cta} onPress={async () => { tap(); try { await ensureSession(); load(); } catch {} }}><Text style={s.ctaText}>Sign in with Apple</Text></TouchableOpacity>
            </View>
          ) : !notes.length ? (
            <View style={s.empty}>
              <Ionicons name="create-outline" size={40} color={C.faint} />
              <Text style={s.emptyTitle}>No notes yet</Text>
              <Text style={s.emptyText}>Been somewhere good? Open the place and tap Leave a note — what to order, when to go, where to sit.</Text>
              <TouchableOpacity style={s.cta} onPress={() => { tap(); router.push('/(tabs)/explore' as any); }}><Text style={s.ctaText}>Explore</Text></TouchableOpacity>
            </View>
          ) : notes.map((n) => (
            <TouchableOpacity key={n.id} style={s.card} activeOpacity={0.75} onPress={() => act(n)} accessibilityLabel={`${n.venue}: ${n.text}`}>
              <View style={s.cardTop}>
                <Text style={s.venue} numberOfLines={1}>{n.venue}</Text>
                <Ionicons name="ellipsis-horizontal" size={16} color={C.faint} />
              </View>
              <Text style={s.eyebrow}>{n.label.toUpperCase()}</Text>
              <Text style={s.quote}>“{n.text}”</Text>
              <View style={s.foot}>
                <Text style={s.meta}>{n.public ? 'With your @name' : 'As a Viberyte guest'} · {n.when}</Text>
                {n.review ? <Text style={s.review}>Under review</Text> : n.useful ? <Text style={s.meta}>Helped {n.useful}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  nav: { paddingHorizontal: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  largeTitle: { color: C.ivory, fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginLeft: 4 },
  sub: { color: C.dim, fontSize: 15, marginTop: 4, marginLeft: 4, marginBottom: 4 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginTop: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  venue: { flex: 1, color: C.ivory, fontSize: 16, fontWeight: '600' },
  eyebrow: { color: C.gold, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.3, marginTop: 10 },
  quote: { fontFamily: SERIF, color: C.ivory, fontSize: 18, lineHeight: 25, marginTop: 6 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 },
  meta: { color: C.dim, fontSize: 13 },
  review: { color: C.gold, fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 28 },
  emptyTitle: { color: C.ivory, fontSize: 20, fontWeight: '600', marginTop: 14, letterSpacing: -0.3 },
  emptyText: { color: C.dim, fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 6 },
  cta: { marginTop: 20, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 100, backgroundColor: C.ivory },
  ctaText: { color: '#000', fontSize: 15, fontWeight: '600' },
});
