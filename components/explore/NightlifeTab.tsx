import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;
const CARD_HEIGHT = 120;
const HERO_HEIGHT = 200;

const API_BASE = 'https://lumina.viberyte.com';

interface NightlifeWorld {
  key: string;
  title: string;
  subtitle: string;
  gradient: [string, string];
  glowColor: string;
  fullWidth?: boolean;
}

// 5 Vibe Lenses - Primary Navigation
const NIGHTLIFE_WORLDS: NightlifeWorld[] = [
  { 
    key: 'outside', 
    title: 'Outside', 
    subtitle: 'Afrobeats, Hip-Hop & R&B', 
    gradient: ['#3d2814', '#1a110a'],
    glowColor: '#FF8C00',
    fullWidth: true 
  },
  { 
    key: 'latin_nights', 
    title: 'Latin Nights', 
    subtitle: 'Reggaeton, Salsa & Bachata', 
    gradient: ['#3d1420', '#1a0a10'],
    glowColor: '#F97316',
  },
  { 
    key: 'low_light', 
    title: 'Low Light', 
    subtitle: 'Lounges & cocktail bars', 
    gradient: ['#241430', '#100a18'],
    glowColor: '#A855F7',
  },
  { 
    key: 'pulse', 
    title: 'Pulse', 
    subtitle: 'EDM, House & Techno', 
    gradient: ['#142030', '#0a1018'],
    glowColor: '#3B82F6',
  },
  { 
    key: 'main_stage', 
    title: 'Main Stage', 
    subtitle: 'Top 40 & open format', 
    gradient: ['#301428', '#180a14'],
    glowColor: '#EC4899',
  },
];

// Classic Venue Types
const VENUE_WORLDS: NightlifeWorld[] = [
  { 
    key: 'lounges', 
    title: 'Lounges', 
    subtitle: 'Conversation-friendly', 
    gradient: ['#1a2018', '#0d100c'],
    glowColor: '#22C55E',
  },
  { 
    key: 'clubs', 
    title: 'Clubs', 
    subtitle: 'Peak-energy nightlife', 
    gradient: ['#201820', '#100c10'],
    glowColor: '#6366F1',
  },
  { 
    key: 'rooftops', 
    title: 'Rooftops', 
    subtitle: 'City views & open air', 
    gradient: ['#182024', '#0c1014'],
    glowColor: '#06B6D4',
  },
  { 
    key: 'bars', 
    title: 'Bars', 
    subtitle: 'Drinks & good company', 
    gradient: ['#24201a', '#14100c'],
    glowColor: '#F59E0B',
  },
];

interface HeroVenue {
  id: number;
  name: string;
  image_url: string;
  neighborhood: string;
  energy_level?: string;
  score_group_night?: number;
}

// Animated World Card - Clean, minimal
const WorldCard = ({ 
  world, 
  onPress, 
  fullWidth = false 
}: { 
  world: NightlifeWorld; 
  onPress: () => void;
  fullWidth?: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[
        styles.cardWrapper,
        fullWidth && styles.cardWrapperFullWidth,
        { transform: [{ scale }] }
      ]}>
        {/* Subtle glow on press */}
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowOpacity,
              shadowColor: world.glowColor,
            },
          ]}
        />
        
        <LinearGradient
          colors={world.gradient}
          style={[styles.worldCard, fullWidth && styles.worldCardFullWidth]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.worldCardContent}>
            <Text style={styles.worldTitle}>{world.title}</Text>
            <Text style={styles.worldSubtitle}>{world.subtitle}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

// Hero Module - Featured venue
const HeroModule = ({ 
  venue, 
  onPress,
  cityName,
}: { 
  venue: HeroVenue | null; 
  onPress: () => void;
  cityName: string;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    // Subtle pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.45,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.25,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  if (!venue) return null;

  const imageUrl = venue.image_url?.startsWith('/') 
    ? `${API_BASE}${venue.image_url}` 
    : venue.image_url;

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.heroContainer, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.heroGlow, { opacity: glowOpacity }]} />
        
        <View style={styles.heroCard}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.heroImage} 
              contentFit="cover" 
              transition={300} 
            />
          ) : (
            <LinearGradient
              colors={['#2a1a0a', '#0d0805']}
              style={styles.heroPlaceholder}
            />
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
            locations={[0, 0.5, 1]}
            style={styles.heroGradient}
          />
          
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>FEATURED</Text>
          </View>
          
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} numberOfLines={2}>{venue.name}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-outline" size={13} color={colors.zinc[400]} />
              <Text style={styles.heroLocation}>{venue.neighborhood}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

