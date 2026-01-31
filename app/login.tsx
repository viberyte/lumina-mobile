import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';
import { colors, typography, spacing } from '../theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Auth
  const { request, response, promptAsync } = authService.useGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleSignInWithToken(authentication.accessToken);
      }
    }
  }, [response]);

  const checkOnboardingComplete = async (): Promise<boolean> => {
    try {
      const persona = await AsyncStorage.getItem('@lumina_persona');
      const preferences = await AsyncStorage.getItem('@lumina_preferences');
      return !!(persona || preferences);
    } catch {
      return false;
    }
  };

  const handleGoogleSignInWithToken = async (accessToken: string) => {
    setLoading(true);
    try {
      await authService.signInWithGoogle(accessToken);
      const hasCompletedOnboarding = await checkOnboardingComplete();
      router.replace(hasCompletedOnboarding ? '/(tabs)' : '/onboarding');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    try {
      await authService.continueAsGuest();
      const hasCompletedOnboarding = await checkOnboardingComplete();
      router.replace(hasCompletedOnboarding ? '/(tabs)' : '/onboarding');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await authService.signInWithApple();
      const hasCompletedOnboarding = await checkOnboardingComplete();
      router.replace(hasCompletedOnboarding ? '/(tabs)' : '/onboarding');
    } catch (error: any) {
      if (error.message !== 'Sign in cancelled') {
        Alert.alert('Sign In Failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await promptAsync();
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await authService.signInWithEmail(email, password);
      const hasCompletedOnboarding = await checkOnboardingComplete();
      router.replace(hasCompletedOnboarding ? '/(tabs)' : '/onboarding');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0a0a0f', '#18181b', '#0a0a0f']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/lumina-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Enter Lumina</Text>
            <Text style={styles.subtitle}>A world of nightlife, curated for you</Text>
            <Text style={styles.tagline}>Tonight starts here.</Text>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleGuestContinue}
            disabled={loading}
          >
            <LinearGradient
              colors={['#8b5cf6', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Start Exploring</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.microCopy}>No account required</Text>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={[styles.appleButton, loading && styles.buttonDisabled]}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={24} color="#000" />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.socialButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading || !request}
          >
            <Ionicons name="logo-google" size={20} color={colors.zinc[300]} />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {!showEmailLogin ? (
            <TouchableOpacity 
              style={styles.emailToggle}
              onPress={() => setShowEmailLogin(true)}
            >
              <Text style={styles.emailToggleText}>Sign in with email</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emailForm}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.zinc[600]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.zinc[600]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <TouchableOpacity 
                style={[styles.emailSignInButton, loading && styles.buttonDisabled]}
                onPress={handleEmailSignIn}
                disabled={loading}
              >
                <Text style={styles.emailSignInButtonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.emailToggle}
                onPress={() => setShowEmailLogin(false)}
              >
                <Text style={styles.emailToggleText}>Hide</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xxl, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: spacing.xl, opacity: 0.9 },
  logo: { width: 80, height: 80 },
  header: { alignItems: 'center', marginBottom: spacing.xxl * 1.5 },
  title: { fontSize: 48, fontWeight: '300', color: colors.white, marginBottom: spacing.sm, letterSpacing: -0.5 },
  subtitle: { fontSize: typography.sizes.md, color: colors.zinc[400], textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg },
  tagline: { fontSize: typography.sizes.sm, color: colors.zinc[500], fontWeight: '400', letterSpacing: 0.5 },
  primaryButton: { borderRadius: 16, overflow: 'hidden', marginBottom: spacing.xs },
  primaryButtonGradient: { paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: typography.sizes.lg, fontWeight: '600', color: colors.white, letterSpacing: 0.3 },
  microCopy: { fontSize: typography.sizes.xs, color: colors.zinc[600], textAlign: 'center', marginBottom: spacing.xl },
  divider: { marginVertical: spacing.xl, alignItems: 'center' },
  dividerLine: { width: '30%', height: 1, backgroundColor: colors.zinc[800], opacity: 0.3 },
  appleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: 14, paddingVertical: spacing.md + 2, marginBottom: spacing.sm },
  appleButtonText: { fontSize: typography.sizes.md, fontWeight: '600', color: '#000', letterSpacing: 0.2 },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 14, paddingVertical: spacing.md + 2, borderWidth: 1, borderColor: colors.zinc[800], marginBottom: spacing.xl },
  socialButtonText: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.zinc[300], letterSpacing: 0.2 },
  emailToggle: { alignItems: 'center', paddingVertical: spacing.md },
  emailToggleText: { fontSize: typography.sizes.xs, color: colors.zinc[600], fontWeight: '500', letterSpacing: 0.3 },
  emailForm: { gap: spacing.sm },
  inputContainer: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.zinc[800] },
  input: { fontSize: typography.sizes.sm, color: colors.white, paddingVertical: spacing.xs },
  emailSignInButton: { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)', marginTop: spacing.xs },
  emailSignInButtonText: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.violet[400], letterSpacing: 0.2 },
  buttonDisabled: { opacity: 0.5 },
});
