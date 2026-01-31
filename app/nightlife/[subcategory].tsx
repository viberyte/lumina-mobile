import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, 
  Image, Dimensions, Animated, Platform, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import colors from '../../constants/colors';
import luminaApi from '../../services/lumina';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;

const SUBCATEGORY_CONFIG: Record<string, { emoji: string; name: string; gradient: string[]; filters: string[] }> = {
  'upscale': { 
    emoji: '💎', 
    name: 'Upscale Lounges', 
    gradient: ['#7B2CBF', '#9D4EDD'],
    filters: ['upscale', 'luxury', 'vip']
  },
  'chill': { 
    emoji: '☁️', 
    name: 'Chill Vibes', 
    gradient: ['#3A86FF', '#8338EC'],
    filters: ['chill', 'cozy', 'laid-back', 'relaxed']
  },
  'high-energy': { 
    emoji: '🕺', 
    name: 'High-Energy Clubs', 
    gradient: ['#FF006E', '#FB5607'],
    filters: ['high-energy', 'club', 'dance']
  },
  'rooftop': { 
    emoji: '🌃', 
    name: 'Rooftop Bars', 
    gradient: ['#1D3557', '#457B9D'],
    filters: ['rooftop', 'skyline', 'outdoor']
  },
  'date-night': { 
    emoji: '❤️', 
    name: 'Date Night Spots', 
    gradient: ['#E63946', '#F4A261'],
    filters: ['date-night', 'romantic', 'intimate']
  },
  'afrobeats': { 
    emoji: '🎶', 
    name: 'Afrobeats Lounges', 
    gradient: ['#2D6A4F', '#40916C'],
    filters: ['afrobeats', 'afro']
  },
  'edm': { 
    emoji: '🎧', 
    name: 'EDM & House', 
    gradient: ['#7209B7', '#3A0CA3'],
    filters: ['edm', 'house', 'techno', 'electronic']
  },
  'hiphop': { 
    emoji: '🎤', 
    name: 'Hip-Hop Venues', 
    gradient: ['#6D3A0A', '#A44A3F'],
    filters: ['hip-hop', 'hiphop', 'rap']
  },
  'aesthetic': { 
    emoji: '📸', 
    name: 'Instagram-Worthy', 
    gradient: ['#F72585', '#B5179E'],
    filters: ['aesthetic', 'instagram', 'photogenic', 'trendy']
  },
  'bottle-service': { 
    emoji: '🍾', 
    name: 'Bottle Service', 
    gradient: ['#FFD700', '#FFA500'],
    filters: ['bottle-service', 'vip', 'table-service']
  },
  'brunch': { 
    emoji: '🥂', 
    name: 'Brunch Lounges', 
    gradient: ['#F9C74F', '#F8961E'],
    filters: ['brunch', 'day-party']
  },
  'live-music': { 
    emoji: '🎵', 
    name: 'Live Music', 
    gradient: ['#E63946', '#1D3557'],
    filters: ['live-music', 'live', 'band', 'jazz']
  },
  'trending': { 
    emoji: '🔥', 
    name: 'Trending Nightlife', 
    gradient: ['#FF6B35', '#F7931A'],
    filters: []
  },
};

export default function NightlifeSubcategoryScreen() {
  const router = useRouter();
  const { subcategory } = useLocalSearchParams<{ subcategory: string }>();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const config = SUBCATEGORY_CONFIG[subcategory || ''] || { 
    emoji: '🌃', 
    name: subcategory || 'Nightlife', 
    gradient: ['#7B2CBF', '#9D4EDD'],
    filters: [subcategory || '']
  };

  useEffect(() => {
    fetchVenues();
  }, [subcategory]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const data = await luminaApi.getVenues('Manhattan');
      
      // Filter for nightlife venues
      let nightlifeVenues = data.filter((v: any) => 
        v.category === 'nightlife' || 
        v.category === 'lounge' || 
        v.category === 'bar' ||
        v.category === 'club'
      );

      // Apply subcategory filters
      if (subcategory === 'trending') {
        nightlifeVenues = nightlifeVenues.sort((a: any, b: any) => 
          (b.viberyte_score || 0) - (a.viberyte_score || 0)
        );
      } else if (config.filters.length > 0) {
        nightlifeVenues = nightlifeVenues.filter((v: any) => {
          const vibeTags = v.vibe_tags || [];
          const musicGenre = v.music_genre?.toLowerCase() || '';
          const name = v.name?.toLowerCase() || '';
          
          return config.filters.some(filter => 
            vibeTags.includes(filter) ||
            musicGenre.includes(filter) ||
            name.includes(filter)
          );
        });
      }

      setVenues(nightlifeVenues);
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build Netflix-style rows
  const venueRows = useMemo(() => {
    const rows = [
      { 
        title: `🔥 Top ${config.name}`, 
        data: [...venues].sort((a, b) => (b.viberyte_score || 0) - (a.viberyte_score || 0)).slice(0, 15) 
      },
      { 
        title: `🌟 Highest Rated`, 
        data: [...venues].filter(v => (v.rating || 0) >= 4.3).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 15) 
      },
      { 
        title: `💎 Premium Picks`, 
        data: venues.filter(v => v.price_level >= 3).slice(0, 15) 
      },
      { 
        title: `📍 Manhattan`, 
        data: venues.filter(v => v.neighborhood?.toLowerCase().includes('manhattan') || v.city?.toLowerCase().includes('manhattan')).slice(0, 15) 
      },
      { 
        title: `📍 Brooklyn`, 
        data: venues.filter(v => v.neighborhood?.toLowerCase().includes('brooklyn') || v.city?.toLowerCase().includes('brooklyn')).slice(0, 15) 
      },
    ];
    return rows.filter(row => row.data.length > 0);
  }, [venues, config.name]);

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
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
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
        <Text style={styles.venueNeighborhood} numberOfLines={1}>{venue.neighborhood}</Text>
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

  // Render row
  const renderRow = (row: { title: string; data: any[] }) => {
    if (row.data.length === 0) return null;
    
    return (
      <View key={row.title} style={styles.rowContainer}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{row.title}</Text>
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
        colors={[config.gradient[0] + '60', config.gradient[1] + '30', '#0a0a1a'] as any}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Animated.View style={{ opacity: headerOpacity }}>
          <Text style={styles.headerTitle}>{config.emoji} {config.name}</Text>
          <Text style={styles.headerSubtitle}>{venues.length} venues</Text>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search venues..."
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
      </View>

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
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{venues.length}</Text>
              <Text style={styles.statLabel}>Venues</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {venues.filter(v => (v.rating || 0) >= 4.5).length}
              </Text>
              <Text style={styles.statLabel}>Top Rated</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {venues.filter(v => v.price_level >= 3).length}
              </Text>
              <Text style={styles.statLabel}>Premium</Text>
            </View>
          </View>

          {/* Netflix Rows */}
          {venueRows.map(row => renderRow(row))}

          {/* Full Grid */}
          <View style={styles.fullGridHeader}>
            <Text style={styles.fullGridTitle}>All {config.name}</Text>
          </View>
          <View style={styles.fullGrid}>
            {venues.slice(0, 30).map((venue, idx) => renderVenueCard(venue, idx))}
          </View>

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
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray[400],
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rowContainer: {
    marginBottom: 28,
  },
  rowHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  rowTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
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
  fullGridHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  fullGridTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  fullGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
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
