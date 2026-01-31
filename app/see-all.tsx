import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';
import { useState, useEffect } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_HEIGHT = CARD_WIDTH * 0.65;
const CARD_GAP = 14;

const API_BASE = 'https://lumina.viberyte.com';

// World aliases
const WORLD_ALIASES: Record<string, string> = {
  'outside': 'clubs',
  'latin_nights': 'clubs',
  'pulse': 'clubs',
  'main_stage': 'clubs',
  'low_light': 'lounges',
  'lounges': 'lounges',
  'clubs': 'clubs',
  'rooftops': 'rooftops',
  'bars': 'bars',
  'italian': 'italian',
  'mexican': 'mexican',
  'caribbean': 'caribbean',
  'japanese': 'japanese',
  'chinese': 'chinese',
  'korean': 'korean',
  'indian': 'indian',
  'thai': 'thai',
  'vietnamese': 'vietnamese',
  'mediterranean': 'mediterranean',
  'latin american': 'latin',
  'soul food': 'soul_food',
  'american': 'american',
  'french': 'french',
  'seafood': 'seafood',
  'steakhouse': 'steakhouse',
};

// Vibe lenses use specific dials
const INITIAL_DIAL: Record<string, string> = {
  'outside': 'afrobeats',
  'latin_nights': 'latin',
  'pulse': 'edm',
  'main_stage': 'hiphop',
  'low_light': 'all',
  'lounges': 'all',
  'clubs': 'all',
  'rooftops': 'all',
  'bars': 'all',
};

// Which worlds need virtual rail expansion
const NEEDS_VIRTUAL_RAILS: string[] = ['outside', 'latin_nights', 'pulse', 'main_stage'];

// Custom titles
const VIBE_TITLES: Record<string, string> = {
  'outside': 'Afrobeats · Caribbean · R&B',
  'latin_nights': 'Latin · Reggaeton · Bachata',
  'pulse': 'EDM · House · Techno',
  'main_stage': 'Hip-Hop · Top 40 · Open Format',
  'low_light': 'Lounges & Cocktails',
};

// Custom tones
const VIBE_TONES: Record<string, string> = {
  'outside': 'Music-forward nights across the city',
  'latin_nights': 'Where rhythm sets the mood',
  'pulse': 'Driven by sound, shaped by energy',
  'main_stage': 'The sounds everyone knows',
  'low_light': 'Conversation-friendly atmosphere',
  'lounges': 'Where the night takes shape',
  'clubs': 'When the energy peaks',
  'bars': 'Keep it simple',
  'rooftops': 'City lights & open air',
};

// Dial labels
const DIAL_LABELS: Record<string, string> = {
  all: 'All',
  date_night: 'Date Night',
  upscale: 'Upscale',
  casual: 'Casual',
  late_night: 'Late Night',
  high_energy: 'High Energy',
  pregame: 'Pregame',
  hookah: 'Hookah',
  hiphop: 'Hip-Hop',
  afrobeats: 'Afrobeats',
  latin: 'Latin',
  edm: 'EDM',
  upscale_club: 'Upscale Club',
  upscale_lounge: 'Upscale',
  cocktail_lounge: 'Cocktail',
};

// Apple TV vibe glows
const VIBE_GLOWS: Record<string, string> = {
  outside: '#FF8C00',
  pulse: '#EF4444',
  low_light: '#A855F7',
  lounges: '#22C55E',
  clubs: '#6366F1',
  latin_nights: '#F97316',
  main_stage: '#EC4899',
  bars: '#F59E0B',
  rooftops: '#06B6D4',
};

interface Venue {
  id: number;
  name: string;
  image_url?: string;
  neighborhood?: string;
  city?: string;
  energy_level?: string;
  late_night_spot?: number;
  score_first_date?: number;
  score_group_night?: number;
  has_hookah?: number;
  price_level?: number;
  dress_code?: string;
  vibe_hint?: string;
}

