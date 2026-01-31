import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing } from '../../theme';
import { glassStyles } from '../../theme/vibeGradients';

const API_BASE = 'https://lumina.viberyte.com';

interface PartnerStats {
  followers: number;
  events_posted: number;
  communities: number;
  total_views: number;
}

export default function PartnerDashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // TODO: Replace with actual partner ID from auth
      const partnerId = 1;
      
      const response = await fetch(`${API_BASE}/api/partners/${partnerId}/stats`);
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
    }
  };

  const handleUploadFlyer = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled) {
        router.push({
          pathname: '/partner-portal/post-event',
          params: { flyerUri: result.assets[0].uri }
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handlePostAnnouncement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/partner-portal/post-announcement');
  };

  const handleViewCommunities = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/partner-portal/communities');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.violet[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
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
          <Text style={styles.headerTitle}>Partner Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats */}
          <View style={[styles.statsContainer, glassStyles.liquid]}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats?.followers || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats?.events_posted || 0}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats?.communities || 0}</Text>
              <Text style={styles.statLabel}>Communities</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <TouchableOpacity
              style={[styles.actionCard, glassStyles.liquid]}
              onPress={handleUploadFlyer}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#A78BFA']}
                  style={styles.actionIconGradient}
                >
                  <Ionicons name="image" size={24} color={colors.white} />
                </LinearGradient>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Post Event</Text>
                <Text style={styles.actionDescription}>Upload flyer and details</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.violet[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, glassStyles.liquid]}
              onPress={handlePostAnnouncement}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <LinearGradient
                  colors={['#EC4899', '#F472B6']}
                  style={styles.actionIconGradient}
                >
                  <Ionicons name="megaphone" size={24} color={colors.white} />
                </LinearGradient>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Post Announcement</Text>
                <Text style={styles.actionDescription}>Share updates with followers</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.violet[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, glassStyles.liquid]}
              onPress={handleViewCommunities}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <LinearGradient
                  colors={['#3B82F6', '#60A5FA']}
                  style={styles.actionIconGradient}
                >
                  <Ionicons name="people" size={24} color={colors.white} />
                </LinearGradient>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Your Communities</Text>
                <Text style={styles.actionDescription}>Manage posting access</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.violet[400]} />
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={[styles.emptyState, glassStyles.liquid]}>
              <Ionicons name="time-outline" size={48} color={colors.zinc[600]} />
              <Text style={styles.emptyStateText}>No recent activity</Text>
              <Text style={styles.emptyStateSubtext}>Your posts and updates will appear here</Text>
            </View>
          </View>
        </ScrollView>
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
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  actionIconContainer: {
    marginRight: spacing.md,
  },
  actionIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
  },
  emptyState: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.zinc[400],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[500],
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
