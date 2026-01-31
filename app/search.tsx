import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme';

const API_BASE = 'https://lumina.viberyte.com';

interface Venue {
  id: number;
  name: string;
  neighborhood?: string;
  cuisine_primary?: string;
  venue_type?: string;
  image_url?: string;
  google_rating?: number;
  price_level?: number;
  matchReason?: string | null;
  score?: number;
}

interface Event {
  id: number;
  name?: string;
  title?: string;
  venue_name?: string;
  image_url?: string;
  cover_image_url?: string;
  music_genre?: string;
}

interface Promoter {
  id: number;
  handle: string;
  business_name?: string;
  profile_image_url?: string;
  verified?: boolean;
}

interface SearchIntent {
  reasoning: string;
  confidence: number;
  matchTags: string[];
  category?: string;
  occasion?: string;
  music?: string[];
  vibe?: string[];
}

// Preload images
const preloadImages = (urls: string[]) => {
  urls.forEach(url => { if (url) Image.prefetch(url); });
};

// Get conversational placeholder based on time
const getPlaceholder = (): string => {
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 4) return "What kind of night is it?";
  if (hour >= 17) return "What's the vibe tonight?";
  if (hour >= 11) return "Dinner, drinks, or dancing?";
  return "Tell me what you're looking for...";
};

// Time-based suggestions
const getTimeSuggestions = (): string[] => {
  const hour = new Date().getHours();
  const isWeekend = [0, 5, 6].includes(new Date().getDay());
  
  if (hour >= 21 || hour < 4) {
    return isWeekend
      ? ['Somewhere to dance', 'Late night eats', 'Afrobeats party', 'Rooftop drinks']
      : ['Chill lounge', 'Late night food', 'Good cocktails', 'Live music'];
  } else if (hour >= 17) {
    return isWeekend
      ? ['Pre-game spots', 'Dinner then drinks', 'Rooftop vibes', 'Group dinner']
      : ['After work drinks', 'Nice dinner', 'Happy hour', 'Date spot'];
  }
  return ['Brunch', 'Lunch spots', 'Coffee', 'Dinner planning'];
};

// Shimmer placeholder
const ShimmerPlaceholder = ({ style }: { style?: any }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  
  return (
    <Animated.View style={[styles.shimmerPlaceholder, style, { 
      opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] })
    }]}>
      <Ionicons name="image-outline" size={20} color={colors.zinc[700]} />
    </Animated.View>
  );
};

