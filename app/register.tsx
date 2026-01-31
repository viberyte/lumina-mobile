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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import authService from '../services/auth';
import { colors, spacing } from '../theme';

type UserRole = 'member' | 'partner';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<UserRole>('member');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Partner-specific fields
  const [businessName, setBusinessName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [partnerRole, setPartnerRole] = useState<'venue_owner' | 'promoter' | 'staff'>('promoter');
  
  // Inline validation errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [businessError, setBusinessError] = useState('');

  // Animations - quieter, more confident
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0.1)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 90, useNativeDriver: true }),
    ]).start();

    // Quieter glow: 0.1 → 0.18 → settle at 0.12
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.18, duration: 800, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.12, duration: 1200, useNativeDriver: true }),
    ]).start();
  }, []);

  // Calmer toggle animation - less bouncy, more confident
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: role === 'member' ? 0 : 1,
      damping: 25,
      stiffness: 160,
      useNativeDriver: false,
    }).start();
  }, [role]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Real-time validation
  const isMemberValid = 
    name.trim().length > 0 && 
    validateEmail(email) && 
    password.length >= 8 && 
    password === confirmPassword;

  const isPartnerValid = 
    isMemberValid && 
    businessName.trim().length > 0;

  const isValid = role === 'member' ? isMemberValid : isPartnerValid;

  // Clear errors as user types
  useEffect(() => { if (name.trim()) setNameError(''); }, [name]);
  useEffect(() => { if (validateEmail(email) || email === '') setEmailError(''); }, [email]);
  useEffect(() => { if (password.length >= 8 || password === '') setPasswordError(''); }, [password]);
  useEffect(() => { if (password === confirmPassword || confirmPassword === '') setConfirmError(''); }, [password, confirmPassword]);
  useEffect(() => { if (businessName.trim()) setBusinessError(''); }, [businessName]);

  // Dynamic "listening line" based on context
  const getListeningLine = () => {
    if (role === 'member') {
      return "We'll personalize recommendations just for you";
    }
    switch (partnerRole) {
      case 'venue_owner':
        return "We'll help bring the right crowd to your venue";
      case 'promoter':
        return "We'll help you promote events to the right audience";
      case 'staff':
        return "We'll help you manage your presence";
      default:
        return "We'll help grow your business";
    }
  };

  // Partner role context hint
  const getRoleHint = () => {
    switch (partnerRole) {
      case 'venue_owner':
        return 'Manage your venue profile and bookings';
      case 'promoter':
        return 'Post events and reach new guests';
      case 'staff':
        return 'Help manage listings and requests';
      default:
        return '';
    }
  };

  const handleRegister = async () => {
    let hasError = false;

    if (!name.trim()) { setNameError('Please enter your name'); hasError = true; }
    if (!validateEmail(email)) { setEmailError('Please enter a valid email'); hasError = true; }
    if (password.length < 8) { setPasswordError('Password needs 8+ characters'); hasError = true; }
    if (password !== confirmPassword) { setConfirmError('Passwords don\'t match'); hasError = true; }
    if (role === 'partner' && !businessName.trim()) { setBusinessError('Please enter your business name'); hasError = true; }

    if (hasError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      await authService.signUpWithEmail(email, password, name, {
        role,
        ...(role === 'partner' && {
          businessName,
          instagramHandle: instagramHandle.replace('@', ''),
          partnerRole,
        }),
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Thoughtful pause before navigation
      setTimeout(() => {
        if (role === 'partner') {
          console.log('NAVIGATING TO PARTNER ONBOARDING'); router.replace('/partner-onboarding');
        } else {
          router.replace('/onboarding');
        }
      }, 400);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Something went wrong', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRole(newRole);
  };

  const toggleSlide = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '50%'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0f', '#0f0a1a', '#0a0a0f']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.glowOrb, { opacity: glowAnim }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.zinc[400]} />
            </TouchableOpacity>

            {/* Segmented Toggle */}
            <View style={styles.toggleContainer}>
              <Animated.View style={[styles.toggleSlider, { left: toggleSlide }]} />
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => handleRoleChange('member')}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, role === 'member' && styles.toggleTextActive]}>
                  Discover
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => handleRoleChange('partner')}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, role === 'partner' && styles.toggleTextActive]}>
                  Partner
                </Text>
              </TouchableOpacity>
            </View>

            {/* Header with Listening Line */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {role === 'member' ? 'Join Lumina' : 'Partner with Lumina'}
              </Text>
              <Text style={styles.listening}>{getListeningLine()}</Text>
              <Text style={styles.reassurance}>Takes less than a minute</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name */}
              <View style={[styles.inputContainer, nameError && styles.inputError]}>
                <Ionicons name="person-outline" size={18} color={nameError ? '#fb7185' : colors.zinc[500]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={colors.zinc[600]}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
                {name.trim().length > 0 && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.violet[400]} />
                )}
              </View>
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

              {/* Email */}
              <View style={[styles.inputContainer, emailError && styles.inputError]}>
                <Ionicons name="mail-outline" size={18} color={emailError ? '#fb7185' : colors.zinc[500]} style={styles.inputIcon} />
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
                {validateEmail(email) && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.violet[400]} />
                )}
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

              {/* Partner-specific fields */}
              {role === 'partner' && (
                <>
                  {/* Business Name */}
                  <View style={[styles.inputContainer, businessError && styles.inputError]}>
                    <Ionicons name="business-outline" size={18} color={businessError ? '#fb7185' : colors.zinc[500]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Business or brand name"
                      placeholderTextColor={colors.zinc[600]}
                      value={businessName}
                      onChangeText={setBusinessName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                    {businessName.trim().length > 0 && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.violet[400]} />
                    )}
                  </View>
                  {businessError ? <Text style={styles.errorText}>{businessError}</Text> : null}

                  {/* Partner Role Pills */}
                  <View style={styles.roleSection}>
                    <Text style={styles.roleLabel}>I am a...</Text>
                    <View style={styles.rolePills}>
                      {(['promoter', 'venue_owner', 'staff'] as const).map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[styles.rolePill, partnerRole === r && styles.rolePillActive]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setPartnerRole(r);
                          }}
                        >
                          <Text style={[styles.rolePillText, partnerRole === r && styles.rolePillTextActive]}>
                            {r === 'venue_owner' ? 'Venue Owner' : r === 'promoter' ? 'Promoter' : 'Staff'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.roleHint}>{getRoleHint()}</Text>
                  </View>

                  {/* Instagram Handle */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="logo-instagram" size={18} color={colors.zinc[500]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Instagram handle (optional)"
                      placeholderTextColor={colors.zinc[600]}
                      value={instagramHandle}
                      onChangeText={setInstagramHandle}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                  </View>
                  <Text style={styles.hint}>Used for verification & promotion</Text>
                </>
              )}

              {/* Password */}
              <View style={[styles.inputContainer, passwordError && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={18} color={passwordError ? '#fb7185' : colors.zinc[500]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.zinc[600]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.zinc[500]}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              
              <Text style={[styles.hint, password.length >= 8 && styles.hintSuccess]}>
                {password.length >= 8 ? '✓ ' : ''}At least 8 characters
              </Text>

              {/* Confirm Password */}
              <View style={[styles.inputContainer, confirmError && styles.inputError]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={confirmError ? '#fb7185' : colors.zinc[500]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.zinc[600]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                {confirmPassword.length > 0 && password === confirmPassword && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.violet[400]} />
                )}
              </View>
              {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}

              {/* Register Button */}
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isValid 
                    ? ['#8b5cf6', '#7c3aed', '#6d28d9']
                    : ['#3f3f46', '#3f3f46', '#3f3f46']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.registerButtonGradient}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={styles.registerButtonText}>Setting things up…</Text>
                    </View>
                  ) : (
                    <Text style={[
                      styles.registerButtonText,
                      !isValid && styles.registerButtonTextDisabled
                    ]}>
                      Continue
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signInRow}>
                <Text style={styles.signInText}>Already have an account?</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                  }}
                >
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
              <Text style={styles.footerText}>
                By continuing, you agree to our Terms & Privacy Policy
              </Text>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  glowOrb: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: colors.violet[600],
    top: -50,
    right: -100,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginTop: 12,
    marginLeft: -8,
  },
  // Segmented Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  toggleSlider: {
    position: 'absolute',
    width: '48%',
    height: '100%',
    backgroundColor: colors.violet[600],
    borderRadius: 10,
    top: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.zinc[500],
  },
  toggleTextActive: {
    color: colors.white,
  },
  // Header
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
  },
  listening: {
    fontSize: 14,
    color: colors.zinc[400],
    lineHeight: 20,
  },
  reassurance: {
    fontSize: 13,
    color: colors.zinc[600],
    marginTop: 8,
  },
  // Form
  form: {
    gap: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  inputError: {
    borderColor: '#fb7185',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.white,
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#fb7185',
    marginTop: 4,
    marginLeft: 4,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: colors.zinc[600],
    marginLeft: 4,
    marginBottom: 4,
  },
  hintSuccess: {
    color: colors.violet[400],
  },
  // Partner Role Section
  roleSection: {
    marginVertical: spacing.sm,
  },
  roleLabel: {
    fontSize: 13,
    color: colors.zinc[400],
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  rolePills: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rolePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  rolePillActive: {
    backgroundColor: colors.violet[600],
    borderColor: colors.violet[600],
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.zinc[500],
  },
  rolePillTextActive: {
    color: colors.white,
  },
  roleHint: {
    fontSize: 12,
    color: colors.zinc[600],
    marginTop: 8,
    marginLeft: 4,
  },
  // Button
  registerButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: spacing.lg,
    shadowColor: colors.violet[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  registerButtonGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  registerButtonTextDisabled: {
    color: colors.zinc[500],
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  signInText: {
    fontSize: 14,
    color: colors.zinc[500],
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.violet[400],
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.zinc[700],
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.9,
  },
});
