import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../../theme';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function SplashScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    // Check if user has selected a city before
    const timer = setTimeout(() => {
      // For now, always go to city selector
      // Later: check AsyncStorage for saved city
      navigation.navigate('CitySelector' as never);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.container}
    >
      <Animated.View entering={FadeIn.duration(1000)} style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.sparkle}>✨</Text>
          </View>
        </View>
        <Text style={styles.title}>Lumina</Text>
        <Text style={styles.subtitle}>Your nightlife concierge</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.violet[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    fontSize: 40,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.light,
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.light,
    color: colors.zinc[500],
  },
});
