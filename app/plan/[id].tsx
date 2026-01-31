import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  getPlan, 
  updatePlan,
  removeVenueFromPlan, 
  sharePlan, 
  Plan, 
  PlanItem 
} from '../../services/plansService';

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

const EMOJI_OPTIONS = ['✨', '🌙', '🎉', '❤️', '🎂', '👔', '💄', '🍸', '🎵', '🔥', '🌴', '🎭', '🍕', '☕️', '🏖️'];

const DATE_OPTIONS = [
  { label: 'Tonight', value: 'tonight' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'This Weekend', value: 'weekend' },
  { label: 'Next Week', value: 'nextweek' },
  { label: 'No Date', value: 'none' },
  { label: 'Pick Date', value: 'custom' },
];

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams();
  const planId = id as string;

  const [plan, setPlan] = useState<(Plan & { items: PlanItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('✨');
  const [selectedDateOption, setSelectedDateOption] = useState('none');
  const [customDate, setCustomDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPlan(planId);
      setPlan(data);
      setEditName(data.name);
      setEditEmoji(data.emoji || '✨');
      
      // Determine date option
      if (data.is_tonight) {
        setSelectedDateOption('tonight');
      } else if (data.date) {
        const planDate = new Date(data.date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (planDate.toDateString() === tomorrow.toDateString()) {
          setSelectedDateOption('tomorrow');
        } else {
          setSelectedDateOption('custom');
        }
      } else {
        setSelectedDateOption('none');
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const getDateFromOption = (option: string): { date: string | null; isTonight: boolean } => {
    const today = new Date();
    
    switch (option) {
      case 'tonight':
        return { date: today.toISOString().split('T')[0], isTonight: true };
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { date: tomorrow.toISOString().split('T')[0], isTonight: false };
      case 'weekend':
        const daysUntilSat = (6 - today.getDay() + 7) % 7 || 7;
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + daysUntilSat);
        return { date: saturday.toISOString().split('T')[0], isTonight: false };
      case 'custom':
        return { date: customDate.toISOString().split('T')[0], isTonight: false };
      case 'nextweek':
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return { date: nextWeek.toISOString().split('T')[0], isTonight: false };
      case 'none':
      default:
        return { date: null, isTonight: false };
    }
  };

  const handleSaveEdit = async () => {
    if (!plan) return;
    
    const { date, isTonight } = getDateFromOption(selectedDateOption);
    
    try {
      await updatePlan(plan.id, {
        name: editName.trim() || 'My Plan',
        emoji: editEmoji,
        date,
        is_tonight: isTonight,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditModal(false);
      loadPlan();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleShare = async () => {
    if (!plan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const shareUrl = await sharePlan(plan.id);
      await Share.share({
        message: `Check out my plan "${plan.name}" on Lumina!\n${shareUrl}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRemoveVenue = (item: PlanItem) => {
    Alert.alert(
      'Remove Venue',
      `Remove ${item.venue_name} from this plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeVenueFromPlan(item.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setPlan(prev => prev ? {
                ...prev,
                items: prev.items.filter(i => i.id !== item.id)
              } : null);
            } catch (error) {
              console.error('Error removing venue:', error);
            }
          },
        },
      ]
    );
  };

  const formatDisplayDate = (plan: Plan): string => {
    if (plan.is_tonight) return 'Tonight';
    if (!plan.date) return 'No date set';
    
    const d = new Date(plan.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderVenueItem = ({ item, index }: { item: PlanItem; index: number }) => (
    <TouchableOpacity
      style={styles.venueCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/venue/${item.venue_id}`);
      }}
      onLongPress={() => handleRemoveVenue(item)}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <View style={styles.stopNumber}>
        <Text style={styles.stopNumberText}>{index + 1}</Text>
      </View>

      <View style={styles.venueImageContainer}>
        {item.venue_photo ? (
          <Image
            source={{ uri: item.venue_photo }}
            style={styles.venueImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.venueImagePlaceholder}>
            <Ionicons name="location" size={24} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.venueInfo}>
        <Text style={styles.venueName} numberOfLines={1}>{item.venue_name}</Text>
        <Text style={styles.venueMeta}>
          {item.venue_category && `${item.venue_category} • `}
          {item.venue_neighborhood || 'Unknown location'}
        </Text>
        {item.venue_rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#FBBF24" />
            <Text style={styles.ratingText}>{item.venue_rating}</Text>
            {item.venue_price_range && (
              <Text style={styles.priceText}> • {item.venue_price_range}</Text>
            )}
          </View>
        )}
      </View>

      {item.origin === 'ai' && (
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={12} color={colors.accent} />
        </View>
      )}

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Plan not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={() => setShowEditModal(true)}
        >
          <Text style={styles.headerEmoji}>{plan.emoji}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{plan.name}</Text>
          <Ionicons name="pencil" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Date & Meta Bar */}
      <TouchableOpacity 
        style={styles.metaBar}
        onPress={() => setShowEditModal(true)}
      >
        <View style={[styles.dateChip, plan.is_tonight && styles.tonightChip]}>
          <Ionicons 
            name={plan.is_tonight ? "moon" : "calendar-outline"} 
            size={16} 
            color={plan.is_tonight ? colors.accent : colors.textSecondary} 
          />
          <Text style={[styles.dateChipText, plan.is_tonight && styles.tonightChipText]}>
            {formatDisplayDate(plan)}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {plan.items.length} {plan.items.length === 1 ? 'stop' : 'stops'}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Venues List */}
      {plan.items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={styles.emptyTitle}>No venues yet</Text>
          <Text style={styles.emptySubtitle}>
            Browse venues and add them to this plan
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/explore')}
          >
            <LinearGradient
              colors={[colors.accent, '#7C3AED']}
              style={styles.exploreButtonGradient}
            >
              <Text style={styles.exploreButtonText}>Find Venues</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plan.items}
          renderItem={renderVenueItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => router.push('/explore')}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.addMoreText}>Add More Venues</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Bottom CTA */}
      {plan.items.length > 0 && (
        <View style={styles.bottomActions}>
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.bottomGradient}
          />
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (plan.items[0]) {
                router.push(`/venue/${plan.items[0].venue_id}`);
              }
            }}
          >
            <LinearGradient
              colors={[colors.accent, '#7C3AED']}
              style={styles.startButtonGradient}
            >
              <Ionicons name="navigate" size={20} color="white" />
              <Text style={styles.startButtonText}>Start Night</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            
            <Text style={styles.modalTitle}>Edit Plan</Text>

            {/* Emoji Picker */}
            <Text style={styles.modalLabel}>Icon</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.emojiPicker}
              contentContainerStyle={styles.emojiPickerContent}
            >
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiOption,
                    editEmoji === emoji && styles.emojiOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEditEmoji(emoji);
                  }}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Name Input */}
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Plan name"
              placeholderTextColor={colors.textMuted}
            />

            {/* Date Options */}
            <Text style={styles.modalLabel}>When</Text>
            <View style={styles.dateOptions}>
              {DATE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dateOption,
                    selectedDateOption === option.value && styles.dateOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDateOption(option.value);
                  }}
                >
                  <Text style={[
                    styles.dateOptionText,
                    selectedDateOption === option.value && styles.dateOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Calendar Picker */}
            {selectedDateOption === 'custom' && (
              <View style={styles.calendarContainer}>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                  <Text style={styles.datePickerText}>
                    {customDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={customDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) setCustomDate(date);
                    }}
                    themeVariant="dark"
                  />
                )}
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveEdit}
              >
                <LinearGradient
                  colors={[colors.accent, '#7C3AED']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
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
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  backLink: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  shareButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Meta Bar
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tonightChip: {},
  dateChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tonightChipText: {
    color: colors.accent,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    marginRight: 8,
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  venueImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
  },
  venueImage: {
    width: '100%',
    height: '100%',
  },
  venueImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  venueMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  priceText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  aiBadge: {
    marginRight: 8,
  },

  // Add More
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    gap: 8,
  },
  addMoreText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exploreButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Bottom Actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 20,
  },
  bottomGradient: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emojiPicker: {
    marginBottom: 20,
  },
  emojiPickerContent: {
    gap: 8,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiOptionSelected: {
    backgroundColor: colors.accentDark,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  emojiText: {
    fontSize: 24,
  },
  nameInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateOptions: {
  calendarContainer: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  datePickerText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
  },
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  dateOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateOptionSelected: {
    backgroundColor: colors.accentDark,
    borderColor: colors.accent,
  },
  dateOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dateOptionTextSelected: {
    color: colors.accent,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
