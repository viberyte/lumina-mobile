import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const API_BASE = 'https://lumina.viberyte.com';

type Booking = {
  id: number;
  host_name: string;
  table_type: string;
  booking_date: string;
  booking_time: string;
  total_amount: number;
  funded_amount: number;
  guest_count: number;
  status: string;
};

type Stats = {
  todayBookings: number;
  weekBookings: number;
  monthRevenue: number;
  profileViews: number;
};

export default function PartnerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [stats, setStats] = useState<Stats>({ todayBookings: 0, weekBookings: 0, monthRevenue: 0, profileViews: 0 });
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        router.replace('/partner');
        return;
      }

      const data = await res.json();
      setPartnerName(data.partner?.name || '');
      setStats(data.stats || { todayBookings: 0, weekBookings: 0, monthRevenue: 0, profileViews: 0 });

      if (data.venues?.length > 0) {
        const homeVenue = data.venues.find((v: any) => v.is_home) || data.venues[0];
        setVenueName(homeVenue.name);

        const bookingsRes = await fetch(`${API_BASE}/api/partner/bookings?venueId=${homeVenue.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData.bookings || []);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const pendingBookings = bookings.filter(b => ['pending', 'soft_commit'].includes(b.status));
  const confirmedBookings = bookings.filter(b => b.status === 'funded');

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
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {partnerName ? partnerName.split(' ')[0] : 'Welcome'}
              </Text>
              <Text style={styles.venueName}>{venueName}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backToAppBtn}>
                <Ionicons name="apps-outline" size={18} color="#8B5CF6" />
                <Text style={styles.backToAppText}>App</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/partner/settings')} style={styles.avatarButton}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {partnerName ? partnerName.charAt(0).toUpperCase() : 'P'}
                </Text>
              </View>
            </TouchableOpacity>
            </View>       
           </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.todayBookings}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.weekBookings}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${stats.monthRevenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </Animated.View>

          {pendingBookings.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(300)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Needs Attention</Text>
                <Text style={styles.sectionCount}>{pendingBookings.length}</Text>
              </View>

              {pendingBookings.slice(0, 5).map((booking) => {
                const progress = booking.total_amount > 0 ? (booking.funded_amount / booking.total_amount) * 100 : 0;
                return (
                  <TouchableOpacity
                    key={booking.id}
                    style={styles.bookingCard}
                    onPress={() => router.push(`/partner/bookings/${booking.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bookingRow}>
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingName}>{booking.host_name}</Text>
                        <Text style={styles.bookingMeta}>
                          {formatDate(booking.booking_date)} · {formatTime(booking.booking_time)} · {booking.guest_count} guests
                        </Text>
                      </View>
                      <View style={styles.bookingAmount}>
                        <Text style={styles.amountText}>${booking.funded_amount}</Text>
                        <Text style={styles.amountTotal}>/ ${booking.total_amount}</Text>
                      </View>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          )}

          {confirmedBookings.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(300)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Confirmed</Text>
              </View>

              {confirmedBookings.slice(0, 5).map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={[styles.bookingCard, styles.confirmedCard]}
                  onPress={() => router.push(`/partner/bookings/${booking.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingRow}>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingName}>{booking.host_name}</Text>
                      <Text style={styles.bookingMeta}>
                        {formatDate(booking.booking_date)} · {formatTime(booking.booking_time)} · {booking.guest_count} guests
                      </Text>
                    </View>
                    <View style={styles.confirmedBadge}>
                      <Ionicons name="checkmark" size={14} color="#22c55e" />
                      <Text style={styles.confirmedAmount}>${booking.total_amount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          {pendingBookings.length === 0 && confirmedBookings.length === 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.emptyState}>
              <Text style={styles.emptyText}>No bookings yet</Text>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="grid" size={22} color="#fff" />
            <Text style={[styles.navText, styles.navTextActive]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/bookings')}>
            <Ionicons name="calendar-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/door')}>
            <Ionicons name="scan-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Door</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/events')}>
            <Ionicons name="sparkles-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/settings')}>
            <Ionicons name="settings-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 24 },
  greeting: { fontSize: 28, fontWeight: '600', color: '#fff' },
  venueName: { fontSize: 15, color: '#52525b', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backToAppBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: 16 },
  backToAppText: { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },
  avatarButton: { padding: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '500', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, padding: 14 },
  statValue: { fontSize: 22, fontWeight: '600', color: '#fff' },
  statLabel: { fontSize: 12, color: '#52525b', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '500', color: '#fff' },
  sectionCount: { fontSize: 13, fontWeight: '500', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  bookingCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, padding: 14, marginBottom: 8 },
  confirmedCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingInfo: { flex: 1 },
  bookingName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  bookingMeta: { fontSize: 13, color: '#52525b', marginTop: 3 },
  bookingAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: 15, fontWeight: '500', color: '#fff' },
  amountTotal: { fontSize: 12, color: '#52525b' },
  progressBar: { height: 3, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, marginTop: 12 },
  progressFill: { height: 3, backgroundColor: '#fff', borderRadius: 2 },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmedAmount: { fontSize: 15, fontWeight: '500', color: '#22c55e' },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#52525b' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 28, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 10, color: '#52525b' },
  navTextActive: { color: '#fff' },
});
