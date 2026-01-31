import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// NORMALIZED TYPES - Future-proof structure
// ============================================
interface Venue {
  id: string | number;
  name: string;
  category?: string;
  cuisine_primary?: string;
  neighborhood?: string;
  city?: string;
  address?: string;
  rating?: number;
  price_tier?: string;
  vibe_tags?: string;
  image_url?: string | null;
  professional_photo_url?: string | null;
  google_photos?: string;
  latitude?: number;
  longitude?: number;
}

interface TimelineSlot {
  time: string;
  category: string;
  primary: Venue;
  alternates: Venue[];
  reasoning: string;
  travelTime: string;
  role: 'safe' | 'elevated' | 'wildcard';
}

// ============================================
// HELPERS
// ============================================
const getPhotoUrl = (venue: Venue): string | null => {
  if (venue.image_url) return venue.image_url;
  if (venue.professional_photo_url) return venue.professional_photo_url;
  
  try {
    const photos = typeof venue.google_photos === "string" 
      ? JSON.parse(venue.google_photos) 
      : venue.google_photos;
    if (photos && photos[0]) {
      return photos[0].startsWith('http') 
        ? photos[0] 
        : "https://lumina.viberyte.com" + photos[0];
    }
  } catch {}
  
  return null;
};

// Normalize raw API data into clean TimelineSlots
   const normalizeStops = (rawStops: any[], meta?: any): TimelineSlot[] => {
  const defaultTimes = meta?.stopTimes || ['7:30 PM', '9:30 PM', '11:30 PM'];
  
  return rawStops.map((stop, index) => {
    // Handle multiple formats: { primary: {...} }, { venue: {...} }, or flat venue
    const venue: Venue = stop.primary || stop.venue || stop;    
    return {
      time: stop.time || defaultTimes[index] || '',
      category: venue.category || 'restaurant',
      primary: {
        id: venue.id,
        name: venue.name,
        category: venue.category,
        cuisine_primary: venue.cuisine_primary,
        neighborhood: venue.neighborhood,
        city: venue.city,
        address: venue.address,
        rating: venue.rating,
        price_tier: venue.price_tier,
        vibe_tags: venue.vibe_tags,
        image_url: venue.image_url,
        professional_photo_url: venue.professional_photo_url,
        google_photos: venue.google_photos,
        latitude: venue.latitude,
        longitude: venue.longitude,
      },
      alternates: [], // Future: populated from backend
      reasoning: stop.ai_reasoning || stop.reasoning || 'Great pick',
      travelTime: stop.travelTime || '~10 min',
      role: stop.role || (index === 0 ? 'safe' : index === 1 ? 'elevated' : 'wildcard'),
    };
  });
};

