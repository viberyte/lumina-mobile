import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';
import { colors, spacing } from '../theme';

const API_BASE = 'https://lumina.viberyte.com';

export default function PartnerOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [partnerData, setPartnerData] = useState<any>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    loadPartnerData();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 90, useNativeDriver: true }),
    ]).start();

    // Subtle glow - stable, not alive
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.12, duration: 1200, useNativeDriver: true }),
    ]).start();

    // Very subtle pulse for Instagram button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.01, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Check Instagram status when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !instagramConnected) {
        checkInstagramStatus();
      }
    });

    return () => subscription.remove();
  }, [instagramConnected]);

  const loadPartnerData = async () => {
    const data = await authService.getPartnerData();
    setPartnerData(data);
  };

  const checkInstagramStatus = async () => {
    setChecking(true);
    try {
      const token = await authService.getAuthToken();
      const response = await fetch(`${API_BASE}/api/partner/instagram/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          setInstagramConnected(true);
          await AsyncStorage.setItem('@lumina_instagram_verified', 'true');
          
          // Animate checkmark
          Animated.spring(checkScale, {
            toValue: 1,
            damping: 12,
            stiffness: 150,
            useNativeDriver: true,
          }).start();
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Error checking Instagram status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleInstagramConnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    
    try {
      const token = await authService.getAuthToken();
      
      // Get Instagram OAuth URL (secure - using Authorization header)
      const response = await fetch(`${API_BASE}/api/partner/instagram/auth`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.auth_url) {
        // Open Instagram OAuth in browser
        await WebBrowser.openBrowserAsync(data.auth_url);
        
        // When browser closes, check if connected
        setTimeout(() => {
          checkInstagramStatus();
        }, 1000);
      }
    } catch (error) {
      console.error('Instagram auth error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Mark as unverified - capabilities will be locked
    await AsyncStorage.setItem('@lumina_instagram_verified', 'false');
    
    // Navigate to app (with limited access)
    router.replace('/partner-tier');
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/partner-tier');
  };

  // Dynamic content based on partner role
  const isVenueOwner = partnerData?.partnerRole === 'venue_owner';
  const isPromoter = partnerData?.partnerRole === 'promoter';
  const isStaff = partnerData?.partnerRole === 'staff';

  const getTitle = () => {
    if (instagramConnected) return "You're verified!";
    if (isVenueOwner) return 'Claim your venue';
    if (isPromoter) return 'Verify your profile';
    if (isStaff) return 'Connect your account';
    return 'Verify with Instagram';
  };

  const getSubtitle = () => {
    if (instagramConnected) {
      return isVenueOwner 
        ? 'Your venue is ready to manage'
        : 'Your profile is verified and ready';
    }
    if (isVenueOwner) return 'Prove you own your venue to unlock management tools';
    if (isPromoter) return 'Verify your identity to post events and reach guests';
    if (isStaff) return 'Connect to help manage your venue';
    return 'Connect Instagram to unlock all features';
  };

  const getBenefits = () => {
    if (isVenueOwner) {
      return [
        { icon: 'business-outline', text: 'Claim & manage your venue' },
        { icon: 'calendar-outline', text: 'Post and promote events' },
        { icon: 'people-outline', text: 'See who\'s interested' },
        { icon: 'analytics-outline', text: 'Track performance' },
      ];
    }
    if (isPromoter) {
      return [
        { icon: 'megaphone-outline', text: 'Post events at any venue' },
        { icon: 'people-outline', text: 'Build your audience' },
        { icon: 'chatbubble-outline', text: 'Message attendees' },
        { icon: 'trending-up-outline', text: 'Grow your brand' },
      ];
    }
    if (isStaff) {
      return [
        { icon: 'clipboard-outline', text: 'Manage guest lists' },
        { icon: 'calendar-outline', text: 'Update events' },
        { icon: 'chatbubble-outline', text: 'Respond to inquiries' },
        { icon: 'shield-checkmark-outline', text: 'Verified team member' },
      ];
    }
    return [
      { icon: 'shield-checkmark-outline', text: 'Verified identity' },
      { icon: 'calendar-outline', text: 'Post events' },
      { icon: 'chatbubble-outline', text: 'Message guests' },
      { icon: 'sync-outline', text: 'Auto-sync content' },
    ];
  };

  const getRoleLabel = () => {
    if (isVenueOwner) return 'Venue Owner';
    if (isPromoter) return 'Promoter';
    if (isStaff) return 'Staff';
    return 'Partner';
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
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Role Badge */}
          <View style={styles.roleBadge}>
            <Ionicons 
              name={isVenueOwner ? 'business' : isPromoter ? 'megaphone' : 'person'} 
              size={12} 
              color={colors.violet[400]} 
            />
            <Text style={styles.roleBadgeText}>{getRoleLabel()}</Text>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            {instagramConnected ? (
              <Animated.View style={[styles.checkContainer, { transform: [{ scale: checkScale }] }]}>
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  style={styles.checkGradient}
                >
                  <Ionicons name="checkmark" size={40} color="white" />
                </LinearGradient>
              </Animated.View>
            ) : (
              <LinearGradient
                colors={['#E1306C', '#F77737', '#FCAF45']}
                style={styles.instagramIcon}
              >
                <Ionicons name="logo-instagram" size={36} color="white" />
              </LinearGradient>
            )}
          </View>

          <Text style={styles.welcomeText}>
            Welcome, {partnerData?.businessName || 'Partner'}
          </Text>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>

        {/* Benefits */}
        {!instagramConnected && (
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>This unlocks:</Text>
            {getBenefits().map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={benefit.icon as any} size={18} color={colors.violet[400]} />
                </View>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Success State */}
        {instagramConnected && (
          <View style={styles.successContainer}>
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.successText}>Instagram connected</Text>
            </View>
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.successText}>Identity verified</Text>
            </View>
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.successText}>All features unlocked</Text>
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Actions */}
        <View style={styles.actions}>
          {instagramConnected ? (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.continueButtonGradient}
              >
                <Text style={styles.continueButtonText}>Let's go</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.instagramButton, loading && styles.buttonDisabled]}
                  onPress={handleInstagramConnect}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#E1306C', '#F77737']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.instagramButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="logo-instagram" size={22} color="white" />
                        <Text style={styles.instagramButtonText}>
                          {isVenueOwner ? 'Verify & Claim Venue' : 'Verify with Instagram'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {checking && (
                <View style={styles.checkingRow}>
                  <ActivityIndicator size="small" color={colors.zinc[500]} />
                  <Text style={styles.checkingText}>Checking verification...</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>I'll verify later</Text>
              </TouchableOpacity>

              <Text style={styles.skipNote}>
                You can verify later, but posting and {isVenueOwner ? 'venue management' : 'messaging'} will be disabled
              </Text>
            </>
          )}
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
    paddingHorizontal: spacing.xl,
  },
  glowOrb: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.violet[600],
    top: -100,
    right: -100,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: spacing.lg,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.violet[400],
    letterSpacing: 0.5,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  instagramIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  checkGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: colors.zinc[500],
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.zinc[400],
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  // Benefits
  benefitsContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.zinc[500],
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 15,
    color: colors.zinc[300],
    flex: 1,
  },

  // Success
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  successText: {
    fontSize: 15,
    color: colors.zinc[300],
  },

  // Actions
  actions: {
    gap: spacing.md,
  },
  instagramButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  instagramButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 10,
  },
  instagramButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#22c55e',
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
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  checkingText: {
    fontSize: 13,
    color: colors.zinc[500],
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: colors.zinc[500],
    fontWeight: '500',
  },
  skipNote: {
    fontSize: 12,
    color: colors.zinc[600],
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
