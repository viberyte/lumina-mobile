import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { 
  getPlans, 
  updatePlan, 
  deletePlan, 
  createPlan,
  Plan 
} from '../services/plansService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAN_CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

const colors = {
  background: '#0A0A0F',
  card: '#16161F',
  cardBorder: '#2A2A3A',
  accent: '#8B5CF6',
  accentDark: '#1B1630',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  danger: '#EF4444',
};

const PLANS_CACHE_KEY = 'lumina_plans_cache';

interface DateGroup {
  key: string;
  label: string;
  plans: Plan[];
  isTonight?: boolean;
  date?: string | null;
}

export default function TripsScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const groupPlansByDate = useCallback((plansList: Plan[]): DateGroup[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups: { [key: string]: Plan[] } = {
      tonight: [],
      noDate: [],
      past: [],
    };

    const upcomingDates: { [date: string]: Plan[] } = {};

    plansList.forEach(plan => {
      if (plan.is_tonight) {
        groups.tonight.push(plan);
      } else if (!plan.date) {
        groups.noDate.push(plan);
      } else {
        const planDate = new Date(plan.date);
        planDate.setHours(0, 0, 0, 0);

        if (planDate < today) {
          groups.past.push(plan);
        } else {
          const dateKey = plan.date;
          if (!upcomingDates[dateKey]) {
            upcomingDates[dateKey] = [];
          }
          upcomingDates[dateKey].push(plan);
        }
      }
    });

    const result: DateGroup[] = [];

    result.push({
      key: 'tonight',
      label: 'Tonight',
      plans: groups.tonight,
      isTonight: true,
      date: today.toISOString().split('T')[0],
    });

    const sortedDates = Object.keys(upcomingDates).sort();
    sortedDates.forEach(dateStr => {
      result.push({
        key: dateStr,
        label: formatDateLabel(dateStr),
        plans: upcomingDates[dateStr],
        date: dateStr,
      });
    });

    result.push({
      key: 'noDate',
      label: 'No Date',
      plans: groups.noDate,
      date: null,
    });

    if (groups.past.length > 0) {
      result.push({
        key: 'past',
        label: 'Past',
        plans: groups.past,
      });
    }

    return result;
  }, []);

  const loadPlans = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const cached = await AsyncStorage.getItem(PLANS_CACHE_KEY);
      if (cached) {
        const cachedPlans = JSON.parse(cached);
        setPlans(cachedPlans);
        setDateGroups(groupPlansByDate(cachedPlans));
        setLoading(false);
      }

      const data = await getPlans();
      setPlans(data);
      setDateGroups(groupPlansByDate(data));
      await AsyncStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPlans(false);
  };

  const handleCreatePlan = async (dateGroup?: DateGroup) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const planDate = dateGroup?.isTonight 
      ? new Date().toISOString().split('T')[0]
      : dateGroup?.date || undefined;

    try {
      const newPlan = await createPlan({
        name: 'New Plan',
        emoji: '✨',
        date: planDate,
      });

      if (dateGroup?.isTonight) {
        await updatePlan(newPlan.id, { is_tonight: true });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadPlans(false);
      router.push(`/plan/${newPlan.id}`);
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  };

  const handleDeletePlan = (plan: Plan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Plan',
      `Delete "${plan.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan(plan.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadPlans(false);
            } catch (error) {
              console.error('Error deleting:', error);
            }
          },
        },
      ]
    );
  };

  const getFlowHint = (plan: Plan): string => {
    const count = plan.item_count || 0;
    if (count === 0) return 'Empty';
    if (count === 1) return '1 spot';
    if (count === 2) return 'Dinner → Drinks';
    if (count === 3) return 'Dinner → Drinks → Nightlife';
    return `${count} spots planned`;
  };

  const renderPlanCard = (
    plan: Plan, 
    isTonight: boolean = false,
    drag?: () => void,
    isActive?: boolean
  ) => {
    const venuePhotos = plan.venue_photos || [];

    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          isTonight && styles.tonightCard,
          isActive && styles.draggingCard,
        ]}
        onPress={() => {
          if (editMode) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/plan/${plan.id}`);
        }}
        onLongPress={() => {
          if (drag) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          }
        }}
        delayLongPress={200}
        activeOpacity={0.9}
      >
        {/* Delete Button - Always visible in edit mode */}
        {editMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePlan(plan)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.deleteButtonInner}>
              <Ionicons name="close" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Collage */}
        <View style={styles.planImageContainer}>
          {venuePhotos.length >= 4 ? (
            <View style={styles.collageGrid}>
              {venuePhotos.slice(0, 4).map((photo, idx) => (
                <Image
                  key={idx}
                  source={{ uri: photo }}
                  style={styles.collageImage}
                  contentFit="cover"
                  transition={300}
                />
              ))}
            </View>
          ) : venuePhotos.length > 0 ? (
            <Image
              source={{ uri: venuePhotos[0] }}
              style={styles.singleImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[
              styles.placeholderImage,
              isTonight && styles.tonightPlaceholder,
            ]}>
              <Text style={styles.placeholderEmoji}>{plan.emoji || '✨'}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
          />
          
          {isTonight && !editMode && (
            <View style={styles.tonightIndicator}>
              <Ionicons name="moon" size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.planCardInfo}>
          <View style={styles.planCardHeader}>
            <Text style={styles.planCardEmoji}>{plan.emoji}</Text>
            <Text style={styles.planCardName} numberOfLines={1}>{plan.name}</Text>
          </View>
          <Text style={styles.planCardFlow}>{getFlowHint(plan)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderNewPlanCard = (dateGroup: DateGroup) => {
    if (editMode) return null;
    
    return (
      <TouchableOpacity
        style={styles.newPlanCard}
        onPress={() => handleCreatePlan(dateGroup)}
        activeOpacity={0.7}
      >
        <View style={styles.newPlanIcon}>
          <Ionicons name="add" size={28} color={colors.accent} />
        </View>
        <Text style={styles.newPlanText}>New Plan</Text>
      </TouchableOpacity>
    );
  };

  const handleDragEnd = (groupKey: string, data: Plan[]) => {
    setDateGroups(prev => prev.map(group => 
      group.key === groupKey ? { ...group, plans: data } : group
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderDateGroup = (group: DateGroup) => {
    if (group.plans.length === 0 && editMode) return null;
    
    return (
      <View key={group.key} style={styles.dateGroup}>
        <View style={styles.groupHeader}>
          <Text style={[
            styles.groupLabel,
            group.isTonight && styles.tonightLabel,
          ]}>
            {group.label}
          </Text>
          {group.isTonight && (
            <View style={styles.tonightBadge}>
              <Ionicons name="moon" size={12} color={colors.accent} />
            </View>
          )}
          <Text style={styles.groupCount}>
            {group.plans.length} {group.plans.length === 1 ? 'plan' : 'plans'}
          </Text>
        </View>

        <DraggableFlatList
          horizontal
          data={group.plans}
          keyExtractor={(item) => item.id}
          renderItem={({ item, drag, isActive }: RenderItemParams<Plan>) => (
            <ScaleDecorator activeScale={1.05}>
              <View style={styles.draggableItem}>
                {renderPlanCard(item, group.isTonight, drag, isActive)}
              </View>
            </ScaleDecorator>
          )}
          onDragEnd={({ data }) => handleDragEnd(group.key, data)}
          containerStyle={styles.draggableContainer}
          ListFooterComponent={() => (
            <View style={styles.draggableItem}>
              {renderNewPlanCard(group)}
            </View>
          )}
        />
      </View>
    );
  };

  if (loading && plans.length === 0) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </GestureHandlerRootView>
    );
  }

  const hasAnyPlans = dateGroups.some(g => g.plans.length > 0);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Plans</Text>
          <View style={styles.headerActions}>
            {hasAnyPlans && (
              <TouchableOpacity
                style={[styles.headerButton, editMode && styles.headerButtonActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditMode(!editMode);
                }}
              >
                <Text style={[styles.editButtonText, editMode && styles.editButtonTextActive]}>
                  {editMode ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>
            )}
            {!editMode && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => handleCreatePlan()}
              >
                <Ionicons name="add" size={24} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {!hasAnyPlans ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌙</Text>
              <Text style={styles.emptyTitle}>No plans yet</Text>
              <Text style={styles.emptySubtitle}>
                {getTimeAwareMessage()}
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push('/explore')}
              >
                <LinearGradient
                  colors={[colors.accent, '#7C3AED']}
                  style={styles.exploreButtonGradient}
                >
                  <Text style={styles.exploreButtonText}>Explore Venues</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            dateGroups.map(renderDateGroup)
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function getTimeAwareMessage(): string {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 5 || day === 6;

  if (hour >= 17 && hour < 22) return "It's not too late to plan tonight";
  if (hour >= 22 || hour < 4) return "Planning ahead? Smart move";
  if (isWeekend) return "Weekend vibes await. Start planning";
  return "Start planning your next night out";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  editButtonTextActive: {
    color: '#fff',
  },

  // Content
  content: {
    paddingTop: 8,
  },

  // Date Groups
  dateGroup: {
    marginBottom: 28,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  groupLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tonightLabel: {
    color: colors.accent,
  },
  tonightBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCount: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  draggableContainer: {
    paddingHorizontal: 20,
  },
  draggableItem: {
    marginRight: 12,
  },

  // Plan Card
  planCard: {
    width: PLAN_CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    position: 'relative',
  },
  tonightCard: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  draggingCard: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  
  // Delete Button
  deleteButton: {
    position: 'absolute',
    top: -6,
    left: -6,
    zIndex: 10,
  },
  deleteButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  planImageContainer: {
    width: '100%',
    height: PLAN_CARD_WIDTH * 0.75,
    position: 'relative',
  },
  collageGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  collageImage: {
    width: '50%',
    height: '50%',
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tonightPlaceholder: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  placeholderEmoji: {
    fontSize: 36,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  tonightIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planCardInfo: {
    padding: 12,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  planCardEmoji: {
    fontSize: 16,
  },
  planCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  planCardFlow: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // New Plan Card
  newPlanCard: {
    width: PLAN_CARD_WIDTH,
    height: PLAN_CARD_WIDTH * 0.75 + 56,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPlanIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  newPlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  exploreButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  exploreButtonGradient: {
    paddingHorizontal: 36,
    paddingVertical: 16,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
});