interface Section {
  key: string;
  title: string;
  venues: Venue[];
  expanded?: boolean;
}

interface WorldData {
  world: string;
  title: string;
  tone: string;
  gradient: [string, string];
  dials: string[];
  dial_active: string;
  neighbors: string[];
  total_venues: number;
  sections: Section[];
}

// ============================================
// VIRTUAL RAIL GENERATOR
// Transforms single section into multiple Netflix-style rails
// ============================================
const generateVirtualRails = (venues: Venue[], vibeKey: string): Section[] => {
  if (!venues || venues.length === 0) return [];

  // Shuffle helper
  const shuffle = (arr: Venue[]) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const rails: Section[] = [];

  // Rail 1: Best for You (shuffled top picks)
  const bestForYou = shuffle(venues).slice(0, Math.min(10, venues.length));
  if (bestForYou.length > 0) {
    rails.push({
      key: 'best_for_you',
      title: 'Best for You',
      venues: bestForYou,
    });
  }

  // Rail 2: Late Night Energy
  const lateNight = venues.filter(v => v.late_night_spot === 1);
  if (lateNight.length >= 3) {
    rails.push({
      key: 'late_night',
      title: 'Late Night Energy',
      venues: shuffle(lateNight).slice(0, 10),
    });
  }

  // Rail 3: Great for Groups
  const forGroups = [...venues].sort((a, b) => 
    (b.score_group_night || 0) - (a.score_group_night || 0)
  ).slice(0, 10);
  if (forGroups.length >= 3) {
    rails.push({
      key: 'groups',
      title: 'Great for Groups',
      venues: forGroups,
    });
  }

  // Rail 4: Date Night Worthy
  const dateNight = [...venues].sort((a, b) => 
    (b.score_first_date || 0) - (a.score_first_date || 0)
  ).filter(v => (v.score_first_date || 0) > 30).slice(0, 10);
  if (dateNight.length >= 3) {
    rails.push({
      key: 'date_night',
      title: 'Date Night Worthy',
      venues: dateNight,
    });
  }

  // Rail 5: Upscale Vibes
  const upscale = venues.filter(v => 
    v.dress_code === 'smart-casual' || 
    v.dress_code === 'upscale' || 
    (v.price_level && v.price_level >= 3)
  );
  if (upscale.length >= 3) {
    rails.push({
      key: 'upscale',
      title: 'Upscale Vibes',
      venues: shuffle(upscale).slice(0, 10),
    });
  }

  // Rail 6: Casual & Fun
  const casual = venues.filter(v => 
    v.dress_code === 'casual' || 
    (v.price_level && v.price_level <= 2)
  );
  if (casual.length >= 3) {
    rails.push({
      key: 'casual',
      title: 'Casual & Fun',
      venues: shuffle(casual).slice(0, 10),
    });
  }

  // Rail 7: High Energy
  const highEnergy = venues.filter(v => v.energy_level === 'lively' || v.energy_level === 'high');
  if (highEnergy.length >= 3) {
    rails.push({
      key: 'high_energy',
      title: 'High Energy',
      venues: shuffle(highEnergy).slice(0, 10),
    });
  }

  // Rail 8: Hookah Available (if applicable)
  const hookah = venues.filter(v => v.has_hookah === 1);
  if (hookah.length >= 2) {
    rails.push({
      key: 'hookah',
      title: 'Hookah Available',
      venues: hookah,
    });
  }

  // If we still don't have enough rails, add a "Discover More" rail
  if (rails.length < 3) {
    const remaining = shuffle(venues).slice(0, 10);
    rails.push({
      key: 'discover',
      title: 'Discover More',
      venues: remaining,
    });
  }

  return rails;
};

