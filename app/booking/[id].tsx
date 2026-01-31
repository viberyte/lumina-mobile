import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../../theme';
import { API_BASE } from '../../config';

interface BookingDetails {
  id: number;
  venue_id: number;
  venue_name: string;
  venue_photo?: string;
  venue_address?: string;
  booking_type: 'guest_list' | 'table' | 'ticket';
  booking_date: string;
  booking_time?: string;
  party_size: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  confirmation_code: string;
  total_amount?: number;
  zone_name?: string;
  event_name?: string;
  special_requests?: string;
  created_at: string;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${id}`);
      const data = await response.json();
      if (data.success) {
        setBooking(data.data);
      }
    } catch (error) {
      console.log('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'checked_in': return '#3b82f6';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'checked_in': return 'Checked In';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE}/api/bookings/${id}/cancel`, {
                method: 'POST',
              });
              if (response.ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking');
            }
          }
        },
      ]
    );
  };

  const openChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/booking/chat?bookingId=${id}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={64} color={colors.zinc[600]} />
          <Text style={styles.emptyTitle}>Booking not found</Text>
          <Text style={styles.emptySubtitle}>This booking may have been removed</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <TouchableOpacity onPress={openChat} style={styles.chatButton}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {booking.venue_photo ? (
          <Image source={{ uri: booking.venue_photo }} style={styles.venueImage} />
        ) : null}

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {getStatusLabel(booking.status)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.venueName}>{booking.venue_name}</Text>
          {booking.venue_address ? (
            <Text style={styles.venueAddress}>{booking.venue_address}</Text>
          ) : null}
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Confirmation Code</Text>
          <Text style={styles.codeValue}>{booking.confirmation_code}</Text>
        </View>

        <TouchableOpacity style={styles.messageButton} onPress={openChat}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
          <Text style={styles.messageButtonText}>Message Promoter</Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.zinc[400]} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking.booking_date)}</Text>
            </View>
          </View>

          {booking.booking_time ? (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={colors.zinc[400]} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{booking.booking_time}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color={colors.zinc[400]} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Party Size</Text>
              <Text style={styles.detailValue}>{booking.party_size} guests</Text>
            </View>
          </View>

          {booking.zone_name ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={colors.zinc[400]} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Section</Text>
                <Text style={styles.detailValue}>{booking.zone_name}</Text>
              </View>
            </View>
          ) : null}

          {typeof booking.total_amount === 'number' && booking.total_amount > 0 ? (
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Ionicons name="card-outline" size={20} color={colors.zinc[400]} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text style={styles.detailValue}>${booking.total_amount.toLocaleString()}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {booking.special_requests ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <Text style={styles.specialRequests}>{booking.special_requests}</Text>
          </View>
        ) : null}

        {(booking.status === 'confirmed' || booking.status === 'pending') ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBooking}>
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.zinc[900], justifyContent: 'center', alignItems: 'center' },
  chatButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.white },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  venueImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: spacing.lg },
  statusContainer: { marginBottom: spacing.lg },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  venueName: { fontSize: 24, fontWeight: '700', color: colors.white, marginBottom: 4 },
  venueAddress: { fontSize: 14, color: colors.zinc[400] },
  codeContainer: { backgroundColor: colors.zinc[900], borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center' },
  codeLabel: { fontSize: 12, color: colors.zinc[500], marginBottom: 4 },
  codeValue: { fontSize: 24, fontWeight: '700', color: colors.white, letterSpacing: 2 },
  messageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6', borderRadius: 12, padding: 16, marginBottom: spacing.lg },
  messageButtonText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 12 },
  detailsCard: { backgroundColor: colors.zinc[900], borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.zinc[800] },
  detailText: { marginLeft: 12, flex: 1 },
  detailLabel: { fontSize: 12, color: colors.zinc[500], marginBottom: 2 },
  detailValue: { fontSize: 16, color: colors.white, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 8 },
  specialRequests: { fontSize: 14, color: colors.zinc[400], lineHeight: 20 },
  actions: { marginTop: spacing.lg },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelButtonText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.white, marginTop: spacing.lg },
  emptySubtitle: { fontSize: 14, color: colors.zinc[500], marginTop: 4 },
});
