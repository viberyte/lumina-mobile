import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';

const ITEM_HEIGHT = 100;

const GENRES = [
  { id: 'afrobeats', name: 'Afrobeats' },
  { id: 'hiphop', name: 'Hip-Hop' },
  { id: 'rnb', name: 'R&B' },
  { id: 'latin', name: 'Latin' },
  { id: 'edm', name: 'EDM' },
  { id: 'house', name: 'House' },
  { id: 'amapiano', name: 'Amapiano' },
  { id: 'reggae', name: 'Reggae' },
  { id: 'jazz', name: 'Jazz' },
  { id: 'live', name: 'Live Music' },
  { id: 'top40', name: 'Top 40' },
  { id: 'open', name: 'Open Format' },
];

interface StretchMusicSelectorProps {
  selectedGenres: string[];
  onToggleGenre: (genreId: string) => void;
  onClose: () => void;
}

export default function StretchMusicSelector({ 
  selectedGenres, 
  onToggleGenre,
  onClose 
}: StretchMusicSelectorProps) {
  const scrollY = useSharedValue(0);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const focusGenre = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFocusedIndex(index);
  };

  const toggleCurrentGenre = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleGenre(GENRES[focusedIndex].id);
  };

  const handleTapGenre = (index: number) => {
    if (index !== focusedIndex) {
      focusGenre(index);
    } else {
      toggleCurrentGenre();
    }
  };

  const gesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .onUpdate((event) => {
      scrollY.value = Math.max(-150, Math.min(150, event.translationY));
    })
    .onEnd(() => {
      const threshold = ITEM_HEIGHT / 3;
      let newIndex = focusedIndex;

      if (scrollY.value > threshold && focusedIndex > 0) {
        newIndex = focusedIndex - 1;
      } else if (scrollY.value < -threshold && focusedIndex < GENRES.length - 1) {
        newIndex = focusedIndex + 1;
      }

      scrollY.value = withSpring(0, { damping: 20, stiffness: 200 });

      if (newIndex !== focusedIndex) {
        runOnJS(focusGenre)(newIndex);
      }
    });

  const visibleGenres = GENRES.map((genre, index) => {
    const distance = Math.abs(index - focusedIndex);
    if (distance > 1) return null;
    return { genre, index, position: index - focusedIndex };
  }).filter(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="chevron-down" size={28} color={colors.zinc[600]} />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Music</Text>
      
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.rail}>
          {visibleGenres.map((item: any) => (
            <GenreRailItem
              key={item.genre.id}
              genre={item.genre}
              position={item.position}
              scrollY={scrollY}
              onTap={() => handleTapGenre(item.index)}
              isSelected={selectedGenres.includes(item.genre.id)}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      <View style={styles.footer}>
        {selectedGenres.length > 0 && (
          <Text style={styles.countText}>
            {selectedGenres.length} selected
          </Text>
        )}
        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface GenreRailItemProps {
  genre: { id: string; name: string };
  position: number;
  scrollY: Animated.SharedValue<number>;
  onTap: () => void;
  isSelected: boolean;
}

function GenreRailItem({ genre, position, scrollY, onTap, isSelected }: GenreRailItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const baseOffset = position * ITEM_HEIGHT;
    const dragOffset = scrollY.value * 0.5;
    const offset = baseOffset - dragOffset;

    const scrollProgress = Math.min(Math.abs(scrollY.value) / ITEM_HEIGHT, 1);
    const scale = interpolate(
      Math.abs(position) - scrollProgress * 0.4,
      [0, 1],
      [1.1, 0.85],
      'clamp'
    );

    const opacity = interpolate(
      Math.abs(position),
      [0, 1],
      [1, 0.25],
      'clamp'
    );

    return {
      transform: [
        { translateY: withSpring(offset, { damping: 25, stiffness: 180 }) },
        { scale: withSpring(scale, { damping: 20 }) },
      ],
      opacity: withSpring(opacity, { damping: 18 }),
    };
  });

  return (
    <Animated.View style={[styles.genreItem, animatedStyle]}>
      <TouchableOpacity 
        onPress={onTap} 
        activeOpacity={0.8}
        style={styles.genreTouchable}
      >
        <Text style={[
          styles.genreName, 
          isSelected && styles.genreNameSelected
        ]}>
          {genre.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[600],
    textAlign: 'center',
    marginBottom: spacing.xl * 3,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  rail: {
    height: ITEM_HEIGHT * 3,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  genreItem: {
    position: 'absolute',
    width: '85%',
    alignItems: 'center',
  },
  genreTouchable: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  genreName: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.zinc[500],
    letterSpacing: -0.5,
  },
  genreNameSelected: {
    color: colors.white,
    fontWeight: '400',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.lg,
  },
  countText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[600],
    fontWeight: '400',
  },
  doneButton: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  doneButtonText: {
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
    fontWeight: '400',
  },
});
