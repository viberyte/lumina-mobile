import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

const API_BASE = 'https://lumina.viberyte.com';

type Venue = {
  id: number;
  name: string;
  address: string;
  is_home: boolean;
  section_count: number;
  table_count: number;
};

export default function VenuesList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/venues`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setVenues(data.venues || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVenues();
    setRefreshing(false);
  };

  const setAsHome = async (venueId: number) => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/venues/${venueId}/set-home`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchVenues();
      }
    } catch (error) {
      console.error('Set home error:', error);
    }
  };

  const confirmSetHome = (venue: Venue) => {
    if (venue.is_home) return;
    
    Alert.alert(
      'Set as Home',
      `Make "${venue.name}" your primary venue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set Home', onPress: () => setAsHome(venue.id) },
      ]
    );
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
          <Text style={styles.headerTitle}>Venues</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/partner/venues/new')}>
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {venues.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={48} color="#3f3f46" />
              <Text style={styles.emptyText}>No venues yet</Text>
              <Text style={styles.emptySubtext}>Add your first venue to get started</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/partner/venues/new')}>
                <Text style={styles.emptyButtonText}>Add Venue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>YOUR VENUES</Text>
              {venues.map((venue, index) => (
                <Animated.View key={venue.id} entering={FadeInDown.delay(index * 50).duration(200)}>
                  <TouchableOpacity
                    style={styles.venueCard}
                    onPress={() => router.push(`/partner/venues/${venue.id}`)}
                    onLongPress={() => confirmSetHome(venue)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.venueRow}>
                      <View style={styles.venueIcon}>
                        <Ionicons name="storefront" size={20} color={venue.is_home ? '#fff' : '#71717a'} />
                      </View>
                      <View style={styles.venueInfo}>
                        <View style={styles.venueNameRow}>
                          <Text style={styles.venueName}>{venue.name}</Text>
                           {!!venue.is_home && (
                            <View style={styles.homeBadge}>
                              <Text style={styles.homeBadgeText}>Home</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.venueAddress}>{venue.address || 'No address'}</Text>
                        <Text style={styles.venueMeta}>
                          {venue.section_count || 0} sections · {venue.table_count || 0} tables
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#3f3f46" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}

              <Text style={styles.hint}>Long press to set as home venue</Text>
            </>
          )}

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
  addButton: { padding: 4 },
  addText: { fontSize: 15, fontWeight: '400', color: '#3b82f6' },

  scrollView: { flex: 1, paddingHorizontal: 16 },

  sectionLabel: { fontSize: 12, fontWeight: '400', color: '#52525b', marginTop: 16, marginBottom: 12, letterSpacing: 0.5 },

  venueCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, padding: 14, marginBottom: 8 },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  venueIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center' },
  venueInfo: { flex: 1 },
  venueNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  venueName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  homeBadge: { backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  homeBadgeText: { fontSize: 10, fontWeight: '600', color: '#000' },
  venueAddress: { fontSize: 13, color: '#71717a', marginTop: 2 },
  venueMeta: { fontSize: 12, color: '#52525b', marginTop: 4 },

  hint: { fontSize: 12, color: '#3f3f46', textAlign: 'center', marginTop: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '500', color: '#fff', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#52525b', marginTop: 4 },
  emptyButton: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  emptyButtonText: { fontSize: 15, fontWeight: '500', color: '#000' },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 28, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 10, color: '#52525b' },
});
