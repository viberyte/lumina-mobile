import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../../theme';
import { API_BASE } from '../../config';
import authService from '../../services/auth';

interface Booking {
  id: number;
  venue_id: number;
  venue_name: string;
  venue_photo?: string;
  booking_type: 'guest_list' | 'table' | 'ticket';
  booking_date: string;
  party_size: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  confirmation_code: string;
  total_amount?: number;
  zone_name?: string;
  event_name?: string;
}

type FilterType = 'upcoming' | 'past' | 'all';

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('upcoming');

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/bookings/user/${user.id}?filter=${filter}`
      );
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Bookings API not available yet');
        setBookings([]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setBookings(data.data || []);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.log('Bookings fetch error (expected if API not ready):', error);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [filter]);

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return colors.green[500];
      case 'pending': return colors.amber[500];
      case 'checked_in': return colors.blue[500];
      case 'completed': return colors.zinc[500];
      case 'cancelled': return colors.rose[500];
      default: return colors.zinc[500];
    }
  };

  const getStatusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'checked_in': return 'Checked In';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getBookingTypeIcon = (type: Booking['booking_type']) => {
    switch (type) {
      case 'guest_list': return 'list';
      case 'table': return 'wine';
      case 'ticket': return 'ticket';
      default: return 'calendar';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Tonight';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7 && diffDays > 0) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/booking/${item.id}`);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.bookingImageContainer}>
        {item.venue_photo ? (
          <Image source={{ uri: item.venue_photo }} style={styles.bookingImage} />
        ) : (
          <View style={styles.bookingImagePlaceholder}>
            <Ionicons name="location" size={24} color={colors.zinc[600]} />
          </View>
        )}
        <View style={[styles.typeIcon, { backgroundColor: colors.violet[500] }]}>
          <Ionicons name={getBookingTypeIcon(item.booking_type) as any} size={14} color="#fff" />
        </View>
      </View>

      <View style={styles.bookingInfo}>
        <Text style={styles.venueName} numberOfLines={1}>{item.venue_name}</Text>
        
        {item.event_name && (
          <Text style={styles.eventName} numberOfLines={1}>{item.event_name}</Text>
        )}
        
        <View style={styles.bookingMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.zinc[500]} />
            <Text style={styles.metaText}>{formatDate(item.booking_date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.zinc[500]} />
            <Text style={styles.metaText}>{item.party_size} guests</Text>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.confirmationCode}>{item.confirmation_code}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.zinc[700]} />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="ticket-outline" size={48} color={colors.zinc[700]} />
      </View>
      <Text style={styles.emptyTitle}>No bookings yet</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'upcoming' 
          ? 'Your upcoming reservations will appear here'
          : 'Your past reservations will appear here'}
      </Text>
      <TouchableOpacity 
        style={styles.exploreButton}
        onPress={() => router.push('/(tabs)/explore')}
      >
        <Text style={styles.exploreButtonText}>Explore Venues</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>Your Bookings</Text>
      </View>

      <View style={styles.filterContainer}>
        {(['upcoming', 'past', 'all'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f);
            }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.violet[500]} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.violet[500]}
            />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.zinc[950] },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#fff' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.zinc[900] },
  filterTabActive: { backgroundColor: colors.violet[500] },
  filterText: { fontSize: 14, fontWeight: '600', color: colors.zinc[500] },
  filterTextActive: { color: '#fff' },
  listContent: { padding: spacing.lg, paddingBottom: 120 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bookingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.zinc[900], borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm },
  bookingImageContainer: { position: 'relative', marginRight: spacing.md },
  bookingImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: colors.zinc[800] },
  bookingImagePlaceholder: { width: 70, height: 70, borderRadius: 12, backgroundColor: colors.zinc[800], alignItems: 'center', justifyContent: 'center' },
  typeIcon: { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.zinc[900] },
  bookingInfo: { flex: 1 },
  venueName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  eventName: { fontSize: 13, color: colors.violet[400], marginBottom: 4 },
  bookingMeta: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: colors.zinc[500] },
  bookingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  confirmationCode: { fontSize: 11, color: colors.zinc[600], fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: spacing.xl },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.zinc[900], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: spacing.xs },
  emptySubtitle: { fontSize: 14, color: colors.zinc[500], textAlign: 'center', marginBottom: spacing.lg },
  exploreButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.violet[500], paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  exploreButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
