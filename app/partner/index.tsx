import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const API_BASE = 'https://lumina.viberyte.com';

type Mode = 'welcome' | 'login' | 'signup';
type SignupStep = 1 | 2 | 3;

export default function PartnerLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('welcome');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup fields
  const [businessName, setBusinessName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryGenre, setPrimaryGenre] = useState('');
  const [promotionMethod, setPromotionMethod] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const genres = ['Hip Hop', 'R&B', 'Afrobeats', 'House', 'Latin', 'Reggaeton', 'Amapiano', 'Open Format'];
  const promotionMethods = ['Instagram', 'Text lists', 'WhatsApp / Telegram', 'Venue partnerships', 'DJ / artist network'];

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/partner/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        await AsyncStorage.setItem('lumina_partner_session', JSON.stringify({
          token: data.token,
          partner: data.partner,
        }));
        router.replace('/partner/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!businessName || !email || !password || !phone) {
     setError('DEBUG: ' + businessName + ' | ' + email + ' | ' + phone);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/partner/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          email,
          password,
          instagram_handle: instagramHandle.replace('@', ''),
          phone,
          primary_genre: primaryGenre,
          promotion_method: promotionMethod,
          verification_status: 'new', // Starts unverified
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await AsyncStorage.setItem('lumina_partner_session', JSON.stringify({
          token: data.token,
          partner: data.partner,
        }));
        router.replace('/partner/dashboard');
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');
    
    if (signupStep === 1) {
      if (!businessName) {
        setError('Enter your business name');
        return;
      }
      if (!instagramHandle) {
        setError('Instagram is required to verify you');
        return;
      }
    }
    if (signupStep === 2) {
      if (!email || !password) {
        setError('Enter email and password');
        return;
      }
      if (!phone) {
        setError('Phone number is required');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }
    
    if (signupStep < 3) {
      setSignupStep((signupStep + 1) as SignupStep);
    } else {
      handleSignup();
    }
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (signupStep > 1) {
      setSignupStep((signupStep - 1) as SignupStep);
      setError('');
    } else {
      setMode('welcome');
    }
  };

  // Welcome Screen
  if (mode === 'welcome') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.welcomeContent}>
                      <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
            <Text style={styles.welcomeTitle}>Partner Portal</Text>
            <Text style={styles.welcomeSubtitle}>Create events, manage bookings, grow your brand</Text>
          </View>

          <View style={styles.welcomeActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setMode('login')}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => { setMode('signup'); setSignupStep(1); }}>
              <Text style={styles.secondaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Login Screen
  if (mode === 'login') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.keyboardView}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => setMode('welcome')}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.loginContent}>
              <Text style={styles.loginTitle}>Welcome back</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@venue.com"
                  placeholderTextColor="#52525b"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#52525b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={[styles.signInButton, loading && styles.buttonDisabled]} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Signup Flow (3 Steps)
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardView}
        >
          <TouchableOpacity style={styles.backButton} onPress={prevStep}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((step) => (
              <View 
                key={step} 
                style={[
                  styles.progressDot, 
                  signupStep >= step && styles.progressDotActive
                ]} 
              />
            ))}
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Step 1: Business Info + Instagram */}
            {signupStep === 1 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Create your profile</Text>
                <Text style={styles.stepSubtitle}>This is how you'll appear on Lumina</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>BUSINESS NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Elite Nightlife"
                    placeholderTextColor="#52525b"
                    value={businessName}
                    onChangeText={setBusinessName}
                    autoCapitalize="words"
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>INSTAGRAM</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="@yourhandle"
                    placeholderTextColor="#52525b"
                    value={instagramHandle}
                    onChangeText={setInstagramHandle}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.inputHint}>Required to verify you as a real promoter</Text>
                </View>
              </View>
            )}

            {/* Step 2: Account Credentials */}
            {signupStep === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Secure your account</Text>
                <Text style={styles.stepSubtitle}>You'll use this to sign in</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@business.com"
                    placeholderTextColor="#52525b"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#52525b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="(555) 555-5555"
                    placeholderTextColor="#52525b"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <Text style={styles.inputHint}>Required for payouts and verification</Text>
                </View>
              </View>
            )}

            {/* Step 3: Genre + Promotion Method */}
            {signupStep === 3 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Almost there</Text>
                <Text style={styles.stepSubtitle}>Help us understand your vibe</Text>

                <Text style={styles.sectionLabel}>PRIMARY GENRE</Text>
                <View style={styles.chipGrid}>
                  {genres.map((genre) => (
                    <TouchableOpacity
                      key={genre}
                      style={[
                        styles.chip,
                        primaryGenre === genre && styles.chipSelected
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPrimaryGenre(genre);
                      }}
                    >
                      <Text style={[
                        styles.chipText,
                        primaryGenre === genre && styles.chipTextSelected
                      ]}>
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 28 }]}>HOW DO YOU PROMOTE?</Text>
                <View style={styles.chipGrid}>
                  {promotionMethods.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.chip,
                        promotionMethod === method && styles.chipSelected
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPromotionMethod(method);
                      }}
                    >
                      <Text style={[
                        styles.chipText,
                        promotionMethod === method && styles.chipTextSelected
                      ]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          {/* Bottom Action */}
          <View style={styles.bottomAction}>
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled]} 
              onPress={nextStep}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {signupStep === 3 ? 'Create Profile' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>
            
            {signupStep === 3 && (
              <Text style={styles.termsText}>
                Your profile will be live. Verify to unlock bookings.
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },

  backButton: { padding: 16 },

  // Welcome
  welcomeContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logoContainer: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(139, 92, 246, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  welcomeTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8 },
  welcomeSubtitle: { fontSize: 15, color: '#71717a', textAlign: 'center', lineHeight: 22 }, logo: { width: 100, height: 100, marginBottom: 24 },


  welcomeActions: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  primaryButton: { backgroundColor: '#fff', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#000' },
  secondaryButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  secondaryButtonText: { fontSize: 16, fontWeight: '500', color: '#fff' },

  // Login
  loginContent: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  loginTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 32 },

  // Progress
  progressContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  progressDotActive: { backgroundColor: '#8B5CF6', width: 24 },

  // Steps
  stepContent: { paddingTop: 8 },
  stepTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8 },
  stepSubtitle: { fontSize: 15, color: '#71717a', marginBottom: 32 },

  // Inputs
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 12, fontWeight: '500', color: '#52525b', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)' },
  inputHint: { fontSize: 12, color: '#52525b', marginTop: 8 },

  // Sections
  sectionLabel: { fontSize: 12, fontWeight: '500', color: '#52525b', marginBottom: 12, letterSpacing: 0.5 },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)' },
  chipSelected: { backgroundColor: 'rgba(139, 92, 246, 0.12)', borderColor: '#8B5CF6' },
  chipText: { fontSize: 14, color: '#a1a1aa', fontWeight: '500' },
  chipTextSelected: { color: '#8B5CF6' },

  // Error
  errorText: { fontSize: 14, color: '#ef4444', marginTop: 16, textAlign: 'center' },

  // Buttons
  signInButton: { backgroundColor: '#fff', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  signInButtonText: { fontSize: 16, fontWeight: '600', color: '#000' },
  buttonDisabled: { opacity: 0.6 },

  forgotButton: { alignItems: 'center', marginTop: 20 },
  forgotText: { fontSize: 14, color: '#8B5CF6' },

  // Bottom
  bottomAction: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 },
  termsText: { fontSize: 13, color: '#52525b', textAlign: 'center', marginTop: 16 },
});