export default function PlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineSlot[]>([]);
  const [planTitle, setPlanTitle] = useState("Your Night");
  const [planSubtitle, setPlanSubtitle] = useState("Curated just for you");
  const [isLocked, setIsLocked] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0); // For re-animation on shuffle

  // Parse params
  const rawStopsData = params.stops ? JSON.parse(params.stops as string) : [];
  const metaData = params.meta ? JSON.parse(params.meta as string) : {};
  const cuisine = params.cuisine as string || '';
  const occasion = params.occasion as string || '';

  useEffect(() => {
    generatePlanTitle();
    
    // Normalize data once
    setTimeout(() => {
      const normalized = normalizeStops(rawStopsData, metaData);
      console.log("NORMALIZED TIMELINE:", JSON.stringify(normalized, null, 2));
      setTimeline(normalized);
      setLoading(false);
    }, 1200);
  }, []);

  const generatePlanTitle = () => {
    const hour = new Date().getHours();
    
    if (hour < 17) {
      setPlanTitle("The Early Start");
      setPlanSubtitle("Get ahead of the crowd");
    } else if (hour < 19) {
      setPlanTitle("Golden Hour");
      setPlanSubtitle("Perfect timing for dinner");
    } else if (hour < 21) {
      setPlanTitle("Prime Time");
      setPlanSubtitle("The night is young");
    } else if (hour < 23) {
      setPlanTitle("The Main Event");
      setPlanSubtitle("Peak hours, peak vibes");
    } else {
      setPlanTitle("After Dark");
      setPlanSubtitle("For the night owls");
    }

    if (occasion === 'date') {
      setPlanTitle("Date Night");
      setPlanSubtitle("Impress without trying");
    } else if (occasion === 'birthday') {
      setPlanTitle("Birthday Mode");
      setPlanSubtitle("Make it unforgettable");
    } else if (occasion === 'friends') {
      setPlanTitle("Squad Night");
      setPlanSubtitle("Good times guaranteed");
    }

    if (cuisine && !occasion) {
      setPlanSubtitle(`${cuisine} vibes, locked in`);
    }
  };

  // ============================================
  // SHARE PLAN
  // ============================================
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    
    let message = `✨ ${planTitle} ✨\n`;
    message += `${dateStr}\n\n`;
    
    timeline.forEach((slot, index) => {
      const venue = slot.primary;
      const emoji = slot.category === 'restaurant' ? '🍽️' : slot.category === 'lounge' ? '🍸' : '🎉';
      
      message += `${emoji} ${slot.time ? slot.time + ' - ' : ''}${venue.name}\n`;
      
      if (venue.address) {
        const shortAddress = venue.address.split(',').slice(0, 2).join(',');
        message += `   📍 ${shortAddress}\n`;
      } else if (venue.city) {
        message += `   📍 ${venue.city}\n`;
      }
      
      if (venue.price_tier) {
        message += `   ${venue.price_tier}\n`;
      }
      
      message += '\n';
    });
    
    message += `Planned with Lumina 💜\nDownload: lumina.viberyte.com`;
    
    try {
      await Share.share({ message, title: planTitle });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Could not share the plan');
    }
  };

  // ============================================
  // SHUFFLE - Reorder stops locally (future: fetch alternates)
  // ============================================
  const handleShuffle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // For now, shuffle the order of non-first stops
    // Later: swap primary with alternates
    setTimeline(prev => {
      if (prev.length <= 1) return prev;
      
      const [first, ...rest] = prev;
      const shuffled = [...rest].sort(() => Math.random() - 0.5);
      
      // Re-assign times to maintain progression
      const times = prev.map(s => s.time);
      return [first, ...shuffled].map((slot, i) => ({
        ...slot,
        time: times[i],
      }));
    });
    
    // Trigger re-animation
    setShuffleKey(k => k + 1);
  };

  const handleVenuePress = (venueId: string | number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/venue/${venueId}`);
  };

  const handleStartNight = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLocked(true);
    
    setTimeout(() => {
      const firstVenue = timeline[0]?.primary;
      if (firstVenue?.id) {
        router.push(`/venue/${firstVenue.id}`);
      }
    }, 800);
  };

  const handleGetDirections = (venue: Venue) => {
    if (!venue.latitude || !venue.longitude) {
      if (venue.address) {
        const url = Platform.select({
          ios: `maps://?daddr=${encodeURIComponent(venue.address)}`,
          android: `google.navigation:q=${encodeURIComponent(venue.address)}`,
        });
        if (url) Linking.openURL(url);
      }
      return;
    }
    
    const url = Platform.select({
      ios: `maps://?daddr=${venue.latitude},${venue.longitude}`,
      android: `google.navigation:q=${venue.latitude},${venue.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // ============================================
  // SLOT CONFIG
  // ============================================
  const getSlotConfig = (slot: TimelineSlot, index: number, total: number) => {
    if (index === 0) {
      return {
        label: 'START HERE',
        sublabel: 'Great choice',
        icon: 'flag',
        gradient: ['#6366f1', '#8b5cf6'] as [string, string],
        isHero: true,
      };
    } else if (index === total - 1 && total > 2) {
      return {
        label: 'THE PIVOT',
        sublabel: 'If the night keeps going',
        icon: 'flash',
        gradient: ['#ec4899', '#f43f5e'] as [string, string],
        isHero: false,
      };
    } else {
      return {
        label: 'THEN',
        sublabel: 'Keep the momentum',
        icon: 'arrow-forward-circle',
        gradient: ['#8b5cf6', '#a855f7'] as [string, string],
        isHero: false,
      };
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a0a0a', '#18181b', '#0a0a0a']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContent}>
          <Animated.View entering={ZoomIn.duration(400)}>
            <View style={styles.loadingLogoContainer}>
              <Image source={require('../assets/images/lumina-logo.png')} style={styles.loadingLogo} />
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(300).duration(500)} style={styles.loadingTitle}>
            Crafting your night...
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.loadingDots}>
            <ActivityIndicator size="small" color={colors.violet[400]} />
          </Animated.View>
        </View>
      </View>
    );
  }

  // ============================================
  // LOCKED STATE
  // ============================================
  if (isLocked) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a0a0a', '#18181b', '#0a0a0a']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContent}>
          <Animated.View entering={ZoomIn.springify()}>
            <View style={[styles.loadingLogoContainer, styles.lockedLogoContainer]}>
              <Ionicons name="checkmark-circle" size={80} color={colors.green[500]} />
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={styles.lockedTitle}>
            You're all set!
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(400).duration(400)} style={styles.lockedSubtitle}>
            Taking you to your first stop
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(600).duration(400)} style={{ marginTop: 32 }}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/chat')}>
              <Text style={styles.backButtonText}>Back to Chat</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0a0a', '#18181b', '#0a0a0a']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <BlurView intensity={60} tint="dark" style={styles.blurButton}>
            <Ionicons name="close" size={22} color={colors.white} />
          </BlurView>
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <BlurView intensity={60} tint="dark" style={styles.blurButton}>
              <Ionicons name="share-outline" size={20} color={colors.white} />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShuffle} style={styles.headerButton}>
            <BlurView intensity={60} tint="dark" style={styles.blurButton}>
              <Ionicons name="shuffle" size={20} color={colors.violet[400]} />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.titleSection}>
          <Text style={styles.titleLabel}>TONIGHT'S PLAN</Text>
          <Text style={styles.title}>{planTitle}</Text>
          <Text style={styles.subtitle}>{planSubtitle}</Text>
        </Animated.View>

        {/* Timeline */}
        <View style={styles.timeline} key={shuffleKey}>
          {timeline.map((slot, index) => {
            const config = getSlotConfig(slot, index, timeline.length);
            const isLast = index === timeline.length - 1;
            const venue = slot.primary;
            const photoUrl = getPhotoUrl(venue);

            return (
              <Animated.View 
                key={`${venue.id}-${shuffleKey}`}
                entering={SlideInRight.delay(400 + index * 200).duration(500).springify()}
              >
                {/* Card */}
                <TouchableOpacity
                  style={[styles.card, config.isHero && styles.heroCard]}
                  onPress={() => venue.id && handleVenuePress(venue.id)}
                  activeOpacity={0.95}
                >
                  <LinearGradient
                    colors={[config.gradient[0] + '25', config.gradient[1] + '10']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  >
                    {/* Header Row */}
                    <View style={styles.stepLabel}>
                      <View style={[styles.stepIcon, { backgroundColor: config.gradient[0] }]}>
                        <Ionicons name={config.icon as any} size={14} color="#fff" />
                      </View>
                      <View style={styles.stepLabelText}>
                        <Text style={[styles.stepTitle, { color: config.gradient[0] }]}>
                          {config.label}
                        </Text>
                        <Text style={styles.stepSubtitle}>{config.sublabel}</Text>
                      </View>
                      {slot.time && (
                        <View style={styles.timeBadge}>
                          <Ionicons name="time-outline" size={12} color={colors.zinc[400]} />
                          <Text style={styles.timeText}>{slot.time}</Text>
                        </View>
                      )}
                    </View>

                    {/* Venue Row */}
                    <View style={styles.venueRow}>
                      <View style={[styles.imageWrapper, config.isHero && styles.heroImageWrapper]}>
                        {photoUrl ? (
                          <Image source={{ uri: photoUrl }} style={styles.venueImage} />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <Ionicons name="image-outline" size={32} color={colors.zinc[700]} />
                          </View>
                        )}
                        {venue.rating && (
                          <View style={styles.ratingPill}>
                            <Ionicons name="star" size={10} color="#FACC15" />
                            <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.venueDetails}>
                        <Text style={[styles.venueName, config.isHero && styles.heroVenueName]} numberOfLines={2}>
                          {venue.name}
                        </Text>
                        
                        <View style={styles.metaRow}>
                          {(venue.neighborhood || venue.city) && (
                            <>
                              <Ionicons name="location" size={12} color={colors.zinc[500]} />
                              <Text style={styles.metaText}>{venue.neighborhood || venue.city}</Text>
                            </>
                          )}
                          {venue.price_tier && (
                            <Text style={styles.priceText}>{venue.price_tier}</Text>
                          )}
                        </View>

                        {slot.reasoning && (
                          <Text style={styles.reasoning} numberOfLines={2}>
                            "{slot.reasoning}"
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Alternates Preview (Future) */}
                    {slot.alternates.length > 0 && (
                      <View style={styles.alternatesRow}>
                        <Text style={styles.alternatesLabel}>Also great:</Text>
                        {slot.alternates.slice(0, 2).map((alt, i) => (
                          <TouchableOpacity 
                            key={alt.id} 
                            style={styles.alternatePill}
                            onPress={() => handleVenuePress(alt.id)}
                          >
                            <Text style={styles.alternateText}>{alt.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Connector */}
                {!isLast && (
                  <View style={styles.connector}>
                    <View style={styles.connectorDot} />
                    <View style={styles.connectorLine} />
                    <View style={styles.connectorBadge}>
                      <Ionicons name="walk-outline" size={11} color={colors.zinc[500]} />
                      <Text style={styles.connectorText}>{slot.travelTime}</Text>
                    </View>
                    <View style={styles.connectorLine} />
                    <View style={styles.connectorDot} />
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* CTA */}
      <Animated.View 
        entering={FadeInUp.delay(800).duration(500)}
        style={[styles.ctaWrapper, { paddingBottom: insets.bottom + 16 }]}
      >
        <BlurView intensity={90} tint="dark" style={styles.ctaBlur}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleStartNight} activeOpacity={0.9}>
            <LinearGradient
              colors={[colors.violet[500], colors.violet[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="sparkles" size={22} color="#fff" />
              <Text style={styles.ctaText}>Start The Night</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaHint}>Tap to lock in your plan</Text>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  
  // Loading
  loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingLogoContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.violet[500] + '20',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  loadingLogo: { width: 60, height: 60 },
  loadingTitle: { fontSize: 22, fontWeight: '600', color: colors.white, marginBottom: 16 },
  loadingDots: { marginTop: 8 },
  
  // Locked
  lockedLogoContainer: { backgroundColor: colors.green[500] + '20' },
  lockedTitle: { fontSize: 28, fontWeight: '700', color: colors.white, marginBottom: 8 },
  lockedSubtitle: { fontSize: 16, color: colors.zinc[400] },
  backButton: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.zinc[700],
  },
  backButtonText: { color: colors.zinc[400], fontSize: 14 },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, zIndex: 100,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerButton: { borderRadius: 22, overflow: 'hidden' },
  blurButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Title
  titleSection: { alignItems: 'center', marginBottom: 32 },
  titleLabel: { fontSize: 11, fontWeight: '700', color: colors.violet[400], letterSpacing: 3, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: colors.white, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 16, color: colors.zinc[400], fontWeight: '500' },

  // Timeline
  timeline: {},

  // Card
  card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.zinc[800] },
  heroCard: { borderColor: colors.violet[500] + '50', borderWidth: 2 },
  cardGradient: { padding: 18 },
  
  stepLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  stepLabelText: { flex: 1, marginLeft: 10 },
  stepTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  stepSubtitle: { fontSize: 12, color: colors.zinc[500], marginTop: 1 },
  
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.zinc[800], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  timeText: { fontSize: 12, fontWeight: '600', color: colors.zinc[300] },
  
  venueRow: { flexDirection: 'row', gap: 14 },
  imageWrapper: { width: 85, height: 85, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.zinc[800] },
  heroImageWrapper: { width: 100, height: 100 },
  venueImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  
  ratingPill: {
    position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: colors.white },
  
  venueDetails: { flex: 1, justifyContent: 'center' },
  venueName: { fontSize: 17, fontWeight: '700', color: colors.white, marginBottom: 4, lineHeight: 22 },
  heroVenueName: { fontSize: 20 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  metaText: { fontSize: 12, color: colors.zinc[500] },
  priceText: { fontSize: 12, color: colors.green[500], fontWeight: '600', marginLeft: 8 },
  reasoning: { fontSize: 13, color: colors.zinc[400], fontStyle: 'italic', lineHeight: 18 },

  // Alternates (Future)
  alternatesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  alternatesLabel: { fontSize: 11, color: colors.zinc[500] },
  alternatePill: {
    backgroundColor: colors.zinc[800], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  alternateText: { fontSize: 11, color: colors.zinc[400] },

  // Connector
  connector: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24 },
  connectorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.zinc[700] },
  connectorLine: { flex: 1, height: 2, backgroundColor: colors.zinc[800] },
  connectorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.zinc[900],
    borderRadius: 10, borderWidth: 1, borderColor: colors.zinc[800],
  },
  connectorText: { fontSize: 11, color: colors.zinc[500], fontWeight: '500' },

  // CTA
  ctaWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 },
  ctaBlur: { borderRadius: 24, overflow: 'hidden', padding: 12, alignItems: 'center' },
  ctaButton: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  ctaText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  ctaHint: { fontSize: 12, color: colors.zinc[500], marginTop: 8 },
});
