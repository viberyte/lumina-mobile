// VBR_PROFILE_V3: Profile — your relationship with the city. Your name up top, what you've saved and the
// insider knowledge you've shared, then the few places you go from here. Account controls live in Settings.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileIdentity from '../../components/profile/ProfileIdentity';
import { type VibeAccount } from '../../services/vibe';
import { getSaved } from '../../lib/saved';

const C = { bg: '#09090B', group: '#1C1C1E', line: 'rgba(243,240,233,0.10)', ivory: '#F3F0E9', dim: 'rgba(243,240,233,0.58)', faint: 'rgba(243,240,233,0.32)' };
const tap = () => Haptics.selectionAsync().catch(() => {});

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('Viberyte Member');
  const [saved, setSaved] = useState(0);
  const [notes, setNotes] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [prof, fav] = await Promise.all([AsyncStorage.getItem('@lumina_profile'), getSaved().catch(() => [])]);
      try { const p = prof ? JSON.parse(prof) : null; setName(p?.name && p.name !== 'Guest' ? p.name : 'Viberyte Member'); } catch {}
      setSaved(Array.isArray(fav) ? fav.length : 0);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onAccount = useCallback((a: VibeAccount | null) => { setNotes(a ? (a as any).notes ?? null : null); }, []);

  const Row = ({ icon, label, value, onPress, last }: { icon: any; label: string; value?: string; onPress: () => void; last?: boolean }) => (
    <TouchableOpacity style={s.row} onPress={() => { tap(); onPress(); }} activeOpacity={0.6}>
      <Ionicons name={icon} size={20} color={C.dim} style={{ width: 26 }} />
      <View style={[s.rowBody, !last && s.hair]}>
        <Text style={s.rowLabel}>{label}</Text>
        {value ? <Text style={s.rowValue}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={C.faint} />
      </View>
    </TouchableOpacity>
  );
  const Stat = ({ n, label, onPress }: { n: number | null; label: string; onPress: () => void }) => (
    <TouchableOpacity style={s.stat} onPress={() => { tap(); onPress(); }} activeOpacity={0.6} accessibilityLabel={`${n ?? 0} ${label}`}>
      <Text style={s.statValue}>{n ?? 0}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <ProfileIdentity fallbackName={name} onChange={load} onAccount={onAccount} />

        <View style={s.stats}>
          <Stat n={saved} label="Saved places" onPress={() => router.push('/saved')} />
          <View style={s.statDivider} />
          <Stat n={notes} label="Insider notes" onPress={() => router.push('/my-notes' as any)} />
        </View>

        <View style={s.group}>
          <Row icon="bookmark-outline" label="Saved places" onPress={() => router.push('/saved')} />
          <Row icon="create-outline" label="My insider notes" onPress={() => router.push('/my-notes' as any)} last />
        </View>

        <View style={s.group}>
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push('/settings')} />
          <Row icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} last />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  stats: { flexDirection: 'row', backgroundColor: C.group, borderRadius: 14, marginTop: 24, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  statValue: { color: C.ivory, fontSize: 22, fontWeight: '600', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  statLabel: { color: C.dim, fontSize: 13, marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: 4 },
  group: { backgroundColor: C.group, borderRadius: 14, overflow: 'hidden', marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingRight: 14, marginLeft: 8, gap: 8 },
  hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowLabel: { flex: 1, color: C.ivory, fontSize: 17 },
  rowValue: { color: C.dim, fontSize: 17 },
});
