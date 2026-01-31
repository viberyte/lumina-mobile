import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

const API_BASE = 'https://lumina.viberyte.com';

type Booking = {
  id: number;
  host_name: string;
  host_phone: string;
  table_type: string;
  booking_date: string;
  booking_time: string;
  total_amount: number;
  funded_amount: number;
  guest_count: number;
  status: string;
  invite_code: string;
};

export default function PartnerBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/bookings`, {
      headers: { Authorization: `Bearer ${token}` },

      });

      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
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

  const filteredBookings = bookings
    .filter(b => {
      if (filter === 'pending') return ['pending', 'soft_commit'].includes(b.status);
      if (filter === 'confirmed') return b.status === 'funded';
      return true;
    })
    .filter(b => {
      if (!searchQuery) return true;
      return b.host_name.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const pendingCount = bookings.filter(b => ['pending', 'soft_commit'].includes(b.status)).length;

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
          <Text style={styles.headerTitle}>Bookings</Text>
          <TouchableOpacity style={styles.newButton} onPress={() => router.push('/partner/bookings/new')}>
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#52525b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#52525b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>Pending</Text>
            {pendingCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'confirmed' && styles.filterTabActive]}
            onPress={() => setFilter('confirmed')}
          >
            <Text style={[styles.filterTabText, filter === 'confirmed' && styles.filterTabTextActive]}>Confirmed</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bookings</Text>
            </View>
          ) : (
            filteredBookings.map((booking) => {
              const progress = booking.total_amount > 0 ? (booking.funded_amount / booking.total_amount) * 100 : 0;
              const isPending = ['pending', 'soft_commit'].includes(booking.status);

              return (
                <Animated.View key={booking.id} entering={FadeInDown.duration(200)}>
                  <TouchableOpacity
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
                      <View style={styles.bookingAmountContainer}>
                        {isPending ? (
                          <>
                            <Text style={styles.amountText}>${booking.funded_amount}</Text>
                            <Text style={styles.amountTotal}>/ ${booking.total_amount}</Text>
                          </>
                        ) : (
                          <View style={styles.confirmedBadge}>
                            <Ionicons name="checkmark" size={14} color="#22c55e" />
                            <Text style={styles.confirmedAmount}>${booking.total_amount}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {isPending && (
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/dashboard')}>
            <Ionicons name="grid-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="calendar" size={22} color="#fff" />
            <Text style={[styles.navText, styles.navTextActive]}>Bookings</Text>
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  newButton: { padding: 4 },
  newButtonText: { fontSize: 15, fontWeight: '400', color: '#3b82f6' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.06)', marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },

  filterTabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.04)', gap: 6 },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabText: { fontSize: 13, fontWeight: '400', color: '#71717a' },
  filterTabTextActive: { color: '#000', fontWeight: '500' },
  filterBadge: { backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  filterBadgeText: { fontSize: 11, fontWeight: '600', color: '#000' },

  scrollView: { flex: 1, paddingHorizontal: 16 },

  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#52525b' },

  bookingCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, padding: 14, marginBottom: 8 },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingInfo: { flex: 1 },
  bookingName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  bookingMeta: { fontSize: 13, color: '#52525b', marginTop: 3 },
  bookingAmountContainer: { alignItems: 'flex-end' },
  amountText: { fontSize: 15, fontWeight: '500', color: '#fff' },
  amountTotal: { fontSize: 12, color: '#52525b' },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmedAmount: { fontSize: 15, fontWeight: '500', color: '#22c55e' },

  progressBar: { height: 3, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, marginTop: 12 },
  progressFill: { height: 3, backgroundColor: '#fff', borderRadius: 2 },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 28, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 10, color: '#52525b' },
  navTextActive: { color: '#fff' },
});
