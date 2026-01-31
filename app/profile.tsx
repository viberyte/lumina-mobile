import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Share,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../theme';
import StretchCitySelector from '../components/StretchCitySelector';
import StretchMusicSelector from '../components/StretchMusicSelector';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  city: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedVenuesCount, setSavedVenuesCount] = useState(0);
  const [savedEventsCount, setSavedEventsCount] = useState(0);
  const [userCity, setUserCity] = useState('Manhattan');
  const [musicPreferences, setMusicPreferences] = useState<string[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfile();
    loadMusicPreferences();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('@lumina_profile');
      const cityData = await AsyncStorage.getItem('@lumina_selected_city');
      
      if (profileData) {
        const parsed = JSON.parse(profileData);
        setProfile(parsed);
        await loadSavedCounts(parsed.id || 'guest');
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
    } catch (error) {
      console.error('Error loading profile:', error);
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

  const saveMusicPreferences = async (genres: string[]) => {
    try {
      await AsyncStorage.setItem('@lumina_music_preferences', JSON.stringify(genres));
    } catch (error) {
      console.log('Could not save music preferences');
    }
  };

  const loadSavedCounts = async (userId: string) => {
    try {
      const venuesResponse = await fetch(
        `https://lumina.viberyte.com/api/favorites?userId=${userId}&type=venue`
      );
      const venuesData = await venuesResponse.json();
      setSavedVenuesCount(venuesData.items?.length || 0);

      const eventsResponse = await fetch(
        `https://lumina.viberyte.com/api/favorites?userId=${userId}&type=event`
      );
      const eventsData = await eventsResponse.json();
      setSavedEventsCount(eventsData.items?.length || 0);
    } catch (error) {
      console.log('Could not load saved counts');
    }
  };

  const handleCitySelect = async (city: string) => {
    setUserCity(city);
    await AsyncStorage.setItem('@lumina_selected_city', city);
    setShowCitySelector(false);
  };

  const handleToggleGenre = (genreId: string) => {
    const updated = musicPreferences.includes(genreId)
      ? musicPreferences.filter(g => g !== genreId)
      : [...musicPreferences, genreId];
    setMusicPreferences(updated);
    saveMusicPreferences(updated);
  };

  const getTimeContext = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Late Night';
  };

  const handleContextTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCitySelector(true);
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
      {/* Atmosphere Header */}
      <LinearGradient
        colors={['#050508', '#120B2E', '#050508']}
        style={[styles.atmosphereHeader, { paddingTop: insets.top }]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close Button */}

        {/* Close Button */}
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

        {/* Identity Block */}
        <Animated.View style={[styles.identityBlock, { opacity: fadeAnim }]}>
          <Text style={styles.name}>
            {profile.name || 'Lumina Member'}
          </Text>
          <Text style={styles.subtitle}>
            {userCity} Night Explorer
          </Text>
        </Animated.View>

        {/* Context Row */}
        <TouchableOpacity 
          style={styles.contextRow}
          onPress={handleContextTap}
          activeOpacity={0.7}
        >
          <Text style={styles.contextText}>
            {userCity} · {getTimeContext()}
          </Text>
        </TouchableOpacity>

        {/* Your Night */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Night</Text>
          
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/saved');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark-outline" size={20} color={colors.zinc[500]} />
            <Text style={styles.rowText}>Saved</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.zinc[500]} />
            <Text style={styles.rowText}>Planned</Text>
            <Text style={styles.rowMeta}>Soon</Text>
          </TouchableOpacity>
        </View>

        {/* Library */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Library</Text>
          
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/saved');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={20} color={colors.zinc[500]} />
            <Text style={styles.rowText}>Venues</Text>
            {savedVenuesCount > 0 && (
              <Text style={styles.rowCount}>{savedVenuesCount}</Text>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/saved');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="ticket-outline" size={20} color={colors.zinc[500]} />
            <Text style={styles.rowText}>Events</Text>
            {savedEventsCount > 0 && (
              <Text style={styles.rowCount}>{savedEventsCount}</Text>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.zinc[600]} />
            <Text style={styles.rowTextMuted}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMusicSelector(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="musical-note-outline" size={20} color={colors.zinc[600]} />
            <Text style={styles.rowTextMuted}>Music</Text>
            {musicPreferences.length > 0 && (
              <Text style={styles.rowMeta}>{musicPreferences.length}</Text>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              try {
                await Share.share({
                  message: 'Check out Lumina - the nightlife concierge.\n\nhttps://apps.apple.com/app/lumina',
                });
              } catch (error) {
                console.error('Share error:', error);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="paper-plane-outline" size={20} color={colors.zinc[600]} />
            <Text style={styles.rowTextMuted}>Share Lumina</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* City Selector Modal */}
      <Modal
        visible={showCitySelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <StretchCitySelector
            currentCity={userCity}
            onSelectCity={handleCitySelect}
          />
        </View>
      </Modal>

      {/* Music Selector Modal */}
      <Modal
        visible={showMusicSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <StretchMusicSelector
            selectedGenres={musicPreferences}
            onToggleGenre={handleToggleGenre}
            onClose={() => setShowMusicSelector(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmer: {
    width: 120,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.zinc[900],
  },
  atmosphereHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  headerButtons: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  closeButton: {
    padding: spacing.sm,
  },
  identityBlock: {
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[500],
    fontWeight: '400',
  },
  contextRow: {
    marginBottom: spacing.xl * 2,
  },
  contextText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[600],
    fontWeight: '400',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[600],
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.white,
    fontWeight: '500',
  },
  rowTextMuted: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
    fontWeight: '400',
  },
  rowCount: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[600],
    fontWeight: '400',
    marginRight: spacing.xs,
  },
  rowMeta: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[700],
    fontWeight: '400',
    marginRight: spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
