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

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Try to restore user session from AuthService
      const user = await authService.getCurrentUser();
      
      if (user) {
        // User session restored successfully
        setIsLoggedIn(true);
      } else {
        // Fallback: check AsyncStorage directly
        const authToken = await AsyncStorage.getItem('@lumina_auth_token');
        const userData = await AsyncStorage.getItem('@lumina_user');
        const isGuest = await AsyncStorage.getItem('@lumina_is_guest');
        const persona = await AsyncStorage.getItem('@lumina_persona');

        const loggedIn = !!(authToken || userData || isGuest === 'true' || persona);
        setIsLoggedIn(loggedIn);
      }
    } catch (error) {
      console.log('Error checking auth:', error);
      setIsLoggedIn(false);
    } finally {
      setIsReady(true);
    }
  };

  // Re-check auth whenever segments change (navigation happens)
  useEffect(() => {
    if (!isReady) return;
    
    const inTabs = segments[0] === '(tabs)';
    
    // If user just navigated to tabs, re-check auth to catch post-onboarding state
    if (inTabs) {
      checkAuthStatus();
    }
  }, [segments, isReady]);

  useEffect(() => {
    if (!isReady || isLoggedIn === null) return;

    const inLogin = segments[0] === 'login';
    const inRegister = segments[0] === 'register';
    const inOnboarding = segments[0] === 'onboarding';
    const inPartnerOnboarding = segments[0] === 'partner-onboarding';
    const inForgotPassword = segments[0] === 'forgot-password';

    const isAuthScreen = inLogin || inRegister || inOnboarding || inPartnerOnboarding || inForgotPassword;

    // If not logged in and not on an auth screen, redirect to login
    if (!isLoggedIn && !isAuthScreen) {
      router.replace('/login');
    }
  }, [isReady, isLoggedIn, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.zinc[900] }}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
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
      <Stack.Screen name="plan/[id]" />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
