import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TimelineVenue {
  venue: {
    id: number;
    name: string;
    neighborhood?: string;
    cuisine?: string;
    photo?: string;
    rating?: number;
    price_tier?: string;
    address?: string;
  };
  reasoning?: string;
  travelTime?: string;
  confidence?: number;
}

interface NightTimelineProps {
  anchorVenue?: { id: number; name: string };
  stops: TimelineVenue[];
  onRefresh?: () => void;
}

export default function NightTimeline({ anchorVenue, stops, onRefresh }: NightTimelineProps) {
  const router = useRouter();

  if (!stops || stops.length === 0) {
    return null;
  }

  const handleVenuePress = (venueId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/venue/${venueId}`);
  };

  // Get contextual labels based on position
  const getStopLabel = (index: number, total: number): { label: string; icon: string; time: string } => {
    if (index === 0) {
      return { label: 'Start Here', icon: 'restaurant', time: 'Now' };
    } else if (index === total - 1 && total > 2) {
      return { label: 'If The Night Keeps Going', icon: 'moon', time: 'Late' };
    } else {
      return { label: 'Next Stop', icon: 'wine', time: '~1hr later' };
    }
  };

  // Get vibe color based on venue type
  const getVibeColor = (cuisine?: string): string[] => {
    const type = (cuisine || '').toLowerCase();
    if (type.includes('club') || type.includes('nightlife')) {
      return ['#ec4899', '#8b5cf6']; // Pink to purple
    } else if (type.includes('lounge') || type.includes('bar')) {
      return ['#8b5cf6', '#6366f1']; // Purple to indigo
    } else {
      return ['#6366f1', '#3b82f6']; // Indigo to blue
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tonight's Flow</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={18} color={colors.violet[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {stops.slice(0, 3).map((stop, index) => {
          const { label, icon, time } = getStopLabel(index, Math.min(stops.length, 3));
          const vibeColors = getVibeColor(stop.venue?.cuisine);
          const isHero = index === 0;
          const isLast = index === Math.min(stops.length, 3) - 1;

          return (
            <View key={stop.venue?.id || index}>
              {/* Stop Card */}
              <TouchableOpacity
                style={[styles.stopCard, isHero && styles.heroCard]}
                onPress={() => stop.venue?.id && handleVenuePress(stop.venue.id)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[vibeColors[0] + '20', vibeColors[1] + '10']}
                  style={styles.cardGradient}
                >
                  {/* Time Badge */}
                  <View style={styles.timeBadge}>
                    <Ionicons name={icon as any} size={14} color={vibeColors[0]} />
                    <Text style={[styles.timeText, { color: vibeColors[0] }]}>{time}</Text>
                  </View>

                  {/* Content Row */}
                  <View style={styles.cardContent}>
                    {/* Image */}
                    <View style={[styles.imageContainer, isHero && styles.heroImageContainer]}>
                      {stop.venue?.photo ? (
                        <Image
                          source={{ uri: stop.venue.photo }}
                          style={[styles.venueImage, isHero && styles.heroImage]}
                        />
                      ) : (
                        <View style={[styles.placeholderImage, isHero && styles.heroImage]}>
                          <Ionicons name={icon as any} size={isHero ? 32 : 24} color={colors.zinc[600]} />
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.infoContainer}>
                      <Text style={styles.stopLabel}>{label}</Text>
                      <Text style={[styles.venueName, isHero && styles.heroVenueName]} numberOfLines={1}>
                        {stop.venue?.name || 'Venue'}
                      </Text>
                      
                      {stop.venue?.neighborhood && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location" size={12} color={colors.zinc[500]} />
                          <Text style={styles.locationText}>{stop.venue.neighborhood}</Text>
                        </View>
                      )}

                      {stop.reasoning && (
                        <Text style={styles.reasoning} numberOfLines={2}>
                          "{stop.reasoning}"
                        </Text>
                      )}

                      {/* CTA for hero */}
                      {isHero && (
                        <View style={styles.ctaRow}>
                          <TouchableOpacity style={[styles.ctaButton, { backgroundColor: vibeColors[0] }]}>
                            <Ionicons name="navigate" size={14} color="#fff" />
                            <Text style={styles.ctaText}>Get Directions</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Connector Line */}
              {!isLast && (
                <View style={styles.connector}>
                  <View style={styles.connectorLine} />
                  <View style={styles.connectorBadge}>
                    <Ionicons name="walk" size={12} color={colors.zinc[500]} />
                    <Text style={styles.connectorText}>
                      {stop.travelTime || '~10 min'}
                    </Text>
                  </View>
                  <View style={styles.connectorLine} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.white,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.zinc[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeline: {
    gap: 0,
  },
  stopCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  heroCard: {
    borderColor: colors.violet[500] + '50',
  },
  cardGradient: {
    padding: spacing.md,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  timeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroImageContainer: {
    width: 100,
    height: 100,
  },
  venueImage: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.zinc[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  stopLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.zinc[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  venueName: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  heroVenueName: {
    fontSize: typography.sizes.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[500],
  },
  reasoning: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
    fontStyle: 'italic',
    lineHeight: 18,
  },
  ctaRow: {
    marginTop: spacing.sm,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.zinc[700],
  },
  connectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.zinc[800],
    borderRadius: 12,
  },
  connectorText: {
    fontSize: 11,
    color: colors.zinc[500],
    fontWeight: '500',
  },
});
