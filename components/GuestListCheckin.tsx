import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';
import { API_BASE } from '../config';

interface Guest {
  id: number;
  guest_name: string;
  checked_in: boolean;
  checked_in_at: string | null;
  plus_ones: number;
  notes: string | null;
}

interface BookingInfo {
  id: number;
  confirmation_code: string;
  party_size: number;
  booking_date: string;
  status: string;
  venue_name?: string;
}

interface Props {
  bookingId: number;
  bookingInfo?: BookingInfo;
  onClose?: () => void;
}

export default function GuestListCheckin({ bookingId, bookingInfo, onClose }: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPlusOnes, setNewGuestPlusOnes] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, [bookingId]);

  const fetchGuests = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/guests`);
      const data = await response.json();
      if (data.success) {
        setGuests(data.data.guests || []);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGuests();
  }, []);

  const toggleCheckIn = async (guest: Guest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newStatus = !guest.checked_in;
    
    setGuests(prev => prev.map(g => 
      g.id === guest.id ? { ...g, checked_in: newStatus, checked_in_at: newStatus ? new Date().toISOString() : null } : g
    ));

    try {
      const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/guests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guest.id,
          action: newStatus ? 'check_in' : 'check_out',
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in: !newStatus } : g));
        Alert.alert('Error', 'Failed to update guest status');
      } else {
        Haptics.notificationAsync(newStatus ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in: !newStatus } : g));
    }
  };

  const addGuest = async () => {
    if (!newGuestName.trim()) {
      Alert.alert('Required', 'Please enter a guest name');
      return;
    }
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: [{ guest_name: newGuestName.trim(), plus_ones: newGuestPlusOnes }] }),
      });
      const data = await response.json();
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNewGuestName('');
        setNewGuestPlusOnes(0);
        setShowAddGuest(false);
        fetchGuests();
      } else {
        Alert.alert('Error', data.error || 'Failed to add guest');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add guest');
    } finally {
      setAdding(false);
    }
  };

  const removeGuest = (guest: Guest) => {
    Alert.alert('Remove Guest', `Remove ${guest.guest_name} from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/guests?guest_id=${guest.id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) setGuests(prev => prev.filter(g => g.id !== guest.id));
          } catch (error) {
            console.error('Error removing guest:', error);
          }
        },
      },
    ]);
  };

  const filteredGuests = guests.filter(g => g.guest_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalGuests = guests.reduce((sum, g) => sum + 1 + (g.plus_ones || 0), 0);
  const checkedInTotal = guests.filter(g => g.checked_in).reduce((sum, g) => sum + 1 + (g.plus_ones || 0), 0);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const renderGuest = ({ item }: { item: Guest }) => (
    <View style={styles.guestCard}>
      <TouchableOpacity style={styles.checkButton} onPress={() => toggleCheckIn(item)} activeOpacity={0.7}>
        <Ionicons name={item.checked_in ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={item.checked_in ? colors.green[500] : colors.zinc[600]} />
      </TouchableOpacity>
      <View style={styles.guestInfo}>
        <Text style={[styles.guestName, item.checked_in && styles.guestNameCheckedIn]}>{item.guest_name}</Text>
        <View style={styles.guestMeta}>
          {item.plus_ones > 0 && (
            <View style={styles.plusOnesBadge}>
              <Ionicons name="people" size={12} color={colors.zinc[400]} />
              <Text style={styles.plusOnesText}>+{item.plus_ones}</Text>
            </View>
          )}
          {item.checked_in && item.checked_in_at && <Text style={styles.checkInTime}>Checked in at {formatTime(item.checked_in_at)}</Text>}
        </View>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => removeGuest(item)}>
        <Ionicons name="close-circle" size={22} color={colors.zinc[700]} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.violet[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Guest List</Text>
          {bookingInfo && <Text style={styles.headerSubtitle}>{bookingInfo.confirmation_code}</Text>}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddGuest(true); }}>
          <Ionicons name="person-add" size={22} color={colors.violet[400]} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}><Text style={styles.statValue}>{checkedInTotal}</Text><Text style={styles.statLabel}>Checked In</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={styles.statValue}>{totalGuests}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${totalGuests > 0 ? (checkedInTotal / totalGuests) * 100 : 0}%` }]} /></View>
          <Text style={styles.statLabel}>{totalGuests > 0 ? Math.round((checkedInTotal / totalGuests) * 100) : 0}%</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.zinc[500]} />
        <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search guests..." placeholderTextColor={colors.zinc[600]} />
        {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={colors.zinc[500]} /></TouchableOpacity>}
      </View>

      <FlatList
        data={filteredGuests}
        renderItem={renderGuest}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet[500]} />}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="people-outline" size={48} color={colors.zinc[700]} /><Text style={styles.emptyTitle}>No guests yet</Text></View>}
      />

      {showAddGuest && (
        <View style={styles.addGuestSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add Guest</Text>
            <TouchableOpacity onPress={() => setShowAddGuest(false)}><Ionicons name="close" size={24} color={colors.zinc[400]} /></TouchableOpacity>
          </View>
          <View style={styles.sheetContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Guest Name</Text>
              <TextInput style={styles.input} value={newGuestName} onChangeText={setNewGuestName} placeholder="Enter name" placeholderTextColor={colors.zinc[600]} autoFocus />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Plus Ones</Text>
              <View style={styles.plusOnesControl}>
                <TouchableOpacity style={styles.plusMinusButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNewGuestPlusOnes(Math.max(0, newGuestPlusOnes - 1)); }}><Ionicons name="remove" size={20} color="#fff" /></TouchableOpacity>
                <Text style={styles.plusOnesValue}>{newGuestPlusOnes}</Text>
                <TouchableOpacity style={styles.plusMinusButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNewGuestPlusOnes(newGuestPlusOnes + 1); }}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={[styles.addGuestButton, adding && styles.addGuestButtonDisabled]} onPress={addGuest} disabled={adding}>
              {adding ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="person-add" size={20} color="#fff" /><Text style={styles.addGuestButtonText}>Add to List</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.zinc[950] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.zinc[950] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.zinc[800] },
  backButton: { padding: 8 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: colors.zinc[500], marginTop: 2 },
  addButton: { padding: 8 },
  statsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.zinc[900], marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: 14 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: colors.zinc[500], marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.zinc[800] },
  progressBar: { width: 60, height: 6, backgroundColor: colors.zinc[800], borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.green[500], borderRadius: 3 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.zinc[900], marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.zinc[800] },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: spacing.sm, fontSize: 16, color: '#fff' },
  listContent: { padding: spacing.md, paddingBottom: 100 },
  guestCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.zinc[900], borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  checkButton: { marginRight: spacing.md },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  guestNameCheckedIn: { color: colors.green[400] },
  guestMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  plusOnesBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.zinc[800], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  plusOnesText: { fontSize: 12, color: colors.zinc[400], fontWeight: '500' },
  checkInTime: { fontSize: 12, color: colors.zinc[500] },
  removeButton: { padding: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.zinc[400], marginTop: 12 },
  addGuestSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.zinc[900], borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.zinc[800] },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  sheetContent: { padding: spacing.lg },
  inputGroup: { marginBottom: spacing.lg },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.zinc[400], marginBottom: spacing.sm },
  input: { backgroundColor: colors.zinc[800], borderRadius: 12, padding: spacing.md, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: colors.zinc[700] },
  plusOnesControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  plusMinusButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.zinc[800], alignItems: 'center', justifyContent: 'center' },
  plusOnesValue: { fontSize: 24, fontWeight: '700', color: '#fff', minWidth: 40, textAlign: 'center' },
  addGuestButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.violet[500], borderRadius: 14, paddingVertical: 16, marginTop: spacing.sm },
  addGuestButtonDisabled: { opacity: 0.6 },
  addGuestButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
