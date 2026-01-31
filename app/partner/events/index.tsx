import React, { useState, useEffect } from 'react';
import { partnerFetch } from '../../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

const API_BASE = 'https://lumina.viberyte.com';

type EventState = 'needs_setup' | 'tables_live' | 'fully_managed';

type Event = {
  id: number;
  source: 'scraped' | 'created';
  title: string;
  venue_name: string;
  event_date: string;
  event_time: string;
  genre: string;
  image_url: string;
  status: string;
  allocations: any[];
  state?: EventState;
  stateLabel?: string;
};

function deriveEventState(event: Event): { state: EventState; label: string } {
  if (!event.allocations || event.allocations.length === 0) {
    return { state: 'needs_setup', label: 'Needs Setup' };
  }
  return { state: 'tables_live', label: 'Tables Live' };
}

export default function PartnerEvents() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<'all' | 'needs_setup' | 'tables_live'>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const res = await partnerFetch(`/api/partner/events?upcoming=true`, {
       headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const eventsWithState = (data.events || []).map((e: Event) => {
          const { state, label } = deriveEventState(e);
          return { ...e, state, stateLabel: label };
        });
        setEvents(eventsWithState);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Tonight';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'needs_setup') return e.state === 'needs_setup';
    if (filter === 'tables_live') return e.state === 'tables_live';
    return true;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (a.state === 'needs_setup' && b.state !== 'needs_setup') return -1;
    if (a.state !== 'needs_setup' && b.state === 'needs_setup') return 1;
    return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
  });

  const needsSetupCount = events.filter(e => e.state === 'needs_setup').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
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
          <Text style={styles.headerTitle}>Events</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/partner/events/new')}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'needs_setup' && styles.filterTabActive]}
            onPress={() => setFilter('needs_setup')}
          >
            <Text style={[styles.filterTabText, filter === 'needs_setup' && styles.filterTabTextActive]}>Needs Setup</Text>
            {needsSetupCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{needsSetupCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'tables_live' && styles.filterTabActive]}
            onPress={() => setFilter('tables_live')}
          >
            <Text style={[styles.filterTabText, filter === 'tables_live' && styles.filterTabTextActive]}>Live</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {sortedEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No events</Text>
              <Text style={styles.emptySubtext}>Events at your venues will appear here</Text>
            </View>
          ) : (
            sortedEvents.map((event, index) => (
              <Animated.View key={`${event.source}-${event.id}`} entering={FadeInDown.delay(index * 40).duration(300)}>
                <TouchableOpacity
                  style={styles.eventCard}
                  onPress={() => router.push(`/partner/events/${event.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.eventRow}>
                    {event.image_url ? (
                      <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                    ) : (
                      <View style={styles.eventImagePlaceholder}>
                        <Ionicons name="musical-notes" size={20} color="#52525b" />
                      </View>
                    )}

                    <View style={styles.eventInfo}>
                      <View style={styles.eventDateRow}>
                        <Text style={styles.eventDate}>{formatDate(event.event_date)}</Text>
                        <Text style={styles.eventDot}>·</Text>
                        <Text style={[
                          styles.eventState,
                          event.state === 'needs_setup' && styles.eventStateNeedsSetup,
                          event.state === 'tables_live' && styles.eventStateLive,
                        ]}>
                          {event.stateLabel}
                        </Text>
                      </View>
                      <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={styles.eventVenue} numberOfLines={1}>{event.venue_name}</Text>
                    </View>

                    <TouchableOpacity 
                      style={[
                        styles.actionButton,
                        event.state === 'needs_setup' && styles.actionButtonPrimary,
                      ]}
                       onPress={() => router.push(`/partner/events/${event.id}`)}
                    >
                      <Text style={[
                        styles.actionButtonText,
                        event.state === 'needs_setup' && styles.actionButtonTextPrimary,
                      ]}>
                        {event.state === 'needs_setup' ? 'Set Tables' : 'Manage'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
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
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="sparkles" size={22} color="#fff" />
            <Text style={[styles.navText, styles.navTextActive]}>Events</Text>
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
  filterTabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.06)', gap: 6 },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabText: { fontSize: 13, fontWeight: '500', color: '#71717a' },
  filterTabTextActive: { color: '#000' },
  filterBadge: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  filterBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  emptyCard: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  emptySubtext: { fontSize: 14, color: '#52525b', marginTop: 4 },
  eventCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 14, padding: 14, marginBottom: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventImage: { width: 56, height: 56, borderRadius: 10 },
  eventImagePlaceholder: { width: 56, height: 56, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center' },
  eventInfo: { flex: 1 },
  eventDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  eventDate: { fontSize: 12, color: '#a1a1aa', fontWeight: '500' },
  eventDot: { fontSize: 12, color: '#52525b' },
  eventState: { fontSize: 12, fontWeight: '500' },
  eventStateNeedsSetup: { color: '#f59e0b' },
  eventStateLive: { color: '#22c55e' },
  eventTitle: { fontSize: 15, fontWeight: '500', color: '#fff', marginBottom: 2 },
  eventVenue: { fontSize: 13, color: '#71717a' },
  actionButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  actionButtonPrimary: { backgroundColor: '#fff' },
  actionButtonText: { fontSize: 13, fontWeight: '500', color: '#a1a1aa' },
  actionButtonTextPrimary: { color: '#000' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 28, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 10, color: '#52525b' },
  navTextActive: { color: '#fff' },
});
