// VBR_PROFILE_V1: the top of the Profile tab — your photo (or initials), your name and your @name.
// Tap the photo to change it; tap the name or @name to edit. Uses the same account as Insider Notes.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActionSheetIOS, Alert, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { getSession, refreshMe, adoptSessionAsLogin, ensureSession, uploadAvatar, removeAvatar, setDisplayName, setHandle, type VibeAccount } from '../../services/vibe';

const tick = () => Haptics.selectionAsync().catch(() => {});
const ask = (title: string, msg: string, value: string, cb: (v: string) => void) => {
  if (Platform.OS === 'ios') Alert.prompt(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Save', onPress: (v?: string) => cb(String(v || '')) }], 'plain-text', value);
};

export default function ProfileIdentity({ fallbackName, onChange, onAccount }: { fallbackName: string; onChange?: () => void; onAccount?: (a: VibeAccount | null) => void }) {
  const [a, setA0] = useState<VibeAccount | null>(null);
  const setA = (x: VibeAccount | null) => { setA0(x); onAccount?.(x); }; // VBR_PROFILE_V3
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => {
    let live = true;
    getSession().then((s) => { if (live && s) setA(s.account); }).then(() => refreshMe()).then((x) => { if (live) setA(x); })
      .then(() => adoptSessionAsLogin()).then((changed) => { if (live && changed) onChange?.(); }).catch(() => {}); // VBR_ADOPT_SESSION
    return () => { live = false; };
  }, []));

  const withSession = async () => { const s = await ensureSession(); if (s) { setA(s.account); onChange?.(); } return s; };
  const run = async (fn: (token: string) => Promise<VibeAccount>) => {
    setBusy(true);
    try { const s = await withSession(); if (s) { setA(await fn(s.token)); onChange?.(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } }
    catch (e: any) { if (!String(e?.code || '').includes('ERR_REQUEST_CANCELED')) Alert.alert('Couldn’t save', e?.message || 'Please try again.'); }
    setBusy(false);
  };
  const choose = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (p.status !== 'granted') { Alert.alert('Photos access is off', 'Allow photo access in Settings to choose a profile picture.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.35, base64: true });
    const b64 = r.canceled ? null : r.assets?.[0]?.base64;
    if (b64) run((t) => uploadAvatar(t, b64));
  };
  const photo = () => {
    tick();
    const opts = a?.avatar ? ['Choose photo', 'Remove photo', 'Cancel'] : ['Choose photo', 'Cancel'];
    const pick = (i: number) => { if (i === 0) choose(); else if (a?.avatar && i === 1) run((t) => removeAvatar(t)); };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: opts.length - 1, destructiveButtonIndex: a?.avatar ? 1 : undefined, userInterfaceStyle: 'dark' }, pick);
    else choose();
  };
  const editName = () => { tick(); ask('Your name', 'Shown on your profile.', a?.display_name || (fallbackName !== 'Viberyte Member' ? fallbackName : ''), (v) => v.trim() && run((t) => setDisplayName(t, v.trim()))); };
  const editHandle = () => { tick(); ask('Your @name', 'Shown on notes you post with your name.', a?.handle || '', (v) => v.trim() && run((t) => setHandle(t, v.trim().replace(/^@/, '').toLowerCase()))); };

  const name = a?.display_name || (fallbackName !== 'Viberyte Member' ? fallbackName : '');
  return (
    <View style={st.wrap}>
      <TouchableOpacity onPress={photo} activeOpacity={0.85} accessibilityLabel="Change profile photo">
        <Avatar uri={a?.avatar} initials={a?.initials || (name || a?.handle || 'V').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()} size={88} />
        <View style={st.badge}>{busy ? <ActivityIndicator size="small" color="#000" /> : <Text style={st.badgeText}>{a?.avatar ? 'Edit' : 'Add photo'}</Text>}</View>
      </TouchableOpacity>
      {name ? (
        <TouchableOpacity onPress={editName} activeOpacity={0.7} style={{ marginTop: 18 }}>
          <Text style={st.name} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={editName} activeOpacity={0.7} style={st.complete} accessibilityLabel="Complete your profile">
          <Text style={st.completeText}>Complete your profile</Text>
          <Ionicons name="chevron-forward" size={15} color="rgba(243,240,233,0.6)" />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={editHandle} activeOpacity={0.7} hitSlop={8}>
        <Text style={st.handle}>{a?.handle ? `@${a.handle}` : 'Choose your @name'}</Text>
      </TouchableOpacity>
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { alignItems: 'center' }, // VBR_PROFILE_V3: centered, name is the centerpiece
  badge: { position: 'absolute', bottom: -8, alignSelf: 'center', backgroundColor: '#F3F0E9', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3, minWidth: 40, alignItems: 'center' },
  badgeText: { color: '#000', fontSize: 11.5, fontWeight: '700' },
  name: { fontSize: 28, fontWeight: '700', color: '#F3F0E9', letterSpacing: -0.7, textAlign: 'center' },
  complete: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 20, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.3)' },
  completeText: { color: '#F3F0E9', fontSize: 15, fontWeight: '600' },
  handle: { color: 'rgba(243,240,233,0.58)', fontSize: 15, marginTop: 6, textAlign: 'center' },
});
