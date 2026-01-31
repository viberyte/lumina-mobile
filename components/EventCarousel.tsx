import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing } from '../theme';
import EventCard from './EventCard';

interface EventCarouselProps {
  title: string;
  events: any[];
  onEventPress?: (event: any) => void;
}

export default function EventCarousel({ title, events, onEventPress }: EventCarouselProps) {
  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {events.map((event, idx) => (
          <EventCard
            key={event.id || idx}
            event={event}
            onPress={() => onEventPress?.(event)}
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
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.light,
    color: colors.white,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
});
