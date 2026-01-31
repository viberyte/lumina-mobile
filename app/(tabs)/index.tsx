import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  
  Animated,
  Dimensions,
  RefreshControl,
  FlatList,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../../theme';
import luminaApi from '../../services/luminaApi';
import { getPhotoUrl, parseVibeTags } from '../../utils/photoHelper';
import { usePersona } from '../../hooks/usePersona';
import StretchCitySelector from '../../components/StretchCitySelector';
import personaService, { sortEventsByMusicPreference } from '../../services/personaService';
import { useUserFollows } from '../../hooks/useFollow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Safely parse vibe tags (could be string or array)
const safeGetTags = (vibeTags: any): string[] => {
  if (!vibeTags) return [];
  if (Array.isArray(vibeTags)) return vibeTags;
  if (typeof vibeTags === 'string') {
    try {
      const parsed = JSON.parse(vibeTags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return vibeTags.split(',').map((t: string) => t.trim());
    }
  }
  return [];
};


// Card sizes
const CARD_WIDTH = 175;
const CARD_HEIGHT = 210;
const SUPER_CARD_WIDTH = 220;
const SUPER_CARD_HEIGHT = 280;

// Hero carousel
const HERO_CARD_WIDTH = SCREEN_WIDTH - 60;
const HERO_CARD_HEIGHT = 240;
const HERO_CARD_SPACING = 12;

// Daily refresh helper
const getDailySeed = () => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

const seededShuffle = (array: any[], seed: number) => {
  const shuffled = [...array];
  let currentSeed = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get time-aware greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Tonight';
};

// Get time-aware context
const getTimeContext = () => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 5 || day === 6;
  
  if (hour >= 17 && hour < 21) return isWeekend ? 'Weekend vibes starting' : 'The night is young';
  if (hour >= 21) return 'Peak hours approaching';
  if (hour < 12) return 'Planning ahead?';
  return isWeekend ? 'Weekend mode' : 'Midweek escape';
};

// Section hints by persona intent
const getSectionHint = (section: string, persona: any): string => {
  const status = persona?.relationship_status || 'single';
  const hints: Record<string, Record<string, string>> = {
    tonight: {
      single: 'Curated for your vibe tonight',
      dating: 'Perfect spots to impress',
      in_relationship: 'Date night awaits',
    },
    popular: {
      single: 'Where the energy is',
      dating: 'Trending this week',
      in_relationship: 'Couple favorites',
    },
    dating: {
      single: 'Great first date energy',
      dating: 'Take them here',
      in_relationship: 'Romantic picks for two',
    },
    lateNight: {
      single: 'Keep the night going',
      dating: 'After dinner moves',
      in_relationship: 'Late night together',
    },
  };
  return hints[section]?.[status] || '';
};

// Skeleton loader
const SkeletonCard = ({ width = CARD_WIDTH, height = CARD_HEIGHT }) => (
  <View style={[styles.skeletonCard, { width, height }]}>
    <Animated.View style={styles.skeletonShimmer} />
  </View>
);

const SkeletonHome = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonHeader}>
      <View style={[styles.skeletonBar, { width: 180, height: 28 }]} />
      <View style={[styles.skeletonBar, { width: 100, height: 16, marginTop: 8 }]} />
    </View>
    <SkeletonCard width={HERO_CARD_WIDTH} height={HERO_CARD_HEIGHT} />
    <View style={styles.skeletonSection}>
      <View style={[styles.skeletonBar, { width: 140, height: 20 }]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    </View>
  </View>
);


