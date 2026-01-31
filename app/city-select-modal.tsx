import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StretchCitySelector from '../components/StretchCitySelector';
import { colors, spacing } from '../theme';

export default function CitySelectModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentCity, setCurrentCity] = useState('Manhattan');

  useEffect(() => {
    loadCurrentCity();
  }, []);

  const loadCurrentCity = async () => {
    try {
      const profile = await AsyncStorage.getItem('@lumina_profile');
      if (profile) {
        const data = JSON.parse(profile);
        setCurrentCity(data.city || 'Manhattan');
      }
    } catch (error) {
      console.error('Error loading city:', error);
    }
  };

  const handleSelectCity = async (cityName: string) => {
    try {
      // Save to AsyncStorage
      const profile = await AsyncStorage.getItem('@lumina_profile');
      const data = profile ? JSON.parse(profile) : {};
      data.city = cityName;
      await AsyncStorage.setItem('@lumina_profile', JSON.stringify(data));
      
      // Go back
      router.back();
    } catch (error) {
      console.error('Error saving city:', error);
    }
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StretchCitySelector
        currentCity={currentCity}
        onSelectCity={handleSelectCity}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
