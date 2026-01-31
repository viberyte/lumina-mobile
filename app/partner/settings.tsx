import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

const API_BASE = 'https://lumina.viberyte.com';

export default function PartnerSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [venueName, setVenueName] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial');
  const [tier, setTier] = useState('claimed');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Payment settings
  const [venmo, setVenmo] = useState('');
  const [zelle, setZelle] = useState('');
  const [cashapp, setCashapp] = useState('');
  
  // Modal state
  const [editModal, setEditModal] = useState<'venmo' | 'zelle' | 'cashapp' | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      // Fetch partner info
      const meRes = await fetch(`${API_BASE}/api/partner/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (meRes.ok) {
        const data = await meRes.json();
        setPartnerName(data.partner?.name || data.partner?.business_name || '');
        setPartnerEmail(data.partner?.email || '');
        setTier(data.partner?.tier || 'claimed');
        setSubscriptionStatus(data.partner?.subscription_status || 'none');
        if (data.venues?.length > 0) {
          setVenueName(data.venues[0].name || '');
        }
      }

      // Fetch payment settings
      const settingsRes = await fetch(`${API_BASE}/api/partner/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings?.payments) {
          setVenmo(settingsData.settings.payments.venmo || '');
          setZelle(settingsData.settings.payments.zelle || '');
          setCashapp(settingsData.settings.payments.cashapp || '');
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const handleSavePayment = async () => {
    if (!editModal) return;
    
    setSaving(true);
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      const payments: any = {};
      payments[editModal] = editValue.trim();

      const res = await fetch(`${API_BASE}/api/partner/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ payments }),
      });

      if (res.ok) {
        // Update local state
        if (editModal === 'venmo') setVenmo(editValue.trim());
        if (editModal === 'zelle') setZelle(editValue.trim());
        if (editModal === 'cashapp') setCashapp(editValue.trim());
        
        setEditModal(null);
        Alert.alert('Success', 'Payment method saved');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to save');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleManagePlan = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      if (tier === 'claimed' || subscriptionStatus === 'none') {
        // No subscription - go to upgrade page
        Linking.openURL(`${API_BASE}/partner/settings?showUpgrade=true`);
        return;
      }

      // Has subscription - open billing portal
      const res = await fetch(`${API_BASE}/api/partner/billing-portal`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          Linking.openURL(data.url);
        }
      } else {
        // Fallback to web settings
        Linking.openURL(`${API_BASE}/partner/settings`);
      }
    } catch (error) {
      console.error('Manage plan error:', error);
      Linking.openURL(`${API_BASE}/partner/settings`);
    }
  };

  const openEditModal = (type: 'venmo' | 'zelle' | 'cashapp') => {
    setEditModal(type);
    if (type === 'venmo') setEditValue(venmo);
    if (type === 'zelle') setEditValue(zelle);
    if (type === 'cashapp') setEditValue(cashapp);
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('lumina_partner_session');
          router.replace('/partner');
        },
      },
    ]);
  };

  const getTierDisplay = () => {
    if (tier === 'elite') return 'Elite';
    if (tier === 'spotlight') return 'Spotlight';
    if (subscriptionStatus === 'trial') return 'Trial';
    return 'Free';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(50).duration(300)}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.card}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {partnerName ? partnerName.charAt(0).toUpperCase() : 'P'}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{partnerName || 'Partner'}</Text>
                  <Text style={styles.profileEmail}>{partnerEmail}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(75).duration(300)}>
            <Text style={styles.sectionLabel}>YOUR PROFILE</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.settingRow} onPress={() => router.push("/edit-profile")}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="person-circle-outline" size={17} color="#8b5cf6" />
                  </View>
                  <Text style={styles.settingTitle}>Edit Public Profile</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValueAccent}>Live</Text>
                  <Ionicons name="chevron-forward" size={17} color="#3f3f46" />
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.settingRow} onPress={() => router.push("/partner/messages")}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="chatbubbles-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Messages</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#3f3f46" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text style={styles.sectionLabel}>VENUE</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="storefront-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>{venueName || 'Venue'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#3f3f46" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/partner/venues')}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="grid-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Venues</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#3f3f46" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="card-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Plan</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValueMuted}>{getTierDisplay()}</Text>
                  <TouchableOpacity onPress={handleManagePlan}>
                    <Text style={styles.manageText}>Manage</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <Text style={styles.sectionLabel}>PAYMENTS</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.settingRow} onPress={() => openEditModal('venmo')}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="wallet-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Venmo</Text>
                </View>
                {venmo ? (
                  <Text style={styles.paymentValue}>@{venmo}</Text>
                ) : (
                  <Text style={styles.addText}>Add</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.settingRow} onPress={() => openEditModal('zelle')}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="swap-horizontal-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Zelle</Text>
                </View>
                {zelle ? (
                  <Text style={styles.paymentValue}>{zelle}</Text>
                ) : (
                  <Text style={styles.addText}>Add</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.settingRow} onPress={() => openEditModal('cashapp')}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="cash-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Cash App</Text>
                </View>
                {cashapp ? (
                  <Text style={styles.paymentValue}>${cashapp}</Text>
                ) : (
                  <Text style={styles.addText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="notifications-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#27272a', true: '#34d399' }}
                  thumbColor="#fff"
                  ios_backgroundColor="#27272a"
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).duration(300)}>
            <Text style={styles.sectionLabel}>SUPPORT</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL('https://lumina.viberyte.com/help')}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="help-circle-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Help</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#3f3f46" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL('mailto:support@viberyte.com')}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name="chatbubble-outline" size={17} color="#a1a1aa" />
                  </View>
                  <Text style={styles.settingTitle}>Contact</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#3f3f46" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>v1.0.0</Text>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/dashboard')}>
            <Ionicons name="grid-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/bookings')}>
            <Ionicons name="calendar-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/events')}>
            <Ionicons name="sparkles-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="settings" size={22} color="#fff" />
            <Text style={[styles.navText, styles.navTextActive]}>Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Edit Payment Modal */}
      <Modal
        visible={editModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModal(null)}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editModal === 'venmo' ? 'Venmo' : editModal === 'zelle' ? 'Zelle' : 'Cash App'}
              </Text>
              <TouchableOpacity onPress={handleSavePayment} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>
                {editModal === 'venmo' ? 'Venmo Username' : 
                 editModal === 'zelle' ? 'Zelle Email or Phone' : 
                 'Cash App $Cashtag'}
              </Text>
              <View style={styles.inputContainer}>
                {editModal === 'venmo' && <Text style={styles.inputPrefix}>@</Text>}
                {editModal === 'cashapp' && <Text style={styles.inputPrefix}>$</Text>}
                <TextInput
                  style={styles.modalInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder={
                    editModal === 'venmo' ? 'username' : 
                    editModal === 'zelle' ? 'email@example.com' : 
                    'cashtag'
                  }
                  placeholderTextColor="#52525b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
              <Text style={styles.modalHint}>
                {editModal === 'venmo' ? 'Customers can pay you via Venmo' : 
                 editModal === 'zelle' ? 'Customers can pay you via Zelle' : 
                 'Customers can pay you via Cash App'}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '400', color: '#52525b', marginTop: 28, marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 17, fontWeight: '500', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  profileEmail: { fontSize: 13, color: '#71717a', marginTop: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center' },
  settingTitle: { fontSize: 15, color: '#fff' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingValueMuted: { fontSize: 14, color: '#52525b' },
  settingValueAccent: { fontSize: 14, color: '#8b5cf6', fontWeight: '500', marginRight: 6 },
  manageText: { fontSize: 14, color: '#3b82f6' },
  addText: { fontSize: 14, color: '#3b82f6' },
  paymentValue: { fontSize: 14, color: '#a1a1aa' },
  divider: { height: 0.5, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginLeft: 54 },
  signOutButton: { marginTop: 40, paddingVertical: 14, alignItems: 'center' },
  signOutText: { fontSize: 15, color: '#ef4444' },
  versionText: { fontSize: 12, color: '#3f3f46', textAlign: 'center', marginTop: 12 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 28, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 10, color: '#52525b' },
  navTextActive: { color: '#fff' },
  
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalSafeArea: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  modalCancel: { fontSize: 15, color: '#71717a' },
  modalSave: { fontSize: 15, color: '#3b82f6', fontWeight: '500' },
  modalContent: { padding: 16 },
  modalLabel: { fontSize: 13, color: '#71717a', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 14 },
  inputPrefix: { fontSize: 16, color: '#71717a', marginRight: 2 },
  modalInput: { flex: 1, fontSize: 16, color: '#fff', paddingVertical: 14 },
  modalHint: { fontSize: 13, color: '#52525b', marginTop: 12 },
});
