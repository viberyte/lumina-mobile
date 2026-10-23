// VBR_REGISTER_V2: black & white, matches the sign-in sheet. One path (create account); partners get a quiet link.
// No promises the app doesn't keep. iOS suggests a strong password + autofills name/email.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import authService from '../services/auth';

const C = { bg: '#050508', field: '#141416', line: 'rgba(255,255,255,0.08)', focus: 'rgba(255,255,255,0.35)', ivory: '#F3F0E9', muted: 'rgba(243,240,233,0.55)', faint: 'rgba(243,240,233,0.32)', err: '#fb7185' };
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start(); }, []);

  const errs = {
    name: !name.trim() ? 'Add your name' : '',
    email: !validEmail(email) ? 'Enter a valid email' : '',
    password: password.length < 8 ? 'Use at least 8 characters' : '',
  };
  const valid = !errs.name && !errs.email && !errs.password;

  const submit = async () => {
    setTried(true);
    if (!valid) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoading(true);
    try {
      await authService.signUpWithEmail(email.trim(), password, name.trim(), { role: 'member' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/onboarding');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Couldn’t create your account', e?.message || 'Please try again.');
    } finally { setLoading(false); }
  };

  const field = (key: 'name' | 'email' | 'password', el: React.ReactNode) => (
    <View>
      <View style={[s.field, focus === key && s.fieldFocus, tried && errs[key] ? s.fieldErr : null]}>{el}</View>
      {tried && errs[key] ? <Text style={s.err}>{errs[key]}</Text> : null}
    </View>
  );

  return (
    <View style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={{ flex: 1, opacity: fade }}>
            <TouchableOpacity style={s.back} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={24} color={C.ivory} />
            </TouchableOpacity>

            <Text style={s.brand}>VIBERYTE</Text>
            <Text style={s.title}>Create your account</Text>
            <Text style={s.sub}>Save the spots you love and keep your nights in one place.</Text>

            <View style={s.form}>
              {field('name', (
                <TextInput style={s.input} placeholder="Name" placeholderTextColor={C.faint} value={name} onChangeText={setName}
                  autoCapitalize="words" textContentType="name" autoComplete="name" returnKeyType="next" editable={!loading}
                  onFocus={() => setFocus('name')} onBlur={() => setFocus(null)} onSubmitEditing={() => emailRef.current?.focus()} />
              ))}
              {field('email', (
                <TextInput ref={emailRef} style={s.input} placeholder="Email" placeholderTextColor={C.faint} value={email} onChangeText={setEmail}
                  autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email"
                  returnKeyType="next" editable={!loading} onFocus={() => setFocus('email')} onBlur={() => setFocus(null)} onSubmitEditing={() => passRef.current?.focus()} />
              ))}
              {field('password', (
                <>
                  <TextInput ref={passRef} style={s.input} placeholder="Password" placeholderTextColor={C.faint} value={password} onChangeText={setPassword}
                    secureTextEntry={!show} textContentType="newPassword" autoComplete="new-password" passwordRules="minlength: 8;"
                    returnKeyType="go" editable={!loading} onFocus={() => setFocus('password')} onBlur={() => setFocus(null)} onSubmitEditing={submit} />
                  <TouchableOpacity onPress={() => setShow((x) => !x)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                    <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.muted} />
                  </TouchableOpacity>
                </>
              ))}
              {!(tried && errs.password) ? (
                <Text style={[s.hint, password.length >= 8 && { color: C.ivory }]}>{password.length >= 8 ? '✓ ' : ''}At least 8 characters</Text>
              ) : null}

              <TouchableOpacity style={[s.cta, !valid && s.ctaOff]} onPress={submit} disabled={loading} activeOpacity={0.88} accessibilityRole="button">
                {loading ? <ActivityIndicator color="#000" /> : <Text style={[s.ctaText, !valid && s.ctaTextOff]}>Create account</Text>}
              </TouchableOpacity>

              <View style={s.row}>
                <Text style={s.rowText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.back()}><Text style={s.rowLink}>Sign in</Text></TouchableOpacity>
              </View>
            </View>

            <View style={{ flex: 1 }} />
            <TouchableOpacity style={s.partner} onPress={() => router.push('/partner')} activeOpacity={0.8}>
              <Text style={s.partnerText}>Own a venue or throw events?</Text>
              <Text style={s.partnerLink}>Partner with Viberyte →</Text>
            </TouchableOpacity>
            <Text style={s.legal}>By creating an account you agree to our Terms and Privacy Policy.</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  brand: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 4, marginTop: 18 },
  title: { color: C.ivory, fontSize: 32, fontWeight: '700', letterSpacing: -0.5, marginTop: 10 },
  sub: { color: C.muted, fontSize: 15, lineHeight: 21, marginTop: 8 },
  form: { marginTop: 32, gap: 12 },
  field: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.field, borderWidth: 1, borderColor: C.line },
  fieldFocus: { borderColor: C.focus },
  fieldErr: { borderColor: C.err },
  input: { flex: 1, color: C.ivory, fontSize: 16 },
  err: { color: C.err, fontSize: 12, marginTop: 6, marginLeft: 4 },
  hint: { color: C.faint, fontSize: 12, marginLeft: 4, marginTop: -2 },
  cta: { height: 54, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  ctaOff: { backgroundColor: 'rgba(255,255,255,0.14)' },
  ctaText: { color: '#000', fontSize: 16, fontWeight: '600' },
  ctaTextOff: { color: 'rgba(255,255,255,0.45)' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  rowText: { color: C.muted, fontSize: 14 },
  rowLink: { color: C.ivory, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  partner: { alignItems: 'center', paddingVertical: 14, marginTop: 28, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  partnerText: { color: C.faint, fontSize: 13 },
  partnerLink: { color: C.ivory, fontSize: 14, fontWeight: '600', marginTop: 3 },
  legal: { color: C.faint, fontSize: 11, textAlign: 'center', marginTop: 8 },
});