// Animated Card Component
const VenueCard = ({ 
  venue, 
  index, 
  onPress, 
  glowColor 
}: { 
  venue: Venue; 
  index: number; 
  onPress: () => void;
  glowColor: string;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const getImageUrl = (v: Venue): string | null => {
    if (!v) return null;
    if (v.image_url) {
      return v.image_url.startsWith('/') 
        ? `${API_BASE}${v.image_url}` 
        : v.image_url;
    }
    return null;
  };

  const imageUrl = getImageUrl(venue);

  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getSubtitle = () => {
    if (venue.vibe_hint) return venue.vibe_hint;
    if (venue.energy_level === 'lively' && venue.late_night_spot) return 'Late night energy';
    if ((venue.score_first_date || 0) > 70) return 'Great for dates';
    if ((venue.score_group_night || 0) > 85) return 'Perfect for groups';
    if (venue.has_hookah) return 'Hookah available';
    return venue.neighborhood || venue.city || '';
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
      <Animated.View
        style={[
          styles.appleGlow,
          {
            opacity: glowOpacity,
            shadowColor: glowColor,
          },
        ]}
      />
      
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={styles.cardImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.zinc[700]} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.cardGradient}
          />
          <View style={styles.cardOverlay}>
            <Text style={styles.cardName} numberOfLines={2}>{venue.name}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>{getSubtitle()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SeeAllScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const world = (params.world as string) || (params.cuisine as string) || 'clubs';
  const city = (params.city as string) || 'Manhattan';
  const resolvedCity = city === 'Near Me' ? 'Manhattan' : city;

  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDial, setActiveDial] = useState('all');

  const rawKey = world.toLowerCase().trim();
  const glowColor = VIBE_GLOWS[rawKey] || VIBE_GLOWS[WORLD_ALIASES[rawKey]] || '#6366F1';
  
  const getInitialDial = () => {
    return INITIAL_DIAL[rawKey] || 'all';
  };

  // Transform sections if needed (virtual rails)
  const displaySections = useMemo(() => {
    if (!worldData?.sections) return [];
    
    // Check if this vibe needs virtual rail expansion
    if (NEEDS_VIRTUAL_RAILS.includes(rawKey) && worldData.sections.length === 1) {
      const allVenues = worldData.sections[0].venues;
      return generateVirtualRails(allVenues, rawKey);
    }
    
    // Otherwise use sections as-is
    return worldData.sections;
  }, [worldData, rawKey]);

  useEffect(() => {
    const initialDial = getInitialDial();
    setActiveDial(initialDial);
    fetchWorld(initialDial);
  }, [world, resolvedCity]);

  const fetchWorld = async (dial: string) => {
    try {
      setLoading(true);
      const worldKey = WORLD_ALIASES[rawKey] || rawKey.replace(/\s+/g, '_');

      console.log('[SeeAll] Fetching:', worldKey, 'dial:', dial, 'city:', resolvedCity);

      const url = `${API_BASE}/api/perspectives/${worldKey}?city=${encodeURIComponent(resolvedCity)}&dial=${dial}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[SeeAll] API error:', response.status);
        setWorldData(null);
        return;
      }

      const data = await response.json();
      console.log('[SeeAll] Got', data.sections?.length, 'sections,', data.total_venues, 'total venues');
      
      setWorldData(data);
      setActiveDial(data.dial_active || dial);
    } catch (error) {
      console.error('[SeeAll] Fetch error:', error);
      setWorldData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDialTap = (dial: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveDial(dial);
    fetchWorld(dial);
  };

  const goToVenue = (venue: Venue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/venue/${venue.id}`);
  };

  const getDisplayTitle = () => {
    return VIBE_TITLES[rawKey] || worldData?.title || world;
  };

  const getDisplayTone = () => {
    return VIBE_TONES[rawKey] || worldData?.tone || '';
  };

  const renderDials = () => {
    if (!worldData?.dials || worldData.dials.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dialsRow}
        style={styles.dialsScroll}
      >
        {worldData.dials.map((dial) => {
          const isActive = dial === activeDial;
          const label = DIAL_LABELS[dial] || dial.split('_').map(w =>
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' ');

          return (
            <TouchableOpacity
              key={dial}
              style={[styles.dialPill, isActive && styles.dialPillActive]}
              onPress={() => handleDialTap(dial)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dialText, isActive && styles.dialTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderRail = (section: Section, sectionIndex: number) => {
    if (!section.venues || section.venues.length === 0) return null;
    
    return (
      <View key={`section_${section.key}_${sectionIndex}`} style={styles.railSection}>
        <View style={styles.railHeader}>
          <Text style={styles.railTitle}>{section.title}</Text>
          <Text style={styles.railCount}>{section.venues.length} spots</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
          contentContainerStyle={styles.railRow}
        >
          {section.venues.map((venue, venueIndex) => (
            <VenueCard
              key={`${venue.id}_${venueIndex}_${sectionIndex}`}
              venue={venue}
              index={venueIndex}
              onPress={() => goToVenue(venue)}
              glowColor={glowColor}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const gradientColors = worldData?.gradient || ['#0a0a0a', '#000000'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors as [string, string]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
      />
      
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>{getDisplayTitle()}</Text>
          <Text style={styles.tone}>{getDisplayTone()}</Text>
          {worldData && (
            <Text style={styles.venueCount}>{worldData.total_venues} venues in {resolvedCity}</Text>
          )}
        </View>

        {renderDials()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={glowColor} />
          </View>
        ) : !worldData || displaySections.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={48} color={colors.zinc[600]} />
            </View>
            <Text style={styles.emptyText}>Nothing nearby yet</Text>
            <Text style={styles.emptySubtext}>
              We're expanding to your area soon.{'\n'}Try a different city or vibe.
            </Text>
          </View>
        ) : (
          displaySections.map((section, idx) => renderRail(section, idx))
        )}

        {worldData?.neighbors && worldData.neighbors.length > 0 && (
          <View style={styles.neighborsSection}>
            <Text style={styles.neighborsTitle}>YOU MIGHT ALSO LIKE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.neighborsRow}
            >
              {worldData.neighbors.map((neighbor, index) => (
                <TouchableOpacity
                  key={`neighbor_${neighbor}_${index}`}
                  style={styles.neighborPill}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: '/see-all',
                      params: { world: neighbor, city: resolvedCity }
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.neighborText}>
                    {neighbor.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.zinc[400]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tone: {
    fontSize: 16,
    color: colors.zinc[400],
    lineHeight: 22,
    marginBottom: 8,
  },
  venueCount: {
    fontSize: 14,
    color: colors.zinc[500],
    fontWeight: '500',
  },
  dialsScroll: {
    marginBottom: 28,
  },
  dialsRow: {
    paddingHorizontal: 24,
    gap: 10,
  },
  dialPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dialPillActive: {
    backgroundColor: colors.white,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dialText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  dialTextActive: {
    color: colors.black,
  },
  railSection: {
    marginBottom: 36,
  },
  railHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  railTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  railCount: {
    fontSize: 14,
    color: colors.zinc[500],
    fontWeight: '500',
  },
  railRow: {
    paddingLeft: 24,
    paddingRight: 10,
  },
  cardWrapper: {
    marginRight: CARD_GAP,
  },
  appleGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 26,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 15,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.zinc[900],
  },
  cardImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.zinc[900],
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
    lineHeight: 22,
  },
  cardMeta: {
    fontSize: 14,
    color: colors.zinc[400],
    fontWeight: '500',
  },
  loadingContainer: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.zinc[300],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.zinc[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  neighborsSection: {
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    marginTop: 16,
    marginHorizontal: 24,
  },
  neighborsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.zinc[500],
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  neighborsRow: {
    gap: 10,
  },
  neighborPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  neighborText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.zinc[300],
    marginRight: 6,
  },
});
