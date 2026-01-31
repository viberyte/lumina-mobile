import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../../theme';

const API_URL = 'https://lumina.viberyte.com';

export default function InstagramVerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const cleanHandle = handle.trim().replace('@', '');
    
    if (!cleanHandle) {
      Alert.alert('Error', 'Please enter your Instagram handle');
      return;
    }

    if (cleanHandle.length < 2) {
      Alert.alert('Error', 'Please enter a valid Instagram handle');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const token = await AsyncStorage.getItem('@lumina_auth_token');
      
      if (!token || token === 'guest_token') {
        Alert.alert('Sign In Required', 'Please sign in to verify your Instagram', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.replace('/login') }
        ]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/user/verify-instagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ instagramHandle: cleanHandle }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      const profileStr = await AsyncStorage.getItem('@lumina_profile');
      const profile = profileStr ? JSON.parse(profileStr) : {};
      profile.instagram_handle = cleanHandle;
      profile.instagram_verified_at = new Date().toISOString();
      await AsyncStorage.setItem('@lumina_profile', JSON.stringify(profile));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Verified!', `@${cleanHandle} has been linked to your account`, [
        { text: 'Continue', onPress: () => router.back() }
      ]);

    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to verify Instagram');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Instagram</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#E1306C', '#F77737', '#FCAF45']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="logo-instagram" size={48} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Link Your Instagram</Text>
          <Text style={styles.subtitle}>
            Promoters use your Instagram to verify bookings and communicate with you
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="yourhandle"
              placeholderTextColor={colors.zinc[600]}
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          <View style={styles.benefits}>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.violet[500]} />
              <Text style={styles.benefitText}>Book VIP tables at premium venues</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.violet[500]} />
              <Text style={styles.benefitText}>Message promoters directly</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.violet[500]} />
              <Text style={styles.benefitText}>Get on exclusive guest lists</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.violet[600], colors.violet[700]]}
              style={styles.verifyBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.zinc[950],
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.zinc[900],
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.zinc[800],
    marginBottom: spacing.xl,
  },
  atSymbol: {
    fontSize: 20,
    color: colors.zinc[500],
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: colors.white,
    paddingVertical: spacing.xs,
  },
  benefits: {
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[300],
  },
  verifyBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  verifyBtnText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.white,
  },
  skipBtn: {
    paddingVertical: spacing.md,
  },
  skipText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[500],
  },
});
