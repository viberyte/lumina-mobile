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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';
import { colors, typography, spacing } from '../theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    <View style={styles.container}>
      <View style={styles.backgroundCircles}>
        <LinearGradient
          colors={['#7c3aed', '#4c1d95']}
          style={styles.circleTopRight}
        />
        <LinearGradient
          colors={['#be185d', '#9d174d']}
          style={styles.circleBottomLeft}
        />
        <LinearGradient
          colors={['#7c3aed', '#5b21b6']}
          style={styles.circleBottomRight}
        />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.logoSection}>
            <Text style={styles.logoText}>L U M I N A</Text>
            <View style={styles.taglineRow}>
              <Text style={styles.sparkle}>✦</Text>
              <Text style={styles.tagline}>N I G H T L I F E   I N T E L L I G E N C E</Text>
              <Text style={styles.sparkle}>✦</Text>
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Your night awaits</Text>
            <Text style={styles.subtitle}>
              Curated venues, events, and experiences{'\n'}tailored to your vibe
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleGuestContinue}
            disabled={loading}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.primaryButtonText}>Start Exploring</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.microCopy}>No account needed · Personalize anytime</Text>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in for full access</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={[styles.appleButton, loading && styles.buttonDisabled]}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={22} color="#000" />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading || !request}
          >
            <Ionicons name="logo-google" size={18} color="#a1a1aa" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {!showEmailLogin ? (
            <TouchableOpacity 
              style={styles.emailToggle}
              onPress={() => setShowEmailLogin(true)}
            >
              <Ionicons name="mail-outline" size={16} color="#71717a" />
              <Text style={styles.emailToggleText}>Sign in with email</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emailForm}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#52525b"
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
                  placeholderTextColor="#52525b"
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.signUpText}>
                Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  backgroundCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circleTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.6,
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: 50,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.5,
  },
  circleBottomRight: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.4,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 12,
    marginBottom: 12,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkle: {
    fontSize: 12,
    color: '#71717a',
  },
  tagline: {
    fontSize: 10,
    fontWeight: '500',
    color: '#71717a',
    letterSpacing: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  primaryButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
  },
  microCopy: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272a',
  },
  dividerText: {
    fontSize: 12,
    color: '#52525b',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emailToggleText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  emailForm: {
    gap: 12,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  input: {
    fontSize: 15,
    color: '#fff',
    paddingVertical: 12,
  },
  emailSignInButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginTop: 4,
  },
  emailSignInButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a78bfa',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#52525b',
    textAlign: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#71717a',
  },
  signUpLink: {
    color: '#a78bfa',
    fontWeight: '600',
  },
});
