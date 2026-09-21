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
  restaurant: 'Restaurant', lounge: 'Lounge', bar: 'Bar',
  cocktail_bar: 'Cocktails', rooftop: 'Rooftop', club: 'Club',
  night_club: 'Club', nightclub: 'Club', diner: 'Late Night',
  cafe: 'Café', wine_bar: 'Wine Bar',
};

export default function NextStopCard({ stop, getImage }: NextStopProps) {
  const stopImage = getImage(stop);
  const categoryLabel = CATEGORY_LABELS[stop.category?.toLowerCase?.() || ''] || 'Venue';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackBehavior(Number(stop.id), 'view', 'next_stop');
    router.push(`/venue/${stop.id}`);
  };

  const travelText = stop.travel_time
    ? `${stop.travel_time} min ${stop.transport_mode === 'rideshare' ? 'ride' : 'walk'}`
    : null;

  const travelIcon = stop.transport_mode === 'rideshare' ? 'car' : 'walk';

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.88}>
      <View style={styles.imageWrap}>
        {stopImage ? (
          <Image
            source={{ uri: stopImage.startsWith('/') ? `https://viberyte.com${stopImage}` : stopImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.imagePlaceholder]}>
            <Ionicons name="location" size={22} color="#4B5563" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
        />
        {travelText && (
          <View style={styles.travelBadge}>
            <Ionicons name={travelIcon} size={11} color="#fff" />
            <Text style={styles.travelText}>{travelText}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{stop.name}</Text>
        <Text style={styles.category}>{categoryLabel}</Text>
        {stop.transition_message ? (
          <Text style={styles.message} numberOfLines={2}>{stop.transition_message}</Text>
        ) : null}
        {stop.venue_insight ? (
          <Text style={styles.insight} numberOfLines={1}>{stop.venue_insight}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 195,
    marginRight: 14,
    borderRadius: 14,
    backgroundColor: '#111115',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  imageWrap: {
    height: 130,
    backgroundColor: '#1a1a22',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  travelBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  travelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  info: {
    padding: 12,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  category: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 17,
    marginTop: 6,
  },
  insight: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
});
