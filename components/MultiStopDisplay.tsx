import React, { useState } from 'react';
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
import { typography, spacing } from '../theme';

interface MultiStopDisplayProps {
  primaryVenueId: number;
  primaryVenueName: string;
  safe: any[];
  elevated: any[];
  wildcard: any[];
  onRefresh?: (tier: string) => Promise<void>;
}

interface TierConfig {
  color: string;
  accentColor: string;
  label: string;
  emoji: string;
}

const TIER_CONFIG: Record<string, TierConfig> = {
  safe: {
    color: '#10b981',
    accentColor: '#34d399',
    label: 'Safe & Cozy',
    emoji: '🛡️'
  },
  elevated: {
    color: '#8b5cf6',
    accentColor: '#a78bfa',
    label: 'Elevated Vibes',
    emoji: '✨'
  },
  wildcard: {
    color: '#ef4444',
    accentColor: '#f87171',
    label: 'Wildcard Energy',
    emoji: '🎲'
  }
};

export default function MultiStopDisplay({
  primaryVenueId,
  primaryVenueName,
  safe,
  elevated,
  wildcard,
  onRefresh
}: MultiStopDisplayProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const recommendations = { safe, elevated, wildcard };

  const handleVenuePress = (venue: any, type: string) => {
    if (type === 'event') {
      router.push(`/event/${venue.id}`);
    } else {
      router.push(`/venue/${venue.id}`);
    }
  };

  const handleRefreshTier = async (tier: string) => {
    if (!onRefresh) return;
    
    setRefreshing(prev => ({ ...prev, [tier]: true }));
    try {
      await onRefresh(tier);
    } finally {
      setRefreshing(prev => ({ ...prev, [tier]: false }));
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
        <Image
          source={{ 
            uri: venue.venue?.photo || venue.venue?.image_url || 'https://via.placeholder.com/240x140'
          }}
          style={styles.venueImage}
        />

        <View style={styles.info}>
          <Text style={styles.venueName} numberOfLines={1}>
            {venue.venue?.name || 'Venue'}
          </Text>
          
          {venue.venue?.cuisine && (
            <Text style={styles.cuisine} numberOfLines={1}>
              {venue.venue.cuisine}
            </Text>
          )}

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

          {venue.travelTime && (
            <View style={styles.travelInfo}>
              <Ionicons name="time-outline" size={12} color="#a1a1aa" />
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
        <View style={styles.tierHeader}>
          <View style={styles.tierLabelContainer}>
            <View style={[styles.tierBadge, { backgroundColor: config.color }]}>
              <Text style={styles.tierEmoji}>{config.emoji}</Text>
            </View>
            <Text style={styles.tierLabel}>{config.label}</Text>
          </View>
          
          {onRefresh && (
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: config.color }]}
              onPress={() => handleRefreshTier(tier)}
              disabled={refreshing[tier]}
            >
              {refreshing[tier] ? (
                <ActivityIndicator size="small" color={config.color} />
              ) : (
                <Ionicons name="refresh" size={18} color={config.color} />
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tierCarousel}
          contentContainerStyle={styles.tierCarouselContent}
        >
          {(recs || []).map((rec, idx) => renderVenueCard(rec, tier, idx))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🌆 Continue from {primaryVenueName}</Text>
      
      {renderTierSection('safe', recommendations.safe || [])}
      {renderTierSection('elevated', recommendations.elevated || [])}
      {renderTierSection('wildcard', recommendations.wildcard || [])}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginTop: spacing.md, 
    marginBottom: spacing.lg 
  },
  sectionTitle: { 
    fontSize: typography.sizes.lg, 
    fontWeight: '700', 
    color: '#ffffff', 
    marginBottom: spacing.lg, 
    paddingHorizontal: spacing.md 
  },
  
  tierSection: {
    marginBottom: spacing.lg,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tierLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  tierEmoji: {
    fontSize: 14,
  },
  tierLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: '#ffffff',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
  
  tierCarousel: {
    paddingLeft: spacing.md,
  },
  tierCarouselContent: {
    paddingRight: spacing.md,
  },
  
  card: { 
    width: 220, 
    backgroundColor: '#18181b', 
    borderRadius: 12, 
    marginRight: spacing.sm, 
    borderWidth: 2, 
    overflow: 'hidden',
  },
  venueImage: { 
    width: '100%', 
    height: 130, 
    backgroundColor: '#27272a' 
  },
  info: { 
    padding: spacing.sm 
  },
  venueName: { 
    fontSize: typography.sizes.md, 
    fontWeight: '700', 
    color: '#ffffff', 
    marginBottom: 2,
  },
  cuisine: { 
    fontSize: typography.sizes.xs, 
    color: '#a1a1aa', 
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
    color: '#a1a1aa', 
    marginLeft: 4,
  },
});