// Animated pressable card wrapper
const AnimatedPressable = ({ children, style, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
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
  
  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { persona, content, isLoading: personaLoading } = usePersona();
  
  const [userName, setUserName] = useState('');
  const [userCity, setUserCity] = useState('Manhattan');
  const [heroVenues, setHeroVenues] = useState<any[]>([]);
  const [pickedForYou, setPickedForYou] = useState<any[]>([]);
  const [happeningNow, setHappeningNow] = useState<any[]>([]);
  const [dateNightPicks, setDateNightPicks] = useState<any[]>([]);
  const [lateNightSpots, setLateNightSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const reloadOpacity = useRef(new Animated.Value(0)).current;
  
  // User follows for "Following" section
  const { follows, loading: followsLoading, refresh: refreshFollows } = useUserFollows();
  
  // Hero carousel state
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const heroScrollX = useRef(new Animated.Value(0)).current;

  // Subtle fade in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    loadProfile();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);


  // Pulsing glow effect for greeting
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  // Load content when persona is ready
  useEffect(() => {
    if (!personaLoading) {
      loadContent();
    }
  }, [personaLoading, persona]);

  const loadProfile = async () => {
    try {
      const profile = await AsyncStorage.getItem('@lumina_profile');
      const savedCity = await AsyncStorage.getItem('@lumina_selected_city');
      if (profile) {
        const data = JSON.parse(profile);
        setUserName(data.name || '');
      }
      if (savedCity) {
        setUserCity(savedCity);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      const [venues, events] = await Promise.all([
        luminaApi.getVenues(userCity || 'Manhattan'),
        luminaApi.getEvents('New York')
      ]);
      
      const seed = getDailySeed();
      const shuffledVenues = seededShuffle(venues, seed);
      const shuffledEvents = seededShuffle(events, seed + 1);
      
      // Apply persona-based sorting
      const sortedVenues = personaService.sortVenuesByPersona(shuffledVenues, persona);
      
      // Hero carousel - top 5 standout venues
      const heroes = sortedVenues
        .filter((v: any) => (v.google_rating || v.rating) >= 4.3 && getPhotoUrl(v))
        .slice(0, 5);
      setHeroVenues(heroes);
      
      // Tonight's picks - persona sorted (skip heroes)
      const heroIds = new Set(heroes.map((h: any) => h.id));
      const picked = sortedVenues
        .filter((v: any) => !heroIds.has(v.id) && getPhotoUrl(v))
        .slice(0, 10);
      setPickedForYou(picked);
      
      // Date night / romantic picks
      const dateSpots = sortedVenues
        .filter((v: any) => {
          const tags = safeGetTags(v.vibe_tags);
          const contextual = v.contextual_tags || {};
          return (
            tags.some((t: string) => 
              t.toLowerCase().includes('romantic') || 
              t.toLowerCase().includes('intimate') ||
              t.toLowerCase().includes('cozy')
            ) ||
            contextual.date_spot ||
            contextual.conversation_friendly
          ) && getPhotoUrl(v) && !heroIds.has(v.id);
        })
        .slice(0, 6);
      setDateNightPicks(dateSpots);
      
      // Late night spots
      const lateNight = sortedVenues
        .filter((v: any) => {
          const tags = safeGetTags(v.vibe_tags);
          const category = (v.category || '').toLowerCase();
          return (
            tags.some((t: string) => 
              t.toLowerCase().includes('late') || 
              t.toLowerCase().includes('club') ||
              t.toLowerCase().includes('dance')
            ) ||
            category.includes('nightclub') ||
            category.includes('lounge') ||
            category.includes('bar')
          ) && getPhotoUrl(v) && !heroIds.has(v.id);
        })
        .slice(0, 6);
      setLateNightSpots(lateNight);
      
      // Happening now - upcoming events (sorted by music preference)
      const musicPrefs = persona?.music_preferences || [];
      const musicSortedEvents = sortEventsByMusicPreference(shuffledEvents, musicPrefs);
      const upcoming = musicSortedEvents
        .filter((e: any) => e.image_url || e.cover_image_url)
        .slice(0, 8);
      setHappeningNow(upcoming);
      
    } catch (error) {
      console.error('Error loading content:', error);
    // Prefetch images for instant loading
      const allImages = [
        ...heroes.map((v: any) => getPhotoUrl(v)),
        ...picked.map((v: any) => getPhotoUrl(v)),
        ...dateSpots.slice(0, 10).map((v: any) => getPhotoUrl(v)),
      ].filter(Boolean);
      Image.prefetch(allImages);
    } finally {
      setLoading(false);
    }
  };


  // City change with context reload effect
  const handleCityChange = async (newCity: string) => {
    setShowCitySelector(false);
    
    if (newCity === userCity) return;
    
    // Start reload effect - fade to black
    setIsReloading(true);
    Animated.timing(reloadOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start(async () => {
      // Update city
      setUserCity(newCity);
      await AsyncStorage.setItem('@lumina_selected_city', newCity);
      
      // Reload content
      setLoading(true);
      await loadContent();
      
      // Fade back in
      setTimeout(() => {
        Animated.timing(reloadOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setIsReloading(false);
        });
      }, 100);
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadContent();
    setRefreshing(false);
  };

  const handleVenuePress = useCallback((venue: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/venue/${venue.id}`);
  }, [router]);

  const handleEventPress = useCallback((event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  }, [router]);

  // Hero carousel item
  const renderHeroItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const photoUrl = getPhotoUrl(item);
    const tags = parseVibeTags(item.vibe_tags);
    
    const inputRange = [
      (index - 1) * (HERO_CARD_WIDTH + HERO_CARD_SPACING),
      index * (HERO_CARD_WIDTH + HERO_CARD_SPACING),
      (index + 1) * (HERO_CARD_WIDTH + HERO_CARD_SPACING),
    ];
    
    const scale = heroScrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: 'clamp',
    });
    
    const opacity = heroScrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });
    
    return (
      <Animated.View style={[styles.heroCardWrapper, { transform: [{ scale }], opacity }]}>
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => handleVenuePress(item)}
          activeOpacity={0.95}
        >
          <Image source={{ uri: photoUrl }} style={styles.heroImage} cachePolicy="memory-disk" contentFit="cover" transition={200} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={12} color={colors.violet[400]} />
            <Text style={styles.heroBadgeText}>Featured</Text>
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{item.name}</Text>
            <Text style={styles.heroSubtitle}>
              {item.neighborhood} · {item.category}
            </Text>
            {tags.length > 0 && (
              <View style={styles.heroTags}>
                {tags.slice(0, 2).map((tag, i) => (
                  <View key={i} style={styles.heroTag}>
                    <Text style={styles.heroTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [heroScrollX, handleVenuePress]);

  // Regular venue card
  const renderVenueCard = useCallback((venue: any, isSuper: boolean = false) => {
    const photoUrl = getPhotoUrl(venue);
    const tags = parseVibeTags(venue.vibe_tags);
    const width = isSuper ? SUPER_CARD_WIDTH : CARD_WIDTH;
    const height = isSuper ? SUPER_CARD_HEIGHT : CARD_HEIGHT;
    
    return (
      <AnimatedPressable
        key={venue.id}
        style={[styles.card, { width, height }]}
        onPress={() => handleVenuePress(venue)}
      >
        <Image source={{ uri: photoUrl }} style={styles.cardImage} cachePolicy="memory-disk" contentFit="cover" transition={200} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.cardGradient}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{venue.name}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {venue.neighborhood || venue.category}
          </Text>
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{tags[0]}</Text>
              </View>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  }, [handleVenuePress]);

  // Event card
  const renderEventCard = useCallback((event: any) => {
    const imageUrl = event.image_url || event.cover_image_url;
    
    return (
      <AnimatedPressable
        key={event.id}
        style={styles.card}
        onPress={() => handleEventPress(event)}
      >
        <Image source={{ uri: imageUrl }} style={styles.cardImage} cachePolicy="memory-disk" contentFit="cover" transition={200} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.cardGradient}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {event.venue_name || event.genre}
          </Text>
          {event.genre && (
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: colors.violet[600] + '40' }]}>
                <Text style={[styles.tagText, { color: colors.violet[300] }]}>{event.genre}</Text>
              </View>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  }, [handleEventPress]);

  // Horizontal venue row component
  const HorizontalVenueRow = useMemo(() => {
    return ({ venues, isSuper = false }: { venues: any[]; isSuper?: boolean }) => (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.horizontalScroll, isSuper && styles.superScroll]}
        decelerationRate="fast"
      >
        {venues.map((venue) => renderVenueCard(venue, isSuper))}
      </ScrollView>
    );
  }, [renderVenueCard]);

  // Section header with hint
  const renderSectionHeader = (title: string, hint: string, icon?: string, onSeeAll?: () => void) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderTop}>
        <View style={styles.sectionTitleRow}>
          {icon && <Ionicons name={icon as any} size={20} color={colors.violet[400]} style={{ marginRight: 8 }} />}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {onSeeAll && (
          <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.violet[400]} />
          </TouchableOpacity>
        )}
      </View>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );

  // Hero pagination dots
  const renderHeroPagination = () => (
    <View style={styles.heroPagination}>
      {heroVenues.map((_, index) => (
        <View
          key={index}
          style={[
            styles.heroDot,
            index === activeHeroIndex && styles.heroDotActive,
          ]}
        />
      ))}
    </View>
  );

  // Show skeleton while loading
  if (personaLoading || (loading && heroVenues.length === 0)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <SkeletonHome />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.violet[400]}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.greetingContainer}>
                <Animated.Text style={[styles.greetingGlow, { opacity: glowAnim }]}>
                  {getGreeting()}{userName ? `, ${userName}` : ''}
                </Animated.Text>
                <Text style={styles.greeting}>
                  {getGreeting()}{userName ? `, ${userName}` : ''}
                </Text>
              </View>
              <Text style={styles.context}>{getTimeContext()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.citySelector}
              onPress={() => setShowCitySelector(true)}
            >
              <Ionicons name="location" size={16} color={colors.violet[400]} />
              <Text style={styles.cityText}>{userCity}</Text>
            </TouchableOpacity>
          </View>


          {/* Smart Search Bar */}
          <TouchableOpacity 
            style={styles.searchBar}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/search');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.searchLeft}>
              <Ionicons name="search" size={18} color={colors.zinc[500]} />
              <Text style={styles.searchPlaceholder}>Search vibes, venues, events...</Text>
            </View>
            <View style={styles.searchSparkle}>
              <Ionicons name="sparkles" size={14} color={colors.violet[400]} />
            </View>
          </TouchableOpacity>

          {/* Hero Carousel */}
          {heroVenues.length > 0 && (
            <View style={styles.heroSection}>
              <Animated.FlatList
                data={heroVenues}
                renderItem={renderHeroItem}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={HERO_CARD_WIDTH + HERO_CARD_SPACING}
                decelerationRate="fast"
                contentContainerStyle={styles.heroList}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: heroScrollX } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / (HERO_CARD_WIDTH + HERO_CARD_SPACING));
                  setActiveHeroIndex(index);
                }}
              />
              {renderHeroPagination()}
            </View>
          )}

          {/* Following Section */}
          {(follows.venues.length > 0 || follows.promoters.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Ionicons name="heart" size={18} color={colors.violet[400]} style={{ marginRight: 8 }} />
                  <Text style={styles.sectionTitle}>Following</Text>
                </View>
                <Text style={styles.sectionHint}>{follows.venues.length + follows.promoters.length} total</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
                decelerationRate="fast"
              >
                {follows.venues.map((venue: any) => {
                  const photoUrl = venue.professional_photo_url || 
                    (venue.google_photos && venue.google_photos[0]) || 
                    venue.image_url ||
                    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400';
                  return (
                    <TouchableOpacity
                      key={`venue-${venue.id}`}
                      style={styles.followCard}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/venue/${venue.id}`);
                      }}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: photoUrl }} style={styles.followImage} cachePolicy="memory-disk" contentFit="cover" transition={200} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        style={styles.cardGradient}
                      />
                      <View style={styles.followBadge}>
                        <Ionicons name="business-outline" size={10} color="#fff" />
                      </View>
                      <View style={styles.followContent}>
                        <Text style={styles.followName} numberOfLines={1}>{venue.name}</Text>
                        <Text style={styles.followMeta} numberOfLines={1}>{venue.category}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {follows.promoters.map((promoter: any) => {
                  const photoUrl = promoter.profile_picture || 
                    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400';
                  return (
                    <TouchableOpacity
                      key={`promoter-${promoter.id}`}
                      style={styles.followCard}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/promoter/${promoter.instagram_handle}`);
                      }}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: photoUrl }} style={styles.followImage} cachePolicy="memory-disk" contentFit="cover" transition={200} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        style={styles.cardGradient}
                      />
                      <View style={[styles.followBadge, { backgroundColor: colors.violet[500] }]}>
                        <Ionicons name="person" size={10} color="#fff" />
                      </View>
                      <View style={styles.followContent}>
                        <Text style={styles.followName} numberOfLines={1}>{promoter.business_name || promoter.instagram_handle}</Text>
                        <Text style={styles.followMeta} numberOfLines={1}>{promoter.primary_genre || 'Promoter'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Tonight's Picks - PERSONA DRIVEN */}
          {pickedForYou.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader(
                content.categories.tonight,
                getSectionHint('tonight', persona),
                'moon',
                () => router.push('/explore?filter=tonight')
              )}
              <HorizontalVenueRow venues={pickedForYou} />
            </View>
          )}

          {/* Happening Now - Events */}
          {happeningNow.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader(
                content.categories.popular,
                getSectionHint('popular', persona),
                'flame',
                () => router.push('/explore?filter=events')
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
                decelerationRate="fast"
              >
                {happeningNow.map((event) => renderEventCard(event))}
              </ScrollView>
            </View>
          )}

          {/* Date Night - SUPER CARDS - PERSONA DRIVEN */}
          {dateNightPicks.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader(
                content.categories.dating,
                getSectionHint('dating', persona),
                'heart',
                () => router.push('/explore?filter=datenight')
              )}
              <HorizontalVenueRow venues={dateNightPicks} isSuper />
            </View>
          )}

          {/* Late Night - PERSONA DRIVEN */}
          {lateNightSpots.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader(
                content.categories.lateNight,
                getSectionHint('lateNight', persona),
                'moon',
                () => router.push('/explore?filter=latenight')
              )}
              <HorizontalVenueRow venues={lateNightSpots} />
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* City Selector Modal */}
      <Modal
        visible={showCitySelector}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCitySelector(false)}
      >
        <StretchCitySelector
          currentCity={userCity}
          onSelectCity={handleCityChange}
        />
      </Modal>

      {/* Context Reload Overlay */}
      {isReloading && (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: '#000',
            opacity: reloadOpacity,
            zIndex: 999,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{ width: 40, height: 3, backgroundColor: colors.violet[500], borderRadius: 2 }} />
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.zinc[900],
  },
  // Following section
  followCard: {
    width: 130,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: colors.zinc[800],
  },
  followImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  followBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  followName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  followMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'capitalize',
  },
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.zinc[800],
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.zinc[700],
  },
  searchPlaceholder: {
    marginLeft: 10,
    fontSize: 15,
    color: colors.zinc[500],
  },
  searchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchSparkle: {
    backgroundColor: colors.violet[500] + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  greetingContainer: {
    position: 'relative',
  },
  greetingGlow: {
    position: 'absolute',
    fontSize: 28,
    fontWeight: '700',
    color: colors.violet[400],
    letterSpacing: -0.5,
    textShadowColor: colors.violet[500],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  context: {
    fontSize: 15,
    color: colors.zinc[400],
    marginTop: 4,
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.zinc[800],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  cityText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
  },
  
  // Hero Carousel
  heroSection: {
    marginBottom: spacing.xl,
  },
  heroList: {
    paddingHorizontal: 30,
  },
  heroCardWrapper: {
    width: HERO_CARD_WIDTH,
    marginRight: HERO_CARD_SPACING,
  },
  heroCard: {
    width: '100%',
    height: HERO_CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.zinc[800],
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  heroBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    color: colors.violet[300],
    fontWeight: '600',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.zinc[300],
    marginBottom: 10,
  },
  heroTags: {
    flexDirection: 'row',
    gap: 8,
  },
  heroTag: {
    backgroundColor: colors.violet[600] + '50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroTagText: {
    fontSize: 12,
    color: colors.violet[200],
    fontWeight: '600',
  },
  heroPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 6,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.violet[500],
    opacity: 0.4,
  },
  heroDotActive: {
    width: 24,
    opacity: 1,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.violet[400],
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.3,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 4,
    fontWeight: '400',
  },
  horizontalScroll: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.xl,
    gap: spacing.md,
  },
  superScroll: {
    gap: spacing.lg,
  },

  // Cards
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.zinc[800],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm + 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.zinc[400],
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  tag: {
    backgroundColor: colors.pink[500] + '35',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 10,
    color: colors.pink[300],
    fontWeight: '600',
  },

  // Skeleton
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  skeletonHeader: {
    marginVertical: spacing.lg,
  },
  skeletonBar: {
    backgroundColor: colors.zinc[800],
    borderRadius: 8,
  },
  skeletonCard: {
    backgroundColor: colors.zinc[800],
    borderRadius: 18,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  skeletonShimmer: {
    flex: 1,
    backgroundColor: colors.zinc[700],
    opacity: 0.5,
  },
  skeletonSection: {
    marginTop: spacing.xl,
  },
});
