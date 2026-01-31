/**
 * ADD TO PLAN SHEET - Clean rebuild
 * v4.1 - Fixed keyboard handling
 */

import React, { useState, useEffect, useRef } from 'react';
import { getPhotoUrl } from '../utils/photoHelper';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Plan,
  VenueData,
  getPlans,
  createPlan,
  addVenueToPlan,
  addVenueToTonight,
  saveVenue,
} from '../services/plansService';

interface Props {
  visible: boolean;
  venue: VenueData | null;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const EMOJIS = ['✨', '🌙', '❤️', '🎂', '🍸'];

export default function AddToPlanSheet({ visible, venue, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'list' | 'new'>('list');
  const [planName, setPlanName] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setMode('list');
      setPlanName('');
      setEmoji('✨');
      loadPlans();
    }
  }, [visible]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await getPlans();
      setPlans(data.filter(p => !p.is_tonight).slice(0, 5));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const close = () => {
    if (!saving) {
      Keyboard.dismiss();
      onClose();
    }
  };

  const goBack = () => {
    Keyboard.dismiss();
    setMode('list');
    setPlanName('');
  };

  const addToTonight = async () => {
    if (!venue || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await addVenueToTonight(venue);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.('Added to Tonight');
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSaving(false);
  };

  const addToPlan = async (plan: Plan) => {
    if (!venue || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await addVenueToPlan(plan.id, { ...venue, photo: getPhotoUrl(venue) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.(`Added to ${plan.name}`);
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSaving(false);
  };

  const createNew = async () => {
    if (!venue || !planName.trim() || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setSaving(true);
    try {
      const newPlan = await createPlan({ name: planName.trim(), emoji });
      await addVenueToPlan(newPlan.id, { ...venue, photo: getPhotoUrl(venue) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.(`Added to ${planName}`);
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSaving(false);
  };

  const saveForLater = async () => {
    if (!venue || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaving(true);
    try {
      await saveVenue(venue);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.('Saved');
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 10 }]}>  
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            {mode === 'new' && (
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color="#999" />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>{mode === 'list' ? 'Add to Plan' : 'New Plan'}</Text>
            <TouchableOpacity onPress={close} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {venue && <Text style={styles.venueName}>{venue.name}</Text>}

          {saving ? (
            <View style={styles.center}>
              <ActivityIndicator color="#8B5CF6" />
            </View>
          ) : loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#8B5CF6" />
            </View>
          ) : mode === 'list' ? (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Tonight */}
              <TouchableOpacity style={styles.tonightBtn} onPress={addToTonight} activeOpacity={0.8}>
                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.tonightGrad}>
                  <Text style={styles.tonightEmoji}>🌙</Text>
                  <Text style={styles.tonightText}>Tonight</Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>

              {/* Plans */}
              {plans.map(plan => (
                <TouchableOpacity key={plan.id} style={styles.planRow} onPress={() => addToPlan(plan)}>
                  <Text style={styles.planEmoji}>{plan.emoji}</Text>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#444" />
                </TouchableOpacity>
              ))}

              {/* New Plan */}
              <TouchableOpacity 
                style={styles.newPlanBtn} 
                onPress={() => {
                  setMode('new');
                  setTimeout(() => inputRef.current?.focus(), 200);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#8B5CF6" />
                <Text style={styles.newPlanText}>Create New Plan</Text>
              </TouchableOpacity>

              {/* Save for later */}
              <TouchableOpacity style={styles.saveBtn} onPress={saveForLater}>
                <Ionicons name="bookmark-outline" size={16} color="#666" />
                <Text style={styles.saveText}>Save for later</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* New Plan Form */
            <View style={styles.form}>
              {/* Emoji picker */}
              <View style={styles.emojiRow}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                    onPress={() => { Haptics.selectionAsync(); setEmoji(e); }}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Input */}
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Plan name"
                placeholderTextColor="#666"
                value={planName}
                onChangeText={setPlanName}
                returnKeyType="done"
                onSubmitEditing={createNew}
              />

              {/* Create button */}
              <TouchableOpacity
                style={[styles.createBtn, !planName.trim() && styles.createBtnDisabled]}
                onPress={createNew}
                disabled={!planName.trim()}
              >
                <Text style={[styles.createText, !planName.trim() && styles.createTextDisabled]}>
                  Create & Add
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1a1a1f',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    padding: 4,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  venueName: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    marginBottom: 16,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  
  // Tonight
  tonightBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tonightGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tonightEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  tonightText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Plan rows
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  planEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  planName: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
  },

  // New plan button
  newPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  newPlanText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },

  // Save for later
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 8,
  },
  saveText: {
    fontSize: 13,
    color: '#666',
  },

  // New plan form
  form: {
    paddingBottom: 20,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtnActive: {
    backgroundColor: 'rgba(139,92,246,0.3)',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  emojiText: {
    fontSize: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 14,
  },
  createBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  createText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  createTextDisabled: {
    color: '#555',
  },
});
