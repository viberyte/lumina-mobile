import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';

const { width, height } = Dimensions.get('window');

// Shooting star component
function ShootingStar({ delay, startX, startY, angle }: { delay: number; startX: number; startY: number; angle: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      progress.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(progress, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7, duration: 100, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(Math.random() * 3000 + 2000),
      ]).start(() => animate());
    };
    animate();
  }, []);

  const length = 120;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * length;
  const dy = Math.sin(rad) * length;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        opacity,
        transform: [
          {
            translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }),
          },
          {
            translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }),
          },
        ],
      }}
    >
      <View
        style={{
          width: length * 0.6,
          height: 1.5,
          borderRadius: 1,
          transform: [{ rotate: `${angle}deg` }],
          background: 'transparent',
          overflow: 'visible',
        }}
      >
        <View style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: length * 0.6,
          height: 1.5,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.9)',
          shadowColor: '#fff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 3,
        }} />
      </View>
    </Animated.View>
  );
}

const STARS = [
  { delay: 0,    startX: width * 0.1,  startY: height * 0.05, angle: 35 },
  { delay: 1200, startX: width * 0.6,  startY: height * 0.02, angle: 40 },
  { delay: 2400, startX: width * 0.3,  startY: height * 0.15, angle: 30 },
  { delay: 3600, startX: width * 0.75, startY: height * 0.08, angle: 45 },
  { delay: 800,  startX: width * 0.85, startY: height * 0.2,  angle: 38 },
  { delay: 2000, startX: width * 0.05, startY: height * 0.3,  angle: 42 },
  { delay: 4000, startX: width * 0.5,  startY: height * 0.01, angle: 35 },
];


