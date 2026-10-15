import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.97)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, damping: 22, stiffness: 120, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(screenFade, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.delay(100),
    ]).start(async () => {
      // VIBERYTE_CONSUMER_ONLY_V1: guests go straight in, no login wall
      try {
        const m = Object.fromEntries(await AsyncStorage.multiGet(['@lumina_auth_token', '@lumina_user_id', '@lumina_persona', '@lumina_preferences']));
        if (!m['@lumina_auth_token'] && !m['@lumina_user_id']) await authService.continueAsGuest();
        router.replace(m['@lumina_persona'] || m['@lumina_preferences'] ? '/(tabs)' : '/onboarding');
      } catch {
        router.replace('/login');
      }
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      <LinearGradient
        colors={['#08080d', '#0d0a14', '#08080d']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.logoContainer}>
        <Animated.Text
          style={[styles.logoText, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        >
          VIBERYTE
        </Animated.Text>

        <Animated.View style={[styles.taglineRow, { opacity: taglineOpacity }]}>
          <View style={styles.line} />
          <Text style={styles.tagline}>Your night, understood</Text>
          <View style={styles.line} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 38,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: 8,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  line: {
    width: 20,
    height: 1,
    backgroundColor: '#3f3f46',
  },
  tagline: {
    fontSize: 12,
    fontWeight: '400',
    color: '#52525b',
    letterSpacing: 1,
  },
});
