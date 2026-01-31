import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Share,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import StretchCitySelector from '../../components/StretchCitySelector';
import StretchMusicSelector from '../../components/StretchMusicSelector';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  city: string;
  partner_id?: number;
  isPartner?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Auth state - token is the ONLY source of truth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  
  // Profile data (can exist without being logged in)
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedVenuesCount, setSavedVenuesCount] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [userCity, setUserCity] = useState('Manhattan');
  const [musicPreferences, setMusicPreferences] = useState<string[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Check auth on mount and focus
  const checkAuthStatus = useCallback(async () => {
    try {
      // Token is the ONLY source of truth for auth
      const token = await AsyncStorage.getItem('@lumina_auth_token');
      setIsLoggedIn(!!token);
      
      // No token = no partner access, ever
      if (!token) {
        setIsPartner(false);
        return;
      }
      
      // Check partner status (only if authenticated)
      const partnerSession = await AsyncStorage.getItem('lumina_partner_session');
      if (partnerSession) {
        setIsPartner(true);
        return;
      }
      
      const profileStr = await AsyncStorage.getItem('@lumina_profile');
      if (profileStr) {
        const profileData = JSON.parse(profileStr);
        setIsPartner(!!profileData.partner_id);
      } else {
        setIsPartner(false);
      }
      
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsLoggedIn(false);
      setIsPartner(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadMusicPreferences();
    checkAuthStatus();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Re-check auth when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkAuthStatus();
      loadTripsCount();
      loadFavoritesCount();
    }, [checkAuthStatus])
  );

  const loadProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('@lumina_profile');
      const cityData = await AsyncStorage.getItem('@lumina_selected_city');
      
      if (profileData) {
        const parsed = JSON.parse(profileData);
        setProfile(parsed);
      } else {
        setProfile({
          id: 'guest',
          name: 'Guest',
          email: '',
          city: 'Manhattan',
        });
      }
      
      if (cityData) {
        setUserCity(cityData);
      }

      await loadTripsCount();
      await loadFavoritesCount();
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadTripsCount = async () => {
    try {
      const trips = await AsyncStorage.getItem('lumina_trips');
      if (trips) {
        const parsed = JSON.parse(trips);
        setTripsCount(Array.isArray(parsed) ? parsed.length : 0);
      }
    } catch (error) {
      console.log('Could not load trips count');
    }
  };

  const loadFavoritesCount = async () => {
    try {
      const favorites = await AsyncStorage.getItem('lumina_favorites');
      if (favorites) {
        const parsed = JSON.parse(favorites);
        setSavedVenuesCount(Array.isArray(parsed) ? parsed.length : 0);
      }
    } catch (error) {
      console.log('Could not load favorites count');
    }
  };

  const loadMusicPreferences = async () => {
    try {
      const prefs = await AsyncStorage.getItem('@lumina_music_preferences');
      if (prefs) {
        setMusicPreferences(JSON.parse(prefs));
      }
    } catch (error) {
      console.log('Could not load music preferences');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Clear auth-related data only
            await AsyncStorage.multiRemove([
              '@lumina_auth_token',
              '@lumina_refresh_token',
              '@lumina_profile',
              'lumina_partner_session',
            ]);
            
            setIsLoggedIn(false);
            setIsPartner(false);
            setProfile({
              id: 'guest',
              name: 'Guest',
              email: '',
              city: userCity,
            });
            
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleContextTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCitySelector(true);
  };

  const handleCitySelect = async (city: string) => {
    setUserCity(city);
    await AsyncStorage.setItem('@lumina_selected_city', city);
    setShowCitySelector(false);
  };

  const handleToggleGenre = async (genre: string) => {
    const updated = musicPreferences.includes(genre)
      ? musicPreferences.filter(g => g !== genre)
      : [...musicPreferences, genre];
    setMusicPreferences(updated);
    await AsyncStorage.setItem('@lumina_music_preferences', JSON.stringify(updated));
  };

  const getTimeContext = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.shimmer} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050508', '#120B2E', '#050508']}
        style={[styles.atmosphereHeader, { paddingTop: insets.top }]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.headerButtons, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={28} color={colors.zinc[500]} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.identityBlock, { opacity: fadeAnim }]}>
          <Text style={styles.name}>{profile.name || 'Lumina Member'}</Text>
          <Text style={styles.subtitle}>{userCity} Night Explorer</Text>
        </Animated.View>

        <TouchableOpacity style={styles.contextRow} onPress={handleContextTap} activeOpacity={0.7}>
          <Text style={styles.contextText}>{userCity} · {getTimeContext()}</Text>
        </TouchableOpacity>

        {/* Your Night */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Night</Text>
          
          <TouchableOpacity style={styles.row} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/saved'); }} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={20} color={colors.zinc[500]} />
            <Text style={styles.rowText}>Saved</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/trips'); }} activeOpacity={0.7}>
            <Ionicons name="airplane-outline" size={20} color={colors.zinc[500]} />
            <Text style={styles.rowText}>My Plans</Text>
            {tripsCount > 0 && <Text style={styles.rowCount}>{tripsCount}</Text>}
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          
          <TouchableOpacity style={styles.row} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color={colors.zinc[600]} />
            <Text style={styles.rowTextMuted}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/my-vibe"); }} activeOpacity={0.7}>
            <Ionicons name="sparkles-outline" size={20} color={colors.violet[500]} />
            <Text style={styles.rowText}>My Vibe</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); try { await Share.share({ message: 'Check out Lumina - the nightlife concierge.\n\nhttps://apps.apple.com/app/lumina' }); } catch (error) {} }} activeOpacity={0.7}>
            <Ionicons name="paper-plane-outline" size={20} color={colors.zinc[600]} />
            <Text style={styles.rowTextMuted}>Share Lumina</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>
        </View>

        {/* Partner Section - Only show if IS a partner AND logged in */}
        {isPartner && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Partner Tools</Text>
            
            <TouchableOpacity style={styles.partnerRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/partner/dashboard'); }} activeOpacity={0.7}>
              <View style={styles.partnerIconContainer}>
                <Ionicons name="business" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.partnerTextContainer}>
                <Text style={styles.partnerTitle}>Partner Dashboard</Text>
                <Text style={styles.partnerSubtitle}>Manage venues, events & bookings</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          
          {isLoggedIn ? (
            <TouchableOpacity style={styles.row} onPress={handleSignOut} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/login"); }} activeOpacity={0.7}>
              <Ionicons name="log-in-outline" size={20} color={colors.violet[500]} />
              <Text style={styles.rowText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showCitySelector} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <StretchCitySelector currentCity={userCity} onSelectCity={handleCitySelect} />
        </View>
      </Modal>

      <Modal visible={showMusicSelector} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <StretchMusicSelector selectedGenres={musicPreferences} onToggleGenre={handleToggleGenre} onClose={() => setShowMusicSelector(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  loadingContainer: { flex: 1, backgroundColor: colors.black, justifyContent: 'center', alignItems: 'center' },
  shimmer: { width: 120, height: 20, borderRadius: 10, backgroundColor: colors.zinc[900] },
  atmosphereHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 140, opacity: 0.6 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl },
  headerButtons: { alignItems: 'center', marginBottom: spacing.xl },
  closeButton: { padding: spacing.sm },
  identityBlock: { marginBottom: spacing.md },
  name: { fontSize: 28, fontWeight: '700', color: colors.white, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.sizes.sm, color: colors.zinc[500], fontWeight: '400' },
  contextRow: { marginBottom: spacing.xl * 2 },
  contextText: { fontSize: typography.sizes.sm, color: colors.zinc[600], fontWeight: '400' },
  section: { marginBottom: spacing.xl },
  sectionLabel: { fontSize: typography.sizes.xs, color: colors.zinc[600], fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowText: { flex: 1, fontSize: typography.sizes.md, color: colors.white, fontWeight: '500' },
  rowTextMuted: { flex: 1, fontSize: typography.sizes.md, color: colors.zinc[400], fontWeight: '400' },
  rowCount: { fontSize: typography.sizes.sm, color: colors.zinc[600], fontWeight: '400', marginRight: spacing.xs },
  signOutText: { flex: 1, fontSize: typography.sizes.md, color: '#ef4444', fontWeight: '500' },
  modalContainer: { flex: 1, backgroundColor: colors.black },
  partnerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  partnerIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(139, 92, 246, 0.15)', alignItems: 'center', justifyContent: 'center' },
  partnerTextContainer: { flex: 1 },
  partnerTitle: { fontSize: typography.sizes.md, color: colors.white, fontWeight: '600', marginBottom: 2 },
  partnerSubtitle: { fontSize: typography.sizes.xs, color: colors.zinc[500] },
});
