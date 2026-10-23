// app/settings.tsx — Viberyte Settings V1
// Consumer-only. Guest-aware. Every row does something real; permissions open iOS Settings.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, Share, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const C = {
  bg: '#09090B', card: 'rgba(243,240,233,0.04)', line: 'rgba(243,240,233,0.08)',
  ivory: '#F3F0E9', dim: 'rgba(243,240,233,0.55)', faint: 'rgba(243,240,233,0.32)',
  gold: '#C5A36B', red: '#E5484D',
};
const SITE = 'https://viberyte.com';
const SUPPORT = 'info@viberyte.com';
const AUTH_KEYS = ['@lumina_auth_token', '@lumina_user', '@lumina_user_id', '@lumina_is_guest', '@lumina_profile', 'lumina_partner_session'];

type Perm = 'on' | 'off' | 'ask' | '…';
const permLabel = (p: Perm) => (p === 'on' ? 'On' : p === 'off' ? 'Off' : p === 'ask' ? 'Not set' : '…');

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loc, setLoc] = useState<Perm>('…');
  const [notif, setNotif] = useState<Perm>('…');
  const [busy, setBusy] = useState(false);
  const version = Constants.expoConfig?.version || '';

  const load = useCallback(async () => {
    try {
      const [token, guest, userRaw, profRaw] = await Promise.all([
        AsyncStorage.getItem('@lumina_auth_token'), AsyncStorage.getItem('@lumina_is_guest'),
        AsyncStorage.getItem('@lumina_user'), AsyncStorage.getItem('@lumina_profile'),
      ]);
      const isIn = !!token && token !== 'guest_token' && guest !== 'true';
      setSignedIn(isIn);
      let e: string | null = null;
      for (const raw of [userRaw, profRaw]) { try { const o = JSON.parse(raw || 'null'); if (o?.email) { e = o.email; break; } } catch {} }
      setEmail(isIn ? e : null);
    } catch {}
    try {
      const l = await Location.getForegroundPermissionsAsync();
      setLoc(l.granted ? 'on' : l.canAskAgain && l.status === 'undetermined' ? 'ask' : 'off');
    } catch { setLoc('off'); }
    try {
      const n = await Notifications.getPermissionsAsync();
      setNotif(n.granted ? 'on' : n.canAskAgain && n.status === 'undetermined' ? 'ask' : 'off');
    } catch { setNotif('off'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const open = (url: string) => { tap(); Linking.openURL(url).catch(() => Alert.alert('Could not open link', url)); };

  const handleLocation = async () => {
    tap();
    if (loc === 'ask') {
      const r = await Location.requestForegroundPermissionsAsync().catch(() => null);
      setLoc(r?.granted ? 'on' : 'off');
    } else Linking.openSettings();
  };
  const handleNotifications = async () => {
    tap();
    if (notif === 'ask') {
      const r = await Notifications.requestPermissionsAsync().catch(() => null);
      setNotif(r?.granted ? 'on' : 'off');
    } else Linking.openSettings();
  };

  const signOut = () => {
    Alert.alert('Sign out?', 'Your saved spots stay on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(AUTH_KEYS).catch(() => {});
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)' as any);
      } },
    ]);
  };

  const deleteAccount = () => {
    Alert.alert('Delete account?', 'This permanently deletes your Viberyte account and profile. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true);
        try {
          const token = await AsyncStorage.getItem('@lumina_auth_token');
          const res = await fetch(`${SITE}/api/user/delete-account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error(String(res.status));
          await AsyncStorage.clear();
          router.replace('/(tabs)' as any);
        } catch {
          Alert.alert('Couldn’t delete right now', `Please try again, or email ${SUPPORT} and we’ll delete it for you.`);
        } finally { setBusy(false); }
      } },
    ]);
  };

  const Row = ({ icon, label, value, onPress, danger, last }: { icon: any; label: string; value?: string; onPress?: () => void; danger?: boolean; last?: boolean }) => (
    <TouchableOpacity style={[s.row, !last && s.rowLine]} onPress={onPress} disabled={!onPress} activeOpacity={0.7} accessibilityRole={onPress ? 'button' : 'text'}>
      <Ionicons name={icon} size={19} color={danger ? C.red : C.gold} style={{ width: 26 }} />
      <Text style={[s.rowLabel, danger && { color: C.red }]} numberOfLines={1}>{label}</Text>
      {!!value && <Text style={s.rowValue} numberOfLines={1}>{value}</Text>}
      {onPress && !danger && <Ionicons name="chevron-forward" size={15} color={C.faint} />}
    </TouchableOpacity>
  );
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))} hitSlop={12} style={s.back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={C.ivory} />
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
        <View style={s.back} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Section title="Account">
          {signedIn ? (
            <>
              <Row icon="mail-outline" label="Email" value={email || 'Signed in'} />
              <Row icon="log-out-outline" label="Sign Out" onPress={signOut} last />
            </>
          ) : (
            <Row icon="person-add-outline" label="Create a profile" value="Keep your spots on any device" onPress={() => { tap(); router.push('/login' as any); }} last />
          )}
        </Section>

        <Section title="Preferences">
          {/* VBR_HIDE_MYVIBE */}
          <Row icon="location-outline" label="Location" value={permLabel(loc)} onPress={handleLocation} />
          <Row icon="notifications-outline" label="Notifications" value={permLabel(notif)} onPress={handleNotifications} last />
        </Section>

        <Section title="Support">
          <Row icon="chatbubble-ellipses-outline" label="Contact us" value={SUPPORT} onPress={() => open(`mailto:${SUPPORT}?subject=Viberyte%20app%20${version}`)} />
          <Row icon="paper-plane-outline" label="Share Viberyte" onPress={async () => { tap(); try { await Share.share({ message: `Find your next spot on Viberyte\n${SITE}` }); } catch {} }} last />
        </Section>

        <Section title="Legal">
          <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => open(`${SITE}/privacy`)} />
          <Row icon="document-text-outline" label="Terms of Service" onPress={() => open(`${SITE}/terms`)} last />
        </Section>

        {signedIn && (
          <Section title="Danger zone">
            {busy ? <View style={[s.row, { justifyContent: 'center' }]}><ActivityIndicator color={C.red} /></View>
                  : <Row icon="trash-outline" label="Delete Account" onPress={deleteAccount} danger last />}
          </Section>
        )}

        <Text style={s.footer}>Viberyte{version ? ` · v${version}` : ''}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.ivory, fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  section: { marginTop: 22 },
  sectionTitle: { color: C.gold, fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 14, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 52 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowLabel: { color: C.ivory, fontSize: 15, fontWeight: '500', flexShrink: 0 },
  rowValue: { color: C.dim, fontSize: 14, flex: 1, textAlign: 'right' },
  footer: { color: C.faint, fontSize: 12, textAlign: 'center', marginTop: 28 },
});
