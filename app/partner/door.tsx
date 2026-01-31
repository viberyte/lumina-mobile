import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Camera, CameraView } from 'expo-camera';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_BASE = 'https://lumina.viberyte.com';

interface GuestEntry {
  id: number;
  booking_id: number;
  guest_name: string;
  plus_ones: number;
  checked_in: boolean;
  checked_in_at: string | null;
  confirmation_code: string;
  host_name: string;
  table_type: string;
  booking_time: string;
}

interface ToastData {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function DoorScreen() {
  const router = useRouter();
  const searchInputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [venueName, setVenueName] = useState('');
  const [venueId, setVenueId] = useState<number | null>(null);
  const [token, setToken] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanCount, setScanCount] = useState(0); // Track scans in session
  
  // Toast state
  const [toast, setToast] = useState<ToastData>({ visible: false, type: 'success', title: '', message: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const scanResetTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-focus search after loading
  useEffect(() => {
    if (!loading && !showScanner) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    }
  }, [loading]);

  // Toast animation
  useEffect(() => {
    if (toast.visible) {
      Animated.spring(toastAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
      
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => {
        hideToast();
      }, 2000); // Faster dismiss for rapid scanning
    }
  }, [toast.visible]);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ visible: true, type, title, message });
  };

  const hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setToast(prev => ({ ...prev, visible: false }));
    });
  };

  const loadData = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token: authToken } = JSON.parse(session);
      setToken(authToken);

      const res = await fetch(`${API_BASE}/api/partner/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        router.replace('/partner');
        return;
      }

      const data = await res.json();
      
      if (data.venues?.length > 0) {
        const homeVenue = data.venues.find((v: any) => v.is_home) || data.venues[0];
        setVenueName(homeVenue.name);
        setVenueId(homeVenue.id);
        await fetchGuests(homeVenue.id, authToken);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async (vid: number, authToken: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const res = await fetch(
        `${API_BASE}/api/partner/door/guests?venue_id=${vid}&date=${today}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setGuests(data.guests || []);
      }
    } catch (error) {
      console.error('Fetch guests error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (venueId && token) {
      await fetchGuests(venueId, token);
    }
    setRefreshing(false);
  }, [venueId, token]);

  const checkInGuest = async (guest: GuestEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Optimistic update
    setGuests(prev => prev.map(g => 
      g.id === guest.id 
        ? { ...g, checked_in: true, checked_in_at: new Date().toISOString() } 
        : g
    ));

    try {
      const res = await fetch(`${API_BASE}/api/partner/door/checkin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ guest_id: guest.id, booking_id: guest.booking_id }),
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('success', '✓ Checked In', `${guest.guest_name}${guest.plus_ones > 0 ? ` +${guest.plus_ones}` : ''}`);
      } else {
        setGuests(prev => prev.map(g => 
          g.id === guest.id ? { ...g, checked_in: false, checked_in_at: null } : g
        ));
        showToast('error', 'Error', 'Failed to check in guest');
      }
    } catch (error) {
      setGuests(prev => prev.map(g => 
        g.id === guest.id ? { ...g, checked_in: false, checked_in_at: null } : g
      ));
    }
  };

  const handleQRScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const res = await fetch(`${API_BASE}/api/partner/door/scan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ qr_data: data, venue_id: venueId }),
      });

      const result = await res.json();
      
      if (result.success) {
        // SUCCESS: Stay in scanner, show toast overlay, auto-reset
        setScanCount(prev => prev + 1);
        showToast('success', '✓ Checked In', `${result.guest_name} · ${result.party_size} guests`);
        
        // Refresh guest list in background
        if (venueId && token) {
          fetchGuests(venueId, token);
        }
        
        // Auto-reset for next scan after 800ms
        if (scanResetTimeout.current) clearTimeout(scanResetTimeout.current);
        scanResetTimeout.current = setTimeout(() => {
          setScanned(false);
        }, 800);
      } else {
        // ERROR: Show alert, keep scanner open but paused
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Not Found', result.error || 'Invalid QR code', [
          { text: 'Try Again', onPress: () => setScanned(false) }
        ]);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to process QR code', [
        { text: 'Try Again', onPress: () => setScanned(false) }
      ]);
    }
  };

  const openScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status === 'granted') {
      setShowScanner(true);
      setScanned(false);
      setScanCount(0); // Reset session count
    } else {
      Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes');
    }
  };

  const closeScanner = () => {
    setShowScanner(false);
    if (scanResetTimeout.current) clearTimeout(scanResetTimeout.current);
    // Refresh list when exiting scanner mode
    onRefresh();
  };

  const filteredGuests = guests.filter(g => 
    g.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.confirmation_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.host_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkedInCount = guests.filter(g => g.checked_in).reduce((sum, g) => sum + 1 + (g.plus_ones || 0), 0);
  const totalCount = guests.reduce((sum, g) => sum + 1 + (g.plus_ones || 0), 0);
  const pendingGuests = filteredGuests.filter(g => !g.checked_in);
  const arrivedGuests = filteredGuests.filter(g => g.checked_in);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatCheckInTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // QR Scanner Mode - Stays open for rapid scanning
  if (showScanner) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleQRScan}
        />
        
        {/* Scanner Toast Overlay */}
        {toast.visible && (
          <Animated.View 
            style={[
              styles.scannerToast, 
              toast.type === 'success' ? styles.toastSuccess : styles.toastError,
              { transform: [{ translateY: toastAnim }] }
            ]}
          >
            <SafeAreaView edges={['top']} style={styles.toastInner}>
              <Ionicons 
                name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
                size={22} 
                color="#fff" 
              />
              <View style={styles.toastText}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                <Text style={styles.toastMessage}>{toast.message}</Text>
              </View>
            </SafeAreaView>
          </Animated.View>
        )}

        <SafeAreaView style={styles.scannerOverlay}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={closeScanner} style={styles.closeScanner}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.scannerHeaderCenter}>
              <Text style={styles.scannerTitle}>Scanner Mode</Text>
              {scanCount > 0 && (
                <Text style={styles.scanCountBadge}>{scanCount} scanned</Text>
              )}
            </View>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.scannerFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerHint}>
              {scanned ? 'Processing...' : 'Ready to scan'}
            </Text>
            <TouchableOpacity style={styles.exitScannerBtn} onPress={closeScanner}>
              <Text style={styles.exitScannerText}>Done Scanning</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toast Banner */}
      {toast.visible && (
        <Animated.View 
          style={[
            styles.toast, 
            toast.type === 'success' ? styles.toastSuccess : styles.toastError,
            { transform: [{ translateY: toastAnim }] }
          ]}
        >
          <SafeAreaView edges={['top']} style={styles.toastInner}>
            <Ionicons 
              name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
              size={22} 
              color="#fff" 
            />
            <View style={styles.toastText}>
              <Text style={styles.toastTitle}>{toast.title}</Text>
              <Text style={styles.toastMessage}>{toast.message}</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Door</Text>
            <Text style={styles.headerSubtitle}>{venueName} · Tonight</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{checkedInCount}</Text>
            <Text style={styles.statLabel}>Arrived</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount - checkedInCount}</Text>
            <Text style={styles.statLabel}>Expected</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${totalCount > 0 ? (checkedInCount / totalCount) * 100 : 0}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Search - Auto-focused */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#52525b" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name or confirmation..."
            placeholderTextColor="#52525b"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#52525b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Guest List */}
        <FlatList
          data={[
            { type: 'section', title: 'Waiting', data: pendingGuests },
            { type: 'section', title: 'Arrived', data: arrivedGuests },
          ]}
          keyExtractor={(item, index) => `section-${index}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View>
              {item.data.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                    <Text style={styles.sectionCount}>{item.data.length}</Text>
                  </View>
                  {item.data.map((guest: GuestEntry) => (
                    <TouchableOpacity
                      key={guest.id}
                      style={[styles.guestCard, guest.checked_in && styles.guestCardCheckedIn]}
                      onPress={() => !guest.checked_in && checkInGuest(guest)}
                      activeOpacity={guest.checked_in ? 1 : 0.7}
                    >
                      <View style={styles.guestLeft}>
                        <View style={[styles.checkCircle, guest.checked_in && styles.checkCircleActive]}>
                          {guest.checked_in && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </View>
                      </View>
                      <View style={styles.guestInfo}>
                        <Text style={[styles.guestName, guest.checked_in && styles.guestNameCheckedIn]}>
                          {guest.guest_name}
                        </Text>
                        <Text style={styles.guestMeta}>
                          {guest.table_type} · {formatTime(guest.booking_time)}
                          {guest.plus_ones > 0 && ` · +${guest.plus_ones}`}
                        </Text>
                        {guest.checked_in && guest.checked_in_at && (
                          <Text style={styles.checkInTime}>
                            Arrived {formatCheckInTime(guest.checked_in_at)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.guestRight}>
                        <Text style={styles.confirmationCode}>{guest.confirmation_code}</Text>
                        {!guest.checked_in && (
                          <View style={styles.checkInBtn}>
                            <Text style={styles.checkInBtnText}>Check In</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#3f3f46" />
              <Text style={styles.emptyTitle}>No guests tonight</Text>
              <Text style={styles.emptySubtitle}>Guest list will appear here</Text>
            </View>
          }
        />

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={openScanner} activeOpacity={0.8}>
          <Ionicons name="scan" size={28} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

  // Toast
  toast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scannerToast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  toastSuccess: { backgroundColor: '#22c55e' },
  toastError: { backgroundColor: '#ef4444' },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  toastText: { flex: 1 },
  toastTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  toastMessage: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#52525b', marginTop: 2 },

  // Stats
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#52525b', marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: '#27272a' },
  progressContainer: { alignItems: 'center', gap: 6 },
  progressBar: { width: 60, height: 6, backgroundColor: '#27272a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  progressText: { fontSize: 14, fontWeight: '600', color: '#22c55e' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  searchInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, color: '#fff' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 16, 
    marginBottom: 12 
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 },
  sectionCount: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#a1a1aa', 
    backgroundColor: '#27272a', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 8 
  },

  // Guest Card
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  guestCardCheckedIn: { backgroundColor: 'rgba(34, 197, 94, 0.08)' },
  guestLeft: { marginRight: 14 },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  guestNameCheckedIn: { color: '#22c55e' },
  guestMeta: { fontSize: 13, color: '#52525b', marginTop: 2 },
  checkInTime: { fontSize: 12, color: '#22c55e', marginTop: 4 },
  guestRight: { alignItems: 'flex-end', gap: 6 },
  confirmationCode: { fontSize: 10, color: '#3f3f46', fontFamily: 'monospace', letterSpacing: 0.5 },
  checkInBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkInBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#52525b', marginTop: 4 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Scanner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  scannerHeaderCenter: { alignItems: 'center' },
  closeScanner: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scannerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  scanCountBadge: { 
    fontSize: 12, 
    color: '#22c55e', 
    marginTop: 4,
    fontWeight: '600',
  },
  scannerFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    position: 'relative',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#8B5CF6', borderTopLeftRadius: 12 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#8B5CF6', borderTopRightRadius: 12 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#8B5CF6', borderBottomLeftRadius: 12 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#8B5CF6', borderBottomRightRadius: 12 },
  scannerFooter: { alignItems: 'center', paddingBottom: 40, gap: 16 },
  scannerHint: { fontSize: 16, color: '#fff', textAlign: 'center' },
  exitScannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exitScannerText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
