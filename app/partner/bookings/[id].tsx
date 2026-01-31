import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://lumina.viberyte.com';

export default function BookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const found = data.bookings?.find((b: any) => b.id === Number(id));
        setBooking(found || null);
      }
      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/bookings`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: Number(id), status }),
      });

      if (res.ok) {
        Alert.alert('Success', status === 'approved' ? 'Booking approved!' : status === 'paid' ? 'Marked as paid!' : 'Updated!');
        fetchBooking();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Update failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setUpdating(false);
    }
  };

  const handleDecline = () => {
    Alert.alert('Decline Booking', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => handleUpdateStatus('declined') },
    ]);
  };

  const formatDate = (dateStr?: unknown) => {
    if (typeof dateStr !== 'string') return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr?: unknown) => {
    if (typeof timeStr !== 'string') return '';
    if (!timeStr.includes(':')) return timeStr;
    const [hh, mm] = timeStr.split(':');
    const h = Number(hh);
    const m = Number(mm);
    if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
    return `${h % 12 || 12}:${mm.padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDateTime = (dateStr?: unknown) => {
    if (typeof dateStr !== 'string') return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#3b82f6';
      case 'paid': return '#22c55e';
      case 'declined': return '#ef4444';
      default: return '#71717a';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Booking</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Booking not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.customerName}>{booking.customer_name || booking.host_name || 'Guest'}</Text>
            {booking.customer_instagram && (
              <Text style={styles.instagram}>@{booking.customer_instagram}</Text>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Ionicons 
              name={booking.status === 'paid' ? 'checkmark-circle' : booking.status === 'approved' ? 'checkmark' : 'time'} 
              size={16} 
              color={getStatusColor(booking.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <DetailRow label="Event" value={booking.event_title} />
            <DetailRow label="Date" value={formatDate(booking.event_date || booking.booking_date)} />
            <DetailRow label="Time" value={formatTime(booking.event_time || booking.booking_time)} />
            <DetailRow label="Package" value={booking.section_name_snapshot || booking.table_type} />
            <DetailRow label="Min Spend" value={`$${booking.section_min_spend_snapshot || booking.total_amount}`} bold />
            <DetailRow label="Party Size" value={`${booking.party_size || booking.guest_count} guests`} />
            <DetailRow label="Confirmation" value={booking.confirmation_code || booking.invite_code} mono />
            <DetailRow label="Requested" value={formatDateTime(booking.created_at)} last />
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Contact</Text>
            {booking.customer_email && <DetailRow label="Email" value={booking.customer_email} />}
            {booking.customer_phone && <DetailRow label="Phone" value={booking.customer_phone} last />}
            {!booking.customer_email && !booking.customer_phone && (
              <Text style={styles.noContact}>No contact info available</Text>
            )}
          </View>

          {booking.special_requests && (
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Special Requests</Text>
              <Text style={styles.requestsText}>{booking.special_requests}</Text>
            </View>
          )}

          {booking.status === 'pending' && (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.approveButton}
                onPress={() => handleUpdateStatus('approved')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.approveText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineButton} onPress={handleDecline} disabled={updating}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {booking.status === 'approved' && (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.paidButton}
                onPress={() => handleUpdateStatus('paid')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cash" size={20} color="#fff" />
                    <Text style={styles.paidText}>Mark as Paid</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.messageButton}
                onPress={() => router.push(`/chat/${booking.user_id}`)}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                <Text style={styles.messageText}>Message Guest</Text>
              </TouchableOpacity>
            </View>
          )}

          {booking.status === 'paid' && (
            <View style={styles.paidConfirmation}>
              <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
              <Text style={styles.paidConfirmText}>Payment Received</Text>
              {booking.paid_at && <Text style={styles.paidDate}>{formatDateTime(booking.paid_at)}</Text>}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const DetailRow = ({ label, value, bold, mono, last }: { label: string; value?: string; bold?: boolean; mono?: boolean; last?: boolean }) => (
  <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, bold && styles.detailBold, mono && styles.detailMono]}>{value || '-'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 16 },
  customerName: { fontSize: 24, fontWeight: '600', color: '#fff' },
  instagram: { fontSize: 15, color: '#3b82f6', marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6, marginBottom: 20 },
  statusText: { fontSize: 14, fontWeight: '500' },
  detailsCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: '#71717a', marginBottom: 12, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  detailRowBorder: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  detailLabel: { fontSize: 14, color: '#71717a' },
  detailValue: { fontSize: 14, color: '#fff' },
  detailBold: { fontWeight: '600' },
  detailMono: { fontFamily: 'monospace', fontSize: 12, color: '#a1a1aa' },
  noContact: { fontSize: 14, color: '#52525b' },
  requestsText: { fontSize: 14, color: '#a1a1aa', lineHeight: 20 },
  actions: { gap: 12, marginTop: 8 },
  approveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 12 },
  approveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  declineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 16, borderRadius: 12 },
  declineText: { fontSize: 16, fontWeight: '500', color: '#ef4444' },
  paidButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 12 },
  paidText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  messageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 16, borderRadius: 12 },
  messageText: { fontSize: 16, fontWeight: '500', color: '#fff' },
  paidConfirmation: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  paidConfirmText: { fontSize: 18, fontWeight: '500', color: '#22c55e' },
  paidDate: { fontSize: 14, color: '#71717a' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#52525b' },
});
