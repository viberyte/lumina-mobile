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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  getPlans,
  updatePlan,
  deletePlan,
  createPlan,
  Plan,
} from '../services/plansService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const loadPlans = async () => {
    try {
      const data = await getPlans();
      setPlans(data || []);
    } catch (e) {
      console.log('Could not load plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);
  useFocusEffect(useCallback(() => { loadPlans(); }, []));

  const onRefresh = () => { setRefreshing(true); loadPlans(); };

  const handleCreatePlan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const name = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const newPlan = await createPlan({ name, emoji: '', date: null });
      if (newPlan?.id) router.push(`/plan/${newPlan.id}`);
    } catch (e) {
      Alert.alert('Could not create plan');
    }
  };

  const handleDeletePlan = (plan: Plan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Plan', `Remove "${plan.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deletePlan(plan.id);
            setPlans(prev => prev.filter(p => p.id !== plan.id));
          } catch {}
        },
      },
    ]);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const getStopCount = (plan: Plan) => {
    const count = plan.item_count || 0;
    if (count === 0) return 'No stops yet';
    return `${count} ${count === 1 ? 'stop' : 'stops'}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Plans</Text>
          {plans.length > 0 && (
            <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>{editMode ? 'Done' : 'Edit'}</Text>
            </TouchableOpacity>
          )}
          {plans.length === 0 && <View style={{ width: 60 }} />}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {plans.length === 0 ? (
            /* ── EMPTY STATE ── */
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No plans yet</Text>
              <Text style={styles.emptySubtitle}>
                Save venues and build your perfect night out.
              </Text>

              {/* Example plan */}
              <View style={styles.exampleCard}>
                <Text style={styles.exampleLabel}>EXAMPLE</Text>
                <Text style={styles.exampleName}>Friday Night</Text>
                <View style={styles.exampleStops}>
                  <Text style={styles.exampleStop}>Dinner</Text>
                  <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.25)" />
                  <Text style={styles.exampleStop}>Rooftop</Text>
                  <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.25)" />
                  <Text style={styles.exampleStop}>Late Night</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.createBtn} onPress={handleCreatePlan} activeOpacity={0.85}>
                <Text style={styles.createBtnText}>Create Your First Plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── PLAN LIST ── */
            <View style={styles.planList}>
              {plans.map(plan => (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.planCard}
                  onPress={() => {
                    if (editMode) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/plan/${plan.id}`);
                  }}
                  activeOpacity={0.85}
                >
                  {/* Photo strip */}
                  {(plan.venue_photos || []).length > 0 && (
                    <View style={styles.photoStrip}>
                      {(plan.venue_photos || []).slice(0, 3).map((photo, i) => (
                        <Image
                          key={i}
                          source={{ uri: photo }}
                          style={[styles.stripPhoto, i > 0 && { marginLeft: -12 }]}
                          contentFit="cover"
                        />
                      ))}
                    </View>
                  )}

                  <View style={styles.planCardContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
                      <View style={styles.planMeta}>
                        <Text style={styles.planStops}>{getStopCount(plan)}</Text>
                        {formatDate(plan.date) && (
                          <>
                            <Text style={styles.planMetaDot}>·</Text>
                            <Text style={styles.planDate}>{formatDate(plan.date)}</Text>
                          </>
                        )}
                      </View>
                    </View>

                    {editMode ? (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeletePlan(plan)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.25)" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        {plans.length > 0 && !editMode && (
          <View style={[styles.fab, { bottom: insets.bottom + 24 }]}>
            <TouchableOpacity style={styles.fabBtn} onPress={handleCreatePlan} activeOpacity={0.85}>
              <Ionicons name="add" size={24} color="#000" />
              <Text style={styles.fabText}>New Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
  editBtn: { width: 60, alignItems: 'flex-end' },
  editBtnText: { fontSize: 15, color: '#a78bfa', fontWeight: '500' },

  // Empty state
  emptyState: {
    paddingHorizontal: 28,
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  exampleCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  exampleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  exampleName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  exampleStops: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exampleStop: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  createBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },

  // Plan list
  planList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 2,
  },
  planCard: {
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 16,
  },
  photoStrip: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stripPhoto: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  planCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planStops: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  planMetaDot: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
  },
  planDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  deleteBtn: {
    padding: 4,
  },

  // FAB
  fab: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  fabBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
});
