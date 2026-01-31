import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import * as Haptics from 'expo-haptics';

interface ButtonGroupProps {
  options: string[];
  onSelect: (option: string) => void;
  questionType?: string;
  columns?: number;
}

// Map semantic values to display labels
const LABEL_MAP: Record<string, string> = {
  // WHO
  solo: 'Solo',
  date: 'Date Night',
  friends: 'Friends',
  birthday: 'Birthday',
  business: 'Business',
  
  // WHEN
  tonight: 'Tonight',
  tomorrow: 'Tomorrow',
  weekend: 'Weekend',
  pick_date: 'Pick a Date',
  
  // WHAT
  dinner: 'Dinner',
  drinks: 'Drinks',
  events: 'Events',
  full_night: 'Full Night',
  
  // CUISINE
  italian: 'Italian',
  japanese: 'Japanese',
  steakhouse: 'Steakhouse',
  seafood: 'Seafood',
  mexican: 'Mexican',
  type: 'Type to Search',
  
  // MUSIC
  afrobeats: 'Afrobeats',
  hip_hop: 'Hip-Hop',
  house_edm: 'House/EDM',
  latin: 'Latin',
  jazz: 'Jazz',
  surprise: 'Surprise Me'
};

export default function ButtonGroup({ options, onSelect, questionType, columns }: ButtonGroupProps) {
  const handlePress = (option: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(option);
  };

  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const displayLabel = LABEL_MAP[option.toLowerCase()] || 
                            option.charAt(0).toUpperCase() + option.slice(1);
        
        return (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={() => handlePress(option)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>{displayLabel}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.violet[400],
  },
  buttonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.violet[400],
  },
});
