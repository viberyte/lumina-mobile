// app/login.tsx — Viberyte Welcome V2 (VBR_WELCOME_V2)
// One primary action (Start Exploring, guest). Apple / Google / email live in a single "Sign in" sheet.
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, Platform,
  Alert, ActivityIndicator, Dimensions, Animated, Modal, Pressable, Linking, AccessibilityInfo,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';

const { width, height } = Dimensions.get('window');
const GOLD = '#C5A36B';
const TERMS_URL = 'https://viberyte.com/terms';
const PRIVACY_URL = 'https://viberyte.com/privacy';

function ShootingStar({ delay, startX, startY, angle }: { delay: number; startX: number; startY: number; angle: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    const animate = () => {
      if (!alive) return;
      progress.setValue(0); opacity.setValue(0);
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
    return () => { alive = false; };
  }, []);
  const length = 120, rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * length, dy = Math.sin(rad) * length;
  return (
    <Animated.View style={{ position: 'absolute', left: startX, top: startY, opacity, transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
    ] }}>
      <View style={{ width: length * 0.6, height: 1.5, borderRadius: 2, transform: [{ rotate: `${angle}deg` }],
        backgroundColor: 'rgba(255,255,255,0.9)', shadowColor: '#fff', shadowOpacity: 0.8, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } }} />
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

// VBR_WELCOME_VIDEO: bundled, muted, looping; fades in when ready; paused when leaving or with Reduce Motion
const WELCOME_VIDEO = require('../assets/video/welcome.mp4');
function WelcomeVideo({ playing }: { playing: boolean }) {
  const player = useVideoPlayer(WELCOME_VIDEO, (pl) => { pl.loop = true; pl.muted = true; });
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sub = player.addListener('statusChange', (e: any) => {
      if (e?.status === 'readyToPlay') Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    });
    return () => { try { sub.remove(); } catch {} };
  }, [player]);
  useEffect(() => { try { playing ? player.play() : player.pause(); } catch {} }, [playing, player]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="none">
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
    </Animated.View>
  );
}

