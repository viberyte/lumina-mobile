import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface PlannedVenue {
  venueId: number;
  venueName: string;
  venueImage: string;
  neighborhood?: string;
  addedAt: string;
}

export default function PlannedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<PlannedVenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const saved = await AsyncStorage.getItem('lumina_plans');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sort by recency - most recent first
        const sorted = parsed.sort(
          (a: PlannedVenue, b: PlannedVenue) => 
            new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        );
        setPlans(sorted);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const removePlan = async (venueId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Remove from My Night',
      'Remove this venue from your planned night?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = plans.filter(p => p.venueId !== venueId);
            setPlans(updated);
            await AsyncStorage.setItem('lumina_plans', JSON.stringify(updated));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Sparkle button with subtle animation
  const SparkleButton = ({ onPress }: { onPress: () => void }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }).start();
    };
    
    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    };
    
    return (
      <Animated.View style={[styles.sparkleButtonWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={styles.sparkleButton}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <Ionicons name="sparkles" size={16} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Night</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Subtitle */}
      {plans.length > 0 && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>
            {plans.length} {plans.length === 1 ? 'venue' : 'venues'} saved for tonight
          </Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="moon-outline" size={48} color="#8B5CF6" />
            </View>
            <Text style={styles.emptyTitle}>Start Building Your Night</Text>
            <Text style={styles.emptySubtitle}>
              Explore venues and tap "Add to My Night" to start collecting spots for tonight
            </Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/explore');
              }}
            >
              <Ionicons name="compass-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.exploreButtonText}>Explore Venues</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.plansList}>
            {plans.map((plan, index) => (
              <TouchableOpacity
                key={plan.venueId}
                style={styles.planCard}
                onPress={() => router.push(`/venue/${plan.venueId}`)}
                activeOpacity={0.8}
              >
                {plan.venueImage ? (
                  <Image source={{ uri: plan.venueImage }} style={styles.planImage} />
                ) : (
                  <View style={[styles.planImage, styles.planImagePlaceholder]}>
                    <Ionicons name="location" size={24} color="#71717a" />
                  </View>
                )}
                <View style={styles.planInfo}>
                  <Text style={styles.planName} numberOfLines={1}>{plan.venueName}</Text>
                  {plan.neighborhood && (
                    <Text style={styles.planNeighborhood}>{plan.neighborhood}</Text>
                  )}
                  <Text style={styles.planDate}>{formatDate(plan.addedAt)}</Text>
                </View>
                <View style={styles.planActions}>
                  <SparkleButton 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push({
                        pathname: '/plan-night',
                        params: {
                          startVenueId: plan.venueId,
                          startVenueName: plan.venueName,
                          startVenueImage: plan.venueImage,
                          neighborhood: plan.neighborhood || ''
                        }
                      });
                    }}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      removePlan(plan.venueId);
                    }}
                  >
                    <Ionicons name="close" size={18} color="#71717a" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Build Night CTA at bottom */}
            {plans.length >= 2 && (
              <TouchableOpacity 
                style={styles.buildNightCTA}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // Start with the most recent venue
                  const firstPlan = plans[0];
                  router.push({
                    pathname: '/plan-night',
                    params: {
                      startVenueId: firstPlan.venueId,
                      startVenueName: firstPlan.venueName,
                      startVenueImage: firstPlan.venueImage,
                      neighborhood: firstPlan.neighborhood || ''
                    }
                  });
                }}
              >
                <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buildNightText}>Build My Night</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12 
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  
  subtitleContainer: { paddingHorizontal: 16, marginBottom: 12 },
  subtitle: { fontSize: 13, color: '#71717a' },
  
  scrollView: { flex: 1, paddingHorizontal: 16 },
  
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 80,
    paddingHorizontal: 40
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  emptyTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#fff',
    marginBottom: 8
  },
  emptySubtitle: { 
    fontSize: 15, 
    color: '#71717a', 
    textAlign: 'center',
    lineHeight: 22
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 28
  },
  exploreButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  
  plansList: { gap: 12, paddingTop: 8 },
  
  planCard: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 12
  },
  planImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#27272a'
  },
  planImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  planNeighborhood: { fontSize: 13, color: '#a1a1aa', marginTop: 2 },
  planDate: { fontSize: 12, color: '#52525b', marginTop: 4 },
  
  planActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  
  sparkleButtonWrapper: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sparkleButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  buildNightCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 12
  },
  buildNightText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
