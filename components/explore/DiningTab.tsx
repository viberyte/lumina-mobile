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
const FEATURE_CARD_HEIGHT = 140;

const API_BASE = 'https://lumina.viberyte.com';

interface CuisineWorld {
  key: string;
  title: string;
  subtitle: string;
  gradient: [string, string];
  glowColor: string;
}

// Primary Cuisines - Most popular
const PRIMARY_CUISINES: CuisineWorld[] = [
  { 
    key: 'italian', 
    title: 'Italian', 
    subtitle: 'Pasta, wine & fine dining', 
    gradient: ['#2d1f1a', '#1a110d'],
    glowColor: '#F97316',
  },
  { 
    key: 'caribbean', 
    title: 'Caribbean', 
    subtitle: 'Bold island flavors', 
    gradient: ['#1a2d20', '#0d1a10'],
    glowColor: '#22C55E',
  },
  { 
    key: 'japanese', 
    title: 'Japanese', 
    subtitle: 'Sushi, ramen & omakase', 
    gradient: ['#1a1a2d', '#0d0d1a'],
    glowColor: '#6366F1',
  },
  { 
    key: 'mexican', 
    title: 'Mexican', 
    subtitle: 'Tacos to mezcal bars', 
    gradient: ['#2d1a1a', '#1a0d0d'],
    glowColor: '#EF4444',
  },
];

// All Cuisines
const ALL_CUISINES: CuisineWorld[] = [
  { 
    key: 'soul_food', 
    title: 'Soul Food', 
    subtitle: 'Southern comfort classics', 
    gradient: ['#241a15', '#140d0a'],
    glowColor: '#F59E0B',
  },
  { 
    key: 'mediterranean', 
    title: 'Mediterranean', 
    subtitle: 'Fresh & light plates', 
    gradient: ['#1a2424', '#0d1414'],
    glowColor: '#06B6D4',
  },
  { 
    key: 'chinese', 
    title: 'Chinese', 
    subtitle: 'Dim sum to late-night', 
    gradient: ['#2d1a1a', '#1a0d0d'],
    glowColor: '#EF4444',
  },
  { 
    key: 'korean', 
    title: 'Korean', 
    subtitle: 'BBQ & banchan', 
    gradient: ['#241a24', '#140d14'],
    glowColor: '#A855F7',
  },
  { 
    key: 'thai', 
    title: 'Thai', 
    subtitle: 'Spice & balance', 
    gradient: ['#241f15', '#140f0a'],
    glowColor: '#F97316',
  },
  { 
    key: 'indian', 
    title: 'Indian', 
    subtitle: 'Spiced & aromatic', 
    gradient: ['#2d1a10', '#1a0d08'],
    glowColor: '#F59E0B',
  },
  { 
    key: 'french', 
    title: 'French', 
    subtitle: 'Bistros & fine dining', 
    gradient: ['#1a1a24', '#0d0d14'],
    glowColor: '#6366F1',
  },
  { 
    key: 'american', 
    title: 'American', 
    subtitle: 'Burgers, BBQ & more', 
    gradient: ['#241a18', '#140d0c'],
    glowColor: '#EF4444',
  },
  { 
    key: 'latin', 
    title: 'Latin American', 
    subtitle: 'Peruvian, Colombian & more', 
    gradient: ['#241a1a', '#140d0d'],
    glowColor: '#F97316',
  },
  { 
    key: 'seafood', 
    title: 'Seafood', 
    subtitle: 'Oysters & ocean-fresh', 
    gradient: ['#181a24', '#0c0d14'],
    glowColor: '#06B6D4',
  },
  { 
    key: 'steakhouse', 
    title: 'Steakhouse', 
    subtitle: 'Dry-aged & premium cuts', 
    gradient: ['#241510', '#140a08'],
    glowColor: '#7C2D12',
  },
];

interface HeroVenue {
  id: number;
  name: string;
  image_url: string;
  neighborhood: string;
  cuisine_primary?: string;
}

// Animated Cuisine Card
const CuisineCard = ({ 
  cuisine, 
  onPress,
}: { 
  cuisine: CuisineWorld; 
  onPress: () => void;
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
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowOpacity,
              shadowColor: cuisine.glowColor,
            },
          ]}
        />
        
        <LinearGradient
          colors={cuisine.gradient}
          style={styles.cuisineCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{cuisine.title}</Text>
            <Text style={styles.cardSubtitle}>{cuisine.subtitle}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

// Food Trucks Feature Card
const FoodTrucksCard = ({ onPress }: { onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.03, 0.08],
  });

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.foodTruckWrapper, { transform: [{ scale }] }]}>
        <Animated.View
          style={[
            styles.foodTruckGlow,
            { opacity: glowOpacity },
          ]}
        />
        
        <LinearGradient
          colors={['#1f2a1a', '#0d140a']}
          style={styles.foodTruckCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Animated shimmer overlay */}
          <Animated.View style={[styles.shimmerOverlay, { opacity: shimmerOpacity }]} />
          
          <View style={styles.foodTruckContent}>
            <View style={styles.foodTruckLeft}>
              <View style={styles.foodTruckIconContainer}>
                <Ionicons name="fast-food-outline" size={24} color="#4ADE80" />
              </View>
              <View style={styles.foodTruckTextContent}>
                <Text style={styles.foodTruckTitle}>Food Trucks</Text>
                <Text style={styles.foodTruckSubtitle}>Street eats & mobile kitchens</Text>
                <View style={styles.foodTruckTags}>
                  <View style={styles.foodTruckTag}>
                    <Text style={styles.foodTruckTagText}>Soul Food</Text>
                  </View>
                  <View style={styles.foodTruckTag}>
                    <Text style={styles.foodTruckTagText}>Mexican</Text>
                  </View>
                  <View style={styles.foodTruckTag}>
                    <Text style={styles.foodTruckTagText}>BBQ</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.foodTruckBadge}>
              <Text style={styles.foodTruckBadgeText}>SOON</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