type Busy = null | 'guest' | 'apple' | 'google' | 'email';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const loading = busy !== null;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {}); }, []);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const glowPulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.7, duration: 4000, useNativeDriver: true }),
    ])).start();
  }, []);

  const { request, response, promptAsync } = authService.useGoogleAuth();
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) handleGoogleSignInWithToken(authentication.accessToken);
    } else if (response) setBusy(null);
  }, [response]);

  const checkOnboardingComplete = async (): Promise<boolean> => {
    try {
      const persona = await AsyncStorage.getItem('@lumina_persona');
      const preferences = await AsyncStorage.getItem('@lumina_preferences');
      return !!(persona || preferences);
    } catch { return false; }
  };
  const goNext = async () => {
    setSheet(false);
    const done = await checkOnboardingComplete();
    router.replace(done ? '/(tabs)' : '/onboarding');
  };

  const handleGoogleSignInWithToken = async (accessToken: string) => {
    setBusy('google');
    try { await authService.signInWithGoogle(accessToken); await goNext(); }
    catch (e: any) { Alert.alert('Sign In Failed', e.message); }
    finally { setBusy(null); }
  };
  const handleGuestContinue = async () => {
    setBusy('guest');
    try { await authService.continueAsGuest(); await goNext(); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setBusy(null); }
  };
  const handleAppleSignIn = async () => {
    setBusy('apple');
    try { await authService.signInWithApple(); await goNext(); }
    catch (e: any) { if (e.message !== 'Sign in cancelled') Alert.alert('Sign In Failed', e.message); }
    finally { setBusy(null); }
  };
  const handleGoogleSignIn = async () => {
    try { setBusy('google'); const r = await promptAsync(); if (r?.type !== 'success') setBusy(null); }
    catch (e: any) { setBusy(null); Alert.alert('Sign In Failed', e.message); }
  };
  const handleEmailSignIn = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please enter email and password'); return; }
    setBusy('email');
    try { await authService.signInWithEmail(email, password, false); await goNext(); }
    catch (e: any) { Alert.alert('Sign In Failed', e.message); }
    finally { setBusy(null); }
  };
  const openRegister = () => { setSheet(false); router.push('/register'); };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050508' }]} />
      {!reduceMotion ? <WelcomeVideo playing={busy === null && !sheet} /> : null}
      <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill}
        colors={['rgba(5,5,8,0.45)', 'rgba(5,5,8,0.55)', 'rgba(5,5,8,0.94)']} locations={[0, 0.4, 0.8]} />
      <Animated.View style={[styles.ambientGlow, { opacity: glowPulse }]} pointerEvents="none">
        <LinearGradient colors={['rgba(197, 163, 107, 0.16)', 'rgba(197, 163, 107, 0.05)', 'transparent']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {reduceMotion ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {STARS.map((s, i) => <ShootingStar key={i} {...s} />)}
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        bounces={false} showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ flex: 1, opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>VIBERYTE</Text>
            <Text style={styles.brandSub}>DINING · LOUNGES · NIGHTLIFE</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroLight}>The night</Text>
            <Text style={styles.heroBold}>starts here.</Text>
            <Text style={styles.heroSub}>Discover restaurants, lounges, and nightlife worth going out for.</Text>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, loading && styles.dim]} onPress={handleGuestContinue} disabled={loading} activeOpacity={0.88} accessibilityRole="button">
            {busy === 'guest' ? <ActivityIndicator color="#0A0A0C" /> : <Text style={styles.primaryBtnText}>Start Exploring</Text>}
          </TouchableOpacity>
          <Text style={styles.noCta}>No account required</Text>

          <View style={{ flex: 1, minHeight: 40 }} />

          <TouchableOpacity style={styles.signInRow} onPress={() => setSheet(true)} disabled={loading} hitSlop={12} accessibilityRole="button">
            <Text style={styles.signInText}>Already have an account? <Text style={styles.signInLink}>Sign in</Text></Text>
          </TouchableOpacity>

          <View style={styles.legalRow}>
            <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">Terms of Service</Text>
            <Text style={styles.legalDot}>·</Text>
            <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">Privacy Policy</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => !loading && setSheet(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Sign in</Text>
            <Text style={styles.sheetSub}>Your saved spots follow you to any device.</Text>

            <TouchableOpacity style={[styles.appleBtn, loading && styles.dim]} onPress={handleAppleSignIn} disabled={loading} activeOpacity={0.88}>
              {busy === 'apple' ? <ActivityIndicator color="#000" /> : (<><Ionicons name="logo-apple" size={20} color="#000" /><Text style={styles.appleBtnText}>Continue with Apple</Text></>)}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.googleBtn, (loading || !request) && styles.dim]} onPress={handleGoogleSignIn} disabled={loading || !request} activeOpacity={0.88}>
              {busy === 'google' ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="logo-google" size={17} color="#fff" /><Text style={styles.googleBtnText}>Continue with Google</Text></>)}
            </TouchableOpacity>

            {!showEmail ? (
              <TouchableOpacity style={styles.textLink} onPress={() => setShowEmail(true)} disabled={loading}>
                <Text style={styles.textLinkText}>Use email instead</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emailForm}>
                <TextInput style={styles.input} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.35)" value={email}
                  onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" editable={!loading} />
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor="rgba(255,255,255,0.35)" value={password}
                  onChangeText={setPassword} secureTextEntry textContentType="password" editable={!loading} onSubmitEditing={handleEmailSignIn} returnKeyType="go" />
                <TouchableOpacity style={[styles.emailSubmit, loading && styles.dim]} onPress={handleEmailSignIn} disabled={loading}>
                  {busy === 'email' ? <ActivityIndicator color="#000" /> : <Text style={styles.emailSubmitText}>Sign In</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.textLink} onPress={openRegister} disabled={loading}>
                  <Text style={styles.textLinkText}>New with email? <Text style={styles.signInLink}>Create an account</Text></Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  ambientGlow: { position: 'absolute', top: -height * 0.15, left: -width * 0.25, width: width * 1.5, height: height * 0.65, borderRadius: width },
  scroll: { flexGrow: 1, paddingHorizontal: 28 },
  brand: { alignItems: 'center', marginBottom: 52 },
  brandName: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 7, marginBottom: 8 },
  brandSub: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.45)', letterSpacing: 3 },
  hero: { marginBottom: 40 },
  heroLight: { fontSize: 48, fontWeight: '200', color: 'rgba(255,255,255,0.72)', letterSpacing: -1.5, lineHeight: 54 },
  heroBold: { fontSize: 48, fontWeight: '700', color: '#fff', letterSpacing: -1.5, lineHeight: 54, marginBottom: 18 },
  heroSub: { fontSize: 16, color: 'rgba(255,255,255,0.68)', lineHeight: 24, fontWeight: '400', maxWidth: 320 },
  primaryBtn: { height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: GOLD, marginBottom: 12 },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#0A0A0C', letterSpacing: -0.2 },
  noCta: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', letterSpacing: 0.2 },
  signInRow: { alignItems: 'center', paddingVertical: 12 },
  signInText: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  signInLink: { color: GOLD, fontWeight: '600' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 6 },
  legalLink: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecorationLine: 'underline', paddingVertical: 6 },
  legalDot: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  dim: { opacity: 0.55 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#141416', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 18 },
  sheetTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  sheetSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4, marginBottom: 20 },
  appleBtn: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, marginBottom: 10 },
  appleBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  googleBtn: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)', marginBottom: 4 },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  textLink: { alignItems: 'center', paddingVertical: 14 },
  textLinkText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  emailForm: { gap: 10, marginTop: 6 },
  input: { height: 52, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  emailSubmit: { height: 52, backgroundColor: '#fff', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emailSubmitText: { fontSize: 16, fontWeight: '600', color: '#000' },
});
