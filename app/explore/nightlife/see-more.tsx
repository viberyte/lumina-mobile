// @deprecated — replaced by /see-all.tsx
import { Image } from 'expo-image';
// Do not add new logic here

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../../theme';
import luminaApi from '../../../services/luminaApi';

interface Venue {
  id: number;
  name: string;
  cuisine?: string;
  photo_url?: string;
  rating?: number;
  price_level?: string;
  neighborhood?: string;
  vibe?: string;
  music_vibe?: string;
}

const SUBCATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Afrobeats', value: 'afrobeats' },
  { label: 'Hip-Hop', value: 'hip-hop' },
  { label: 'Latin', value: 'latin' },
  { label: 'EDM', value: 'edm' },
  { label: 'R&B', value: 'rnb' },
  { label: 'Reggae', value: 'reggae' },
  { label: 'House', value: 'house' },
  { label: 'Live Music', value: 'live-music' },
];

export default function NightlifeSeeMore() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const category = params.category as string;
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const data = await luminaApi.getVenues('Manhattan');
      
      // Filter by main category
      let filtered = data.filter((v: Venue) => {
        const vibe = v.vibe?.toLowerCase() || '';
        const musicVibe = v.music_vibe?.toLowerCase() || '';
        
        switch(category) {
          case 'trending-now':
            return v.rating && v.rating >= 4.3;
          case 'upscale-lounges':
            return vibe.includes('upscale') && vibe.includes('lounge');
          case 'trendy-lounges':
            return vibe.includes('trendy') && vibe.includes('lounge');
          case 'rooftops':
            return vibe.includes('rooftop');
          case 'date-night':
            return vibe.includes('date') || vibe.includes('romantic');
          case 'intimate-lounges':
            return vibe.includes('intimate') && vibe.includes('lounge');
          case 'late-night':
            return vibe.includes('late night') || vibe.includes('club');
          default:
            return true;
        }
      });

      setVenues(filtered);
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = selectedSubcategory === 'all' 
    ? venues 
    : venues.filter(v => {
        const musicVibe = v.music_vibe?.toLowerCase() || '';
        return musicVibe.includes(selectedSubcategory.replace('-', ' '));
      });

  const getCategoryTitle = () => {
    switch(category) {
      case 'trending-now': return 'Trending Now';
      case 'upscale-lounges': return 'Upscale Lounges';
      case 'trendy-lounges': return 'Trendy Lounges';
      case 'rooftops': return 'Rooftop Venues';
      case 'date-night': return 'Date Night Spots';
      case 'intimate-lounges': return 'Intimate Lounges';
      case 'late-night': return 'Late Night Spots';
      default: return 'Nightlife';
    }
  };

  const renderVenueCard = (venue: Venue) => (
    <TouchableOpacity
      key={venue.id}
      style={styles.card}
      onPress={() => router.push(`/venue/${venue.id}`)}
    >
      <Image
        source={{ uri: venue.photo_url || 'https://via.placeholder.com/400' }}
        style={styles.cardImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.cardGradient}
      />
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{venue.name}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {venue.neighborhood || venue.cuisine}
        </Text>
        
        <View style={styles.cardMeta}>
          {venue.rating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={colors.yellow[400]} />
              <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
            </View>
          )}
          {venue.price_level && (
            <Text style={styles.priceText}>{venue.price_level}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getCategoryTitle()}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Subcategory Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {SUBCATEGORIES.map((sub) => (
          <TouchableOpacity
            key={sub.value}
            style={[
              styles.filterChip,
              selectedSubcategory === sub.value && styles.filterChipActive
            ]}
            onPress={() => setSelectedSubcategory(sub.value)}
          >
            <Text style={[
              styles.filterChipText,
              selectedSubcategory === sub.value && styles.filterChipTextActive
            ]}>
              {sub.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredVenues.length} {filteredVenues.length === 1 ? 'venue' : 'venues'}
      </Text>

      {/* Grid */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {filteredVenues.map(renderVenueCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.zinc[950],
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.zinc[950],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    backgroundColor: colors.zinc[950],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.white,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.zinc[900],
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  filterChipActive: {
    backgroundColor: colors.violet[600],
    borderColor: colors.violet[500],
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  filterChipTextActive: {
    color: colors.white,
  },
  resultsCount: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[500],
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
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
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[400],
    marginBottom: spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.zinc[900] + '90',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.white,
  },
  priceText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.green[400],
  },
});
