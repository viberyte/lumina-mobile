import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';
import { API_BASE } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Zone {
  id?: number;
  zone_type: 'zone' | 'table' | 'booth' | 'vip';
  name: string;
  capacity_min: number;
  capacity_max: number;
  minimum_spend: number;
  price: number;
  notes: string;
  color: string;
  is_vip: boolean;
  sort_order: number;
}

interface Layout {
  id?: number;
  name: string;
  venue_id: number;
  is_active: boolean;
  zones: Zone[];
}

interface Props {
  venueId: number;
  venueName: string;
  promoterId: number;
  existingLayout?: Layout;
  onSave?: (layout: Layout) => void;
  onClose?: () => void;
}

const ZONE_COLORS = [
  { name: 'Gold', value: '#EAB308' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Orange', value: '#F97316' },
];

const ZONE_TYPES = [
  { type: 'vip', label: 'VIP Section', icon: 'star' },
  { type: 'booth', label: 'Booth', icon: 'square' },
  { type: 'table', label: 'Table', icon: 'grid' },
  { type: 'zone', label: 'General Zone', icon: 'people' },
];

export default function PromoterLayoutBuilder({ 
  venueId, 
  venueName, 
  promoterId,
  existingLayout,
  onSave, 
  onClose 
}: Props) {
  const [layoutName, setLayoutName] = useState(existingLayout?.name || '');
  const [zones, setZones] = useState<Zone[]>(existingLayout?.zones || []);
  const [showAddZone, setShowAddZone] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [saving, setSaving] = useState(false);

  // New zone form state
  const [newZone, setNewZone] = useState<Partial<Zone>>({
    zone_type: 'vip',
    name: '',
    capacity_min: 1,
    capacity_max: 10,
    minimum_spend: 0,
    price: 0,
    notes: '',
    color: ZONE_COLORS[0].value,
    is_vip: true,
  });

  const resetNewZone = () => {
    setNewZone({
      zone_type: 'vip',
      name: '',
      capacity_min: 1,
      capacity_max: 10,
      minimum_spend: 0,
      price: 0,
      notes: '',
      color: ZONE_COLORS[0].value,
      is_vip: true,
    });
  };

  const addZone = () => {
    if (!newZone.name) {
      Alert.alert('Required', 'Please enter a zone name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const zone: Zone = {
      zone_type: newZone.zone_type as Zone['zone_type'],
      name: newZone.name,
      capacity_min: newZone.capacity_min || 1,
      capacity_max: newZone.capacity_max || 10,
      minimum_spend: newZone.minimum_spend || 0,
      price: newZone.price || 0,
      notes: newZone.notes || '',
      color: newZone.color || ZONE_COLORS[0].value,
      is_vip: newZone.zone_type === 'vip',
      sort_order: zones.length,
    };

    setZones([...zones, zone]);
    setShowAddZone(false);
    resetNewZone();
  };

  const updateZone = (index: number, updates: Partial<Zone>) => {
    const updated = [...zones];
    updated[index] = { ...updated[index], ...updates };
    setZones(updated);
  };

  const removeZone = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Remove Zone',
      `Remove "${zones[index].name}" from layout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setZones(zones.filter((_, i) => i !== index))
        },
      ]
    );
  };

  const saveLayout = async () => {
    if (!layoutName) {
      Alert.alert('Required', 'Please enter a layout name');
      return;
    }

    if (zones.length === 0) {
      Alert.alert('Required', 'Add at least one zone to your layout');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const endpoint = existingLayout?.id 
        ? `${API_BASE}/api/promoters/layouts/${existingLayout.id}`
        : `${API_BASE}/api/promoters/layouts`;
      
      const method = existingLayout?.id ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: venueId,
          promoter_id: promoterId,
          name: layoutName,
          is_active: true,
          zones: zones.map((z, i) => ({ ...z, sort_order: i })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved!', 'Your layout has been saved successfully.');
        onSave?.({ ...data.data, zones });
        onClose?.();
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      Alert.alert('Error', 'Failed to save layout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount > 0 ? `$${amount.toLocaleString()}` : 'Free';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Layout Builder</Text>
          <Text style={styles.headerSubtitle}>{venueName}</Text>
        </View>
        <TouchableOpacity 
          onPress={saveLayout} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Layout Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Layout Name</Text>
          <TextInput
            style={styles.nameInput}
            value={layoutName}
            onChangeText={setLayoutName}
            placeholder="e.g., NYE 2025, Weekend Standard"
            placeholderTextColor={colors.zinc[600]}
          />
        </View>

        {/* Zones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Zones & Tables</Text>
            <Text style={styles.sectionCount}>{zones.length} items</Text>
          </View>

          {/* Zone List */}
          {zones.map((zone, index) => (
            <View key={index} style={styles.zoneCard}>
              <View style={[styles.zoneColorBar, { backgroundColor: zone.color }]} />
              <View style={styles.zoneContent}>
                <View style={styles.zoneHeader}>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <View style={styles.zoneMeta}>
                      <View style={styles.zoneTag}>
                        <Text style={styles.zoneTagText}>
                          {ZONE_TYPES.find(t => t.type === zone.zone_type)?.label}
                        </Text>
                      </View>
                      <Text style={styles.zoneCapacity}>
                        {zone.capacity_min}-{zone.capacity_max} guests
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeZone(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.rose[500]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.zonePricing}>
                  {zone.minimum_spend > 0 && (
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Min Spend</Text>
                      <Text style={styles.priceValue}>{formatCurrency(zone.minimum_spend)}</Text>
                    </View>
                  )}
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>{formatCurrency(zone.price)}</Text>
                  </View>
                </View>

                {zone.notes && (
                  <Text style={styles.zoneNotes}>{zone.notes}</Text>
                )}
              </View>
            </View>
          ))}

          {/* Add Zone Button */}
          <TouchableOpacity 
            style={styles.addZoneButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddZone(true);
            }}
          >
            <Ionicons name="add-circle" size={24} color={colors.violet[400]} />
            <Text style={styles.addZoneText}>Add Zone or Table</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {zones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preview</Text>
            <View style={styles.previewContainer}>
              {zones.map((zone, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.previewZone,
                    { 
                      backgroundColor: zone.color + '30',
                      borderColor: zone.color,
                    }
                  ]}
                >
                  <Text style={[styles.previewZoneName, { color: zone.color }]}>
                    {zone.name}
                  </Text>
                  <Text style={styles.previewZonePrice}>
                    {formatCurrency(zone.price || zone.minimum_spend)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.previewNote}>
              Members will see these as bookable options
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Zone Modal */}
      <Modal
        visible={showAddZone}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddZone(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddZone(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Zone</Text>
            <TouchableOpacity onPress={addZone}>
              <Text style={styles.modalDone}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Zone Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeGrid}>
                {ZONE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.type}
                    style={[
                      styles.typeButton,
                      newZone.zone_type === type.type && styles.typeButtonActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewZone({ ...newZone, zone_type: type.type as Zone['zone_type'], is_vip: type.type === 'vip' });
                    }}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={20} 
                      color={newZone.zone_type === type.type ? colors.violet[400] : colors.zinc[500]} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      newZone.zone_type === type.type && styles.typeButtonTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={newZone.name}
                onChangeText={(text) => setNewZone({ ...newZone, name: text })}
                placeholder="e.g., VIP Section 1, Main Floor"
                placeholderTextColor={colors.zinc[600]}
              />
            </View>

            {/* Capacity */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Min Guests</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(newZone.capacity_min || '')}
                  onChangeText={(text) => setNewZone({ ...newZone, capacity_min: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.zinc[600]}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Max Guests</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(newZone.capacity_max || '')}
                  onChangeText={(text) => setNewZone({ ...newZone, capacity_max: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor={colors.zinc[600]}
                />
              </View>
            </View>

            {/* Pricing */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Min Spend ($)</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(newZone.minimum_spend || '')}
                  onChangeText={(text) => setNewZone({ ...newZone, minimum_spend: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.zinc[600]}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Price ($)</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(newZone.price || '')}
                  onChangeText={(text) => setNewZone({ ...newZone, price: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.zinc[600]}
                />
              </View>
            </View>

            {/* Color */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {ZONE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color.value },
                      newZone.color === color.value && styles.colorButtonActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewZone({ ...newZone, color: color.value });
                    }}
                  >
                    {newZone.color === color.value && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={newZone.notes}
                onChangeText={(text) => setNewZone({ ...newZone, notes: text })}
                placeholder="Any special details about this zone..."
                placeholderTextColor={colors.zinc[600]}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.zinc[950],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc[800],
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: colors.violet[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.zinc[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sectionCount: {
    fontSize: 13,
    color: colors.zinc[600],
  },
  nameInput: {
    backgroundColor: colors.zinc[900],
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  zoneCard: {
    flexDirection: 'row',
    backgroundColor: colors.zinc[900],
    borderRadius: 14,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  zoneColorBar: {
    width: 4,
  },
  zoneContent: {
    flex: 1,
    padding: spacing.md,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  zoneMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  zoneTag: {
    backgroundColor: colors.zinc[800],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  zoneTagText: {
    fontSize: 11,
    color: colors.zinc[400],
    fontWeight: '500',
  },
  zoneCapacity: {
    fontSize: 12,
    color: colors.zinc[500],
  },
  removeButton: {
    padding: 4,
  },
  zonePricing: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.zinc[800],
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.zinc[500],
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.violet[400],
  },
  zoneNotes: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.violet[500] + '15',
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.violet[500] + '30',
    borderStyle: 'dashed',
  },
  addZoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.violet[400],
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  previewZone: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  previewZoneName: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewZonePrice: {
    fontSize: 12,
    color: colors.zinc[400],
    marginTop: 2,
  },
  previewNote: {
    fontSize: 12,
    color: colors.zinc[600],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.zinc[950],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 20,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc[800],
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
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.zinc[400],
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.zinc[900],
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.zinc[900],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  typeButtonActive: {
    borderColor: colors.violet[500],
    backgroundColor: colors.violet[500] + '15',
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.zinc[500],
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: colors.violet[400],
  },
  colorGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
});
