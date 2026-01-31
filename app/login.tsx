import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import authService from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  // Navigate based on onboarding status
  const navigateAfterAuth = async () => {
    const persona = await AsyncStorage.getItem('@lumina_persona');
    if (persona) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 90,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 12,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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

  const handleGoogleSignInWithToken = async (accessToken: string) => {
    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await authService.signInWithGoogle(accessToken);
      await navigateAfterAuth();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await authService.continueAsGuest();
      await navigateAfterAuth();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await authService.signInWithApple();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await navigateAfterAuth();
    } catch (error: any) {
      if (error.message !== 'Sign in cancelled') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Sign In Failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await promptAsync();
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await authService.signInWithEmail(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await navigateAfterAuth();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={['#0a0a0f', '#0f0a1a', '#0a0a0f']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Ambient Glow Effects */}
      <Animated.View style={[styles.glowOrb, styles.glowOrb1, { opacity: glowAnim }]} />
      <Animated.View style={[styles.glowOrb, styles.glowOrb2, { opacity: glowAnim }]} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Animated.View 
          style={[
            styles.content, 
            { 
              paddingTop: insets.top + 40,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Logo Section */}
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <View style={styles.glowWrapper}>
              <Animated.Text style={[styles.logoGlow, { opacity: glowAnim }]}>
                LUMINA
              </Animated.Text>
              <Text style={styles.logoText}>LUMINA</Text>
            </View>
            <View style={styles.logoIconRow}>
              <View style={styles.sparkleContainer}>
                <Ionicons name="sparkles" size={12} color={colors.violet[400]} />
              </View>
              <Text style={styles.logoTagline}>NIGHTLIFE INTELLIGENCE</Text>
              <View style={styles.sparkleContainer}>
                <Ionicons name="sparkles" size={12} color={colors.violet[400]} />
              </View>
            </View>
          </Animated.View>

          {/* Hero Text */}
          <View style={styles.header}>
            <Text style={styles.title}>Your night awaits</Text>
            <Text style={styles.subtitle}>
              Curated venues, events, and experiences{'\n'}tailored to your vibe
            </Text>
          </View>

          {/* Primary CTA */}
          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleGuestContinue}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Start Exploring</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.microCopy}>No account needed · Personalize anytime</Text>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in for full access</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Auth Buttons */}
          <View style={styles.authButtons}>
            {/* Apple Sign In */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={[styles.appleButton, loading && styles.buttonDisabled]}
                onPress={handleAppleSignIn}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Ionicons name="logo-apple" size={20} color="#000" />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}

            {/* Google Sign In */}
            <TouchableOpacity 
              style={[styles.socialButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading || !request}
              activeOpacity={0.8}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Email Toggle */}
            {!showEmailLogin ? (
              <TouchableOpacity 
                style={styles.emailToggle}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowEmailLogin(true);
                }}
              >
                <Ionicons name="mail-outline" size={16} color={colors.zinc[500]} />
                <Text style={styles.emailToggleText}>Sign in with email</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emailForm}>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color={colors.zinc[500]} style={styles.inputIcon} />
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
                  <Ionicons name="lock-closed-outline" size={18} color={colors.zinc[500]} style={styles.inputIcon} />
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
                  style={styles.forgotPassword}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/forgot-password');
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.emailSignInButton, loading && styles.buttonDisabled]}
                  onPress={handleEmailSignIn}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emailSignInButtonText}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.emailToggle}
                  onPress={() => setShowEmailLogin(false)}
                >
                  <Text style={styles.emailToggleText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/register");
              }}
              style={{ marginTop: 16 }}
            >
              <Text style={{ fontSize: 14, color: colors.zinc[500] }}>
                Don't have an account? <Text style={{ color: colors.violet[400], fontWeight: "600" }}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },

  // Ambient Glow
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowOrb1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
    backgroundColor: colors.violet[600],
    opacity: 0.15,
  },
  glowOrb2: {
    width: 250,
    height: 250,
    bottom: 100,
    left: -80,
    backgroundColor: colors.pink[600],
    opacity: 0.1,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl * 1.5,
  },
  glowWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    fontSize: 48,
    fontWeight: '800',
    color: colors.violet[500],
    letterSpacing: 10,
    textShadowColor: colors.violet[500],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 10,
  },
  logoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
  },
  sparkleContainer: {
    opacity: 0.8,
  },
  logoTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.zinc[500],
    letterSpacing: 4,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl * 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.white,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.zinc[400],
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Primary Button
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: colors.violet[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.3,
  },
  microCopy: {
    fontSize: 12,
    color: colors.zinc[600],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.zinc[800],
  },
  dividerText: {
    fontSize: 12,
    color: colors.zinc[600],
    fontWeight: '400',
  },
  
  // Auth Buttons Container
  authButtons: {
    gap: spacing.sm,
  },
  
  // Apple Button
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 15,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  
  // Google Button
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.zinc[300],
  },
  
  // Email Toggle
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: colors.violet[400],
    fontSize: 14,
    fontWeight: '500',
  },
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  emailToggleText: {
    fontSize: 13,
    color: colors.zinc[500],
    fontWeight: '500',
  },
  
  // Email Form
  emailForm: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.white,
    paddingVertical: 14,
  },
  emailSignInButton: {
    backgroundColor: colors.violet[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  emailSignInButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  
  // Footer
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.zinc[700],
    textAlign: 'center',
  },
  
  buttonDisabled: {
    opacity: 0.6,
  },
});
