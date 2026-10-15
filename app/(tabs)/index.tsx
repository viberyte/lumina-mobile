import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../../theme';
import luminaApi from '../../services/luminaApi';
import FlowCard from '../../components/FlowCard';
import { getPhotoUrl, parseVibeTags } from '../../utils/photoHelper';
import { usePersona } from '../../hooks/usePersona';
import StretchCitySelector from '../../components/StretchCitySelector';
import personaService, { sortEventsByMusicPreference } from '../../services/personaService';
import { useUserFollows } from '../../hooks/useFollow';
import favoritesService from '../../services/favorites';
import tasteTracker from '../../services/tasteTracker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Layout constants ──────────────────────────────────────────────
const SIDE_PAD = 16;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - SIDE_PAD * 2 - CARD_GAP) / 2.15;
const CARD_IMAGE_HEIGHT = CARD_WIDTH;
const HERO_HEIGHT = 220;
const SECTION_GAP = 28;
const FLOW_CARD_WIDTH = SCREEN_WIDTH * 0.82;
const FOLLOW_SIZE = 64;

// ─── Quick-intent → category mapping (values from MASTER_TAG_SCHEMA) ─
const INTENT_MAP: Record<string, { label: string; icon: string; categories: string[]; tagPatterns?: RegExp }> = {
  eat: { label: 'Eat', icon: 'restaurant-outline', categories: ['restaurant'], tagPatterns: /dining|brunch|food|bistro|cafe|diner/i },
  drinks: { label: 'Drinks', icon: 'wine-outline', categories: ['bar'], tagPatterns: /cocktail|wine|rooftop|speakeasy|pub|beer|drinks/i },
  goOut: { label: 'Go Out', icon: 'musical-notes-outline', categories: ['club', 'nightclub', 'lounge', 'live_music'], tagPatterns: /dance|dj|party|nightlife/i },
  surprise: { label: 'Surprise Me', icon: 'sparkles-outline', categories: [] }, // empty = all categories, shuffled
};

// ─── Helpers ───────────────────────────────────────────────────────
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

const getDailySeed = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const seededShuffle = (arr: any[], seed: number) => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Tonight';
};

const getContextLine = () => {
  const h = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 5 || day === 6;
  if (h < 12) return isWeekend ? 'Brunch plans?' : 'Start the day right';
  if (h < 17) return isWeekend ? 'Where to next?' : 'Planning tonight?';
  if (h < 21) return 'The night is calling';
  return 'Still going strong';
};

// ─── Animated press wrapper ────────────────────────────────────────
const AnimatedPressable = ({ children, style, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ─── Skeleton ──────────────────────────────────────────────────────
const SkeletonHome = () => (
  <View style={{ flex: 1, paddingHorizontal: SIDE_PAD, paddingTop: 20 }}>
    <View style={{ width: 180, height: 22, backgroundColor: '#1a1a1f', borderRadius: 8, marginBottom: 6 }} />
    <View style={{ width: 120, height: 14, backgroundColor: '#1a1a1f', borderRadius: 6, marginBottom: 20 }} />
    <View style={{ width: '100%', height: 44, backgroundColor: '#1a1a1f', borderRadius: 12, marginBottom: 16 }} />
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: 72, height: 36, backgroundColor: '#1a1a1f', borderRadius: 20 }} />
      ))}
    </View>
    <View style={{ width: '100%', height: HERO_HEIGHT, backgroundColor: '#1a1a1f', borderRadius: 14, marginBottom: 28 }} />
    <View style={{ width: 130, height: 20, backgroundColor: '#1a1a1f', borderRadius: 6, marginBottom: 14 }} />
    <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
      <View style={{ width: CARD_WIDTH, height: CARD_IMAGE_HEIGHT + 44, backgroundColor: '#1a1a1f', borderRadius: 12 }} />
      <View style={{ width: CARD_WIDTH, height: CARD_IMAGE_HEIGHT + 44, backgroundColor: '#1a1a1f', borderRadius: 12 }} />
    </View>
  </View>
);

