import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme';
import favoritesService from '../services/favorites';
import { getPhotoUrl, parseVibeTags } from '../utils/photoHelper';

interface VenueCardProps {
  venue: any;
}

export default function VenueCard({ venue }: VenueCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    checkFavoriteStatus();
  }, [venue.id]);

  const checkFavoriteStatus = async () => {
    const fav = await favoritesService.isFavorite(venue.id);
    setFavorited(fav);
  };

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

  const handlePress = () => {
    router.push(`/venue/${venue.id}`);
  };

  // USE CENTRALIZED PHOTO HELPER - Single source of truth
  const photoUrl = getPhotoUrl(venue);
  const vibeTags = parseVibeTags(venue.vibe_tags);

  // Don't render card if no photo
  if (!photoUrl) return null;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F5F5', '#E8E8E8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.imageContainer}>
          {!imageError ? (
            <>
              <Image
                source={{ uri: photoUrl }}
                style={styles.image}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
              {imageLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={colors.violet[500]} />
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="restaurant-outline" size={48} color={colors.zinc[400]} />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.heartButton}
          onPress={handleFavorite}
          activeOpacity={0.7}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={24}
            color={favorited ? '#FF3B30' : '#FFFFFF'}
          />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {venue.name}
          </Text>
          
          <View style={styles.row}>
            <Text style={styles.neighborhood} numberOfLines={1}>
              {venue.neighborhood}
            </Text>
            {venue.cuisine_primary || venue.cuisine ? (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.cuisine} numberOfLines={1}>
                  {venue.cuisine_primary || venue.cuisine}
                </Text>
              </>
            ) : null}
          </View>

          {vibeTags.length > 0 && (
            <View style={styles.tags}>
              {vibeTags.slice(0, 3).map((tag: string, idx: number) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.zinc[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.zinc[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  name: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.zinc[900],
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  neighborhood: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[600],
    flex: 1,
  },
  separator: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
    marginHorizontal: spacing.xs,
  },
  cuisine: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[600],
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.violet[100],
  },
  tagText: {
    fontSize: typography.sizes.xs,
    color: colors.violet[700],
    fontWeight: '500',
  },
});
