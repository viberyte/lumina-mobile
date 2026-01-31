import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../../theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface EventsFilterProps {
  onFilterChange: (filters: any) => void;
}

const GENRES = [
  { id: 'afrobeats', label: 'Afrobeats', icon: '🌍' },
  { id: 'hiphop', label: 'Hip-Hop', icon: '🎤' },
  { id: 'latin', label: 'Latin', icon: '💃' },
  { id: 'edm', label: 'EDM', icon: '⚡' },
  { id: 'rnb', label: 'R&B', icon: '🎵' },
  { id: 'house', label: 'House', icon: '🎧' },
  { id: 'reggae', label: 'Reggae', icon: '🇯🇲' },
  { id: 'jazz', label: 'Jazz', icon: '🎷' },
];

const WHEN = [
  { id: 'tonight', label: 'Tonight' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'thisweek', label: 'This Week' },
  { id: 'weekend', label: 'Weekend' },
];

const TYPES = [
  { id: 'concert', label: 'Concert', icon: '🎸' },
  { id: 'dayparty', label: 'Day Party', icon: '☀️' },
  { id: 'rooftop', label: 'Rooftop', icon: '🌆' },
  { id: 'brunch', label: 'Brunch', icon: '🥂' },
  { id: 'djset', label: 'DJ Set', icon: '🎛️' },
];

export default function EventsFilter({ onFilterChange }: EventsFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedWhen, setSelectedWhen] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  }, [isExpanded]);

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const toggleChip = (
    id: string,
    selected: string[],
    setter: (val: string[]) => void,
    category: 'genre' | 'day' | 'type'
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSelected = selected.includes(id)
      ? selected.filter(item => item !== id)
      : [...selected, id];
    setter(newSelected);
    
    // Build filter object with the new value
    const filters = {
      genre: category === 'genre' ? newSelected : selectedGenres,
      day: category === 'day' ? newSelected : selectedWhen,
      type: category === 'type' ? newSelected : selectedTypes,
    };
    onFilterChange(filters);
  };
  const clearFilters = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedGenres([]);
    setSelectedWhen([]);
    setSelectedTypes([]);
    onFilterChange({});
  };

  const activeCount = selectedGenres.length + selectedWhen.length + selectedTypes.length;

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const renderChip = (
    item: { id: string; label: string; icon?: string },
    selected: string[],
    setter: (val: string[]) => void,
    category: 'genre' | 'day' | 'type', showIcon: boolean = false
  ) => {
    const isActive = selected.includes(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => toggleChip(item.id, selected, setter, category)}
        activeOpacity={0.7}
      >
        {showIcon && item.icon && <Text style={styles.chipIcon}>{item.icon}</Text>}
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleExpand} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <Ionicons name="options-outline" size={18} color={colors.violet[400]} />
          <Text style={styles.headerText}>Filters</Text>
          {activeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons name="chevron-down" size={20} color={colors.zinc[500]} />
        </Animated.View>
      </TouchableOpacity>

      {/* Expandable Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Genre Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genre</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {GENRES.map(item => renderChip(item, selectedGenres, setSelectedGenres, 'genre', true))}
            </ScrollView>
          </View>

          {/* When Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {WHEN.map(item => renderChip(item, selectedWhen, setSelectedWhen, 'day'))}
            </ScrollView>
          </View>

          {/* Type Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {TYPES.map(item => renderChip(item, selectedTypes, setSelectedTypes, 'type', true))}
            </ScrollView>
          </View>

          {/* Clear Button */}
          {activeCount > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters} activeOpacity={0.7}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.zinc[900],
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.violet[500],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  content: {
    marginTop: spacing.md,
    backgroundColor: colors.zinc[900],
    borderRadius: 14,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.zinc[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.zinc[800],
    borderWidth: 1,
    borderColor: colors.zinc[700],
    gap: 6,
  },
  chipActive: {
    backgroundColor: colors.violet[500] + '25',
    borderColor: colors.violet[500],
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  chipTextActive: {
    color: colors.white,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.violet[400],
  },
});
