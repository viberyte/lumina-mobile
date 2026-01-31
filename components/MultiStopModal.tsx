import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../theme';
import { glassStyles } from '../theme/vibeGradients';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MultiStopModalProps {
  visible: boolean;
  onClose: () => void;
  primaryVenueId: number;
  primaryVenueName: string;
  persona?: 'date_night' | 'solo' | 'friends' | 'group';
}

interface VibeOption {
  type: string;
  venue?: any;
  event?: any;
  reasoning: string;
  travelTime: string;
  proTip: string;
  confidence?: number;
}

export default function MultiStopModal({
  visible,
  onClose,
  primaryVenueId,
  primaryVenueName,
  persona = 'friends',
}: MultiStopModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [safe, setSafe] = useState<VibeOption | null>(null);
  const [elevated, setElevated] = useState<VibeOption | null>(null);
  const [wildcard, setWildcard] = useState<VibeOption | null>(null);

  useEffect(() => {
    if (visible) {
      fetchRecommendations();
    }
  }, [visible, primaryVenueId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://lumina.viberyte.com/api/multi-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryVenueId,
          persona,
          dateSelection: 'tonight',
        }),
      });

      const data = await response.json();
      setSafe(data.recommendations.safe);
      setElevated(data.recommendations.elevated);
      setWildcard(data.recommendations.wildcard);
    } catch (error) {
      console.error('Multi-stop fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRecommendations();
  };

  const handleVenuePress = (venueId: number) => {
    onClose();
    router.push(`/venue/${venueId}`);
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return '';
    if (confidence >= 0.9) return 'Very confident';
    if (confidence >= 0.75) return 'Confident';
    if (confidence >= 0.6) return 'Pretty sure';
    return 'Worth trying';
  };

  const renderVibeCard = (
    tier: 'safe' | 'elevated' | 'wildcard',
    option: VibeOption | null,
    icon: string,
    title: string,
    subtitle: string,
    gradientColors: string[]
  ) => {
    if (!option) return null;

    const venue = option.venue || option.event;
    if (!venue) return null;

    return (
      <TouchableOpacity
        style={styles.vibeCard}
        onPress={() => handleVenuePress(venue.id)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.vibeCardGradient}
        >
          {/* Header */}
          <View style={styles.vibeHeader}>
            <View style={styles.vibeIconContainer}>
              <Ionicons name={icon as any} size={20} color={colors.white} />
            </View>
            <View style={styles.vibeHeaderText}>
              <Text style={styles.vibeTitle}>{title}</Text>
              <Text style={styles.vibeSubtitle}>{subtitle}</Text>
            </View>
            {option.confidence && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {getConfidenceText(option.confidence)}
                </Text>
              </View>
            )}
          </View>

          {/* Venue Image & Info */}
          <View style={[styles.venueContainer, glassStyles.matte]}>
            {venue.photo && (
              <Image
                source={{ uri: venue.photo }}
                style={styles.venueImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.venueInfo}>
              <Text style={styles.venueName} numberOfLines={1}>
                {venue.name}
              </Text>
              <View style={styles.venueMeta}>
                <Ionicons name="location" size={12} color={colors.zinc[400]} />
                <Text style={styles.venueMetaText}>{option.travelTime}</Text>
              </View>
              {venue.cuisine && (
                <Text style={styles.venueCuisine}>{venue.cuisine}</Text>
              )}
            </View>
          </View>

          {/* Reasoning */}
          <View style={styles.reasoningContainer}>
            <View style={styles.reasoningHeader}>
              <Ionicons name="sparkles" size={14} color={colors.violet[400]} />
              <Text style={styles.reasoningTitle}>Why This Works</Text>
            </View>
            <Text style={styles.reasoningText}>{option.reasoning}</Text>
          </View>

          {/* Pro Tip */}
          <View style={styles.proTipContainer}>
            <Ionicons name="bulb" size={14} color={colors.yellow[500]} />
            <Text style={styles.proTipText}>{option.proTip}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Continue the Vibe</Text>
            <Text style={styles.headerSubtitle}>After {primaryVenueName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={24} color={colors.violet[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.violet[500]} />
              <Text style={styles.loadingText}>Finding perfect spots...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                💫 Pick your energy level:
              </Text>

              {renderVibeCard(
                'safe',
                safe,
                'shield-checkmark',
                '🛡️ SAFE',
                'Easy, cozy, smooth ending',
                [colors.blue[600] + '40', colors.blue[700] + '20']
              )}

              {renderVibeCard(
                'elevated',
                elevated,
                'sparkles',
                '✨ ELEVATED',
                'Fun but refined, good vibes',
                [colors.violet[600] + '40', colors.violet[700] + '20']
              )}

              {renderVibeCard(
                'wildcard',
                wildcard,
                'flash',
                '🎲 WILDCARD',
                'Turn the night up, spontaneous energy',
                [colors.pink[600] + '40', colors.pink[700] + '20']
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.zinc[900],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xxl + 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc[800],
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    paddingTop: spacing.xxl * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  vibeCard: {
    marginBottom: spacing.xl,
    borderRadius: 20,
    overflow: 'hidden',
  },
  vibeCardGradient: {
    padding: spacing.lg,
  },
  vibeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  vibeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vibeHeaderText: {
    flex: 1,
  },
  vibeTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  vibeSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.white + 'CC',
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.white + '20',
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: typography.sizes.xs,
    color: colors.white,
    fontWeight: '600',
  },
  venueContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  venueImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.zinc[800],
  },
  venueInfo: {
    padding: spacing.md,
  },
  venueName: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  venueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  venueMetaText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
  },
  venueCuisine: {
    fontSize: typography.sizes.sm,
    color: colors.violet[400],
    fontWeight: '600',
  },
  reasoningContainer: {
    marginBottom: spacing.md,
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  reasoningTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
  },
  reasoningText: {
    fontSize: typography.sizes.md,
    color: colors.white + 'DD',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  proTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.yellow[500] + '20',
    borderRadius: 8,
  },
  proTipText: {
    fontSize: typography.sizes.sm,
    color: colors.yellow[200],
    fontWeight: '600',
  },
});
