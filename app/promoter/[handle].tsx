import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Share,
  Dimensions,
  FlatList,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFollow } from '../../hooks/useFollow';

const API_BASE = 'https://lumina.viberyte.com';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

const colors = {
  background: '#07070A',
  card: '#12121A',
  cardElevated: '#1A1A24',
  cardBorder: '#2A2A3A',
  accent: '#8B5CF6',
  accentSoft: 'rgba(139, 92, 246, 0.15)',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  success: '#10B981',
  warning: '#F59E0B',
  pink: '#EC4899',
};

type Promoter = {
  id: number;
  instagram_handle: string;
  business_name: string;
  name?: string;
  profile_picture: string;
  avatar_url?: string;
  follower_count: number;
  primary_genre: string;
  secondary_genres: string;
  is_verified: boolean;
  bio?: string;
  cover_image?: string;
  specialty?: string;
};

type Event = {
  id: number;
  title: string;
  name?: string;
  event_date: string;
  parsed_date?: string;
  date?: string;
  event_time: string;
  time?: string;
  venue_name: string;
  venue_id?: number;
  image_url: string;
  genre: string;
  is_upcoming?: boolean;
};

type Venue = {
  id: number;
  name: string;
  category: string;
  neighborhood?: string;
  city?: string;
  image_url?: string;
  google_photos?: string[];
  role?: string;
};

