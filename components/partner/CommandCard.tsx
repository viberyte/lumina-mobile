import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 2;

interface CommandCardProps {
  icon: string;
  title: string;
  subtitle?: string | null;
  gradient: [string, string];
  badge?: number;
  onPress: () => void;
  disabled?: boolean;
  locked?: boolean;
  lockLabel?: string;
}

export default function CommandCard({
  icon,
  title,
  subtitle,
  gradient,
  onPress,
  badge,
  disabled = false,
  locked = false,
  lockLabel,
}: CommandCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.cardWrapper, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={locked ? ['#1A1A1F', '#121215'] : gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Badge - quiet authority */}
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}

        {/* Lock badge */}
        {locked && lockLabel && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>{lockLabel}</Text>
          </View>
        )}

        {/* Icon - slightly subdued */}
        <Text style={[styles.icon, locked && styles.iconLocked]}>{icon}</Text>

        {/* Title - refined weight */}
        <Text style={[styles.title, locked && styles.titleLocked]}>{title}</Text>

        {/* Subtitle - generous air */}
        {subtitle && (
          <Text style={[styles.subtitle, locked && styles.subtitleLocked]}>{subtitle}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 22,
    backgroundColor: 'transparent',
    // Apple-soft shadow: wide, faint
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  disabled: {
    opacity: 0.4,
  },
  card: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
  },
  // Badge: quiet authority, not alarm
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Lock badge
  lockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Icon: subdued dominance
  icon: {
    fontSize: 44,
    marginBottom: 10,
    opacity: 0.9,
  },
  iconLocked: {
    opacity: 0.3,
  },
  // Title: refined, not aggressive
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
    textAlign: 'center',
  },
  titleLocked: {
    color: 'rgba(255,255,255,0.4)',
  },
  // Subtitle: generous air
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  subtitleLocked: {
    color: 'rgba(255,255,255,0.25)',
  },
});
