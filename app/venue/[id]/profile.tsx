import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
  FlatList,
  Linking,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFollow } from '../../../hooks/useFollow';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPhotoUrl, getAllMedia } from '../../../utils/photoHelper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MEDIA_HEIGHT = SCREEN_HEIGHT * 0.48; // Slightly less aggressive

const colors = {
  background: '#07070A',
  card: '#12121A',
  cardElevated: '#1A1A24',
  cardBorder: '#2A2A3A',
  accent: '#8B5CF6',
  accentSoft: 'rgba(139, 92, 246, 0.15)',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  success: '#10B981',
  warning: '#F59E0B',
  pink: '#EC4899',
  orange: '#F97316',
};

// Helper to safely parse JSON
const safeParseArray = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface VenueEvent {
  id: number;
  title: string;
  date: string;
  event_date?: string;
  time?: string;
  image_url?: string;
  genre?: string;
  ticket_url?: string;
  is_upcoming: boolean;
}

interface Promoter {
  id: number;
  name: string;
  instagram_handle?: string;
  avatar_url?: string;
  role: string;
}

export default function VenueProfileScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [venue, setVenue] = useState<any>(null);
  const { isFollowing, toggleFollow } = useFollow('venue', id ? Number(id) : null);
  const [events, setEvents] = useState<{ upcoming: VenueEvent[]; past: VenueEvent[] }>({ upcoming: [], past: [] });
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaToShow, setMediaToShow] = useState(9);
  // Follow hook handles state and API

  useEffect(() => {
    fetchAllData();
  }, [id]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Parallel fetch calls for better performance
      const [venueRes, eventsRes, promotersRes] = await Promise.all([
        fetch(`https://lumina.viberyte.com/api/venues/${id}`),
        fetch(`https://lumina.viberyte.com/api/venues/${id}/events`),
        fetch(`https://lumina.viberyte.com/api/venues/${id}/promoters`)
      ]);
      
const venueData = await venueRes.json();
      setVenue(venueData);
      
      const eventsData = await eventsRes.json();
      if (eventsData.success && eventsData.events) {
        const upcoming = eventsData.events.filter((e: VenueEvent) => e.is_upcoming);
        const past = eventsData.events.filter((e: VenueEvent) => !e.is_upcoming);
        setEvents({ upcoming, past });
      }
      
      const promotersData = await promotersRes.json();
      if (promotersData.success && promotersData.promoters) {
        setPromoters(promotersData.promoters);
      }
      
    } catch (error) {
      console.error('Error fetching venue profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // useCallback for scroll handler - prevents re-renders
  const handleMediaScrollEnd = useCallback((e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentMediaIndex(index);
    setIsVideoPlaying(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (!venue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out ${venue.name} on Lumina - your AI nightlife concierge`,
        url: `https://lumina.viberyte.com/venue/${id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [venue, id]);

  const handleInstagram = useCallback(() => {
    if (venue?.instagram_handle) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`https://instagram.com/${venue.instagram_handle.replace('@', '')}`);
    }
  }, [venue?.instagram_handle]);

  const handleDirections = useCallback(() => {
    if (venue?.address) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const address = encodeURIComponent(venue.address);
      // Cross-platform directions
      const url = Platform.OS === 'ios'
        ? `maps://?q=${address}`
        : `https://www.google.com/maps/search/?api=1&query=${address}`;
      Linking.openURL(url);
    }
  }, [venue?.address]);

  const toggleVideoPlay = useCallback(() => {
    setIsVideoPlaying(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Tonight';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const formatPastDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  // Memoized media array
  const allMedia = useMemo(() => {
    if (!venue) return [];
    return getAllMedia(venue);
  }, [venue]);

  const heroImage = useMemo(() => {
    if (!venue) return null;
    return getPhotoUrl(venue);
  }, [venue]);


  // Memoized vibes
  const vibes = useMemo(() => {
    if (!venue) return [];
    return safeParseArray(venue.primary_vibes);
  }, [venue]);

  // Header animation - better interpolation timing
  const headerOpacity = scrollY.interpolate({
    inputRange: [MEDIA_HEIGHT - 280, MEDIA_HEIGHT - 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Memoized media item renderer - only mount video for current index
  const renderMediaItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => {
    const isCurrentItem = index === currentMediaIndex;
    const isVideo = item.type === 'video';
    
    return (
      <View style={styles.mediaSlide}>
        {isVideo && isCurrentItem ? (
          <TouchableOpacity
            activeOpacity={1}
            onPress={toggleVideoPlay}
            style={styles.mediaSlide}
          >
            <Video
              source={{ uri: item.url }}
              style={styles.mediaContent}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isVideoPlaying}
              isLooping
              isMuted={isMuted}
            />
            {!isVideoPlaying && (
              <View style={styles.playOverlay}>
                <View style={styles.playButton}>
                  <Ionicons name="play" size={32} color="white" />
                </View>
              </View>
            )}
            {isVideoPlaying && (
              <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
                <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="white" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : (
          <Image
            source={{ uri: isVideo ? item.thumbnail : item.url }}
            style={styles.mediaContent}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        )}
        {isVideo && !isCurrentItem && (
          <View style={styles.videoIndicatorOverlay}>
            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </View>
    );
  }, [currentMediaIndex, isVideoPlaying, isMuted, toggleVideoPlay, toggleMute]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
        <Text style={styles.errorText}>Venue not found</Text>
        <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rating = venue.google_rating || venue.rating;
  const showDots = allMedia.length > 1 && allMedia.length <= 8;

  // Get venue hero for event fallback
  const venueHeroImage = heroImage || allMedia[0]?.url || null;

  const renderEventCard = (event: VenueEvent, isPast: boolean = false) => {
    // Use event image, or venue hero as fallback
    const eventImage = event.image_url && !event.image_url.includes('unsplash.com') 
      ? event.image_url 
      : venueHeroImage;
    
    return (
    <TouchableOpacity
      key={event.id}
      style={[styles.eventCard, isPast && styles.eventCardPast]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/event/${event.id}`);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.eventImageContainer}>
        {eventImage ? (
          <Image
            source={{ uri: eventImage }}
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
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventDate}>
          {isPast ? formatPastDate(event.parsed_date || event.date || event.event_date || '') : formatDate(event.parsed_date || event.date || event.event_date || '')}
        </Text>
        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
        {event.genre && (
          <Text style={styles.eventGenre}>{event.genre}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
  };

  const renderPromoterCard = (promoter: Promoter) => (
    <TouchableOpacity
      key={promoter.id}
      style={styles.promoterCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (promoter.instagram_handle) {
          router.push(`/promoter/${promoter.instagram_handle}`);
        }
      }}
      activeOpacity={0.8}
    >
      <View style={styles.promoterAvatar}>
        {promoter.avatar_url ? (
          <Image
            source={{ uri: promoter.avatar_url }}
            style={styles.promoterAvatarImage}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[colors.accent, colors.pink]}
            style={styles.promoterAvatarPlaceholder}
          >
            <Text style={styles.promoterInitial}>
              {promoter.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
        )}
      </View>
      <View style={styles.promoterInfo}>
        <Text style={styles.promoterName}>{promoter.name}</Text>
        {promoter.instagram_handle && (
          <Text style={styles.promoterHandle}>@{promoter.instagram_handle}</Text>
        )}
      </View>
      <View style={styles.promoterRole}>
        <Text style={styles.promoterRoleText}>
          {promoter.role === 'resident' ? '🏠 Resident' : 
           promoter.role === 'owner' ? '👑 Owner' : '🎤 Guest'}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.animatedHeaderTitle} numberOfLines={1}>{venue.name}</Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Media Swiper */}
        <View style={styles.mediaSwiperContainer}>
          {allMedia.length > 0 ? (
            <FlatList
              data={allMedia}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleMediaScrollEnd}
              keyExtractor={(item) => item.id}
              renderItem={renderMediaItem}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews={true}
            />
          ) : (
            <View style={[styles.mediaSlide, styles.noMediaPlaceholder]}>
              <Ionicons name="image-outline" size={64} color={colors.textMuted} />
              <Text style={styles.noMediaText}>No photos yet</Text>
            </View>
          )}
          
          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(7,7,10,0.3)', 'rgba(7,7,10,0.95)']}
            locations={[0, 0.5, 1]}
            style={styles.mediaGradient}
            pointerEvents="none"
          />
          
          {/* Media dots - only show if <= 8 items */}
          {showDots && (
            <View style={styles.dotsContainer}>
              {allMedia.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentMediaIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
          
          {/* Back button */}
          <TouchableOpacity
            style={[styles.headerButton, { top: insets.top + 8, left: 16 }]}
            onPress={() => router.back()}
          >
            <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </BlurView>
          </TouchableOpacity>
          
          {/* Share button */}
          <TouchableOpacity
            style={[styles.headerButton, { top: insets.top + 8, right: 16 }]}
            onPress={handleShare}
          >
            <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
              <Ionicons name="share-outline" size={22} color="white" />
            </BlurView>
          </TouchableOpacity>
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          {/* Venue Header */}
          <View style={styles.venueHeader}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <View style={styles.venueMeta}>
              <Text style={styles.venueCategory}>{venue.category}</Text>
              {venue.neighborhood && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.venueNeighborhood}>{venue.neighborhood}</Text>
                </>
              )}
              {rating && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={colors.warning} />
                    <Text style={styles.ratingText}>{Number(rating).toFixed(1)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
          
          {/* Follow Button */}
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleFollow();
            }}
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

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {venue.instagram_handle && (
              <TouchableOpacity style={styles.quickAction} onPress={handleInstagram}>
                <LinearGradient
                  colors={['#833AB4', '#E1306C', '#F77737']}
                  style={styles.quickActionGradient}
                >
                  <Ionicons name="logo-instagram" size={20} color="white" />
                </LinearGradient>
                <Text style={styles.quickActionText}>Instagram</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.quickAction} onPress={handleDirections}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="navigate" size={20} color={colors.accent} />
              </View>
              <Text style={styles.quickActionText}>Directions</Text>
            </TouchableOpacity>
            {venue.phone && (
              <TouchableOpacity 
                style={styles.quickAction} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL(`tel:${venue.phone}`);
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="call" size={20} color={colors.success} />
                </View>
                <Text style={styles.quickActionText}>Call</Text>
              </TouchableOpacity>
            )}
            {venue.website && (
              <TouchableOpacity 
                style={styles.quickAction} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL(venue.website);
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                  <Ionicons name="globe-outline" size={20} color={colors.orange} />
                </View>
                <Text style={styles.quickActionText}>Website</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Vibes */}
          {vibes.length > 0 && (
            <View style={styles.vibesContainer}>
              {vibes.map((vibe: string, index: number) => (
                <View key={index} style={styles.vibeBadge}>
                  <Text style={styles.vibeText}>{vibe}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* About */}
          {(venue.bio || venue.description) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.aboutText}>{venue.bio || venue.description}</Text>
            </View>
          )}
          
          {/* Photos & Videos Grid */}
          {allMedia.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Photos & Videos</Text>
                <View style={styles.mediaCountBadge}>
                  <Text style={styles.mediaCountText}>{allMedia.length}</Text>
                  <Ionicons name="images-outline" size={16} color={colors.textSecondary} />
                </View>
              </View>
              <FlatList
                data={allMedia.slice(0, mediaToShow)}
                numColumns={3}
                scrollEnabled={false}
                keyExtractor={(item, index) => `media-${item.id}-${index}`}
                contentContainerStyle={styles.mediaGrid}
                columnWrapperStyle={styles.mediaGridRow}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.mediaGridItem}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.thumbnail || item.url }}
                      style={styles.mediaGridImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    {item.type === 'video' && (
                      <View style={styles.mediaGridVideoOverlay}>
                        <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
              {allMedia.length > mediaToShow && (
                <TouchableOpacity
                  style={styles.showMoreMediaButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMediaToShow(prev => prev + 12);
                  }}
                >
                  <Text style={styles.showMoreMediaText}>Show More</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Events Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Events</Text>
              {events.upcoming.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{events.upcoming.length} upcoming</Text>
                </View>
              )}
            </View>
            {events.upcoming.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsScroll}
              >
                {events.upcoming.slice(0, 10).map((event) => renderEventCard(event))}
              </ScrollView>
            ) : (
              <View style={styles.noEventsContainer}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                <Text style={styles.noEventsText}>No upcoming events</Text>
                <Text style={styles.noEventsSubtext}>Check back soon for updates</Text>
              </View>
            )}
          </View>
          
          {/* Past Events - only show if there are past events */}
          {events.past.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Past Events</Text>
                <Text style={styles.sectionSubtitle}>What you missed</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsScroll}
              >
                {events.past.slice(0, 15).map((event) => renderEventCard(event, true))}
              </ScrollView>
            </View>
          )}
          
          {/* Promoters */}
          {promoters.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Promoters & Hosts</Text>
              </View>
              <View style={styles.promotersList}>
                {promoters.map(renderPromoterCard)}
              </View>
            </View>
          )}
          
          {/* Location */}
          {venue.address && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <TouchableOpacity style={styles.locationCard} onPress={handleDirections}>
                <View style={styles.locationIcon}>
                  <Ionicons name="location" size={24} color={colors.accent} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationAddress}>{venue.address}</Text>
                  {venue.city && (
                    <Text style={styles.locationCity}>{venue.city}, {venue.state}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsGrid}>
              {venue.dress_code && (
                <View style={styles.detailItem}>
                  <Ionicons name="shirt-outline" size={20} color={colors.textMuted} />
                  <Text style={styles.detailLabel}>Dress Code</Text>
                  <Text style={styles.detailValue}>{venue.dress_code}</Text>
                </View>
              )}
              {venue.price_tier && (
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={20} color={colors.textMuted} />
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>{venue.price_tier}</Text>
                </View>
              )}
              {venue.energy_level && (
                <View style={styles.detailItem}>
                  <Ionicons name="flash-outline" size={20} color={colors.textMuted} />
                  <Text style={styles.detailLabel}>Energy</Text>
                  <Text style={styles.detailValue}>{venue.energy_level}</Text>
                </View>
              )}
              {venue.music_genres && (
                <View style={styles.detailItem}>
                  <Ionicons name="musical-notes-outline" size={20} color={colors.textMuted} />
                  <Text style={styles.detailLabel}>Music</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {safeParseArray(venue.music_genres).join(', ') || venue.music_genres}
                  </Text>
                </View>
              )}
            </View>
          </View>
          

        </View>
      </Animated.ScrollView>
      
      {/* Sticky CTA */}
      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.stickyCtaGradient}
        />
        <TouchableOpacity
          style={styles.stickyCtaButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.back(); // Go back to venue module which has Add to Plan
          }}
        >
          <Ionicons name="add-circle" size={22} color="white" />
          <Text style={styles.stickyCtaText}>Add to Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.textMuted,
  },
  backButtonError: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  
  // Animated Header
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  animatedHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  animatedHeaderBack: {
    marginRight: 12,
  },
  animatedHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  
  // Media Swiper
  mediaSwiperContainer: {
    height: MEDIA_HEIGHT,
    position: 'relative',
  },
  mediaSlide: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
  },
  mediaContent: {
    width: '100%',
    height: '100%',
  },
  noMediaPlaceholder: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  noMediaText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  mediaGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MEDIA_HEIGHT * 0.6,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  videoIndicatorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  muteButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 20,
    backgroundColor: 'white',
  },
  headerButton: {
    position: 'absolute',
    zIndex: 10,
  },
  headerButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  
  // Content
  content: {
    marginTop: -40,
    paddingHorizontal: 20,
  },
  
  // Venue Header
  venueHeader: {
    marginBottom: 20,
  },
  venueName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  venueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  venueCategory: {
    fontSize: 15,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  metaDot: {
    fontSize: 15,
    color: colors.textMuted,
  },
  venueNeighborhood: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
  },
  
  // Follow Button
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  followButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  followButtonTextActive: {
    color: colors.white,
  },
  
  // Media Grid
  mediaGrid: {
    gap: 2,
  },
  mediaGridRow: {
    gap: 2,
  },
  mediaGridItem: {
    width: (SCREEN_WIDTH - 44) / 3,
    height: (SCREEN_WIDTH - 44) / 3,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  mediaGridImage: {
    width: '100%',
    height: '100%',
  },
  mediaGridVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  mediaCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaCountText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  showMoreMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    marginTop: 8,
  },
  showMoreMediaText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
    gap: 6,
  },
  quickActionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  // Vibes
  vibesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  vibeBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  vibeText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  
  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  countBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  
  // Events
  eventsScroll: {
    gap: 12,
  },
  eventCard: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  eventCardPast: {
    opacity: 0.7,
  },
  eventImageContainer: {
    width: '100%',
    height: 100,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  eventInfo: {
    padding: 12,
    gap: 4,
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  eventGenre: {
    fontSize: 12,
    color: colors.textMuted,
  },
  
  // Promoters
  promotersList: {
    gap: 12,
  },
  promoterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  promoterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  promoterAvatarImage: {
    width: '100%',
    height: '100%',
  },
  promoterAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoterInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  promoterInfo: {
    flex: 1,
    gap: 2,
  },
  promoterName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  promoterHandle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  promoterRole: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
  },
  promoterRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  
  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 14,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    gap: 2,
  },
  locationAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  locationCity: {
    fontSize: 13,
    color: colors.textMuted,
  },
  
  // Details
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  

  
  // Media Grid
  mediaGrid: {
    gap: 2,
  },
  mediaGridRow: {
    gap: 2,
  },
  mediaGridItem: {
    width: (SCREEN_WIDTH - 44) / 3,
    height: (SCREEN_WIDTH - 44) / 3,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  mediaGridImage: {
    width: '100%',
    height: '100%',
  },
  mediaGridVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  mediaCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaCountText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  
  // No Events State
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  noEventsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
  
  // Sticky CTA
  stickyCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stickyCtaGradient: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 60,
  },
  stickyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: colors.accentGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  stickyCtaText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
});