// Hero Module
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
              colors={['#2d1f1a', '#1a110d']}
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
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaRow}>
                <Ionicons name="location-outline" size={13} color={colors.zinc[400]} />
                <Text style={styles.heroLocation}>{venue.neighborhood}</Text>
              </View>
              {venue.cuisine_primary && (
                <View style={styles.heroCuisineTag}>
                  <Text style={styles.heroCuisineText}>{venue.cuisine_primary}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

interface DiningTabProps {
  filters?: {
    city?: string;
    searchQuery?: string;
  };
}

export default function DiningTab({ filters = {} }: DiningTabProps) {
  const router = useRouter();
  const city = filters.city || 'Manhattan';
  const resolvedCity = city === 'Near Me' ? 'Manhattan' : city;
  const [heroVenue, setHeroVenue] = useState<HeroVenue | null>(null);

  useEffect(() => {
    fetchHeroVenue();
  }, [city]);

  const fetchHeroVenue = async () => {
    try {
      const cuisines = ['italian', 'japanese', 'caribbean', 'mexican'];
      const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
      
      const url = `${API_BASE}/api/perspectives/${randomCuisine}?city=${encodeURIComponent(resolvedCity)}&dial=all`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const venues = data.sections?.[0]?.venues || [];
        
        if (venues.length > 0) {
          const withImages = venues.filter((v: any) => v.image_url);
          const sorted = withImages.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
          const selected = sorted[0] || venues[0];
          
          setHeroVenue({
            id: selected.id,
            name: selected.name,
            image_url: selected.image_url,
            neighborhood: selected.neighborhood || selected.city || resolvedCity,
            cuisine_primary: selected.cuisine_primary || data.title,
          });
        }
      }
    } catch (error) {
      console.log('[DiningTab] Hero fetch error:', error);
    }
  };

  const goToCuisine = (cuisine: CuisineWorld) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/see-all',
      params: { world: cuisine.key, city: resolvedCity },
    });
  };

  const goToVenue = (venue: HeroVenue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/venue/${venue.id}`);
  };

  const handleFoodTrucksPress = () => {
    // Coming soon - just haptic feedback for now
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
        <Text style={styles.headerTitle}>Explore Cuisines</Text>
        <Text style={styles.headerSubtitle}>
          Top restaurants in {resolvedCity}
        </Text>
      </View>

      {/* Primary Cuisines */}
      <View style={styles.grid}>
        {PRIMARY_CUISINES.map((cuisine) => (
          <CuisineCard
            key={cuisine.key}
            cuisine={cuisine}
            onPress={() => goToCuisine(cuisine)}
          />
        ))}
      </View>

      {/* Food Trucks Feature Card */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Street Food</Text>
        <Text style={styles.sectionSubtitle}>Mobile kitchens & pop-ups</Text>
      </View>
      <FoodTrucksCard onPress={handleFoodTrucksPress} />

      {/* Happy Hour */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Happy Hour</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>Deals before the night begins</Text>
      </View>
      <View style={styles.comingSoonCard}>
        <Ionicons name="time-outline" size={28} color={colors.zinc[600]} />
        <Text style={styles.comingSoonCardTitle}>Happy Hour Spots</Text>
        <Text style={styles.comingSoonCardDesc}>Great drinks, better prices</Text>
      </View>

      {/* All Cuisines */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Cuisines</Text>
        <Text style={styles.sectionSubtitle}>Browse by type</Text>
      </View>
      <View style={styles.grid}>
        {ALL_CUISINES.map((cuisine) => (
          <CuisineCard
            key={cuisine.key}
            cuisine={cuisine}
            onPress={() => goToCuisine(cuisine)}
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
    backgroundColor: '#F97316',
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
  heroMeta: {
    gap: 8,
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
  heroCuisineTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroCuisineText: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '600',
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
  cuisineCard: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    padding: spacing.md,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardContent: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.zinc[400],
    lineHeight: 16,
  },
  // Food Trucks Card
  foodTruckWrapper: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  foodTruckGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    shadowColor: '#4ADE80',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  foodTruckCard: {
    height: FEATURE_CARD_HEIGHT,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#4ADE80',
  },
  foodTruckContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  foodTruckLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  foodTruckIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodTruckTextContent: {
    flex: 1,
    gap: 4,
  },
  foodTruckTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.2,
  },
  foodTruckSubtitle: {
    fontSize: 13,
    color: colors.zinc[400],
    lineHeight: 18,
  },
  foodTruckTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  foodTruckTag: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  foodTruckTagText: {
    fontSize: 11,
    color: '#4ADE80',
    fontWeight: '600',
  },
  foodTruckBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  foodTruckBadgeText: {
    fontSize: 10,
    color: '#4ADE80',
    fontWeight: '700',
    letterSpacing: 1,
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
