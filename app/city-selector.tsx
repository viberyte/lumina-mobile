import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';

const cities = [
  { name: 'Manhattan', state: 'NY' },
  { name: 'Brooklyn', state: 'NY' },
  { name: 'Queens', state: 'NY' },
  { name: 'Bronx', state: 'NY' },
  { name: 'Jersey City', state: 'NJ' },
  { name: 'Hoboken', state: 'NJ' },
];

export default function CitySelectorScreen() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setTimeout(() => {
      router.push('/home');
    }, 300);
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Where are you tonight?</Text>
        <Text style={styles.subtitle}>Choose your city to get started</Text>
      </View>

      <ScrollView 
        style={styles.cityList}
        contentContainerStyle={styles.cityListContent}
        showsVerticalScrollIndicator={false}
      >
        {cities.map((city) => (
          <TouchableOpacity
            key={city.name}
            style={[
              styles.cityButton,
              selectedCity === city.name && styles.cityButtonSelected,
            ]}
            onPress={() => handleCitySelect(city.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.cityName}>{city.name}</Text>
            <Text style={styles.cityState}>{city.state}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.light,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.light,
    color: colors.zinc[500],
  },
  cityList: {
    flex: 1,
  },
  cityListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  cityButton: {
    backgroundColor: colors.glass.medium,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityButtonSelected: {
    backgroundColor: colors.violet[600],
    borderColor: colors.violet[500],
  },
  cityName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.light,
    color: colors.white,
  },
  cityState: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.light,
    color: colors.zinc[400],
  },
});
