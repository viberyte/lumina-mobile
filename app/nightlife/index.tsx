import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, 
  Image, Dimensions, Animated, Platform, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import colors from '../../constants/colors';
import luminaApi from '../../services/lumina';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;

const NIGHTLIFE_CATEGORIES = [
  { emoji: '🛋️', name: 'Lounges', key: 'lounges', gradient: ['#7B2CBF', '#9D4EDD'] },
  { emoji: '🍸', name: 'Bars', key: 'bars', gradient: ['#3A86FF', '#8338EC'] },
  { emoji: '🕺', name: 'Clubs', key: 'clubs', gradient: ['#FF006E', '#FB5607'] },
  { emoji: '🌃', name: 'Rooftops', key: 'rooftop', gradient: ['#1D3557', '#457B9D'] },
  { emoji: '🌙', name: 'Late Night', key: 'late-night', gradient: ['#0F172A', '#334155'] },
  { emoji: '🌴', name: 'Caribbean', key: 'caribbean', gradient: ['#00A86B', '#2DD4BF'] },
  { emoji: '🌶️', name: 'Latin', key: 'latin', gradient: ['#D62828', '#F77F00'] },
  { emoji: '🇩🇴', name: 'Dominican', key: 'dominican', gradient: ['#1E40AF', '#DC2626'] },
  { emoji: '🎶', name: 'Afrobeats', key: 'afrobeats', gradient: ['#2D6A4F', '#40916C'] },
  { emoji: '🎤', name: 'Hip-Hop', key: 'hiphop', gradient: ['#6D3A0A', '#A44A3F'] },
  { emoji: '🎷', name: 'R&B / Jazz', key: 'rnb-jazz', gradient: ['#4A1942', '#8B5CF6'] },
  { emoji: '💨', name: 'Hookah', key: 'hookah', gradient: ['#18081a', '#6B21A8'] },
];

const NIGHTLIFE_ROWS = [
  { title: "🔥 Saturday's Moves", filter: 'trending', sort: 'viberyte_score' },
  { title: '🛋️ Lounges', filter: 'lounges', sort: 'rating' },
  { title: '🍸 Bars', filter: 'bars', sort: 'rating' },
  { title: '🕺 Clubs', filter: 'clubs', sort: 'viberyte_score' },
  { title: '🌃 Rooftops', filter: 'rooftop', sort: 'rating' },
  { title: '🌙 Late Night', filter: 'late-night', sort: 'rating' },
  { title: '🌴 Caribbean Vibes', filter: 'caribbean', sort: 'rating' },
  { title: '🌶️ Latin Vibes', filter: 'latin', sort: 'rating' },
  { title: '🇩🇴 Dominican Vibes', filter: 'dominican', sort: 'rating' },
  { title: '🎶 Afrobeats', filter: 'afrobeats', sort: 'viberyte_score' },
  { title: '💨 Hookah Lounges', filter: 'hookah', sort: 'rating' },
];