export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPartnerLogin, setIsPartnerLogin] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const glowPulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.7, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const { request, response, promptAsync } = authService.useGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) handleGoogleSignInWithToken(authentication.accessToken);
    }
  }, [response]);

  const checkOnboardingComplete = async (): Promise<boolean> => {
    try {
      const persona = await AsyncStorage.getItem('@lumina_persona');
      const preferences = await AsyncStorage.getItem('@lumina_preferences');
      return !!(persona || preferences);
    } catch { return false; }
  };

  const handleGoogleSignInWithToken = async (accessToken: string) => {
    setLoading(true);
    try {
      await authService.signInWithGoogle(accessToken);
      const done = await checkOnboardingComplete();
      router.replace(done ? '/(tabs)' : '/onboarding');
    } catch (e: any) { Alert.alert('Sign In Failed', e.message); }
    finally { setLoading(false); }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    try {
      await authService.continueAsGuest();
      const done = await checkOnboardingComplete();
      router.replace(done ? '/(tabs)' : '/onboarding');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await authService.signInWithApple();
      const done = await checkOnboardingComplete();
      router.replace(done ? '/(tabs)' : '/onboarding');
    } catch (e: any) {
      if (e.message !== 'Sign in cancelled') Alert.alert('Sign In Failed', e.message);
    } finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    try { await promptAsync(); }
    catch (e: any) { Alert.alert('Sign In Failed', e.message); }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please enter email and password'); return; }
    setLoading(true);
    try {
      await authService.signInWithEmail(email, password, isPartnerLogin);
      const done = await checkOnboardingComplete();
      router.replace(done ? '/(tabs)' : '/onboarding');
    } catch (e: any) { Alert.alert('Sign In Failed', e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.root}>

      {/* Jet black base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050508' }]} />

      {/* Single ambient glow — centered, top third */}
      <Animated.View style={[styles.ambientGlow, { opacity: glowPulse }]}>
        <LinearGradient
          colors={['#4c1d95', '#2e1065', 'transparent']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Shooting stars */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        {STARS.map((s, i) => (
          <ShootingStar key={i} delay={s.delay} startX={s.startX} startY={s.startY} angle={s.angle} />
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

            {/* Brand */}
            <View style={styles.brand}>
              <Text style={styles.brandName}>VIBERYTE</Text>
              <Text style={styles.brandSub}>NIGHTLIFE INTELLIGENCE</Text>
            </View>

            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroLight}>The night</Text>
              <Text style={styles.heroBold}>starts here.</Text>
              <Text style={styles.heroSub}>
                Curated venues, flows & events{'\n'}built for how you move.
              </Text>
            </View>

            {/* Primary CTA */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleGuestContinue}
              disabled={loading}
              activeOpacity={0.88}
            >
              <View style={styles.primaryBtnGrad}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Start Exploring</Text>
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.noCta}>No account needed</Text>

            {/* Divider */}
            <View style={styles.divRow}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>or sign in</Text>
              <View style={styles.divLine} />
            </View>

            {/* Apple */}
            <TouchableOpacity style={styles.appleBtn} onPress={handleAppleSignIn} disabled={loading} activeOpacity={0.88}>
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.appleBtnText}>Continue with Apple</Text>
            </TouchableOpacity>

            {/* Google */}
            <TouchableOpacity style={styles.ghostBtn} onPress={handleGoogleSignIn} disabled={loading || !request} activeOpacity={0.88}>
              <Ionicons name="logo-google" size={16} color="rgba(255,255,255,0.4)" />
              <Text style={styles.ghostBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Email */}
            {!showEmailLogin ? (
              <TouchableOpacity style={styles.textLink} onPress={() => setShowEmailLogin(true)}>
                <Text style={styles.textLinkText}>Sign in with email</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emailForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
                <TouchableOpacity style={styles.partnerRow} onPress={() => setIsPartnerLogin(!isPartnerLogin)}>
                  <View style={[styles.track, isPartnerLogin && styles.trackOn]}>
                    <View style={[styles.thumb, isPartnerLogin && styles.thumbOn]} />
                  </View>
                  <Text style={[styles.partnerLabel, isPartnerLogin && styles.partnerLabelOn]}>Partner Login</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emailSubmit} onPress={handleEmailSignIn} disabled={loading}>
                  <Text style={styles.emailSubmitText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.textLink} onPress={() => setShowEmailLogin(false)}>
                  <Text style={styles.textLinkText}>Hide</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.legal}>By continuing, you agree to our Terms & Privacy Policy</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.signupRow}>
                  New here? <Text style={styles.signupLink}>Create account</Text>
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
  root: { flex: 1, backgroundColor: '#050508' },
  ambientGlow: {
    position: 'absolute',
    top: -height * 0.15,
    left: -width * 0.25,
    width: width * 1.5,
    height: height * 0.65,
    borderRadius: width,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 52,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 7,
    marginBottom: 7,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 3.5,
  },
  hero: {
    marginBottom: 44,
  },
  heroLight: {
    fontSize: 48,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: -1.5,
    lineHeight: 54,
  },
  heroBold: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1.5,
    lineHeight: 54,
    marginBottom: 18,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.32)',
    lineHeight: 23,
    fontWeight: '400',
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  primaryBtnGrad: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.18)',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  divRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  divLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  divText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.18)',
    letterSpacing: 0.5,
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 13,
    paddingVertical: 16,
    marginBottom: 10,
  },
  appleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 13,
    paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  textLinkText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
  },
  emailForm: { gap: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  track: {
    width: 38,
    height: 21,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  trackOn: { backgroundColor: '#7c3aed' },
  thumb: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  thumbOn: { alignSelf: 'flex-end' },
  partnerLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
  },
  partnerLabelOn: { color: '#a78bfa' },
  emailSubmit: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  emailSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
  footer: {
    paddingTop: 28,
    alignItems: 'center',
    gap: 10,
  },
  legal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.12)',
    textAlign: 'center',
    lineHeight: 16,
  },
  signupRow: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.25)',
  },
  signupLink: {
    color: '#a78bfa',
    fontWeight: '600',
  },
});
