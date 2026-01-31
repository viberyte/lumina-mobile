import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../../theme';

interface SmartSearchBarProps {
  placeholder?: string;
  initialQuery?: string;
}

export default function SmartSearchBar({ 
  placeholder = 'Search venues, events, vibes...', 
  initialQuery 
}: SmartSearchBarProps) {
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate immediately to search page
    router.push('/search');
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="search" size={20} color={colors.zinc[400]} />
      <Text style={styles.placeholder}>{placeholder}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 12,
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  placeholder: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.zinc[500],
  },
});
