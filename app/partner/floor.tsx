import React, { useState, useEffect } from 'react';
import { partnerFetch } from '../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme';

const API_BASE = 'https://lumina.viberyte.com';

type FloorItem = {
  id: number;
  venue_id: number;
  item_type: 'table' | 'bottle' | 'package';
  name: string;
  description?: string;
  original_price: number;
  current_price: number;
  quantity_available: number;
  quantity_requested: number;
  is_flash_deal: boolean;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
};

export default function PartnerFloor() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<FloorItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FloorItem | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'table' | 'bottle' | 'package'>('table');
  const [formPrice, setFormPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formDescription, setFormDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchFloorItems();
  }, []);

  const fetchFloorItems = async () => {
    try {
      const res = await partnerFetch(`/api/partner/floor`, {
        
      });

      if (res.status === 401) {
        router.replace('/partner');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFloorItems();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormType('table');
    setFormPrice('');
    setFormQuantity('1');
    setFormDescription('');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: FloorItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormType(item.item_type);
    setFormPrice(item.current_price.toString());
    setFormQuantity(item.quantity_available.toString());
    setFormDescription(item.description || '');
    setShowEditModal(true);
  };

  const handleAddItem = async () => {
    if (!formName || !formPrice) {
      Alert.alert('Missing Info', 'Please enter a name and price.');
      return;
    }

    setFormSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await partnerFetch(`/api/partner/floor`, {
        method: 'POST',
        
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          item_type: formType,
          original_price: parseFloat(formPrice),
          current_price: parseFloat(formPrice),
          quantity_available: parseInt(formQuantity) || 1,
          description: formDescription || null,
        }),
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAddModal(false);
        resetForm();
        fetchFloorItems();
      } else {
        Alert.alert('Error', 'Failed to add item. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !formName || !formPrice) {
      Alert.alert('Missing Info', 'Please enter a name and price.');
      return;
    }

    setFormSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await partnerFetch(`/api/partner/floor/${editingItem.id}`, {
        method: 'PATCH',
        
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          current_price: parseFloat(formPrice),
          quantity_available: parseInt(formQuantity) || 1,
          description: formDescription || null,
        }),
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowEditModal(false);
        setEditingItem(null);
        resetForm();
        fetchFloorItems();
      } else {
        Alert.alert('Error', 'Failed to update item. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (item: FloorItem) => {
    setProcessingId(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const res = await partnerFetch(`/api/partner/floor/${item.id}/toggle`, {
        method: 'POST',
        
      });

      if (res.ok) {
        setItems(prev =>
          prev.map(i =>
            i.id === item.id ? { ...i, is_active: !i.is_active } : i
          )
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update item.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFlashDeal = async (item: FloorItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.prompt(
      'Flash Deal',
      `Enter new price for "${item.name}" (was $${item.current_price})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop Price',
          onPress: async (newPrice) => {
            if (!newPrice || isNaN(parseFloat(newPrice))) return;

            setProcessingId(item.id);
            try {
              const res = await partnerFetch(`/api/partner/floor/${item.id}/flash`, {
                method: 'POST',
                
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  new_price: parseFloat(newPrice),
                }),
              });

              if (res.ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fetchFloorItems();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to create flash deal.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleDelete = (item: FloorItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove "${item.name}" from Tonight's Floor?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(item.id);
            try {
              const res = await partnerFetch(`/api/partner/floor/${item.id}`, {
                method: 'DELETE',
                
              });

              if (res.ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setItems(prev => prev.filter(i => i.id !== item.id));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return 'grid-outline';
      case 'bottle': return 'wine-outline';
      case 'package': return 'gift-outline';
      default: return 'cube-outline';
    }
  };

  const activeItems = items.filter(i => i.is_active);
  const inactiveItems = items.filter(i => !i.is_active);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tonight's Floor</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Live Indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live inventory · {activeItems.length} items</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flame-outline" size={48} color={colors.zinc[700]} />
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.emptySubtitle}>
                Add tables, bottles, or packages to Tonight's Floor
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Add First Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Active Items */}
              {activeItems.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Active</Text>
                  {activeItems.map((item, index) => (
                    <Animated.View
                      key={item.id}
                      entering={FadeInDown.delay(index * 50).duration(300)}
                    >
                      <View style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTypeIcon}>
                            <Ionicons name={getTypeIcon(item.item_type)} size={20} color={colors.zinc[400]} />
                          </View>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemMeta}>
                              {item.quantity_available - item.quantity_requested} remaining
                              {item.quantity_requested > 0 && ` · ${item.quantity_requested} requested`}
                            </Text>
                          </View>
                          <View style={styles.itemPricing}>
                            {item.is_flash_deal && item.original_price !== item.current_price && (
                              <Text style={styles.originalPrice}>${item.original_price}</Text>
                            )}
                            <Text style={[styles.currentPrice, item.is_flash_deal && styles.flashPrice]}>
                              ${item.current_price}
                            </Text>
                          </View>
                        </View>

                        {item.is_flash_deal && (
                          <View style={styles.flashBadge}>
                            <Ionicons name="flash" size={12} color="#F59E0B" />
                            <Text style={styles.flashBadgeText}>Flash Deal</Text>
                          </View>
                        )}

                        <View style={styles.itemActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openEditModal(item)}
                          >
                            <Ionicons name="pencil-outline" size={18} color={colors.zinc[400]} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleFlashDeal(item)}
                          >
                            <Ionicons name="flash-outline" size={18} color="#F59E0B" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleToggleActive(item)}
                            disabled={processingId === item.id}
                          >
                            <Ionicons name="eye-off-outline" size={18} color={colors.zinc[400]} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDelete(item)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              )}

              {/* Inactive Items */}
              {inactiveItems.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Hidden</Text>
                  {inactiveItems.map((item) => (
                    <View key={item.id} style={[styles.itemCard, styles.itemCardInactive]}>
                      <View style={styles.itemHeader}>
                        <View style={[styles.itemTypeIcon, styles.itemTypeIconInactive]}>
                          <Ionicons name={getTypeIcon(item.item_type)} size={20} color={colors.zinc[600]} />
                        </View>
                        <View style={styles.itemInfo}>
                          <Text style={[styles.itemName, styles.itemNameInactive]}>{item.name}</Text>
                          <Text style={styles.itemMeta}>${item.current_price}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reactivateButton}
                          onPress={() => handleToggleActive(item)}
                          disabled={processingId === item.id}
                        >
                          {processingId === item.id ? (
                            <ActivityIndicator size="small" color={colors.zinc[400]} />
                          ) : (
                            <Text style={styles.reactivateText}>Show</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity onPress={handleAddItem} disabled={formSubmitting}>
                {formSubmitting ? (
                  <ActivityIndicator size="small" color={colors.violet[400]} />
                ) : (
                  <Text style={styles.modalDone}>Add</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Type Selector */}
              <Text style={styles.inputLabel}>TYPE</Text>
              <View style={styles.typeSelector}>
                {(['table', 'bottle', 'package'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeOption, formType === type && styles.typeOptionActive]}
                    onPress={() => setFormType(type)}
                  >
                    <Ionicons 
                      name={getTypeIcon(type)} 
                      size={20} 
                      color={formType === type ? '#fff' : colors.zinc[500]} 
                    />
                    <Text style={[styles.typeText, formType === type && styles.typeTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Name */}
              <Text style={styles.inputLabel}>NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. VIP Booth, Hennessy, Bottle Package"
                placeholderTextColor={colors.zinc[600]}
                value={formName}
                onChangeText={setFormName}
              />

              {/* Price & Quantity Row */}
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>PRICE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.zinc[600]}
                    value={formPrice}
                    onChangeText={setFormPrice}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>QUANTITY</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor={colors.zinc[600]}
                    value={formQuantity}
                    onChangeText={setFormQuantity}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Description */}
              <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Add details about this item..."
                placeholderTextColor={colors.zinc[600]}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={3}
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingItem(null); }}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity onPress={handleUpdateItem} disabled={formSubmitting}>
                {formSubmitting ? (
                  <ActivityIndicator size="small" color={colors.violet[400]} />
                ) : (
                  <Text style={styles.modalDone}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Name */}
              <Text style={styles.inputLabel}>NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Item name"
                placeholderTextColor={colors.zinc[600]}
                value={formName}
                onChangeText={setFormName}
              />

              {/* Price & Quantity Row */}
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>PRICE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.zinc[600]}
                    value={formPrice}
                    onChangeText={setFormPrice}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>QUANTITY</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor={colors.zinc[600]}
                    value={formQuantity}
                    onChangeText={setFormQuantity}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Description */}
              <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Add details about this item..."
                placeholderTextColor={colors.zinc[600]}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={3}
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  // Live Indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  liveText: {
    fontSize: 13,
    color: colors.zinc[500],
    fontWeight: '500',
  },
  // Scroll
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.zinc[500],
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.zinc[600],
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(139,92,246,0.85)',
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.zinc[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  // Item Card
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  itemCardInactive: {
    opacity: 0.6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTypeIconInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  itemNameInactive: {
    color: colors.zinc[500],
  },
  itemMeta: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 3,
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 12,
    color: colors.zinc[600],
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  flashPrice: {
    color: '#F59E0B',
  },
  // Flash Badge
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 8,
  },
  flashBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  // Actions
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  actionButton: {
    width: 40,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactivateButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  reactivateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalCancel: {
    fontSize: 16,
    color: colors.zinc[400],
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.violet[400],
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  // Inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.zinc[500],
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeOptionActive: {
    backgroundColor: 'rgba(139,92,246,0.85)',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.zinc[500],
  },
  typeTextActive: {
    color: '#fff',
  },
});