export default function NightlifeScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const data = await luminaApi.getVenues('Manhattan');
      const nightlifeVenues = data.filter((v: any) => 
        v.category === 'nightlife' || 
        v.category === 'lounge' || 
        v.category === 'bar' ||
        v.category === 'club'
      );
      setVenues(nightlifeVenues);
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check lounge_type match
  const matchesLoungeType = (venue: any, ...types: string[]) => {
    const loungeType = (venue.lounge_type || '').toLowerCase();
    return types.some(t => loungeType.includes(t.toLowerCase()));
  };

  // Helper to check vibe_culture match
  const matchesVibeCulture = (venue: any, ...cultures: string[]) => {
    const vibeCulture = (venue.vibe_culture || '').toLowerCase();
    const musicGenres = (venue.music_genres || venue.music_genre || '').toLowerCase();
    const vibeTags = (venue.vibe_tags || '').toLowerCase();
    return cultures.some(c =>
      vibeCulture.includes(c.toLowerCase()) ||
      musicGenres.includes(c.toLowerCase()) ||
      vibeTags.includes(c.toLowerCase())
    );
  };

  // Helper to check special_features for hookah
  const hasHookah = (venue: any) => {
    const specialFeatures = venue.special_features || '';
    const loungeType = (venue.lounge_type || '').toLowerCase();
    if (typeof specialFeatures === 'string') {
      return specialFeatures.toLowerCase().includes('hookah') || loungeType.includes('hookah');
    }
    return specialFeatures?.has_hookah === true || loungeType.includes('hookah');
  };

  // Build featured rows
  const featuredRows = useMemo(() => {
    return NIGHTLIFE_ROWS.map(row => {
      let filtered = [...venues];

      switch (row.filter) {
        case 'trending':
          filtered = filtered.sort((a, b) => (b.viberyte_score || 0) - (a.viberyte_score || 0));
          break;
        case 'lounges':
          filtered = filtered.filter(v =>
            v.category === 'lounge' ||
            matchesLoungeType(v, 'lounge', 'upscale-lounge', 'cocktail-lounge', 'chill-lounge')
          );
          break;
        case 'bars':
          filtered = filtered.filter(v =>
            v.category === 'bar' ||
            matchesLoungeType(v, 'bar', 'cocktail-bar', 'wine-bar', 'sports-bar', 'dive-bar')
          );
          break;
        case 'clubs':
          filtered = filtered.filter(v =>
            v.category === 'club' ||
            matchesLoungeType(v, 'club', 'nightclub', 'dance-club')
          );
          break;
        case 'rooftop':
          filtered = filtered.filter(v =>
            matchesLoungeType(v, 'rooftop') ||
            v.name?.toLowerCase().includes('rooftop')
          );
          break;
        case 'late-night':
          filtered = filtered.filter(v =>
            v.late_night_spot === 1 ||
            matchesLoungeType(v, 'late-night') ||
            v.vibe_tags?.includes('late-night') ||
            v.vibe_tags?.includes('after-hours')
          );
          break;
        case 'caribbean':
          filtered = filtered.filter(v =>
            matchesVibeCulture(v, 'caribbean', 'reggae', 'soca', 'dancehall')
          );
          break;
        case 'latin':
          filtered = filtered.filter(v =>
            matchesVibeCulture(v, 'latin', 'salsa', 'reggaeton', 'bachata')
          );
          break;
        case 'dominican':
          filtered = filtered.filter(v =>
            matchesVibeCulture(v, 'dominican', 'dembow', 'bachata')
          );
          break;
        case 'afrobeats':
          filtered = filtered.filter(v =>
            matchesVibeCulture(v, 'afrobeats', 'afro', 'amapiano')
          );
          break;
        case 'hookah':
          filtered = filtered.filter(v => hasHookah(v));
          break;
        case 'hiphop':
          filtered = filtered.filter(v =>
            matchesVibeCulture(v, 'hip-hop', 'hiphop', 'rap')
          );
          break;
        case 'rnb-jazz':
          filtered = filtered.filter(v =>
            matchesVibeCulture(v, 'r&b', 'rnb', 'jazz', 'soul') ||
            matchesLoungeType(v, 'jazz-lounge')
          );
          break;
      }

      // Sort by rating for non-trending rows
      if (row.filter !== 'trending' && row.sort === 'rating') {
        filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      return { ...row, data: filtered.slice(0, 15) };
    }).filter(row => row.data.length > 0);
  }, [venues]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return venues.filter(v => 
      v.name?.toLowerCase().includes(query) ||
      v.neighborhood?.toLowerCase().includes(query) ||
      v.music_genre?.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [venues, searchQuery]);

  // Parallax header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [160, 100],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Render venue card
  const renderVenueCard = (venue: any, index: number) => (
    <TouchableOpacity
      key={venue.id}
      style={styles.venueCard}
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/venue/${venue.id}`);
      }}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: venue.professional_photo_url || venue.image_url || 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2' }}
        style={styles.venueImage}
      />
      <LinearGradient 
        colors={['transparent', 'rgba(0,0,0,0.9)']} 
        style={styles.venueGradient} 
      />
      <View style={styles.venueInfo}>
        <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
        <Text style={styles.venueNeighborhood} numberOfLines={1}>
          {venue.neighborhood}
        </Text>
        <View style={styles.venueRating}>
          <Ionicons name="star" size={12} color={colors.amber[500]} />
          <Text style={styles.venueRatingText}>{venue.rating?.toFixed(1) || '4.5'}</Text>
          {venue.music_genre && (
            <Text style={styles.venueGenre} numberOfLines={1}>• {venue.music_genre}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render category tile
  const renderCategoryTile = (cat: typeof NIGHTLIFE_CATEGORIES[0], index: number) => (
    <TouchableOpacity
      key={cat.key}
      style={styles.categoryTile}
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/nightlife/${cat.key}`);
      }}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={cat.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.categoryGradient}
      >
        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
        <Text style={styles.categoryName}>{cat.name}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Render row
  const renderRow = (row: { title: string; data: any[]; filter: string }) => {
    if (row.data.length === 0) return null;
    
    return (
      <View key={row.title} style={styles.rowContainer}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <TouchableOpacity onPress={() => router.push(`/nightlife/${row.filter}`)}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 12}
          contentContainerStyle={styles.rowScroll}
        >
          {row.data.map((venue, idx) => renderVenueCard(venue, idx))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a1a', '#1a0a2e', '#0a0a1a']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Animated.View style={{ opacity: headerOpacity }}>
          <Text style={styles.headerTitle}>🌃 Nightlife</Text>
          <Text style={styles.headerSubtitle}>Lounges, Clubs & Rooftops</Text>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search venues, vibes, music..."
            placeholderTextColor={colors.gray[500]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Content */}
      {searchQuery.length > 0 ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.searchResultsTitle}>
            {searchResults.length} results for "{searchQuery}"
          </Text>
          <View style={styles.searchResultsGrid}>
            {searchResults.map((venue, idx) => renderVenueCard(venue, idx))}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <Animated.ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Category Grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse by Vibe</Text>
          </View>
          <View style={styles.categoryGrid}>
            {NIGHTLIFE_CATEGORIES.map((cat, idx) => renderCategoryTile(cat, idx))}
          </View>

          {/* Featured Rows */}
          {featuredRows.map(row => renderRow(row))}

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.gray[400],
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 32,
  },
  categoryTile: {
    width: (SCREEN_WIDTH - 52) / 3,
    height: 90,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  rowContainer: {
    marginBottom: 28,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  rowTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C77DFF',
  },
  rowScroll: {
    paddingLeft: 20,
    paddingRight: 8,
    gap: 12,
  },
  venueCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.gray[800],
  },
  venueImage: {
    width: '100%',
    height: '100%',
  },
  venueGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  venueInfo: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  venueName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  venueNeighborhood: {
    fontSize: 12,
    color: colors.gray[300],
    marginBottom: 6,
  },
  venueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueRatingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  venueGenre: {
    fontSize: 11,
    color: colors.gray[400],
    marginLeft: 4,
    flex: 1,
  },
  searchResultsTitle: {
    fontSize: 16,
    color: colors.gray[400],
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
});
