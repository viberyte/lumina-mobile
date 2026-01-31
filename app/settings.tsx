import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { colors, typography, spacing } from '../theme';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  city: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  
  const [eventsNotifications, setEventsNotifications] = useState(true);
  const [venueNotifications, setVenueNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [hideActivity, setHideActivity] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [storeChatHistory, setStoreChatHistory] = useState(true);

  useEffect(() => {
    loadProfile();
    loadNotificationSettings();
    loadPrivacySettings();
  }, []);

  useEffect(() => {
    if (profile) saveNotificationSettings();
  }, [eventsNotifications, venueNotifications, weeklyDigest]);

  useEffect(() => {
    if (profile) savePrivacySettings();
  }, [hideActivity, anonymousMode, storeChatHistory]);

  const loadProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('@lumina_profile');
      if (profileData) {
        const parsed = JSON.parse(profileData);
        setProfile(parsed);
        setName(parsed.name || '');
        setEmail(parsed.email || '');
        setCity(parsed.city || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const data = await AsyncStorage.getItem('@lumina_notifications');
      if (data) {
        const settings = JSON.parse(data);
        setEventsNotifications(settings.eventsNotifications);
        setVenueNotifications(settings.venueNotifications);
        setWeeklyDigest(settings.weeklyDigest);
      }
    } catch (error) {}
  };

  const loadPrivacySettings = async () => {
    try {
      const data = await AsyncStorage.getItem('@lumina_privacy');
      if (data) {
        const settings = JSON.parse(data);
        setHideActivity(settings.hideActivity);
        setAnonymousMode(settings.anonymousMode);
        setStoreChatHistory(settings.storeChatHistory);
      }
    } catch (error) {}
  };

  const saveNotificationSettings = async () => {
    try {
      await AsyncStorage.setItem('@lumina_notifications', JSON.stringify({
        eventsNotifications,
        venueNotifications,
        weeklyDigest,
      }));
    } catch (error) {}
  };

  const savePrivacySettings = async () => {
    try {
      await AsyncStorage.setItem('@lumina_privacy', JSON.stringify({
        hideActivity,
        anonymousMode,
        storeChatHistory,
      }));
    } catch (error) {}
  };

  const saveProfile = async () => {
    if (!name || !email) {
      Alert.alert('Required', 'Name and email are required');
      return;
    }
    try {
      const updated = { ...profile, name, email, city };
      await AsyncStorage.setItem('@lumina_profile', JSON.stringify(updated));
      setProfile(updated as UserProfile);
      setEditMode(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050508', '#120B2E', '#050508']}
        style={[styles.atmosphereHeader, { height: 140 + insets.top }]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={28} color={colors.zinc[500]} />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Profile</Text>
            <TouchableOpacity onPress={() => editMode ? saveProfile() : setEditMode(true)}>
              <Text style={styles.editButton}>{editMode ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={name}
              onChangeText={setName}
              editable={editMode}
              placeholder="Your name"
              placeholderTextColor={colors.zinc[600]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={email}
              onChangeText={setEmail}
              editable={editMode}
              placeholder="your@email.com"
              placeholderTextColor={colors.zinc[600]}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={city}
              onChangeText={setCity}
              editable={editMode}
              placeholder="Manhattan"
              placeholderTextColor={colors.zinc[600]}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Events</Text>
              <Text style={styles.toggleDescription}>Upcoming events nearby</Text>
            </View>
            <Switch
              value={eventsNotifications}
              onValueChange={setEventsNotifications}
              trackColor={{ false: colors.zinc[800], true: colors.violet[600] }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Venues</Text>
              <Text style={styles.toggleDescription}>New recommendations</Text>
            </View>
            <Switch
              value={venueNotifications}
              onValueChange={setVenueNotifications}
              trackColor={{ false: colors.zinc[800], true: colors.violet[600] }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Weekly Digest</Text>
              <Text style={styles.toggleDescription}>Weekend plans every Friday</Text>
            </View>
            <Switch
              value={weeklyDigest}
              onValueChange={setWeeklyDigest}
              trackColor={{ false: colors.zinc[800], true: colors.violet[600] }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Privacy</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Hide Activity</Text>
              <Text style={styles.toggleDescription}>Keep browsing private</Text>
            </View>
            <Switch
              value={hideActivity}
              onValueChange={setHideActivity}
              trackColor={{ false: colors.zinc[800], true: colors.violet[600] }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Anonymous Mode</Text>
              <Text style={styles.toggleDescription}>No tracking</Text>
            </View>
            <Switch
              value={anonymousMode}
              onValueChange={setAnonymousMode}
              trackColor={{ false: colors.zinc[800], true: colors.violet[600] }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Chat History</Text>
              <Text style={styles.toggleDescription}>Save conversations locally</Text>
            </View>
            <Switch
              value={storeChatHistory}
              onValueChange={setStoreChatHistory}
              trackColor={{ false: colors.zinc[800], true: colors.violet[600] }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Partner */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Partner Program</Text>

          <View style={styles.row}>
            <Ionicons name="star-outline" size={20} color={colors.zinc[500]} />
            <View style={styles.rowInfo}>
              <Text style={styles.rowText}>Become a Partner</Text>
              <Text style={styles.rowDescription}>Coming Soon</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>

          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.zinc[700]} />
          </TouchableOpacity>

          <View style={styles.menuRow}>
            <Text style={styles.menuText}>Version</Text>
            <Text style={styles.versionText}>{Constants.expoConfig?.version || '1.0.0'}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  atmosphereHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[600],
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  editButton: {
    fontSize: typography.sizes.sm,
    color: colors.violet[400],
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[500],
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.zinc[900],
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.white,
  },
  inputDisabled: {
    backgroundColor: 'transparent',
    color: colors.zinc[400],
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: typography.sizes.md,
    color: colors.white,
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[600],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowInfo: {
    flex: 1,
  },
  rowText: {
    fontSize: typography.sizes.md,
    color: colors.white,
    fontWeight: '500',
    marginBottom: 2,
  },
  rowDescription: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[600],
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuText: {
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
    fontWeight: '400',
  },
  versionText: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[700],
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 30,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutText: {
    fontSize: typography.sizes.md,
    color: '#EF4444',
    fontWeight: '500',
  },
});