export default function PromoterProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { handle } = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [loading, setLoading] = useState(true);
  const [promoter, setPromoter] = useState<Promoter | null>(null);
  const [promoterId, setPromoterId] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  // isFollowing managed by useFollow hook below
  const [bioExpanded, setBioExpanded] = useState(false);
  
  // Follow hook
  const { isFollowing, toggleFollow } = useFollow('promoter', promoterId);

  useEffect(() => {
    fetchPromoterData();
  }, [handle]);

  const fetchPromoterData = async () => {
    try {
      setLoading(true);
      
      const [promoterRes, venuesRes] = await Promise.all([
        fetch(`${API_BASE}/api/promoters/${handle}`),
        fetch(`${API_BASE}/api/promoters/venues?promoter_id=${handle}`).catch(() => null),
      ]);
      
      if (promoterRes.ok) {
        const data = await promoterRes.json();
        setPromoter(data.promoter);
        setPromoterId(data.promoter?.id || null);
        setEvents(data.events || []);
      }
      
      if (venuesRes?.ok) {
        const venueData = await venuesRes.json();
        setVenues(venueData.venues || []);
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Tonight';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 7 && diffDays > 0) return date.toLocaleDateString('en-US', { weekday: 'short' });
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }, []);

  const formatPastDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }, []);

  const formatFollowers = (count: number) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const openInstagram = useCallback(() => {
    if (promoter?.instagram_handle) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`https://instagram.com/${promoter.instagram_handle}`);
    }
  }, [promoter?.instagram_handle]);

  const handleShare = useCallback(async () => {
    if (!promoter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out ${promoter.business_name || promoter.instagram_handle} on Lumina!`,
        url: `https://lumina.viberyte.com/p/${promoter.instagram_handle}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  }, [promoter]);

  const handleFollow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFollow();
  }, [toggleFollow]);

  // Split events
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = events.filter(e => {
      const date = e.parsed_date || e.event_date || e.date || '';
      return date >= today;
    }).sort((a, b) => (a.parsed_date || a.event_date || '').localeCompare(b.parsed_date || b.event_date || ''));
    
    const past = events.filter(e => {
      const date = e.parsed_date || e.event_date || e.date || '';
      return date < today;
    }).sort((a, b) => (b.parsed_date || b.event_date || '').localeCompare(a.parsed_date || a.event_date || ''))
    .slice(0, 15);
    
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  // Get photos from events
  const eventPhotos = useMemo(() => {
    return events
      .filter(e => e.image_url && !e.image_url.includes('unsplash.com'))
      .map((e, i) => ({ id: `event-${e.id}-${i}`, url: e.image_url, type: 'image' as const }))
      .slice(0, 12);
  }, [events]);

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 200, HERO_HEIGHT - 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!promoter) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="person-outline" size={64} color={colors.textMuted} />
        <Text style={styles.errorText}>Promoter not found</Text>
        <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = promoter.business_name || promoter.name || promoter.instagram_handle;
  const heroImage = promoter.cover_image || promoter.profile_picture || promoter.avatar_url;
  const genres = [
    promoter.primary_genre,
    ...(promoter.secondary_genres?.split(',').map(g => g.trim()) || [])
  ].filter(Boolean);
  
  const bio = promoter.bio || `${displayName} is a premier nightlife curator known for creating unforgettable experiences across the city's most exclusive venues.`;
  const bioPreview = bio.length > 150 ? bio.substring(0, 150).trim() + '...' : bio;
  
  // Build credibility line
  const credibilityParts = [];
  if (promoter.specialty) credibilityParts.push(promoter.specialty);
  else if (genres.length > 0) credibilityParts.push(`${genres[0]} curator`);
  else credibilityParts.push('Nightlife curator');
  if (venues.length > 0) credibilityParts.push(`${venues.length} venue${venues.length > 1 ? 's' : ''}`);
  if (events.length > 0) credibilityParts.push(`${events.length} events`);
  const credibilityLine = credibilityParts.join(' · ');

  const renderEventCard = (event: Event, isPast: boolean = false, isFirst: boolean = false) => {
    const eventDate = event.parsed_date || event.event_date || event.date || '';
    const eventTitle = event.title || event.name || 'Event';
    
    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.eventCard, isPast && styles.eventCardPast, isFirst && !isPast && styles.eventCardFirst]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/event/${event.id}`);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.eventImageContainer}>
          {event.image_url && !event.image_url.includes('unsplash.com') ? (
            <Image
              source={{ uri: event.image_url }}
              style={styles.eventImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <LinearGradient
              colors={[colors.accent, colors.pink]}
              style={styles.eventImagePlaceholder}
            >
              <Ionicons name="musical-notes" size={24} color="white" />
            </LinearGradient>
          )}
          {isPast && (
            <View style={styles.pastOverlay}>
              <Text style={styles.pastText}>PAST</Text>
            </View>
          )}
          {isFirst && !isPast && (
            <View style={styles.nextEventBadge}>
              <Text style={styles.nextEventText}>NEXT</Text>
            </View>
          )}
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventDate}>
            {isPast ? formatPastDate(eventDate) : formatDate(eventDate)}
          </Text>
          <Text style={styles.eventTitle} numberOfLines={2}>{eventTitle}</Text>
          {event.venue_name && (
            <Text style={styles.eventVenue} numberOfLines={1}>{event.venue_name}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderVenueCard = (venue: Venue) => {
    const venuePhoto = venue.image_url || (venue.google_photos && venue.google_photos[0]);
    
    return (
      <TouchableOpacity
        key={venue.id}
        style={styles.venueCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/venue/${venue.id}`);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.venueImageContainer}>
          {venuePhoto ? (
            <Image
              source={{ uri: venuePhoto }}
              style={styles.venueImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <LinearGradient
              colors={[colors.card, colors.cardElevated]}
              style={styles.venueImagePlaceholder}
            >
              <Ionicons name="business-outline" size={24} color={colors.textMuted} />
            </LinearGradient>
          )}
        </View>
        <View style={styles.venueInfo}>
          <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
          <Text style={styles.venueCategory}>{venue.category}</Text>
        </View>
        {venue.role && (
          <View style={styles.venueRoleBadge}>
            <Text style={styles.venueRoleText}>
              {venue.role === 'resident' ? '🏠 Resident' : venue.role === 'owner' ? '👑 Partner' : '🎤 Guest'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.animatedHeaderContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.animatedHeaderBack}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.animatedHeaderTitle} numberOfLines={1}>{displayName}</Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <LinearGradient colors={[colors.accent, colors.pink]} style={styles.heroImage} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(7,7,10,0.4)', 'rgba(7,7,10,0.95)']}
            locations={[0, 0.5, 1]}
            style={styles.heroGradient}
          />
          
          <TouchableOpacity
            style={[styles.headerButton, { top: insets.top + 8, left: 16 }]}
            onPress={() => router.back()}
          >
            <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </BlurView>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.headerButton, { top: insets.top + 8, right: 16 }]}
            onPress={handleShare}
          >
            <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
              <Ionicons name="share-outline" size={22} color="white" />
            </BlurView>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{displayName}</Text>
              {promoter.is_verified && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </View>
            <Text style={styles.handle}>@{promoter.instagram_handle}</Text>
            <Text style={styles.credibilityLine}>{credibilityLine}</Text>
            
            {promoter.follower_count > 0 && (
              <View style={styles.statsRow}>
                <Text style={styles.statValue}>{formatFollowers(promoter.follower_count)}</Text>
                <Text style={styles.statLabel}> followers</Text>
              </View>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followButtonActive]}
              onPress={handleFollow}
            >
              <Ionicons 
                name={isFollowing ? "checkmark-circle" : "add-circle-outline"} 
                size={20} 
                color={isFollowing ? colors.white : colors.accent} 
              />
              <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bookingBadge} onPress={openInstagram}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.bookingBadgeText}>DM for bookings</Text>
            </TouchableOpacity>
          </View>
          
          {isFollowing && (
            <Text style={styles.followFeedback}>You'll be notified about new events</Text>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={openInstagram}>
              <LinearGradient
                colors={['#833AB4', '#E1306C', '#F77737']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="logo-instagram" size={20} color="white" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Instagram</Text>
            </TouchableOpacity>
          </View>

          {/* Genres */}
          {genres.length > 0 && (
            <View style={styles.genresContainer}>
              {genres.map((genre, index) => (
                <View key={index} style={styles.genreBadge}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <TouchableOpacity 
              onPress={() => setBioExpanded(!bioExpanded)}
              activeOpacity={bio.length > 150 ? 0.7 : 1}
            >
              <Text style={styles.bioText}>{bioExpanded ? bio : bioPreview}</Text>
              {bio.length > 150 && (
                <Text style={styles.readMore}>{bioExpanded ? 'Less' : 'More'}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Venues */}
          {venues.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Venues</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{venues.length}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venuesScroll}>
                {venues.map(renderVenueCard)}
              </ScrollView>
            </View>
          )}

          {/* Events */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Events</Text>
              {upcomingEvents.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{upcomingEvents.length} upcoming</Text>
                </View>
              )}
            </View>
            {upcomingEvents.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
                {upcomingEvents.slice(0, 10).map((event, index) => renderEventCard(event, false, index === 0))}
              </ScrollView>
            ) : (
              <View style={styles.noEventsContainer}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                <Text style={styles.noEventsText}>No upcoming events</Text>
                <Text style={styles.noEventsSubtext}>Check back soon for updates</Text>
              </View>
            )}
          </View>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Nights</Text>
                <Text style={styles.sectionSubtitle}>Proven track record</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
                {pastEvents.map((event) => renderEventCard(event, true, false))}
              </ScrollView>
            </View>
          )}

          {/* Photo Grid */}
          {eventPhotos.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <Text style={styles.mediaCountText}>{eventPhotos.length}</Text>
              </View>
              <FlatList
                data={eventPhotos.slice(0, 9)}
                numColumns={3}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.photoGrid}
                columnWrapperStyle={styles.photoGridRow}
                renderItem={({ item }) => (
                  <View style={styles.photoGridItem}>
                    <Image source={{ uri: item.url }} style={styles.photoGridImage} contentFit="cover" />
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
  errorText: { marginTop: 16, fontSize: 18, color: colors.textMuted },
  backButtonError: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.accent, borderRadius: 12 },
  backButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  scrollView: { flex: 1 },

  // Animated Header
  animatedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, overflow: 'hidden' },
  animatedHeaderContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  animatedHeaderBack: { marginRight: 12 },
  animatedHeaderTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: 'white' },

  // Hero
  heroContainer: { height: HERO_HEIGHT, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: HERO_HEIGHT * 0.7 },
  headerButton: { position: 'absolute', zIndex: 10 },
  headerButtonBlur: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },

  // Content
  content: { marginTop: -50, paddingHorizontal: 20 },

  // Profile Header
  profileHeader: { marginBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  displayName: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  handle: { fontSize: 16, color: colors.textMuted, marginBottom: 6 },
  credibilityLine: { fontSize: 14, color: colors.accent, fontWeight: '600', marginBottom: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 15, color: colors.textSecondary },

  // Action Row
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  followButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: 'transparent' },
  followButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  followButtonText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  followButtonTextActive: { color: colors.white },
  bookingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  bookingBadgeText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  followFeedback: { fontSize: 13, color: colors.success, marginBottom: 16, marginTop: 4 },

  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  quickAction: { alignItems: 'center', gap: 6 },
  quickActionGradient: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  quickActionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  // Genres
  genresContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  genreBadge: { backgroundColor: colors.accentSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.accent + '30' },
  genreText: { fontSize: 13, color: colors.accent, fontWeight: '600' },

  // Sections
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  sectionSubtitle: { fontSize: 14, color: colors.textMuted },
  countBadge: { backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 13, fontWeight: '700', color: 'white' },
  bioText: { fontSize: 16, lineHeight: 24, color: colors.textSecondary },
  readMore: { fontSize: 15, color: colors.accent, fontWeight: '600', marginTop: 8 },
  mediaCountText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },

  // Venues
  venuesScroll: { gap: 12 },
  venueCard: { width: 140, backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  venueImageContainer: { width: '100%', height: 90 },
  venueImage: { width: '100%', height: '100%' },
  venueImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  venueInfo: { padding: 10, gap: 2 },
  venueName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  venueCategory: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  venueRoleBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  venueRoleText: { fontSize: 10, color: 'white', fontWeight: '600' },

  // Events
  eventsScroll: { gap: 12 },
  eventCard: { width: 160, backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  eventCardFirst: { width: 180, borderColor: colors.accent + '50' },
  eventCardPast: { opacity: 0.7 },
  eventImageContainer: { width: '100%', height: 100, position: 'relative' },
  eventImage: { width: '100%', height: '100%' },
  eventImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  pastOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pastText: { fontSize: 12, fontWeight: '800', color: 'white', letterSpacing: 1 },
  nextEventBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  nextEventText: { fontSize: 10, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  eventInfo: { padding: 12, gap: 4 },
  eventDate: { fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' },
  eventTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  eventVenue: { fontSize: 12, color: colors.textMuted },

  // No Events
  noEventsContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 8 },
  noEventsText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  noEventsSubtext: { fontSize: 14, color: colors.textMuted },

  // Photo Grid
  photoGrid: { gap: 2 },
  photoGridRow: { gap: 2 },
  photoGridItem: { width: (SCREEN_WIDTH - 44) / 3, height: (SCREEN_WIDTH - 44) / 3, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.card },
  photoGridImage: { width: '100%', height: '100%' },
});
