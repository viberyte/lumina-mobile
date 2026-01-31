import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing } from '../theme';
import VenueCard from './VenueCard';

interface VenueCarouselProps {
  title: string;
  venues: any[];
  onEndReached?: () => void;
}

export default function VenueCarousel({ title, venues, onEndReached }: VenueCarouselProps) {
  // Don't render if no venues (skip empty carousels)
  if (!venues || venues.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScrollEndDrag={onEndReached}
      >
        {venues.map((venue, idx) => (
          <VenueCard
            key={venue.id || idx}
            venue={venue}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.white,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
});
