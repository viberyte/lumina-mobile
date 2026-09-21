import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { colors, typography } from '../theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('@lumina_auth_token');
              if (token) {
                await fetch('https://viberyte.com/api/user/delete-account', {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` },
                });
              }
              await AsyncStorage.clear();
              router.replace('/login');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove([
            '@lumina_auth_token',
            '@lumina_refresh_token',
            '@lumina_user_profile',
          ]);
          router.replace('/login');
        },
      },
    ]);
  };

  const Row = ({ icon, label, onPress, destructive, value }: any) => (
    <TouchableOpacity style={s.row} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={destructive ? '#ef4444' : colors.zinc[400]} />
      <Text style={[s.rowLabel, destructive && { color: '#ef4444' }]}>{label}</Text>
      {value ? <Text style={s.rowValue}>{value}</Text> : <Ionicons name="chevron-forward" size={16} color={colors.zinc[600]} />}
    </TouchableOpacity>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.section}>
          <Row icon="mail-outline" label="Email" onPress={() => {}} />
          <View style={s.divider} />
          <Row icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
        </View>

        <Text style={s.sectionLabel}>PREFERENCES</Text>
        <View style={s.section}>
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications' as any)} />
          <View style={s.divider} />
          <Row icon="sparkles-outline" label="My Vibe" onPress={() => router.push('/my-vibe' as any)} />
        </View>

        <Text style={s.sectionLabel}>PRIVACY & LEGAL</Text>
        <View style={s.section}>
          <Row icon="shield-outline" label="Privacy Policy" onPress={() => Linking.openURL('https://viberyte.com/privacy')} />
          <View style={s.divider} />
          <Row icon="document-text-outline" label="Terms of Service" onPress={() => Linking.openURL('https://viberyte.com/terms')} />
        </View>

        <Text style={s.sectionLabel}>DANGER ZONE</Text>
        <View style={s.section}>
          <Row icon="log-out-outline" label="Sign Out" onPress={handleSignOut} destructive />
          <View style={s.divider} />
          <Row icon="trash-outline" label="Delete Account" onPress={handleDeleteAccount} destructive />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  sectionLabel: { color: colors.zinc[500], fontSize: 11, fontWeight: '600', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  section: { backgroundColor: '#18181b', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowLabel: { flex: 1, color: '#fff', fontSize: 15 },
  rowValue: { color: colors.zinc[500], fontSize: 14 },
  divider: { height: 0.5, backgroundColor: colors.zinc[800], marginLeft: 48 },
});