interface NightlifeTabProps {
  filters?: {
    city?: string;
    searchQuery?: string;
  };
}

export default function NightlifeTab({ filters = {} }: NightlifeTabProps) {
  const router = useRouter();
  const city = filters.city || 'Manhattan';
  const resolvedCity = city === 'Near Me' ? 'Manhattan' : city;
  const [heroVenue, setHeroVenue] = useState<HeroVenue | null>(null);

  useEffect(() => {
    fetchHeroVenue();
  }, [city]);

  const fetchHeroVenue = async () => {
    try {
      const url = `${API_BASE}/api/perspectives/clubs?city=${encodeURIComponent(resolvedCity)}&dial=all`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const venues = data.sections?.[0]?.venues || [];
        
        if (venues.length > 0) {
          // Prefer high-energy or partner venues for hero
          // Sort by engagement signals: energy level, group score
          const sorted = [...venues].sort((a, b) => {
            const aScore = (a.energy_level === 'lively' ? 2 : 0) + (a.score_group_night || 0) / 50;
            const bScore = (b.energy_level === 'lively' ? 2 : 0) + (b.score_group_night || 0) / 50;
            return bScore - aScore;
          });
          
          // Pick from top 3 to add slight variety
          const topVenues = sorted.slice(0, 3);
          const selected = topVenues[Math.floor(Math.random() * topVenues.length)];
          
          setHeroVenue({
            id: selected.id,
            name: selected.name,
            image_url: selected.image_url,
            neighborhood: selected.neighborhood || selected.city || resolvedCity,
            energy_level: selected.energy_level,
            score_group_night: selected.score_group_night,
          });
        }
      }
    } catch (error) {
      console.log('[NightlifeTab] Hero fetch error:', error);
    }
  };

  const goToWorld = (world: NightlifeWorld) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/see-all',
      params: { world: world.key, city: resolvedCity },
    });
  };

  const goToVenue = (venue: HeroVenue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/venue/${venue.id}`);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Hero Module */}
      {heroVenue && (
        <HeroModule 
          venue={heroVenue} 
          onPress={() => goToVenue(heroVenue)}
          cityName={resolvedCity}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tonight's Vibe</Text>
        <Text style={styles.headerSubtitle}>
          Curated based on what's active in {resolvedCity}
        </Text>
      </View>

      {/* Vibe Lenses */}
      <View style={styles.grid}>
        {NIGHTLIFE_WORLDS.map((world) => (
          <WorldCard
            key={world.key}
            world={world}
            onPress={() => goToWorld(world)}
            fullWidth={world.fullWidth}
          />
        ))}
      </View>

      {/* Booking & Tables */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Booking & Tables</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>VIP sections from our venue partners</Text>
      </View>
      <View style={styles.comingSoonCard}>
        <Ionicons name="sparkles-outline" size={28} color={colors.zinc[600]} />
        <Text style={styles.comingSoonCardTitle}>Partner Sections</Text>
        <Text style={styles.comingSoonCardDesc}>Book tables directly from venues</Text>
      </View>

      {/* By Venue Type */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>By Venue Type</Text>
        <Text style={styles.sectionSubtitle}>Browse by category</Text>
      </View>
      <View style={styles.grid}>
        {VENUE_WORLDS.map((world) => (
          <WorldCard
            key={world.key}
            world={world}
            onPress={() => goToWorld(world)}
          />
        ))}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  // Hero
  heroContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroGlow: {
    position: 'absolute',
    top: 8,
    left: spacing.lg + 8,
    right: spacing.lg + 8,
    bottom: 8,
    backgroundColor: '#FF8C00',
    borderRadius: 20,
  },
  heroCard: {
    height: HERO_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.zinc[900],
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  heroBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroLocation: {
    fontSize: 13,
    color: colors.zinc[400],
    fontWeight: '500',
  },
  // Header
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.zinc[500],
    lineHeight: 20,
  },
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  // Card
  cardWrapper: {
    width: CARD_WIDTH,
  },
  cardWrapperFullWidth: {
    width: SCREEN_WIDTH - 32,
  },
  cardGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  worldCard: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    padding: spacing.md,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  worldCardFullWidth: {
    width: '100%',
  },
  worldCardContent: {
    gap: 2,
  },
  worldTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.2,
  },
  worldSubtitle: {
    fontSize: 12,
    color: colors.zinc[400],
    lineHeight: 16,
  },
  // Section headers
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 10,
    color: colors.violet[400],
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comingSoonCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    gap: 8,
  },
  comingSoonCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  comingSoonCardDesc: {
    fontSize: 13,
    color: colors.zinc[600],
  },
  bottomPadding: {
    height: 100,
  },
});
