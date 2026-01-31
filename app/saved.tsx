import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme';
import VenueCard from '../components/VenueCard';
import EventCard from '../components/EventCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'venues' | 'events';

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<TabType>('venues');
  const [savedVenues, setSavedVenues] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserIdAndFetch();
  }, []);

  const loadUserIdAndFetch = async () => {
    try {
      const profile = await AsyncStorage.getItem('@lumina_profile');
      if (profile) {
        const data = JSON.parse(profile);
        const uid = data.id || 'guest';
        setUserId(uid);
        await fetchSavedItems(uid);
      } else {
        setUserId('guest');
        await fetchSavedItems('guest');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUserId('guest');
      await fetchSavedItems('guest');
    }
  };

  const fetchSavedItems = async (uid: string) => {
    try {
      setLoading(true);

      const venuesResponse = await fetch(
        `https://lumina.viberyte.com/api/favorites?userId=${uid}&type=venue`
      );
      const venuesData = await venuesResponse.json();
      setSavedVenues(venuesData.items || []);

      const eventsResponse = await fetch(
        `https://lumina.viberyte.com/api/favorites?userId=${uid}&type=event`
      );
      const eventsData = await eventsResponse.json();
      setSavedEvents(eventsData.items || []);
    } catch (error) {
      console.error('Error fetching saved items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await fetchSavedItems(userId);
  };

  const handleUnsave = async (itemType: 'venue' | 'event', itemId: number) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await fetch(
        `https://lumina.viberyte.com/api/favorites?userId=${userId}&itemType=${itemType}&itemId=${itemId}`,
        { method: 'DELETE' }
      );

      if (itemType === 'venue') {
        setSavedVenues(savedVenues.filter((v) => v.id !== itemId));
      } else {
        setSavedEvents(savedEvents.filter((e) => e.id !== itemId));
      }
    } catch (error) {
      Alert.alert('Error', 'Could not remove item');
    }
  };

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const renderEmptyState = () => {
    const isVenues = activeTab === 'venues';
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={isVenues ? 'location-outline' : 'ticket-outline'}
          size={48}
          color={colors.zinc[700]}
        />
        <Text style={styles.emptyTitle}>
          No {isVenues ? 'venues' : 'events'} saved
        </Text>
        <Text style={styles.emptyText}>
          {isVenues
            ? 'Save spots you want to visit'
            : 'Save events you want to attend'}
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => router.push('/(tabs)/explore')}
          activeOpacity={0.7}
        >
          <Text style={styles.exploreButtonText}>Explore</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderVenues = () => {
    if (savedVenues.length === 0) return renderEmptyState();

    return (
      <View style={styles.grid}>
        {savedVenues.map((venue) => (
          <View key={venue.id} style={styles.cardWrapper}>
            <VenueCard venue={venue} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleUnsave('venue', venue.id)}
              activeOpacity={0.7}
            >
              <View style={styles.removeIcon}>
                <Ionicons name="close" size={16} color={colors.zinc[400]} />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderEvents = () => {
    if (savedEvents.length === 0) return renderEmptyState();

    return (
      <View style={styles.list}>
        {savedEvents.map((event) => (
          <View key={event.id} style={styles.eventCardWrapper}>
            <EventCard event={event} />
            <TouchableOpacity
              style={styles.removeButtonEvent}
              onPress={() => handleUnsave('event', event.id)}
              activeOpacity={0.7}
            >
              <View style={styles.removeIcon}>
                <Ionicons name="close" size={16} color={colors.zinc[400]} />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const currentCount = activeTab === 'venues' ? savedVenues.length : savedEvents.length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050508', '#120B2E', '#050508']}
        style={[styles.atmosphereHeader, { height: 140 + insets.top }]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.violet[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={28} color={colors.zinc[500]} />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Library</Text>
        
        {currentCount > 0 && (
          <Text style={styles.countText}>{currentCount} saved</Text>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'venues' && styles.tabActive]}
            onPress={() => handleTabChange('venues')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'venues' && styles.tabTextActive
            ]}>
              Venues
            </Text>
            {savedVenues.length > 0 && (
              <Text style={[
                styles.tabCount,
                activeTab === 'venues' && styles.tabCountActive
              ]}>
                {savedVenues.length}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.tabActive]}
            onPress={() => handleTabChange('events')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'events' && styles.tabTextActive
            ]}>
              Events
            </Text>
            {savedEvents.length > 0 && (
              <Text style={[
                styles.tabCount,
                activeTab === 'events' && styles.tabCountActive
              ]}>
                {savedEvents.length}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.zinc[600]} />
          </View>
        ) : (
          <>
            {activeTab === 'venues' ? renderVenues() : renderEvents()}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  atmosphereHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  countText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[600],
    marginBottom: spacing.xl,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.white,
  },
  tabText: {
    fontSize: typography.sizes.md,
    fontWeight: '500',
    color: colors.zinc[600],
  },
  tabTextActive: {
    color: colors.white,
  },
  tabCount: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[700],
  },
  tabCountActive: {
    color: colors.zinc[500],
  },
  loadingContainer: {
    paddingTop: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.zinc[500],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[700],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  exploreButton: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  exploreButtonText: {
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardWrapper: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  removeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    gap: spacing.md,
  },
  eventCardWrapper: {
    position: 'relative',
  },
  removeButtonEvent: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
});
