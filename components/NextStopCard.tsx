import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { trackBehavior } from '../lib/api';

interface NextStopProps {
  stop: {
    id: string | number;
    name: string;
    full_name?: string;
    category: string;
    image_url?: string;
    travel_time?: number;
    transport_mode?: 'walk' | 'rideshare';
    transition_message?: string;
    venue_insight?: string;
    compatibility_score?: number;
  };
  getImage: (stop: any) => string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  lounge: 'Lounge',
  bar: 'Bar',
  cocktail_bar: 'Cocktails',
  rooftop: 'Rooftop',
  club: 'Club',
  night_club: 'Club',
  nightclub: 'Club',
  diner: 'Late Night Eats',
  cafe: 'Café',
  wine_bar: 'Wine Bar',
};

export default function NextStopCard({ stop, getImage }: NextStopProps) {
  const stopImage = getImage(stop);
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackBehavior(Number(stop.id), 'view', 'next_stop');
    router.push(`/venue/${stop.id}`);
  };

  const getTravelIcon = () => {
    if (stop.transport_mode === 'rideshare') return 'car-outline';
    return 'walk-outline';
  };

  const getTravelText = () => {
    if (!stop.travel_time) return null;
    const mode = stop.transport_mode === 'rideshare' ? 'ride' : 'walk';
    return `${stop.travel_time} min ${mode}`;
  };

  // Normalize category safely
  const categoryKey = stop.category?.toLowerCase?.() || '';
  const categoryLabel = CATEGORY_LABELS[categoryKey] || 'Venue';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {stopImage ? (
          <Image
            source={{ uri: stopImage.startsWith('/') ? `https://lumina.viberyte.com${stopImage}` : stopImage }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="location" size={24} color="#6B7280" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
        />
        
        {/* Travel badge */}
        {stop.travel_time && (
          <View style={styles.travelBadge}>
            <Ionicons name={getTravelIcon()} size={12} color="#FFFFFF" />
            <Text style={styles.travelText}>{getTravelText()}</Text>
          </View>
        )}
      </View>
      
      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{stop.name}</Text>
        <Text style={styles.category}>{categoryLabel}</Text>
        
        {/* Transition message - voice personalized (primary) */}
        {stop.transition_message && (
          <View style={styles.transitionRow}>
            <View style={styles.transitionAccent} />
            <Text style={styles.transitionMessage} numberOfLines={2}>
              {stop.transition_message}
            </Text>
          </View>
        )}
        
        {/* Venue insight - time aware */}
        {stop.venue_insight && (
          <View style={styles.insightRow}>
            <Ionicons name="sparkles" size={12} color="#8B5CF6" />
            <Text style={styles.insightText} numberOfLines={1}>
              {stop.venue_insight}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: '#16161F',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  imageContainer: {
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F1F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  travelBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  travelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  info: {
    padding: 12,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  category: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    gap: 6,
  },
  transitionAccent: {
    width: 2,
    height: '100%',
    minHeight: 16,
    backgroundColor: '#8B5CF6',
    borderRadius: 1,
  },
  transitionMessage: {
    flex: 1,
    fontSize: 12,
    color: '#E5E7EB',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  insightText: {
    flex: 1,
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '500',
  },
});
