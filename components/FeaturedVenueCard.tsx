import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getPhotoUrl } from '../utils/photoHelper';
import favoritesService from '../services/favorites';

const { width } = Dimensions.get('window');

interface FeaturedVenueCardProps {
  venue: any;
  cardWidth?: number;
  cardHeight?: number;
  isVisible?: boolean;
  isNearby?: boolean;
}

function ReelPlayer({ uri, playing = false, preload = false }: { uri: string; playing?: boolean; preload?: boolean }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = true;
    // Don't autoplay — wait for playing prop
  });

  useEffect(() => {
    if (playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [playing]);

  // Only render VideoView if playing or preloading
  if (!playing && !preload) return null;

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export default function FeaturedVenueCard({ venue, cardWidth, cardHeight, isVisible = false, isNearby = false }: FeaturedVenueCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = React.useState(false);

  React.useEffect(() => {
    favoritesService.isFavorite(venue.id).then(setFavorited);
  }, [venue.id]);

  const handleFavorite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (favorited) {
      await favoritesService.removeFavorite(venue.id);
      setFavorited(false);
    } else {
      await favoritesService.addFavorite(venue);
      setFavorited(true);
    }
  };

  const photoUrl = getPhotoUrl(venue);
  const [reelUrl, setReelUrl] = useState<string | null>(null);

  React.useEffect(() => {
    // Try from venue data first
    const media = venue.instagram_media || [];
    const bestReel = media
      .filter((m: any) => (m.type || '').toUpperCase() === 'VIDEO' && m.url && m.url.includes('/venue-videos/'))
      .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))[0];
    if (bestReel?.url) {
      setReelUrl(bestReel.url.startsWith('/') ? 'https://viberyte.com' + bestReel.url : bestReel.url);
      return;
    }
    // Fetch from venue detail API
    fetch('https://viberyte.com/api/venues/' + venue.id)
      .then(r => r.json())
      .then(data => {
        const m = (data?.venue || data)?.instagram_media || data?.instagram_media || [];
        const reel = m
          .filter((x: any) => (x.type || '').toUpperCase() === 'VIDEO' && x.url && x.url.includes('/venue-videos/'))
          .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))[0];
        if (reel?.url) { const url = reel.url.startsWith('/') ? 'https://viberyte.com' + reel.url : reel.url; console.log('REEL URL:', url); setReelUrl(url); } else { console.log('NO REEL for venue:', venue.id, 'media:', media.length); }
      })
      .catch(() => {});
  }, [venue.id]);

  const cat = venue.standardized_category || venue.category || '';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/venue/${venue.id}`)}
      activeOpacity={0.95}
      style={[styles.card, cardWidth ? { width: cardWidth, height: cardHeight || 240 } : null]}
    >
      {photoUrl && (
        <Image
          source={{ uri: photoUrl.startsWith('/') ? 'https://viberyte.com' + photoUrl : photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}
      {reelUrl && (
        <ReelPlayer uri={reelUrl} playing={isVisible} preload={isNearby || isVisible} />
      )}
      {!reelUrl && !photoUrl && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1a2e' }]} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
        locations={[0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {reelUrl && (
        <View style={styles.reelBadge}>
          <Ionicons name="play-circle" size={12} color="#fff" />
          <Text style={styles.reelBadgeText}>REEL</Text>
        </View>
      )}

      <TouchableOpacity style={styles.heart} onPress={handleFavorite}>
        <Ionicons
          name={favorited ? 'heart' : 'heart-outline'}
          size={22}
          color={favorited ? '#FF3B30' : '#fff'}
        />
      </TouchableOpacity>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
        <Text style={styles.meta}>
          {venue.neighborhood}{cat ? ' · ' + cat.charAt(0).toUpperCase() + cat.slice(1) : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width - 40,
    height: 320,
    // defaults overridden by props
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0e0e13',
    marginHorizontal: 20,
    marginBottom: 4,
  },
  reelBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heart: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
});
