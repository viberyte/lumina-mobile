import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';
import { colors, spacing } from '../theme';

const API_BASE = 'https://lumina.viberyte.com';

type Tier = 'claimed' | 'spotlight' | 'elite';

const TIERS = [
  {
    id: 'claimed' as Tier,
    name: 'Claimed',
    tagline: 'Get discovered',
    price: 'Free',
    priceValue: 0,
    features: [
      'Claim your venue',
      'Edit venue profile',
      'Post basic events',
      'Get discovered',
    ],
    buttonText: 'Claim Your Venue',
    buttonTextSelected: 'Selected',
    popular: false,
  },
  {
    id: 'spotlight' as Tier,
    name: 'Spotlight',
    tagline: 'Grow your presence',
    price: '$25',
    priceValue: 25,
    features: [
      'Everything in Free',
      'Event promotion boost',
      'Happy Hour placement',
      'Daily Specials placement',
      'Continue the Night flow',
      'Basic analytics',
    ],
    buttonText: 'Unlock Spotlight',
    buttonTextSelected: 'Selected',
    popular: true,
  },
  {
    id: 'elite' as Tier,
    name: 'Elite',
    tagline: 'Full booking system',
    price: '$44.99',
    priceValue: 44.99,
    features: [
      'Everything in Spotlight',
      'Table bookings',
      'Accept payments',
      'VIP section management',
      'Advanced analytics',
      'Priority placement',
    ],
    buttonText: 'Upgrade to Elite',
    buttonTextSelected: 'Selected',
    popular: false,
  },
];

export default function PartnerTierScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTier, setSelectedTier] = useState<Tier>('spotlight');
  const [loading, setLoading] = useState(false);
  const [partnerData, setPartnerData] = useState<any>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    loadPartnerData();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 90, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.12, duration: 1200, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadPartnerData = async () => {
    const data = await authService.getPartnerData();
    setPartnerData(data);
  };

  const handleSelectTier = async (tier: Tier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTier(tier);
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const token = await authService.getAuthToken();
      
      if (selectedTier === 'claimed') {
        // Free tier - just save and continue
        await fetch(`${API_BASE}/api/partner/tier`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ tier: 'claimed' }),
        });
        
        await AsyncStorage.setItem('@lumina_partner_tier', 'claimed');
        router.replace('/(tabs)');
      } else {
        // Paid tier - call upgrade endpoint for Stripe checkout
        const response = await fetch(`${API_BASE}/api/partner/upgrade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ targetTier: selectedTier }),
        });
        
        const data = await response.json();
        
        if (data.url) {
          // Open Stripe checkout in browser
          await Linking.openURL(data.url);
          // Save tier locally (webhook will confirm on server)
          await AsyncStorage.setItem('@lumina_partner_tier', selectedTier);
          router.replace('/(tabs)');
        } else if (data.error) {
          console.error('Upgrade error:', data.error);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          // If already on tier, just continue
          if (data.currentTier) {
            await AsyncStorage.setItem('@lumina_partner_tier', data.currentTier);
            router.replace('/(tabs)');
          }
        }
      }
    } catch (error) {
      console.error('Tier selection error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Still continue on error for now
      await AsyncStorage.setItem('@lumina_partner_tier', selectedTier);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = (tier: typeof TIERS[0]) => {
    if (selectedTier === tier.id) {
      return `✓ ${tier.buttonTextSelected}`;
    }
    return tier.buttonText;
  };

  const getContinueText = () => {
    const tier = TIERS.find(t => t.id === selectedTier);
    if (selectedTier === 'claimed') return 'Continue with Free';
    return `Continue with ${tier?.name}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0f', '#0f0a1a', '#0a0a0f']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.glowOrb, { opacity: glowAnim }]} />

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose your plan</Text>
          <Text style={styles.subtitle}>
            Keep 100% of your P2P payments. No per-reservation cuts.
          </Text>
          <Text style={styles.reassurance}>No contracts. Cancel anytime.</Text>
        </View>

        {/* Tier Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tiersContainer}
          snapToInterval={280 + 16}
          decelerationRate="fast"
        >
          {TIERS.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles.tierCard,
                selectedTier === tier.id && styles.tierCardSelected,
              ]}
              onPress={() => handleSelectTier(tier.id)}
              activeOpacity={0.9}
            >
              {tier.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}

              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierTagline}>{tier.tagline}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.tierPrice}>{tier.price}</Text>
                {tier.priceValue > 0 && <Text style={styles.tierPriceUnit}>/mo</Text>}
              </View>

              <View style={styles.featuresContainer}>
                {tier.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={16} color={colors.violet[400]} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.tierButton,
                  selectedTier === tier.id && styles.tierButtonSelected,
                ]}
                onPress={() => handleSelectTier(tier.id)}
              >
                <Text
                  style={[
                    styles.tierButtonText,
                    selectedTier === tier.id && styles.tierButtonTextSelected,
                  ]}
                >
                  {getButtonText(tier)}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Continue Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={selectedTier === 'elite' 
                ? ['#8b5cf6', '#7c3aed'] 
                : selectedTier === 'spotlight'
                  ? ['#3b82f6', '#2563eb']
                  : ['#52525b', '#3f3f46']
              }
              style={styles.continueButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>{getContinueText()}</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            {selectedTier !== 'claimed' ? '7-day free trial included' : 'Upgrade anytime from settings'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    flex: 1,
  },
  glowOrb: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.violet[600],
    top: -150,
    right: -100,
  },
  header: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.zinc[400],
    lineHeight: 20,
  },
  reassurance: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 6,
  },
  tiersContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 16,
  },
  tierCard: {
    width: 280,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.zinc[800],
    marginRight: 16,
  },
  tierCardSelected: {
    borderColor: colors.violet[500],
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  tierName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
    marginTop: 8,
  },
  tierTagline: {
    fontSize: 13,
    color: colors.zinc[500],
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  tierPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
  },
  tierPriceUnit: {
    fontSize: 16,
    color: colors.zinc[500],
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: colors.zinc[300],
    flex: 1,
  },
  tierButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tierButtonSelected: {
    backgroundColor: colors.violet[600],
    borderColor: colors.violet[500],
  },
  tierButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  tierButtonTextSelected: {
    color: 'white',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.violet[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 10,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  footerNote: {
    fontSize: 12,
    color: colors.zinc[600],
    textAlign: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
