import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';

interface NightlifeFilterProps {
  onFilterChange: (filters: any) => void;
}

export default function NightlifeFilter({ onFilterChange }: NightlifeFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string[]>([]);

  // Matches lounge_type values in database
  const venueTypes = [
    { label: 'Rooftop', value: 'rooftop' },
    { label: 'Upscale', value: 'upscale' },
    { label: 'Casual', value: 'casual' },
    { label: 'Speakeasy', value: 'speakeasy' },
    { label: 'Hookah', value: 'hookah' },
    { label: 'Live Music', value: 'live' },
  ];

  // Matches primary_vibes values in database
  const vibes = [
    { label: 'Lively', value: 'lively' },
    { label: 'Trendy', value: 'trendy' },
    { label: 'Romantic', value: 'romantic' },
    { label: 'Chill', value: 'chill' },
    { label: 'Upscale', value: 'upscale' },
    { label: 'Fun', value: 'fun' },
    { label: 'Exclusive', value: 'exclusive' },
    { label: 'Late Night', value: 'late' },
  ];

  const toggleType = (type: string) => {
    const newFilters = selectedType.includes(type)
      ? selectedType.filter(item => item !== type)
      : [...selectedType, type];
    setSelectedType(newFilters);
    
    onFilterChange({
      type: newFilters,
      vibe: selectedVibe,
    });
  };

  const toggleVibe = (vibe: string) => {
    const newFilters = selectedVibe.includes(vibe)
      ? selectedVibe.filter(item => item !== vibe)
      : [...selectedVibe, vibe];
    setSelectedVibe(newFilters);
    
    onFilterChange({
      type: selectedType,
      vibe: newFilters,
    });
  };

  const clearFilters = () => {
    setSelectedType([]);
    setSelectedVibe([]);
    onFilterChange({});
  };

  const activeFilterCount = selectedType.length + selectedVibe.length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="options-outline" size={18} color={colors.zinc[400]} />
          <Text style={styles.headerText}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </View>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={18} 
          color={colors.zinc[500]} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.filterContent}>
          {/* Venue Type Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Venue Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {venueTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.filterChip,
                    selectedType.includes(type.value) && styles.filterChipActive
                  ]}
                  onPress={() => toggleType(type.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedType.includes(type.value) && styles.filterChipTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Vibe Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Vibe</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {vibes.map((vibe) => (
                <TouchableOpacity
                  key={vibe.value}
                  style={[
                    styles.filterChip,
                    selectedVibe.includes(vibe.value) && styles.filterChipActive
                  ]}
                  onPress={() => toggleVibe(vibe.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedVibe.includes(vibe.value) && styles.filterChipTextActive
                  ]}>
                    {vibe.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters} activeOpacity={0.7}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: 10,
    backgroundColor: colors.zinc[900],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.zinc[300],
  },
  badge: {
    backgroundColor: colors.violet[600],
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  filterContent: {
    paddingTop: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.zinc[500],
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.zinc[900],
  },
  filterChipActive: {
    backgroundColor: colors.white,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.zinc[400],
  },
  filterChipTextActive: {
    color: colors.black,
  },
  clearButton: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.zinc[500],
  },
});
