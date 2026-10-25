// app/splash.tsx — VBR_SPLASH_V2: no second intro screen.
// The native launch screen (black + V) is the only opening. This route just decides where to go, on the same black,
// so the hand-off is seamless. Routing is unchanged from V1: guests go straight in; first run goes to onboarding.
import React, { useEffect } from 'react';
import { View, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';

export default function SplashScreen() {
  const router = useRouter();
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    (async () => {
      try {
        const m = Object.fromEntries(await AsyncStorage.multiGet(['@lumina_auth_token', '@lumina_user_id', '@lumina_persona', '@lumina_preferences']));
        if (!m['@lumina_auth_token'] && !m['@lumina_user_id']) await authService.continueAsGuest();
        router.replace(m['@lumina_persona'] || m['@lumina_preferences'] ? '/(tabs)' : '/onboarding');
      } catch {
        router.replace('/login');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <View style={{ flex: 1, backgroundColor: '#0A0A0A' }} />; // same black as the native launch screen
}