// Featured Result Card (Top Match)
const FeaturedResultCard = ({ item, onPress }: { item: Venue; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const imageUrl = item.image_url?.startsWith('/') ? `${API_BASE}${item.image_url}` : item.image_url;
  const subtitle = [item.cuisine_primary || item.venue_type, item.neighborhood].filter(Boolean).join(' · ');

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.featuredCard, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.featuredGlow, { opacity: glowOpacity }]} />
        
        <View style={styles.featuredContent}>
          <View style={styles.featuredImageContainer}>
            {imageUrl ? (
              <>
                {!imageLoaded && <ShimmerPlaceholder style={styles.featuredImage} />}
                <Image 
                  source={{ uri: imageUrl }} 
                  style={[styles.featuredImage, !imageLoaded && { position: 'absolute', opacity: 0 }]} 
                  contentFit="cover" 
                  transition={150}
                  cachePolicy="memory-disk"
                  onLoad={() => setImageLoaded(true)}
                />
              </>
            ) : (
              <View style={styles.featuredImagePlaceholder}>
                <Ionicons name="location" size={32} color={colors.zinc[600]} />
              </View>
            )}
          </View>
          
          <View style={styles.featuredInfo}>
            <View style={styles.topMatchBadge}>
              <Ionicons name="sparkles" size={10} color={colors.violet[400]} />
              <Text style={styles.topMatchText}>TOP MATCH</Text>
            </View>
            
            <Text style={styles.featuredName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.featuredSubtitle} numberOfLines={1}>{subtitle}</Text>
            
            {item.matchReason && (
              <Text style={styles.matchReasonText}>{item.matchReason}</Text>
            )}
            
            <View style={styles.featuredMeta}>
              {item.google_rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={styles.ratingText}>{item.google_rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// Regular Result Card
const ResultCard = ({ item, type, onPress }: { item: any; type: 'venue' | 'event' | 'promoter'; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const [imageLoaded, setImageLoaded] = useState(false);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const rawUrl = item.image_url || item.cover_image_url || item.profile_image_url;
  const imageUrl = rawUrl?.startsWith('/') ? `${API_BASE}${rawUrl}` : rawUrl;
  const isPromoter = type === 'promoter';
  
  const subtitle = type === 'venue' 
    ? [item.cuisine_primary || item.venue_type, item.neighborhood].filter(Boolean).join(' · ')
    : type === 'event'
    ? [item.venue_name, item.music_genre].filter(Boolean).join(' · ')
    : item.verified ? 'Verified Promoter' : 'Promoter';

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.resultCard, { transform: [{ scale }] }]}>
        <View style={[styles.resultImageContainer, isPromoter && styles.resultImageRoundContainer]}>
          {imageUrl ? (
            <>
              {!imageLoaded && <ShimmerPlaceholder style={[styles.resultImage, isPromoter && styles.resultImageRound]} />}
              <Image 
                source={{ uri: imageUrl }} 
                style={[styles.resultImage, isPromoter && styles.resultImageRound, !imageLoaded && { position: 'absolute', opacity: 0 }]} 
                contentFit="cover" 
                transition={150}
                cachePolicy="memory-disk"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <View style={[styles.resultImagePlaceholder, isPromoter && styles.resultImageRound]}>
              <Ionicons name={isPromoter ? "person" : type === 'event' ? "calendar" : "location"} size={24} color={colors.zinc[600]} />
            </View>
          )}
        </View>
        
        <View style={styles.resultInfo}>
          <View style={styles.resultNameRow}>
            <Text style={styles.resultName} numberOfLines={1}>
              {item.name || item.title || item.business_name || item.handle}
            </Text>
            {item.verified && <Ionicons name="checkmark-circle" size={14} color={colors.violet[400]} />}
          </View>
          <Text style={styles.resultSubtitle} numberOfLines={1}>{subtitle}</Text>
          {type === 'venue' && item.matchReason && (
            <Text style={styles.resultMatchReason} numberOfLines={1}>{item.matchReason}</Text>
          )}
        </View>
        
        {item.google_rating && (
          <View style={styles.ratingBadgeSmall}>
            <Ionicons name="star" size={10} color="#FBBF24" />
            <Text style={styles.ratingTextSmall}>{item.google_rating.toFixed(1)}</Text>
          </View>
        )}
        
        <Ionicons name="chevron-forward" size={18} color={colors.zinc[600]} />
      </Animated.View>
    </Pressable>
  );
};

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholder] = useState(getPlaceholder());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const [aiPowered, setAiPowered] = useState(false);
  const [timeSuggestions] = useState(getTimeSuggestions());

  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 150);
    loadRecentSearches();
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (searchQuery.length >= 2) {
      searchTimeout.current = setTimeout(() => performSearch(searchQuery), 300);
    } else {
      setVenues([]);
      setEvents([]);
      setPromoters([]);
      setIntent(null);
      setAiPowered(false);
    }
    
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();
      
      // Use backend AI intent
      if (data.intent) {
        setIntent(data.intent);
        setAiPowered(data.aiPowered || false);
      }
      
      // Venues already have matchReason from backend
      setVenues(data.venues || []);
      setEvents(data.events || []);
      setPromoters(data.promoters || []);
      
      // Preload images
      const imageUrls = [
        ...(data.venues || []).slice(0, 10).map((v: Venue) => v.image_url),
        ...(data.events || []).slice(0, 5).map((e: Event) => e.image_url || e.cover_image_url),
      ].filter(Boolean).map(url => url?.startsWith('/') ? `${API_BASE}${url}` : url);
      preloadImages(imageUrls as string[]);
      
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const recent = await AsyncStorage.getItem('@lumina_recent_searches');
      if (recent) setRecentSearches(JSON.parse(recent));
    } catch (error) {}
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter(s => s.toLowerCase() !== query.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      await AsyncStorage.setItem('@lumina_recent_searches', JSON.stringify(updated));
    } catch (error) {}
  };

  const handleVenuePress = (venue: Venue) => {
    saveRecentSearch(venue.name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/venue/${venue.id}`);
  };

  const handleEventPress = (event: Event) => {
    saveRecentSearch(event.name || event.title || '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  };

  const handlePromoterPress = (promoter: Promoter) => {
    saveRecentSearch(promoter.business_name || promoter.handle);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/promoter/${promoter.handle}`);
  };

  const handleQuickSearch = (query: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery(query);
    saveRecentSearch(query);
  };

  const clearRecentSearches = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecentSearches([]);
    await AsyncStorage.removeItem('@lumina_recent_searches');
  };

  const hasResults = venues.length > 0 || events.length > 0 || promoters.length > 0;
  const totalResults = venues.length + events.length + promoters.length;
  const topVenue = venues[0];
  const otherVenues = venues.slice(1);
  const showFeatured = intent && intent.confidence > 25 && topVenue;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} 
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={colors.zinc[500]} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder={placeholder}
              placeholderTextColor={colors.zinc[500]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator size="small" color={colors.violet[400]} />}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.zinc[500]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* AI Intent Badge - from backend */}
        {intent?.reasoning && (
          <View style={styles.intentContainer}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.18)', 'rgba(139, 92, 246, 0.06)']}
              style={styles.intentBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="sparkles" size={14} color={colors.violet[400]} />
              <Text style={styles.intentText}>{intent.reasoning}</Text>
              {aiPowered && (
                <View style={styles.aiPill}>
                  <Text style={styles.aiPillText}>AI</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Results */}
          {hasResults && (
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsSubtext}>
                  {intent && intent.confidence > 25 
                    ? 'Curated for you based on your search' 
                    : `${totalResults} results`}
                </Text>
              </View>
              
              {/* Featured Top Match */}
              {showFeatured && (
                <FeaturedResultCard
                  item={topVenue}
                  onPress={() => handleVenuePress(topVenue)}
                />
              )}
              
              {/* Promoters */}
              {promoters.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="people" size={16} color={colors.violet[400]} />
                    <Text style={styles.sectionTitle}>Promoters</Text>
                  </View>
                  {promoters.map((promoter) => (
                    <ResultCard
                      key={`promoter-${promoter.id}`}
                      item={promoter}
                      type="promoter"
                      onPress={() => handlePromoterPress(promoter)}
                    />
                  ))}
                </View>
              )}
              
              {/* Venues */}
              {(showFeatured ? otherVenues : venues).length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="location" size={16} color={colors.violet[400]} />
                    <Text style={styles.sectionTitle}>
                      {showFeatured ? 'More Options' : 'Venues'}
                    </Text>
                  </View>
                  {(showFeatured ? otherVenues : venues).map((venue) => (
                    <ResultCard
                      key={`venue-${venue.id}`}
                      item={venue}
                      type="venue"
                      onPress={() => handleVenuePress(venue)}
                    />
                  ))}
                </View>
              )}
              
              {/* Events */}
              {events.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="calendar" size={16} color={colors.orange[400]} />
                    <Text style={styles.sectionTitle}>Events</Text>
                  </View>
                  {events.map((event) => (
                    <ResultCard
                      key={`event-${event.id}`}
                      item={event}
                      type="event"
                      onPress={() => handleEventPress(event)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* No Results */}
          {searchQuery.length >= 2 && !isSearching && !hasResults && (
            <View style={styles.noResults}>
              <View style={styles.noResultsIcon}>
                <Ionicons name="search-outline" size={36} color={colors.zinc[600]} />
              </View>
              <Text style={styles.noResultsText}>No results for "{searchQuery}"</Text>
              <Text style={styles.noResultsHint}>Try describing the vibe you're looking for</Text>
            </View>
          )}

          {/* Default State */}
          {!hasResults && searchQuery.length < 2 && (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.violet[400]} />
                  <Text style={styles.sectionTitle}>Try asking</Text>
                </View>
                <View style={styles.chipsContainer}>
                  {timeSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => handleQuickSearch(suggestion)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.zinc[500]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trending-up" size={16} color={colors.zinc[400]} />
                  <Text style={styles.sectionTitle}>Popular searches</Text>
                </View>
                <View style={styles.trendingChips}>
                  {['Afrobeats', 'Rooftop', 'Date night', 'Hip-Hop', 'Sushi', 'Latin', 'Lounge'].map((term, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.trendingChip}
                      onPress={() => handleQuickSearch(term)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.trendingText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={16} color={colors.zinc[500]} />
                    <Text style={styles.sectionTitle}>Recent</Text>
                    <TouchableOpacity onPress={clearRecentSearches} style={styles.clearButton}>
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((term, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.recentItem}
                      onPress={() => handleQuickSearch(term)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.zinc[600]} />
                      <Text style={styles.recentText}>{term}</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.zinc[700]} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.white, padding: 0 },
  intentContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.xs, marginBottom: spacing.sm },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  intentText: { fontSize: 14, color: colors.violet[300], fontWeight: '600' },
  aiPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  aiPillText: { fontSize: 9, color: colors.violet[300], fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  resultsContainer: { gap: spacing.md },
  resultsHeader: { marginBottom: spacing.xs },
  resultsSubtext: { fontSize: 13, color: colors.zinc[500], fontWeight: '500' },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.white, flex: 1 },
  // Shimmer
  shimmerPlaceholder: {
    backgroundColor: colors.zinc[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Featured Card
  featuredCard: { marginBottom: spacing.lg, borderRadius: 18, overflow: 'hidden' },
  featuredGlow: {
    position: 'absolute',
    top: -6, left: -6, right: -6, bottom: -6,
    backgroundColor: colors.violet[500],
    borderRadius: 24,
  },
  featuredContent: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    padding: spacing.md,
    gap: spacing.md,
  },
  featuredImageContainer: { width: 100, height: 100 },
  featuredImage: { width: 100, height: 100, borderRadius: 14, backgroundColor: colors.zinc[800] },
  featuredImagePlaceholder: {
    width: 100, height: 100, borderRadius: 14, backgroundColor: colors.zinc[800],
    justifyContent: 'center', alignItems: 'center',
  },
  featuredInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  topMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  topMatchText: { fontSize: 9, fontWeight: '700', color: colors.violet[400], letterSpacing: 0.5 },
  featuredName: { fontSize: 17, fontWeight: '700', color: colors.white, lineHeight: 21 },
  featuredSubtitle: { fontSize: 13, color: colors.zinc[400] },
  matchReasonText: { fontSize: 12, color: colors.violet[400], fontWeight: '600', marginTop: 2 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  // Result Card
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  resultImageContainer: { width: 64, height: 64 },
  resultImageRoundContainer: { width: 56, height: 56 },
  resultImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.zinc[800] },
  resultImageRound: { width: 56, height: 56, borderRadius: 28 },
  resultImagePlaceholder: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: colors.zinc[800],
    justifyContent: 'center', alignItems: 'center',
  },
  resultInfo: { flex: 1, gap: 2 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultName: { fontSize: 15, fontWeight: '600', color: colors.white, flexShrink: 1 },
  resultSubtitle: { fontSize: 13, color: colors.zinc[500] },
  resultMatchReason: { fontSize: 12, color: colors.violet[400], fontWeight: '500', marginTop: 2 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#FBBF24' },
  ratingBadgeSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  ratingTextSmall: { fontSize: 11, fontWeight: '600', color: '#FBBF24' },
  // Suggestions
  chipsContainer: { gap: spacing.sm },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  suggestionText: { fontSize: 15, color: colors.white, fontWeight: '500' },
  trendingChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  trendingChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  trendingText: { fontSize: 14, color: colors.zinc[300], fontWeight: '500' },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  recentText: { flex: 1, fontSize: 15, color: colors.zinc[300] },
  clearButton: { paddingHorizontal: spacing.sm },
  clearButtonText: { fontSize: 13, color: colors.violet[400], fontWeight: '600' },
  noResults: { alignItems: 'center', paddingVertical: spacing.xxl * 2 },
  noResultsIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  noResultsText: { fontSize: 17, fontWeight: '600', color: colors.white, marginBottom: 4 },
  noResultsHint: { fontSize: 14, color: colors.zinc[500] },
});
