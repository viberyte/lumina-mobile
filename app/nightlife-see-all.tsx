import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from '../components/LoadingScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // 2 columns with gap
const CARD_HEIGHT = 200;

const API_BASE = 'https://viberyte.com';

interface Venue {
  id: number;
  name: string;
  image_url: string | null;
  neighborhood: string | null;
  city: string;
  vibe_tags: string[];
  rating: number | null;
  energy_level: string | null;
}

interface SeeAllData {
  mode: string;
  row: string;
  title: string;
  emoji: string;
  city: string;
  mood_active: string;
  areas_included: string[];
  total_venues: number;
  venues: Venue[];
}

// Venue Card Component
const VenueCard = ({ 
  venue, 
  onPress 
}: { 
  venue: Venue; 
  onPress: () => void;
}) => {
  const imageUrl = venue.image_url?.startsWith('/') 
    ? `${API_BASE}${venue.image_url}` 
    : venue.image_url;

  const displayTags = venue.vibe_tags?.slice(0, 2) || [];
  
  // Show city if not Manhattan
  const locationText = venue.neighborhood 
    ? `${venue.neighborhood}${venue.city && venue.city !== 'Manhattan' ? `, ${venue.city}` : ''}`
    : venue.city;

  return (
    <Pressable 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.venueCard,
        pressed && styles.venueCardPressed
      ]}
    >
      <View style={styles.venueImageContainer}>
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.venueImage} 
            contentFit="cover" 
            transition={200} 
          />
        ) : (
          <LinearGradient
            colors={['#1a1a1a', '#0d0d0d']}
            style={styles.venueImagePlaceholder}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.venueImageGradient}
        />
        
        {/* Vibe tags overlay */}
        {displayTags.length > 0 && (
          <View style={styles.vibeTagsOverlay}>
            {displayTags.map((tag, idx) => (
              <View key={idx} style={styles.vibeTag}>
                <Text style={styles.vibeTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.venueInfo}>
        <Text style={styles.venueName} numberOfLines={2}>{venue.name}</Text>
        {locationText && (
          <Text style={styles.venueLocation} numberOfLines={1}>{locationText}</Text>
        )}
      </View>
    </Pressable>
  );
};

export default function NightlifeSeeAll() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    row: string;
    title: string;
    emoji: string;
    city: string;
    mood: string;
  }>();

  const [data, setData] = useState<SeeAllData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      const url = `${API_BASE}/api/nightlife?row=${params.row}&city=${encodeURIComponent(params.city || 'Manhattan')}&world=${params.world || 'all'}&limit=100`;
      console.log('[NightlifeSeeAll] Fetching:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        console.log('[NightlifeSeeAll] Got', result.total_venues, 'venues');
        setData(result);
      }
    } catch (error) {
      console.log('[NightlifeSeeAll] Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.row, params.city, params.mood]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const goToVenue = (venue: Venue) => {
    router.push(`/venue/${venue.id}`);
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loading && !data) {
    return <LoadingScreen />;
  }

  // Format areas string
  const areasText = data?.areas_included?.length 
    ? data.areas_included.join(' • ')
    : params.city || 'Manhattan';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>{params.emoji || '🌙'}</Text>
            <Text style={styles.title}>{params.title || 'Nightlife'}</Text>
          </View>
          <Text style={styles.areasText}>{areasText}</Text>
        </View>
        
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{data?.total_venues || 0}</Text>
        </View>
      </View>

      {/* Venue Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.violet[500]}
          />
        }
      >
        <View style={styles.grid}>
          {data?.venues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onPress={() => goToVenue(venue)}
            />
          ))}
        </View>
        
        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.3,
  },
  areasText: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.violet[400],
  },
  // Grid
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    padding: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Venue Card
  venueCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  venueCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  venueImageContainer: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: '100%',
  },
  venueImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  venueImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  vibeTagsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  vibeTag: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  vibeTagText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  venueInfo: {
    padding: 10,
    gap: 4,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 18,
  },
  venueLocation: {
    fontSize: 12,
    color: colors.zinc[500],
  },
});
