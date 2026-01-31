import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';
import { API_BASE } from '../config';

interface MultiStopProps {
  venueId: number;
}

interface TierConfig {
  color: string;
  accentColor: string;
  label: string;
  emoji: string;
}

const TIER_CONFIG: Record<string, TierConfig> = {
  safe: {
    color: colors.emerald[500],
    accentColor: colors.emerald[400],
    label: 'Safe & Cozy',
    emoji: '🛡️'
  },
  elevated: {
    color: colors.violet[500],
    accentColor: colors.violet[400],
    label: 'Elevated Vibes',
    emoji: '✨'
  },
  wildcard: {
    color: colors.red[500],
    accentColor: colors.red[400],
    label: 'Wildcard Energy',
    emoji: '🎲'
  }
};

export default function MultiStopRecommendations({ venueId }: MultiStopProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRecommendations();
  }, [venueId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/multi-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryVenueId: venueId,
          dateSelection: { type: 'tonight' },
          count: 2, // Request 2 per tier
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.message || 'Could not load recommendations');
      } else {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Multi-stop fetch error:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const refreshTier = async (tier: string) => {
    try {
      setRefreshing(prev => ({ ...prev, [tier]: true }));
      
      const response = await fetch(`${API_BASE}/api/multi-stop/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryVenueId: venueId,
          tier: tier,
          count: 2,
        }),
      });

      const data = await response.json();
      
      if (!data.error && data.recommendations) {
        setRecommendations(prev => ({
          ...prev,
          [tier]: data.recommendations
        }));
      }
    } catch (err) {
      console.error(`Refresh ${tier} error:`, err);
    } finally {
      setRefreshing(prev => ({ ...prev, [tier]: false }));
    }
  };

  const handleVenuePress = (venue: any, type: string) => {
    if (type === 'event') {
      router.push(`/event/${venue.id}`);
    } else {
      router.push(`/venue/${venue.id}`);
    }
  };

  const renderVenueCard = (venue: any, tier: string, index: number) => {
    const config = TIER_CONFIG[tier];
    if (!config || !venue) return null;

    return (
      <TouchableOpacity
        key={`${tier}-${index}`}
        style={[styles.card, { borderColor: config.color }]}
        onPress={() => handleVenuePress(venue.venue, venue.type)}
        activeOpacity={0.8}
      >
        {/* Venue Image */}
        <Image
          source={{ 
            uri: venue.venue.photo || venue.venue.image_url || 'https://via.placeholder.com/300x200'
          }}
          style={styles.venueImage}
        />

        {/* Venue Info */}
        <View style={styles.info}>
          <Text style={styles.venueName} numberOfLines={1}>
            {venue.venue.name}
          </Text>
          
          {venue.venue.cuisine && (
            <Text style={styles.cuisine} numberOfLines={1}>
              {venue.venue.cuisine}
            </Text>
          )}

          {/* AI Reasoning */}
          {venue.reasoning && (
            <View style={[
              styles.reasoningBox, 
              { 
                backgroundColor: `${config.accentColor}20`,
                borderLeftColor: config.accentColor
              }
            ]}>
              <Ionicons name="bulb-outline" size={14} color={config.accentColor} />
              <Text style={[styles.reasoning, { color: config.accentColor }]} numberOfLines={2}>
                {venue.reasoning}
              </Text>
            </View>
          )}

          {/* Travel Time */}
          {venue.travelTime && (
            <View style={styles.travelInfo}>
              <Ionicons name="time-outline" size={12} color={colors.zinc[400]} />
              <Text style={styles.travelTime}>{venue.travelTime}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTierSection = (tier: string, recs: any[]) => {
    const config = TIER_CONFIG[tier];
    if (!config || !recs || recs.length === 0) return null;

    return (
      <View key={tier} style={styles.tierSection}>
        {/* Tier Header */}
        <View style={styles.tierHeader}>
          <View style={styles.tierLabelContainer}>
            <View style={[styles.tierBadge, { backgroundColor: config.color }]}>
              <Text style={styles.tierEmoji}>{config.emoji}</Text>
            </View>
            <Text style={styles.tierLabel}>{config.label}</Text>
          </View>
          
          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: config.color }]}
            onPress={() => refreshTier(tier)}
            disabled={refreshing[tier]}
          >
            {refreshing[tier] ? (
              <ActivityIndicator size="small" color={config.color} />
            ) : (
              <Ionicons name="refresh" size={18} color={config.color} />
            )}
          </TouchableOpacity>
        </View>

        {/* Cards Carousel */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tierCarousel}
          contentContainerStyle={styles.tierCarouselContent}
        >
          {recs.map((rec, idx) => renderVenueCard(rec, tier, idx))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
        <Text style={styles.loadingText}>Finding your next stop...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.red[500]} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!recommendations) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🌆 Continue Your Night</Text>
      <Text style={styles.subtitle}>Choose your vibe for the next stop</Text>

      {renderTierSection('safe', recommendations.safe)}
      {renderTierSection('elevated', recommendations.elevated)}
      {renderTierSection('wildcard', recommendations.wildcard)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginTop: spacing.xl, 
    marginBottom: spacing.lg 
  },
  sectionTitle: { 
    fontSize: typography.sizes.xxl, 
    fontWeight: '700', 
    color: colors.white, 
    marginBottom: spacing.xs, 
    paddingHorizontal: spacing.lg 
  },
  subtitle: { 
    fontSize: typography.sizes.sm, 
    color: colors.zinc[400], 
    marginBottom: spacing.lg, 
    paddingHorizontal: spacing.lg 
  },
  
  // Tier Section
  tierSection: {
    marginBottom: spacing.xl,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tierLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  tierEmoji: {
    fontSize: 16,
  },
  tierLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.white,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.zinc[900],
  },
  
  // Carousel
  tierCarousel: {
    paddingLeft: spacing.lg,
  },
  tierCarouselContent: {
    paddingRight: spacing.lg,
  },
  
  // Card
  card: { 
    width: 240, 
    backgroundColor: colors.zinc[900], 
    borderRadius: 12, 
    marginRight: spacing.md, 
    borderWidth: 2, 
    overflow: 'hidden',
  },
  venueImage: { 
    width: '100%', 
    height: 140, 
    backgroundColor: colors.zinc[800] 
  },
  info: { 
    padding: spacing.sm 
  },
  venueName: { 
    fontSize: typography.sizes.md, 
    fontWeight: '700', 
    color: colors.white, 
    marginBottom: 2,
  },
  cuisine: { 
    fontSize: typography.sizes.xs, 
    color: colors.zinc[400], 
    marginBottom: spacing.xs 
  },
  reasoningBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    padding: spacing.xs, 
    borderRadius: 6, 
    marginBottom: spacing.xs,
    borderLeftWidth: 2,
  },
  reasoning: { 
    fontSize: 11, 
    marginLeft: spacing.xs, 
    flex: 1, 
    lineHeight: 14,
    fontWeight: '500',
  },
  travelInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  travelTime: { 
    fontSize: 11, 
    color: colors.zinc[400], 
    marginLeft: 4,
  },
  
  // Loading/Error
  loadingContainer: { 
    padding: spacing.xxl, 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: spacing.md, 
    fontSize: typography.sizes.sm, 
    color: colors.zinc[400] 
  },
  errorContainer: { 
    padding: spacing.xxl, 
    alignItems: 'center' 
  },
  errorText: { 
    marginTop: spacing.md, 
    fontSize: typography.sizes.sm, 
    color: colors.red[500], 
    textAlign: 'center' 
  },
});
