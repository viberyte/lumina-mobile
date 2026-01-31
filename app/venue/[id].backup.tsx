import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
  Share,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AddToPlanSheet from '../../components/AddToPlanSheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 350;

const colors = {
  background: '#0A0A0F',
  card: '#16161F',
  cardBorder: '#2A2A3A',
  accent: '#8B5CF6',
  accentDim: 'rgba(139, 92, 246, 0.12)',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
};

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  lounge: 'Lounge',
  bar: 'Bar',
  cocktail_bar: 'Cocktails',
  rooftop: 'Rooftop',
  club: 'Club',
  night_club: 'Club',
  diner: 'Late Night Eats',
  cafe: 'Café',
  wine_bar: 'Wine Bar',
};

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'photo';
  url: string;
  thumbnail?: string;
}

interface NextStop {
  id: string;
  name: string;
  category: string;
  neighborhood?: string;
  rating?: number;
  distance_miles?: number;
  walk_time_minutes?: number;
  reason?: {
    type: string;
    label: string;
  };
  flow_type?: string;
  confidence?: number;
  rank?: number;
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  recommendation: string;
}

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addToPlanVisible, setAddToPlanVisible] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [mediaToShow, setMediaToShow] = useState(9);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchVenueDetails();
    fetchWeather();
  }, [id]);

  const fetchVenueDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://lumina.viberyte.com/api/venues/${id}`);
      const data = await response.json();
      setVenue(data);
    } catch (error) {
      console.error('Error fetching venue:', error);
      Alert.alert('Error', 'Failed to load venue details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    try {
      const hour = new Date().getHours();
      const isEvening = hour >= 17;
      
      setWeather({
        temp: 68,
        condition: isEvening ? 'Clear evening' : 'Partly cloudy',
        icon: isEvening ? 'moon' : 'partly-sunny',
        recommendation: isEvening ? 'great for rooftops' : 'perfect weather',
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const getTimeStatus = () => {
    const hour = new Date().getHours();
    if (hour < 17) return { status: 'Opens soon', color: colors.warning, icon: 'time-outline' };
    if (hour < 22) return { status: 'Open now', color: colors.success, icon: 'checkmark-circle' };
    return { status: 'Late night', color: colors.accent, icon: 'moon' };
  };

  const getPrimaryAction = () => {
    const category = venue?.category?.toLowerCase();
    if (['restaurant', 'cafe', 'diner'].includes(category)) return 'directions';
    if (['club', 'night_club', 'lounge', 'bar'].includes(category)) return 'instagram';
    return 'directions';
  };

  const getConfidenceBadge = (reason?: { type: string; label: string }) => {
    if (!reason) return null;
    
    const badges: Record<string, { icon: string; label: string }> = {
      'vibe_match': { icon: '🔥', label: 'Popular next stop' },
      'late_night': { icon: '🕒', label: 'Best after 11pm' },
      'same_music': { icon: '🎶', label: 'Similar vibe' },
      'nearby': { icon: '🚶', label: 'Walkable' },
      'warm_up': { icon: '✨', label: 'Good after dinner' },
      'turn_up': { icon: '⚡', label: 'Late-night energy' },
    };

    return badges[reason.type] || null;
  };

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCall = () => {
    if (venue?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`tel:${venue.phone}`);
    }
  };

  const handleDirections = () => {
    if (venue?.address) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const address = encodeURIComponent(venue.address);
      Linking.openURL(`maps://?q=${address}`);
    }
  };

  const handleInstagram = () => {
    if (venue?.instagram_handle) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const handle = venue.instagram_handle.replace('@', '');
      Linking.openURL(`instagram://user?username=${handle}`).catch(() => {
        Linking.openURL(`https://instagram.com/${handle}`);
      });
    }
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: `Check out ${venue?.name} on Lumina! https://lumina.viberyte.com/venue/${id}`,
        url: `https://lumina.viberyte.com/venue/${id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleBudgetMeal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Budget Meal Builder',
      'Set your budget and get AI meal recommendations!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Budget',
          onPress: () => {
            router.push(`/budget-meal/${id}`);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Venue not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allMedia: MediaItem[] = [
    ...(venue.google_photos?.map((photo: string, index: number) => ({
      id: `google-${index}`,
      type: 'image' as const,
      url: photo,
      thumbnail: photo,
    })) || []),
    ...(venue.instagram_media?.map((item: any, index: number) => ({
      id: `instagram-${index}`,
      type: (item.type === 'video' ? 'video' : 'image') as const,
      url: item.url,
      thumbnail: item.thumbnail || item.url,
    })) || []),
  ].sort((a, b) => (a.type === "video" && b.type !== "video" ? -1 : a.type !== "video" && b.type === "video" ? 1 : 0));


  const displayedMedia = allMedia.slice(0, mediaToShow);
  const timeStatus = getTimeStatus();
  const primaryAction = getPrimaryAction();

  // Native driver animations
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 125, 250],
    outputRange: [1, 0.8, 0.3],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.3, 1],
    extrapolate: 'clamp',
  });

  const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => {
    const isHero = index === 0;
    const isVideo = item.type === 'video';
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openGallery(index)}
        style={[styles.mediaItem, isHero && styles.heroMediaItem]}
      >
        {isVideo ? (
          <View style={[styles.mediaThumbnail, styles.videoPlaceholder]}>
            <Ionicons name="play-circle" size={isHero ? 72 : 48} color="white" />
          </View>
        ) : (
          <Image
            source={{ uri: item.thumbnail || item.url }}
            style={styles.mediaThumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority={isHero ? 'high' : 'normal'}
          />
        )}
      </TouchableOpacity>
    );
  };
  const renderGalleryItem = ({ item }: { item: MediaItem }) => (
    <View style={styles.gallerySlide}>
      {item.type === 'video' ? (
        <Video
          source={{ uri: item.url }}
          style={styles.galleryImage}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
        />
      ) : (
        <Image
          source={{ uri: item.url }}
          style={styles.galleryImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Parallax Header */}
      <Animated.View style={[styles.header, { height: HEADER_MAX_HEIGHT }]}>
        <Animated.Image
          source={{ uri: allMedia[0]?.url || 'https://via.placeholder.com/400' }}
          style={[
            styles.headerImage,
            {
              opacity: imageOpacity,
              transform: [{ scale: imageScale }],
            },
          ]}
        />
        <LinearGradient
          colors={['transparent', 'rgba(10, 10, 15, 0.9)', colors.background]}
          style={styles.headerGradient}
        />

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <BlurView intensity={80} tint="dark" style={styles.blurButton}>
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <BlurView intensity={80} tint="dark" style={styles.blurButton}>
              <Ionicons name="share-outline" size={24} color={colors.white} />
            </BlurView>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Venue Info */}
          <View style={styles.venueInfo}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.venueName}>{venue.name}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.category}>
                    {CATEGORY_LABELS[venue.category] || venue.category}
                  </Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.neighborhood}>{venue.neighborhood}</Text>
                  {venue.rating && (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={styles.rating}>{venue.rating.toFixed(1)}</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: `${timeStatus.color}20` }]}>
                <Ionicons name={timeStatus.icon as any} size={14} color={timeStatus.color} />
                <Text style={[styles.statusText, { color: timeStatus.color }]}>
                  {timeStatus.status}
                </Text>
              </View>
            </View>

            {/* Description */}
            {venue.description && (
              <View style={styles.descriptionContainer}>
                <Text
                  style={styles.description}
                  numberOfLines={descriptionExpanded ? undefined : 3}
                >
                  {venue.description}
                </Text>
                {venue.description.length > 150 && (
                  <TouchableOpacity
                    onPress={() => {
                      setDescriptionExpanded(!descriptionExpanded);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={styles.readMore}>
                      {descriptionExpanded ? 'Read less' : 'Read more'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Inline Weather */}
                {weather && (
                  <View style={styles.inlineWeather}>
                    <Ionicons name={weather.icon as any} size={16} color={colors.textMuted} />
                    <Text style={styles.inlineWeatherText}>
                      {weather.temp}°F · {weather.condition} — {weather.recommendation}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              {venue.phone && (
                <TouchableOpacity
                  onPress={handleCall}
                  style={[
                    styles.actionButton,
                    primaryAction !== 'call' && styles.actionButtonSecondary
                  ]}
                >
                  <View style={[
                    styles.actionIconContainer,
                    primaryAction === 'call' && styles.actionIconPrimary
                  ]}>
                    <Ionicons name="call" size={20} color={primaryAction === 'call' ? colors.white : colors.accent} />
                  </View>
                  <Text style={[
                    styles.actionLabel,
                    primaryAction === 'call' && styles.actionLabelPrimary
                  ]}>Call</Text>
                </TouchableOpacity>
              )}

              {venue.address && (
                <TouchableOpacity
                  onPress={handleDirections}
                  style={[
                    styles.actionButton,
                    primaryAction !== 'directions' && styles.actionButtonSecondary
                  ]}
                >
                  <View style={[
                    styles.actionIconContainer,
                    primaryAction === 'directions' && styles.actionIconPrimary
                  ]}>
                    <Ionicons name="navigate" size={20} color={primaryAction === 'directions' ? colors.white : colors.accent} />
                  </View>
                  <Text style={[
                    styles.actionLabel,
                    primaryAction === 'directions' && styles.actionLabelPrimary
                  ]}>Directions</Text>
                </TouchableOpacity>
              )}

              {venue.instagram_handle && (
                <TouchableOpacity
                  onPress={handleInstagram}
                  style={[
                    styles.actionButton,
                    primaryAction !== 'instagram' && styles.actionButtonSecondary
                  ]}
                >
                  <View style={[
                    styles.actionIconContainer,
                    primaryAction === 'instagram' && styles.actionIconPrimary
                  ]}>
                    <Ionicons name="logo-instagram" size={20} color={primaryAction === 'instagram' ? colors.white : colors.accent} />
                  </View>
                  <Text style={[
                    styles.actionLabel,
                    primaryAction === 'instagram' && styles.actionLabelPrimary
                  ]}>Instagram</Text>
                </TouchableOpacity>
              )}

              {venue.category === 'restaurant' && (
                <TouchableOpacity
                  onPress={handleBudgetMeal}
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="restaurant" size={20} color={colors.accent} />
                  </View>
                  <Text style={styles.actionLabel}>Budget</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Photos & Videos */}
          {allMedia.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Photos & Videos</Text>
                <Text style={styles.sectionCount}>{allMedia.length}</Text>
              </View>

              <FlatList
                data={displayedMedia}
                renderItem={renderMediaItem}
                keyExtractor={(item, index) => `${item.type}-${index}`}
                numColumns={3}
                scrollEnabled={false}
                contentContainerStyle={styles.mediaGrid}
              />

              {mediaToShow < allMedia.length && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => {
                    setMediaToShow(prev => Math.min(prev + 9, allMedia.length));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.showMoreText}>
                    See All {allMedia.length - mediaToShow} More
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Continue the Night */}
          {venue.next_stops && venue.next_stops.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Continue the Night</Text>

              <FlatList
                data={venue.next_stops}
                renderItem={({ item: stop }) => {
                  const confidenceBadge = getConfidenceBadge(stop.reason);
                  
                  return (
                    <TouchableOpacity
                      style={styles.nextStopCard}
                      activeOpacity={0.9}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/venue/${stop.id}`);
                      }}
                    >
                      {stop.photo_url && (
                        <Image
                          source={{ uri: stop.photo_url }}
                          style={styles.nextStopImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      )}
                      <View style={styles.nextStopContent}>
                        <View style={styles.nextStopHeader}>
                          <Text style={styles.nextStopName}>{stop.name}</Text>
                          {stop.distance_miles !== undefined && (
                            <Text style={styles.nextStopDistance}>
                              {stop.distance_miles < 0.5
                                ? `${stop.walk_time_minutes} min`
                                : `${stop.distance_miles.toFixed(1)} mi`
                              }
                            </Text>
                          )}
                        </View>

                        <View style={styles.nextStopMeta}>
                          <Text style={styles.nextStopCategory}>
                            {CATEGORY_LABELS[stop.category] || stop.category}
                          </Text>
                          {stop.neighborhood && (
                            <>
                              <Text style={styles.metaDot}>•</Text>
                              <Text style={styles.nextStopNeighborhood}>{stop.neighborhood}</Text>
                            </>
                          )}
                        </View>

                        {confidenceBadge && (
                          <View style={styles.confidenceBadge}>
                            <Text style={styles.confidenceBadgeText}>
                              {confidenceBadge.icon} {confidenceBadge.label}
                            </Text>
                          </View>
                        )}

                        {stop.reason && (
                          <View style={styles.reasonBadge}>
                            <Text style={styles.reasonText}>{stop.reason.label}</Text>
                          </View>
                        )}
                      </View>

                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={360}
                decelerationRate="fast"
                contentContainerStyle={styles.nextStopsList}
              />
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Sticky CTA */}
      <View style={styles.stickyCtaContainer}>
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.ctaGradient}
        />
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAddToPlanVisible(true);
          }}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradientButton}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.white} />
            <Text style={styles.ctaText}>Add to Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Gallery Modal */}
      <Modal
        visible={galleryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryVisible(false)}
      >
        <View style={styles.galleryModal}>
          <View style={styles.galleryHeader}>
            <TouchableOpacity
              onPress={() => setGalleryVisible(false)}
              style={styles.galleryClose}
            >
              <Ionicons name="close" size={32} color={colors.white} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={allMedia}
            renderItem={renderGalleryItem}
            keyExtractor={(item, index) => `gallery-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={galleryIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />
        </View>
      </Modal>

      <AddToPlanSheet
        visible={addToPlanVisible}
        onClose={() => setAddToPlanVisible(false)}
        venue={venue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { fontSize: 18, color: colors.textSecondary, marginBottom: 20 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.accent, borderRadius: 12 },
  backButtonText: { fontSize: 16, color: colors.white, fontWeight: '600' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, overflow: 'hidden' },
  headerImage: { width: '100%', height: '100%' },
  headerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  headerActions: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  blurButton: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { paddingTop: HEADER_MAX_HEIGHT - 40 },
  venueInfo: { paddingHorizontal: 20, paddingTop: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  titleContainer: { flex: 1, marginRight: 12 },
  venueName: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 8, lineHeight: 34 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  category: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  metaDot: { fontSize: 15, color: colors.textMuted, marginHorizontal: 6 },
  neighborhood: { fontSize: 15, color: colors.textSecondary },
  rating: { fontSize: 14, color: colors.textSecondary, marginLeft: 4, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  descriptionContainer: { marginTop: 4 },
  description: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  readMore: { fontSize: 15, color: colors.accent, marginTop: 8, fontWeight: '600' },
  inlineWeather: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  inlineWeatherText: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  quickActions: { flexDirection: 'row', marginTop: 24, gap: 12 },
  actionButton: { flex: 1, alignItems: 'center' },
  actionButtonSecondary: { opacity: 0.7 },
  actionIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionIconPrimary: { backgroundColor: colors.accent },
  actionLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  actionLabelPrimary: { color: colors.textPrimary },
  section: { marginTop: 32, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  sectionCount: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  mediaGrid: { gap: 8 },
  mediaItem: { flex: 1, aspectRatio: 1, margin: 4, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card },
  heroMediaItem: { flex: 2, aspectRatio: 2 },
  mediaThumbnail: { width: '100%', height: '100%' },
  videoIndicator: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  videoPlaceholder: { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  showMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder },
  showMoreText: { fontSize: 15, color: colors.accent, fontWeight: '600', marginRight: 6 },
  nextStopsList: { paddingRight: 20, gap: 16 },
  nextStopCard: { width: 360, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.cardBorder, minHeight: 140 },
  nextStopImage: { width: 80, height: 80, borderRadius: 12, marginRight: 16 },
  nextStopContent: { flex: 1, marginRight: 12 },
  nextStopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nextStopName: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, flex: 1, marginRight: 8 },
  nextStopDistance: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  nextStopMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  nextStopCategory: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  nextStopNeighborhood: { fontSize: 14, color: colors.textSecondary },
  confidenceBadge: { marginBottom: 8 },
  confidenceBadgeText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  reasonBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(139, 92, 246, 0.15)', borderRadius: 12 },
  reasonText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  stickyCtaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  ctaGradient: { position: 'absolute', top: -50, left: 0, right: 0, height: 50 },
  ctaButton: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', elevation: 8, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  ctaGradientButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  ctaText: { fontSize: 18, fontWeight: '700', color: colors.white },
  galleryModal: { flex: 1, backgroundColor: 'black' },
  galleryHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, right: 20, zIndex: 10 },
  galleryClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  gallerySlide: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  galleryImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
});