// ─── Compact Venue Card ────────────────────────────────────────────
const CompactVenueCard = React.memo(({ venue, onPress }: { venue: any; onPress: () => void }) => {
  const photoUrl = getPhotoUrl(venue);
  const category = (venue.standardized_category || venue.category || '').replace(/^\w/, (c: string) => c.toUpperCase());

  return (
    <AnimatedPressable style={s.compactCard} onPress={onPress}>
      <View style={s.compactImageWrap}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={s.compactImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[s.compactImage, { backgroundColor: '#1a1a1f' }]} />
        )}
      </View>
      <Text style={s.compactName} numberOfLines={1}>{venue.name}</Text>
      <Text style={s.compactMeta} numberOfLines={1}>
        {venue.neighborhood || category || venue.city}
      </Text>
    </AnimatedPressable>
  );
});

// ─── Compact Event Card ────────────────────────────────────────────
const CompactEventCard = React.memo(({ event, onPress }: { event: any; onPress: () => void }) => {
  const imageUrl = event.image_url || event.cover_image_url;
  const genre = event.genre || event.music_genre || '';

  return (
    <AnimatedPressable style={s.compactCard} onPress={onPress}>
      <View style={s.compactImageWrap}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={s.compactImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[s.compactImage, { backgroundColor: '#1a1a1f' }]} />
        )}
        {genre ? (
          <View style={s.genrePill}>
            <Text style={s.genrePillText} numberOfLines={1}>{genre}</Text>
          </View>
        ) : null}
      </View>
      <Text style={s.compactName} numberOfLines={1}>{event.title || event.name}</Text>
      <Text style={s.compactMeta} numberOfLines={1}>
        {event.venue_name || genre}
      </Text>
    </AnimatedPressable>
  );
});

// ─── Section Header ────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) => (
  <View style={s.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={s.seeAll}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Horizontal Collection Row ─────────────────────────────────────
const CollectionRow = React.memo(({ data, renderItem, keyPrefix = 'v' }: { data: any[]; renderItem: (item: any) => React.ReactNode; keyPrefix?: string }) => (
  <FlatList
    data={data}
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: CARD_GAP }}
    decelerationRate="fast"
    keyExtractor={(item) => `${keyPrefix}-${item.id}`}
    renderItem={({ item }) => <>{renderItem(item)}</>}
  />
));

