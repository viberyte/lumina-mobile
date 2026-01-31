import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  SlideOutDown 
} from 'react-native-reanimated';
import {
  getPlans,
  createPlan,
  addEventToPlan,
  addEventToTonight,
  Plan,
} from '../services/plansService';

const colors = {
  background: '#0A0A0F',
  card: '#16161F',
  cardBorder: '#2A2A3A',
  accent: '#8B5CF6',
  accentDark: '#1B1630',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  tonight: '#7C3AED',
};

interface AddEventToPlanSheetProps {
  visible: boolean;
  onClose: () => void;
  event: {
    id: number;
    title?: string;
    name?: string;  // Some events use 'name' instead of 'title'
    image_url?: string;
    image?: string;
    genre?: string;
    venue_name?: string;
    date?: string;
  };
  onSuccess: (message: string) => void;
}

export default function AddEventToPlanSheet({ 
  visible, 
  onClose, 
  event,
  onSuccess,
}: AddEventToPlanSheetProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  // Normalize event data - handle both 'title' and 'name' fields
  const eventTitle = event?.title || event?.name || 'Untitled Event';
  const eventImage = event?.image_url || event?.image;

  useEffect(() => {
    if (visible) {
      loadPlans();
      // Debug log to see what event data we're receiving
      console.log('[AddEventToPlanSheet] Event data:', {
        id: event?.id,
        title: event?.title,
        name: event?.name,
        resolvedTitle: eventTitle,
        image_url: event?.image_url,
        image: event?.image,
        venue_name: event?.venue_name,
      });
    }
  }, [visible]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTonight = async () => {
    setSaving(true);
    
    try {
      await addEventToTonight({
        id: event.id,
        title: eventTitle,  // Use normalized title
        image: eventImage,  // Use normalized image
        genre: event.genre,
        venue_name: event.venue_name,
        date: event.date,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess('Added to Tonight!');
      onClose();
    } catch (error) {
      console.error('Error adding to tonight:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onSuccess('Failed to add - please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToPlan = async (plan: Plan) => {
    setSaving(true);
    
    try {
      await addEventToPlan(plan.id, {
        id: event.id,
        title: eventTitle,  // Use normalized title
        image: eventImage,  // Use normalized image
        genre: event.genre,
        venue_name: event.venue_name,
        date: event.date,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(`Added to ${plan.name}!`);
      onClose();
    } catch (error) {
      console.error('Error adding to plan:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onSuccess('Failed to add - please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewPlan = async () => {
    if (!newPlanName.trim()) return;
    
    setSaving(true);
    
    try {
      const newPlan = await createPlan({ name: newPlanName.trim() });
      await addEventToPlan(newPlan.id, {
        id: event.id,
        title: eventTitle,  // Use normalized title
        image: eventImage,  // Use normalized image
        genre: event.genre,
        venue_name: event.venue_name,
        date: event.date,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(`Added to ${newPlan.name}!`);
      onClose();
    } catch (error) {
      console.error('Error creating plan:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onSuccess('Failed to create plan - please try again');
    } finally {
      setSaving(false);
      setNewPlanName('');
      setShowNewPlan(false);
    }
  };

  if (!visible) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      />
      
      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.duration(200)}
        style={styles.sheet}
      >
        <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add to Plan</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{eventTitle}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Tonight Option */}
              <TouchableOpacity 
                style={styles.tonightOption}
                onPress={handleAddToTonight}
                disabled={saving}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[colors.tonight, '#5B21B6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tonightGradient}
                >
                  <View style={styles.tonightIcon}>
                    <Ionicons name="moon" size={24} color="#fff" />
                  </View>
                  <View style={styles.tonightText}>
                    <Text style={styles.tonightTitle}>Tonight</Text>
                    <Text style={styles.tonightSubtitle}>Add to tonight's plan</Text>
                  </View>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Your Plans */}
              <Text style={styles.sectionTitle}>YOUR PLANS</Text>
              
              {plans.filter(p => !p.is_tonight).map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.planOption}
                  onPress={() => handleAddToPlan(plan)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <View style={styles.planImageContainer}>
                    {plan.venue_photos && plan.venue_photos.length > 0 ? (
                      <Image
                        source={{ uri: plan.venue_photos[0] }}
                        style={styles.planImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.planImagePlaceholder}>
                        <Text style={styles.planEmoji}>{plan.emoji || '✨'}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planMeta}>
                      {plan.item_count || 0} {(plan.item_count || 0) === 1 ? 'item' : 'items'}
                      {plan.date && ` • ${formatDate(plan.date)}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))}

              {/* New Plan */}
              {showNewPlan ? (
                <View style={styles.newPlanForm}>
                  <TextInput
                    style={styles.newPlanInput}
                    placeholder="Plan name..."
                    placeholderTextColor={colors.textMuted}
                    value={newPlanName}
                    onChangeText={setNewPlanName}
                    autoFocus
                  />
                  <View style={styles.newPlanButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowNewPlan(false);
                        setNewPlanName('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.createButton,
                        !newPlanName.trim() && styles.createButtonDisabled
                      ]}
                      onPress={handleCreateNewPlan}
                      disabled={!newPlanName.trim() || saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.createButtonText}>Create & Add</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.newPlanButton}
                  onPress={() => setShowNewPlan(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.newPlanIcon}>
                    <Ionicons name="add" size={24} color={colors.accent} />
                  </View>
                  <Text style={styles.newPlanText}>Create New Plan</Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  blurContainer: {
    backgroundColor: 'rgba(22, 22, 31, 0.95)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tonightOption: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tonightGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  tonightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tonightText: {
    flex: 1,
  },
  tonightTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  tonightSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  planImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  planImage: {
    width: '100%',
    height: '100%',
  },
  planImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.accentDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planEmoji: {
    fontSize: 22,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  planMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  newPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  newPlanIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.accentDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  newPlanText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  newPlanForm: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  newPlanInput: {
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 10,
    marginBottom: 12,
  },
  newPlanButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  createButton: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
