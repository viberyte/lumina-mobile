import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../contexts/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import * as Location from 'expo-location';
import LoadingSequence from '../components/LoadingSequence';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [previousSegment, setPreviousSegment] = useState<string | undefined>();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const [authToken, userData, isGuest, persona, userId] = await Promise.all([
        AsyncStorage.getItem('@lumina_auth_token'),
        AsyncStorage.getItem('@lumina_user'),
        AsyncStorage.getItem('@lumina_is_guest'),
        AsyncStorage.getItem('@lumina_persona'),
        AsyncStorage.getItem('@lumina_user_id'),
      ]);

      const hasAuth = !!(authToken && authToken !== '') ||
                      !!(userData && userData !== '') ||
                      isGuest === 'true' ||
                      !!(persona && persona !== '') ||
                      !!(userId && userId !== '');

      if (hasAuth) {
        if (userData) {
          try { authService['user'] = JSON.parse(userData); } catch {}
        }
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log('Error checking auth:', error);
      try {
        const fallback = await AsyncStorage.getItem('@lumina_user');
        setIsLoggedIn(!!fallback);
      } catch {
        setIsLoggedIn(false);
      }
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    const currentSegment = segments[0];
    const inTabs = currentSegment === '(tabs)';
    const wasOnboarding = previousSegment === 'onboarding';
    if (inTabs && wasOnboarding) {
      setTimeout(() => { checkAuthStatus(); }, 300);
    } else if (inTabs) {
      checkAuthStatus();
    }
    setPreviousSegment(currentSegment);
  }, [segments, isReady]);

  useEffect(() => {
    if (!isReady || isLoggedIn === null) return;
    const inLogin = segments[0] === 'login';
    const inRegister = segments[0] === 'register';
    const inOnboarding = segments[0] === 'onboarding';
    const inPartnerOnboarding = segments[0] === 'partner-onboarding';
    const inForgotPassword = segments[0] === 'forgot-password';
    const isAuthScreen = inLogin || inRegister || inOnboarding || inPartnerOnboarding || inForgotPassword;
    if (!isLoggedIn && !isAuthScreen) {
      authService.continueAsGuest().then(() => setIsLoggedIn(true)).catch(() => router.replace('/login'));
    }
  }, [isReady, isLoggedIn, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.zinc[900] }}>
        <ActivityIndicator size="large" color={colors.lux.ivory} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="partner-onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="venue/[id]" />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="venue-sheet/[id]" options={{ presentation: 'modal', gestureEnabled: true }} />
      <Stack.Screen name="event-sheet/[id]" options={{ presentation: 'modal', gestureEnabled: true }} />
      <Stack.Screen name="plan/[id]" />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
}

// VBR_INTRO_ONCE_V1: the intro and its location ask play on first launch only.
// Skipped when it has been seen, or when iOS already has an answer for location (existing users).
const INTRO_KEY = '@vbr_intro_seen_v1';

export default function RootLayout() {
  const [intro, setIntro] = useState<'check' | 'show' | 'done'>('check');
  const introDone = intro === 'done';

  useEffect(() => {
    (async () => {
      try {
        const [seen, perm] = await Promise.all([
          AsyncStorage.getItem(INTRO_KEY),
          Location.getForegroundPermissionsAsync().catch(() => null),
        ]);
        if (seen === '1' || (perm && perm.status !== 'undetermined')) {
          AsyncStorage.setItem(INTRO_KEY, '1').catch(() => {});
          setIntro('done');
          return;
        }
      } catch {}
      setIntro('show');
    })();
  }, []);

  const setIntroDone = (_: boolean) => setIntro('done');

  const handleIntroComplete = async (shareLocation: boolean) => {
    await AsyncStorage.multiSet([[INTRO_KEY, '1'], ['@vbr_loc_not_now', shareLocation ? '0' : '1']]).catch(() => {});
    if (shareLocation) {
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch (e) {
        console.log('Location permission error:', e);
      }
    }
    setIntroDone(true);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="light" />
          {intro === 'check' ? (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />
          ) : !introDone ? (
            <LoadingSequence onComplete={handleIntroComplete} />
          ) : (
            <RootLayoutNav />
          )}
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