// ─── Quick Intent Pill ─────────────────────────────────────────────
const IntentPill = React.memo(({ intentKey, active, onPress }: { intentKey: string; active: boolean; onPress: () => void }) => {
  const intent = INTENT_MAP[intentKey];
  if (!intent) return null;
  return (
    <TouchableOpacity
      style={[s.intentPill, active && s.intentPillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={intent.icon as any}
        size={16}
        color={active ? '#FAFAFA' : '#A1A1AA'}
        style={{ marginRight: 5 }}
      />
      <Text style={[s.intentPillText, active && s.intentPillTextActive]}>
        {intent.label}
      </Text>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { persona, isLoading: personaLoading } = usePersona();

  // ── Core state ──────────────────────────────────────────────────
  const [userName, setUserName] = useState('');
  const [userCity, setUserCity] = useState('Manhattan');
  const [heroVenue, setHeroVenue] = useState<any>(null);
  const [pickedForYou, setPickedForYou] = useState<any[]>([]);
  const [yourKindVenues, setYourKindVenues] = useState<any[]>([]);
  const [intentResults, setIntentResults] = useState<any[]>([]);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [happeningNow, setHappeningNow] = useState<any[]>([]);
  const [flowsData, setFlowsData] = useState<any[]>([]);
  const [dateNightPicks, setDateNightPicks] = useState<any[]>([]);
  const [lateNightSpots, setLateNightSpots] = useState<any[]>([]);
  const [nearYouVenues, setNearYouVenues] = useState<any[]>([]);
  const [allVenues, setAllVenues] = useState<any[]>([]); // cache for intent filtering
  const [hasTaste, setHasTaste] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadingCity, setReloadingCity] = useState('');
  const [refreshSeed, setRefreshSeed] = useState(0);
  const reloadOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { follows, refresh: refreshFollows } = useUserFollows();

  // ── Lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    loadProfile();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const res = await fetch(
          `https://viberyte.com/api/venues?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&limit=10&sort=distance`
        ).then(r => r.json()).catch(() => null);
        if (res?.venues?.length) {
          setNearYouVenues(res.venues.filter((v: any) => getPhotoUrl(v)).slice(0, 8));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!personaLoading) loadContent();
  }, [personaLoading]);

  const loadProfile = async () => {
    try {
      const profile = await AsyncStorage.getItem('@lumina_profile');
      const savedCity = await AsyncStorage.getItem('@lumina_selected_city');
      if (profile) { const d = JSON.parse(profile); setUserName(d.name || ''); }
      if (savedCity && savedCity !== 'Near Me') setUserCity(savedCity);
    } catch {}
  };

  // ── Build "Your Kind of Places" from taste + favorites + persona ─
  const buildYourKindSection = async (sortedVenues: any[], heroId: any) => {
    try {
      const [topCats, recentIds, hasData, favs] = await Promise.all([
        tasteTracker.getTopCategories(3),
        tasteTracker.getRecentlyViewed(),
        tasteTracker.hasTasteData(),
        favoritesService.getFavorites(),
      ]);
      setHasTaste(hasData);

      if (!hasData && favs.length < 2) {
        // New user fallback: show persona-sorted top picks (not duplicating Tonight's Picks)
        setYourKindVenues([]);
        return;
      }

      // Score each venue based on: fav match, top-category match, recent view, persona sort position
      const favIds = new Set(favs.map(f => String(f.id)));
      const recentSet = new Set(recentIds);
      const topCatSet = new Set(topCats);

      const scored = sortedVenues
        .filter((v: any) => v.id !== heroId && getPhotoUrl(v))
        .map((v: any, idx: number) => {
          let score = 0;
          const cat = (v.standardized_category || v.category || '').toLowerCase();
          if (topCatSet.has(cat)) score += 5;
          if (favIds.has(String(v.id))) score += 4;
          if (recentSet.has(String(v.id))) score += 2;
          // Persona position bonus (higher ranked = higher score)
          score += Math.max(0, 20 - idx) * 0.1;
          return { ...v, _kindScore: score };
        })
        .filter((v: any) => v._kindScore > 0)
        .sort((a: any, b: any) => b._kindScore - a._kindScore)
        .slice(0, 8);

      setYourKindVenues(scored);
    } catch {
      setYourKindVenues([]);
    }
  };

  // ── Data loading (preserves all backend logic) ──────────────────
  const loadContent = async (cityOverride?: string, seedOverride?: number) => {
    // Always read saved city from storage to avoid race with useState
    const savedCity = await AsyncStorage.getItem('@lumina_selected_city').catch(() => null);
    const rawCity = cityOverride || (savedCity && savedCity !== 'Near Me' ? savedCity : null) || userCity;
    const activeCity = (!rawCity || rawCity === 'Near Me') ? 'Manhattan' : rawCity;
    // Sync state if storage had a different city
    if (savedCity && savedCity !== 'Near Me' && savedCity !== userCity) setUserCity(savedCity);
    try {
      setLoading(true);
      const [venues, events, flowsRes, featuredRes] = await Promise.all([
        luminaApi.getVenues(activeCity || 'Manhattan'),
        luminaApi.getEvents(activeCity || 'New York'),
        fetch('https://viberyte.com/api/flows?city=' + encodeURIComponent(activeCity || 'Manhattan')).then(r => r.json()).catch(() => ({ ok: false, flows: [] })),
        fetch('https://viberyte.com/api/events?city=' + encodeURIComponent(activeCity || 'New York') + '&limit=15').then(r => r.json()).catch(() => ({ events: [] })),
      ]);

      const seed = (seedOverride != null && seedOverride > 0) ? seedOverride : (refreshSeed > 0 ? refreshSeed : getDailySeed());
      const shuffledVenues = seededShuffle(venues, seed);
      const shuffledEvents = seededShuffle(events, seed + 1);
      const sortedVenues = personaService.sortVenuesByPersona(shuffledVenues, persona);

      // Cache all venues for intent filtering
      setAllVenues(sortedVenues);

      // Hero — single standout venue
      const hero = sortedVenues.find((v: any) => (v.google_rating || v.rating) >= 4.3 && getPhotoUrl(v));
      setHeroVenue(hero || null);

      // Tonight's picks (skip hero)
      const heroId = hero?.id;
      const picked = sortedVenues
        .filter((v: any) => v.id !== heroId && getPhotoUrl(v))
        .slice(0, 10);
      setPickedForYou(picked);

      // Build "Your Kind of Places"
      await buildYourKindSection(sortedVenues, heroId);

      // Date night
      const dateSpots = sortedVenues
        .filter((v: any) => {
          const tags = safeGetTags(v.vibe_tags);
          const ctx = v.contextual_tags || {};
          return (
            tags.some((t: string) => /romantic|intimate|cozy/i.test(t)) ||
            ctx.date_spot || ctx.conversation_friendly
          ) && getPhotoUrl(v) && v.id !== heroId;
        }).slice(0, 8);
      setDateNightPicks(dateSpots);

      // Late night
      const lateNight = sortedVenues
        .filter((v: any) => {
          const tags = safeGetTags(v.vibe_tags);
          const cat = (v.category || '').toLowerCase();
          return (
            tags.some((t: string) => /late|club|dance/i.test(t)) ||
            /nightclub|lounge|bar/.test(cat)
          ) && getPhotoUrl(v) && v.id !== heroId;
        }).slice(0, 8);
      setLateNightSpots(lateNight);

      // Events
      const musicPrefs = (persona as any)?.music_preferences || [];
      const musicSorted = sortEventsByMusicPreference(shuffledEvents, musicPrefs);
      setHappeningNow(musicSorted.filter((e: any) => e.image_url || e.cover_image_url).slice(0, 8));
      setFeaturedEvents((featuredRes?.events || []).slice(0, 10));
      if (flowsRes?.ok && flowsRes?.flows) setFlowsData(flowsRes.flows);

      // Prefetch key images
      const imgs = [
        hero && getPhotoUrl(hero),
        ...picked.slice(0, 4).map((v: any) => getPhotoUrl(v)),
      ].filter(Boolean);
      if (imgs.length) Image.prefetch(imgs);

    } catch (err) {
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Intent pill tap → filter venues from cached data ────────────
  const handleIntentPress = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIntent === key) {
      // Toggle off — clear intent results
      setActiveIntent(null);
      setIntentResults([]);
      return;
    }
    setActiveIntent(key);
    const intent = INTENT_MAP[key];
    if (!intent) return;

    if (intent.categories.length === 0) {
      // "Surprise Me" — random reshuffle from all venues
      const shuffled = seededShuffle(allVenues, Date.now());
      setIntentResults(shuffled.filter((v: any) => getPhotoUrl(v)).slice(0, 10));
    } else {
      // Filter by category match OR tagPattern match on vibe_tags
      const catSet = new Set(intent.categories);
      const filtered = allVenues.filter((v: any) => {
        if (!getPhotoUrl(v)) return false;
        const cat = (v.standardized_category || v.category || '').toLowerCase();
        if (catSet.has(cat)) return true;
        // Also match via tagPatterns against vibe_tags
        if (intent.tagPatterns) {
          const tags = safeGetTags(v.vibe_tags).join(' ');
          const name = (v.name || '').toLowerCase();
          if (intent.tagPatterns.test(tags) || intent.tagPatterns.test(name)) return true;
        }
        return false;
      });
      setIntentResults(filtered.slice(0, 10));
    }
  }, [activeIntent, allVenues]);

  // ── City change ─────────────────────────────────────────────────
  const handleCityChange = async (newCity: string) => {
    setShowCitySelector(false);
    if (newCity === userCity) return;
    setIsReloading(true);
    setReloadingCity(newCity);
    reloadOpacity.setValue(1);
    setHeroVenue(null);
    setPickedForYou([]);
    setYourKindVenues([]);
    setIntentResults([]);
    setActiveIntent(null);
    setDateNightPicks([]);
    setLateNightSpots([]);
    setFeaturedEvents([]);
    setHappeningNow([]);
    setLoading(true);
    await new Promise<void>(r => setTimeout(r, 50));
    setUserCity(newCity);
    if (newCity !== 'Near Me') await AsyncStorage.setItem('@lumina_selected_city', newCity);
    await loadContent(newCity);
    await new Promise<void>(r => setTimeout(r, 800));
    await new Promise<void>(r => {
      Animated.timing(reloadOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => r());
    });
    setIsReloading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSeed = Math.floor(Math.random() * 999999);
    setRefreshSeed(newSeed);
    setActiveIntent(null);
    setIntentResults([]);
    await loadContent(undefined, newSeed);
    setRefreshing(false);
  };

  const handleVenuePress = useCallback((venue: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Record taste signal
    const cat = venue.standardized_category || venue.category || '';
    tasteTracker.recordDetailView(venue.id, cat);
    router.push(`/venue/${venue.id}`);
  }, [router]);

  const handleEventPress = useCallback((event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  }, [router]);

  // ── Dynamic section ordering ────────────────────────────────────
  const hour = new Date().getHours();
  const isLateNight = hour >= 22 || hour < 4;
  const isEvening = hour >= 18 && hour < 22;
  const isDaytime = hour >= 6 && hour < 18;

  const orderedSections = useMemo(() => {
    type Section =
      | 'intentResults'
      | 'yourKind'
      | 'following'
      | 'tonightPicks'
      | 'nearYou'
      | 'flows'
      | 'events'
      | 'contextual';

    const sections: Section[] = [];

    // Intent results always first when active
    if (activeIntent && intentResults.length > 0) sections.push('intentResults');

    // "Your Kind of Places" — when user has taste data
    if (yourKindVenues.length > 0) sections.push('yourKind');

    // Following — if user follows anyone
    if (follows.venues.length > 0 || follows.promoters.length > 0) sections.push('following');

    // Time-based ordering of main content
    if (isLateNight) {
      // Late night: contextual first (Still Going), then events, then picks
      sections.push('contextual', 'events', 'tonightPicks');
    } else if (isEvening) {
      // Evening: picks first, then events, then date night (contextual)
      sections.push('tonightPicks', 'events', 'contextual');
    } else {
      // Daytime: picks, nearby, events
      sections.push('tonightPicks', 'events');
    }

    // Nearby — always shown if available
    if (nearYouVenues.length > 0 && !sections.includes('nearYou')) {
      sections.push('nearYou');
    }

    // Flows — always present if available
    if (flowsData.length > 0) sections.push('flows');

    return sections;
  }, [activeIntent, intentResults, yourKindVenues, follows, nearYouVenues, flowsData, isLateNight, isEvening, hour]);

  // ── Loading state ───────────────────────────────────────────────
  if (personaLoading || (loading && !heroVenue && pickedForYou.length === 0)) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <SkeletonHome />
      </View>
    );
  }

  // ── Render sections by dynamic order ────────────────────────────
  const renderSection = (key: string, index: number) => {
    switch (key) {
      case 'intentResults':
        return (
          <View key="intent-results" style={s.section}>
            <SectionHeader
              title={INTENT_MAP[activeIntent!]?.label || 'Results'}
              subtitle={`${intentResults.length} spots in ${userCity}`}
            />
            <CollectionRow
              data={intentResults}
              keyPrefix="ir"
              renderItem={(venue) => (
                <CompactVenueCard venue={venue} onPress={() => handleVenuePress(venue)} />
              )}
            />
          </View>
        );

      case 'yourKind':
        return (
          <View key="your-kind" style={s.section}>
            <SectionHeader
              title="Your Kind of Places"
              subtitle="Based on what you love"
              onSeeAll={() => router.push('/explore')}
            />
            <CollectionRow
              data={yourKindVenues}
              keyPrefix="yk"
              renderItem={(venue) => (
                <CompactVenueCard venue={venue} onPress={() => handleVenuePress(venue)} />
              )}
            />
          </View>
        );

      case 'following':
        return (
          <View key="following" style={s.section}>
            <SectionHeader title="Following" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: 16 }}
            >
              {follows.venues.map((v: any) => {
                const photo = v.professional_photo_url || (v.google_photos?.[0]) || v.image_url;
                return (
                  <TouchableOpacity
                    key={`fv-${v.id}`}
                    style={s.followItem}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/venue/${v.id}`); }}
                    activeOpacity={0.8}
                  >
                    <View style={s.followAvatarWrap}>
                      <Image source={{ uri: photo }} style={s.followAvatar} contentFit="cover" cachePolicy="memory-disk" />
                    </View>
                    <Text style={s.followName} numberOfLines={1}>{v.name}</Text>
                  </TouchableOpacity>
                );
              })}
              {follows.promoters.map((p: any) => {
                const photo = p.profile_picture || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200';
                return (
                  <TouchableOpacity
                    key={`fp-${p.id}`}
                    style={s.followItem}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/promoter/${p.instagram_handle}`); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.followAvatarWrap, { borderColor: colors.violet[600] }]}>
                      <Image source={{ uri: photo }} style={s.followAvatar} contentFit="cover" cachePolicy="memory-disk" />
                    </View>
                    <Text style={s.followName} numberOfLines={1}>{p.business_name || p.instagram_handle}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      case 'tonightPicks':
        if (pickedForYou.length === 0) return null;
        return (
          <View key="tonight-picks" style={s.section}>
            <SectionHeader
              title={isLateNight ? 'Late Night Picks' : isDaytime ? 'Explore Today' : "Tonight's Picks"}
              onSeeAll={() => router.push('/explore?filter=tonight')}
            />
            <CollectionRow
              data={pickedForYou}
              keyPrefix="tp"
              renderItem={(venue) => (
                <CompactVenueCard venue={venue} onPress={() => handleVenuePress(venue)} />
              )}
            />
          </View>
        );

      case 'nearYou':
        if (nearYouVenues.length === 0) return null;
        return (
          <View key="near-you" style={s.section}>
            <SectionHeader title="Nearest to You" onSeeAll={() => router.push('/explore?filter=nearby')} />
            <CollectionRow
              data={nearYouVenues}
              keyPrefix="ny"
              renderItem={(venue) => (
                <CompactVenueCard venue={venue} onPress={() => handleVenuePress(venue)} />
              )}
            />
          </View>
        );

      case 'flows':
        if (flowsData.length === 0) return null;
        return (
          <View key="flows" style={s.section}>
            <SectionHeader
              title="Flow of the Night"
              subtitle="Multi-stop plans, curated for you"
              onSeeAll={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/all-flows' as any); }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SIDE_PAD, paddingRight: 40 }}
              decelerationRate="fast"
              snapToInterval={FLOW_CARD_WIDTH + 14}
              snapToAlignment="start"
            >
              {flowsData.slice(0, 5).map((flow: any) => (
                <FlowCard key={flow.slug} flow={flow} />
              ))}
            </ScrollView>
          </View>
        );

      case 'events':
        if (happeningNow.length === 0 && featuredEvents.length === 0) return null;
        const eventsToShow = happeningNow.length > 0 ? happeningNow : featuredEvents.slice(0, 6);
        const eventsTitle = happeningNow.length > 0
          ? (isLateNight ? 'Live Now' : 'Events Tonight')
          : 'Featured Events';
        return (
          <View key="events" style={s.section}>
            <SectionHeader title={eventsTitle} onSeeAll={() => router.push('/explore?filter=events')} />
            <CollectionRow
              data={eventsToShow}
              keyPrefix="ev"
              renderItem={(event) => (
                <CompactEventCard event={event} onPress={() => handleEventPress(event)} />
              )}
            />
          </View>
        );

      case 'contextual':
        if (isLateNight && lateNightSpots.length > 0) {
          return (
            <View key="contextual" style={s.section}>
              <SectionHeader title="Still Going" onSeeAll={() => router.push('/explore?filter=latenight')} />
              <CollectionRow
                data={lateNightSpots}
                keyPrefix="ln"
                renderItem={(venue) => (
                  <CompactVenueCard venue={venue} onPress={() => handleVenuePress(venue)} />
                )}
              />
            </View>
          );
        }
        if (isEvening && dateNightPicks.length > 0) {
          return (
            <View key="contextual" style={s.section}>
              <SectionHeader title="Date Night" onSeeAll={() => router.push('/explore?filter=datenight')} />
              <CollectionRow
                data={dateNightPicks}
                keyPrefix="dn"
                renderItem={(venue) => (
                  <CompactVenueCard venue={venue} onPress={() => handleVenuePress(venue)} />
                )}
              />
            </View>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#71717A" />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ───── CONTEXTUAL HEADER ───── */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <View style={s.headerTopRow}>
                <Text style={s.greeting}>{getGreeting()}</Text>
                <TouchableOpacity
                  style={s.locationPill}
                  onPress={() => setShowCitySelector(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={11} color={colors.violet[400]} />
                  <Text style={s.locationText}>{userCity}</Text>
                  <Ionicons name="chevron-down" size={10} color="#52525B" />
                </TouchableOpacity>
              </View>
              <Text style={s.contextLine}>{getContextLine()}</Text>
            </View>
          </View>

          {/* ───── SEARCH BAR ───── */}
          <TouchableOpacity
            style={s.searchBar}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/search');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color="#52525B" />
            <Text style={s.searchPlaceholder}>Search venues, events, vibes…</Text>
          </TouchableOpacity>

          {/* ───── QUICK INTENT PILLS ───── */}
          <View style={s.intentRow}>
            {Object.keys(INTENT_MAP).map((key) => (
              <IntentPill
                key={key}
                intentKey={key}
                active={activeIntent === key}
                onPress={() => handleIntentPress(key)}
              />
            ))}
          </View>

          {/* ───── EDITORIAL HERO ───── */}
          {heroVenue && !activeIntent && (
            <AnimatedPressable
              style={s.heroWrap}
              onPress={() => handleVenuePress(heroVenue)}
            >
              <View style={s.heroImageWrap}>
                <Image
                  source={{ uri: getPhotoUrl(heroVenue) }}
                  style={s.heroImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={300}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)']}
                  locations={[0.35, 0.6, 1]}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={s.heroOverlay}>
                  <Text style={s.heroLabel}>FEATURED</Text>
                </View>
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroName}>{heroVenue.name}</Text>
                <Text style={s.heroMeta}>
                  {heroVenue.neighborhood}
                  {heroVenue.category ? ` · ${heroVenue.category.charAt(0).toUpperCase() + heroVenue.category.slice(1)}` : ''}
                </Text>
              </View>
            </AnimatedPressable>
          )}

          {/* ───── DYNAMIC SECTIONS ───── */}
          {orderedSections.map((section, idx) => renderSection(section, idx))}

        </Animated.View>
      </ScrollView>

      {/* ───── CITY SELECTOR MODAL ───── */}
      <Modal visible={showCitySelector} animationType="fade" transparent onRequestClose={() => setShowCitySelector(false)}>
        <StretchCitySelector currentCity={userCity} onSelectCity={handleCityChange} />
      </Modal>

      {/* ───── CITY SWITCH OVERLAY ───── */}
      {isReloading && (
        <Animated.View style={[s.reloadOverlay, { opacity: reloadOpacity }]}>
          <Text style={s.reloadBrand}>VIBERYTE</Text>
          <View style={s.reloadCityRow}>
            <View style={s.reloadLine} />
            <Text style={s.reloadCity}>{reloadingCity.toUpperCase()}</Text>
            <View style={s.reloadLine} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Header ─────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SIDE_PAD,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: -0.5,
  },
  contextLine: {
    fontSize: 14,
    color: '#71717A',
    fontWeight: '400',
    marginTop: 2,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(139,92,246,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.12)',
  },
  locationText: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '500',
  },

  // ── Search Bar ──────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIDE_PAD,
    marginBottom: 14,
    height: 44,
    backgroundColor: '#121216',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1a1a1f',
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#52525B',
    fontWeight: '400',
  },

  // ── Quick Intent Pills ──────────────────────────────────────────
  intentRow: {
    flexDirection: 'row',
    paddingHorizontal: SIDE_PAD,
    gap: 8,
    marginBottom: 24,
  },
  intentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#121216',
    borderWidth: 1,
    borderColor: '#1a1a1f',
  },
  intentPillActive: {
    backgroundColor: colors.violet[600],
    borderColor: colors.violet[500],
  },
  intentPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  intentPillTextActive: {
    color: '#FAFAFA',
  },

  // ── Editorial Hero ──────────────────────────────────────────────
  heroWrap: {
    marginHorizontal: SIDE_PAD,
    marginBottom: SECTION_GAP,
  },
  heroImageWrap: {
    width: '100%',
    height: HERO_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1a1f',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
  },
  heroInfo: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: -0.3,
  },
  heroMeta: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
    fontWeight: '400',
  },

  // ── Following ───────────────────────────────────────────────────
  followItem: {
    alignItems: 'center',
    width: FOLLOW_SIZE + 8,
  },
  followAvatarWrap: {
    width: FOLLOW_SIZE,
    height: FOLLOW_SIZE,
    borderRadius: FOLLOW_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    marginBottom: 6,
  },
  followAvatar: {
    width: '100%',
    height: '100%',
  },
  followName: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Sections ────────────────────────────────────────────────────
  section: {
    marginBottom: SECTION_GAP,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: SIDE_PAD,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#52525B',
    fontWeight: '400',
    marginTop: 2,
  },
  seeAll: {
    fontSize: 14,
    color: '#A78BFA',
    fontWeight: '500',
  },

  // ── Compact Card (Apple Music style) ────────────────────────────
  compactCard: {
    width: CARD_WIDTH,
  },
  compactImageWrap: {
    width: CARD_WIDTH,
    height: CARD_IMAGE_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1f',
    marginBottom: 8,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
    letterSpacing: -0.1,
    marginBottom: 1,
  },
  compactMeta: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '400',
  },

  // ── Genre pill on event cards ───────────────────────────────────
  genrePill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genrePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },

  // ── City Reload Overlay ─────────────────────────────────────────
  reloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reloadBrand: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 8,
    marginBottom: 20,
  },
  reloadCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reloadLine: {
    width: 20,
    height: 1,
    backgroundColor: '#3F3F46',
  },
  reloadCity: {
    fontSize: 12,
    fontWeight: '400',
    color: '#7C3AED',
    letterSpacing: 2,
  },
});

