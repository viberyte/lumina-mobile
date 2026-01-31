import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../../theme';
import { glassStyles } from '../../theme/vibeGradients';

const API_BASE = 'https://lumina.viberyte.com';

export default function PartnerApplyScreen() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    instagram_handle: '',
    business_name: '',
    email: '',
    phone: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.instagram_handle || !formData.business_name || !formData.email || !formData.phone) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(`${API_BASE}/api/partners/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Application Submitted!',
          'We will review your application and get back to you within 24 hours.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', data.error || 'Application failed');
      }
    } catch (error) {
      console.error('Application error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Program</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Join as a Lumina Partner</Text>
              <Text style={styles.heroSubtitle}>
                For DJs, promoters, venues, and event organizers. Reach your audience where they are.
              </Text>
            </View>

            <View style={styles.benefitsGrid}>
              <View style={[styles.benefitCard, glassStyles.liquid]}>
                <Text style={styles.benefitEmoji}>📢</Text>
                <Text style={styles.benefitTitle}>Direct Access</Text>
                <Text style={styles.benefitText}>Post to vibe-specific communities</Text>
              </View>
              <View style={[styles.benefitCard, glassStyles.liquid]}>
                <Text style={styles.benefitEmoji}>👥</Text>
                <Text style={styles.benefitTitle}>Build Your Following</Text>
                <Text style={styles.benefitText}>Users follow you across all cities</Text>
              </View>
              <View style={[styles.benefitCard, glassStyles.liquid]}>
                <Text style={styles.benefitEmoji}>🌍</Text>
                <Text style={styles.benefitTitle}>Multi-City Reach</Text>
                <Text style={styles.benefitText}>Post events anywhere you go</Text>
              </View>
            </View>

            <View style={[styles.formContainer, glassStyles.liquid]}>
              <Text style={styles.formTitle}>Application</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Instagram Handle <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="@yourhandle"
                  placeholderTextColor={colors.zinc[500]}
                  value={formData.instagram_handle}
                  onChangeText={(text) => setFormData({ ...formData, instagram_handle: text })}
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>Must be a professional/business account</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Name / Brand <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="DJ Name / Venue / Event Series"
                  placeholderTextColor={colors.zinc[500]}
                  value={formData.business_name}
                  onChangeText={(text) => setFormData({ ...formData, business_name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.zinc[500]}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Phone Number <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.zinc[500]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tell us about yourself</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What events do you run? Which cities do you operate in?"
                  placeholderTextColor={colors.zinc[500]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.reviewTime}>
                ⏱️ Review time: Usually within 24 hours
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsGrid: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  benefitCard: {
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  benefitEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  benefitTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  benefitText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
    textAlign: 'center',
  },
  formContainer: {
    padding: spacing.lg,
    borderRadius: 20,
  },
  formTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.red[400],
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[500],
    marginTop: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.violet[500],
    borderRadius: 24,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.zinc[700],
  },
  submitButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.white,
  },
  reviewTime: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
