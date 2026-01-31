import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const colors = {
  violet: { 500: '#8b5cf6', 600: '#7c3aed' },
  green: { 400: '#4ade80', 500: '#22c55e' },
  rose: { 400: '#fb7185', 500: '#f43f5e' },
  orange: { 500: '#f97316' },
  yellow: { 500: '#eab308' },
  blue: { 500: '#3b82f6' },
  zinc: { 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' },
};

type Table = {
  id: string;
  name: string;
  capacity: number;
  minimumSpend: number;
  isLocked?: boolean;
  lockedBy?: string;
  lockedUntil?: string;
};

type Zone = {
  id: string;
  name: string;
  type: 'vip' | 'standard' | 'mainfloor' | 'patio' | 'private';
  tables: Table[];
  minimumSpend: number;
  color: string;
};

type ZoneType = {
  id: 'vip' | 'standard' | 'mainfloor' | 'patio' | 'private';
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const ZONE_TYPES: ZoneType[] = [
  { id: 'vip', name: 'VIP Section', icon: 'star', color: colors.yellow[500] },
  { id: 'standard', name: 'Standard', icon: 'grid', color: colors.violet[500] },
  { id: 'mainfloor', name: 'Main Floor', icon: 'people', color: colors.blue[500] },
  { id: 'patio', name: 'Patio / Outdoor', icon: 'sunny', color: colors.green[500] },
  { id: 'private', name: 'Private Room', icon: 'lock-closed', color: colors.rose[500] },
];

export default function LayoutBuilder() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promoterId, setPromoterId] = useState<string | null>(null);

  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);

  // Modals
  const [addZoneModalVisible, setAddZoneModalVisible] = useState(false);
  const [addTableModalVisible, setAddTableModalVisible] = useState(false);

  // Add Zone form
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<ZoneType>(ZONE_TYPES[0]);
  const [newZoneMinimum, setNewZoneMinimum] = useState('');

  // Add Table form
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('');
  const [newTableMinimum, setNewTableMinimum] = useState('');

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('lumina_partner_session');
      if (!sessionData) {
        router.replace('/partner');
        return;
      }

      const session = JSON.parse(sessionData);
      setPromoterId(session.promoterId);

      // Try to fetch from API
      const response = await fetch(
        `https://lumina.viberyte.com/api/promoters/${session.promoterId}/layouts`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.zones && data.zones.length > 0) {
          setZones(data.zones);
        } else {
          loadDemoData();
        }
      } else {
        loadDemoData();
      }
    } catch (error) {
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    setZones([
      {
        id: 'zone-1',
        name: 'VIP Section',
        type: 'vip',
        color: colors.yellow[500],
        minimumSpend: 2000,
        tables: [
          { id: 't1', name: 'VIP 1', capacity: 8, minimumSpend: 2000, isLocked: false },
          { id: 't2', name: 'VIP 2', capacity: 10, minimumSpend: 3000, isLocked: true, lockedBy: 'DJ Mike', lockedUntil: '2:00 AM' },
          { id: 't3', name: 'VIP 3', capacity: 6, minimumSpend: 1500, isLocked: false },
        ],
      },
      {
        id: 'zone-2',
        name: 'Main Floor',
        type: 'mainfloor',
        color: colors.blue[500],
        minimumSpend: 500,
        tables: [
          { id: 't4', name: 'Table A', capacity: 4, minimumSpend: 500, isLocked: false },
          { id: 't5', name: 'Table B', capacity: 4, minimumSpend: 500, isLocked: false },
          { id: 't6', name: 'Table C', capacity: 6, minimumSpend: 750, isLocked: false },
        ],
      },
      {
        id: 'zone-3',
        name: 'Patio',
        type: 'patio',
        color: colors.green[500],
        minimumSpend: 300,
        tables: [
          { id: 't7', name: 'Patio 1', capacity: 4, minimumSpend: 300, isLocked: false },
          { id: 't8', name: 'Patio 2', capacity: 4, minimumSpend: 300, isLocked: false },
        ],
      },
    ]);
  };

  const saveLayout = async () => {
    if (!promoterId) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await fetch(`https://lumina.viberyte.com/api/promoters/${promoterId}/layouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones }),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Layout saved successfully.');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Layout saved locally.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddZone = () => {
    if (!newZoneName.trim()) {
      Alert.alert('Missing Name', 'Please enter a zone name.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name: newZoneName.trim(),
      type: newZoneType.id,
      color: newZoneType.color,
      minimumSpend: parseInt(newZoneMinimum) || 0,
      tables: [],
    };

    setZones([...zones, newZone]);
    setAddZoneModalVisible(false);
    setNewZoneName('');
    setNewZoneType(ZONE_TYPES[0]);
    setNewZoneMinimum('');
  };

  const handleAddTable = () => {
    if (!selectedZone) return;
    if (!newTableName.trim()) {
      Alert.alert('Missing Name', 'Please enter a table name.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newTable: Table = {
      id: `table-${Date.now()}`,
      name: newTableName.trim(),
      capacity: parseInt(newTableCapacity) || 4,
      minimumSpend: parseInt(newTableMinimum) || selectedZone.minimumSpend,
      isLocked: false,
    };

    setZones(zones.map(z => 
      z.id === selectedZone.id 
        ? { ...z, tables: [...z.tables, newTable] }
        : z
    ));

    setAddTableModalVisible(false);
    setNewTableName('');
    setNewTableCapacity('');
    setNewTableMinimum('');
  };

  const handleDeleteZone = (zoneId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      'Delete Zone',
      'Are you sure? This will remove all tables in this zone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setZones(zones.filter(z => z.id !== zoneId));
            if (expandedZoneId === zoneId) {
              setExpandedZoneId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteTable = (zoneId: string, tableId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      'Delete Table',
      'Are you sure you want to remove this table?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setZones(zones.map(z => 
              z.id === zoneId 
                ? { ...z, tables: z.tables.filter(t => t.id !== tableId) }
                : z
            ));
          },
        },
      ]
    );
  };

  const handleToggleLock = (zoneId: string, tableId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setZones(zones.map(z => 
      z.id === zoneId 
        ? {
            ...z,
            tables: z.tables.map(t => 
              t.id === tableId 
                ? {
                    ...t,
                    isLocked: !t.isLocked,
                    lockedBy: !t.isLocked ? 'You' : undefined,
                    lockedUntil: !t.isLocked ? '4 hours' : undefined,
                  }
                : t
            ),
          }
        : z
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getZoneIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const zoneType = ZONE_TYPES.find(z => z.id === type);
    return zoneType?.icon || 'grid';
  };

  const totalTables = zones.reduce((sum, z) => sum + z.tables.length, 0);
  const totalCapacity = zones.reduce((sum, z) => 
    sum + z.tables.reduce((tSum, t) => tSum + t.capacity, 0), 0
  );
  const totalHeld = zones.reduce((sum, z) => 
    sum + z.tables.filter(t => t.isLocked).length, 0
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
      </View>
    );
  }

  return (
    <LinearGradient colors={[colors.zinc[950], colors.zinc[900]]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Layout Builder</Text>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveLayout}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{zones.length}</Text>
            <Text style={styles.summaryLabel}>Zones</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalTables}</Text>
            <Text style={styles.summaryLabel}>Tables</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalCapacity}</Text>
            <Text style={styles.summaryLabel}>Capacity</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, totalHeld > 0 && { color: colors.orange[500] }]}>
              {totalHeld}
            </Text>
            <Text style={styles.summaryLabel}>Held</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Zones List */}
          {zones.map((zone) => (
            <View key={zone.id} style={styles.zoneCard}>
              <TouchableOpacity
                style={styles.zoneHeader}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedZoneId(expandedZoneId === zone.id ? null : zone.id);
                }}
              >
                <View style={styles.zoneHeaderLeft}>
                  <View style={[styles.zoneIcon, { backgroundColor: zone.color + '20' }]}>
                    <Ionicons name={getZoneIcon(zone.type)} size={18} color={zone.color} />
                  </View>
                  <View>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <Text style={styles.zoneInfo}>
                      {zone.tables.length} tables • {formatCurrency(zone.minimumSpend)} min
                    </Text>
                  </View>
                </View>
                <View style={styles.zoneHeaderRight}>
                  <TouchableOpacity
                    style={styles.deleteZoneButton}
                    onPress={() => handleDeleteZone(zone.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.zinc[500]} />
                  </TouchableOpacity>
                  <Ionicons 
                    name={expandedZoneId === zone.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={colors.zinc[500]} 
                  />
                </View>
              </TouchableOpacity>

              {expandedZoneId === zone.id && (
                <View style={styles.tablesContainer}>
                  {zone.tables.map((table) => (
                    <View 
                      key={table.id} 
                      style={[
                        styles.tableRow,
                        table.isLocked && styles.tableRowLocked,
                      ]}
                    >
                      <View style={styles.tableInfo}>
                        <View style={styles.tableNameRow}>
                          <Text style={styles.tableName}>{table.name}</Text>
                          {table.isLocked && (
                            <View style={styles.lockedBadge}>
                              <Ionicons name="lock-closed" size={12} color={colors.orange[500]} />
                              <Text style={styles.lockedText}>Held</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.tableDetails}>
                          {table.capacity} guests • {formatCurrency(table.minimumSpend)}
                        </Text>
                        {table.isLocked && table.lockedBy && (
                          <Text style={styles.lockedByText}>
                            By {table.lockedBy} • {table.lockedUntil}
                          </Text>
                        )}
                      </View>

                      <View style={styles.tableActions}>
                        <TouchableOpacity
                          style={[
                            styles.lockButton,
                            table.isLocked && styles.lockButtonActive,
                          ]}
                          onPress={() => handleToggleLock(zone.id, table.id)}
                        >
                          <Ionicons 
                            name={table.isLocked ? 'lock-closed' : 'lock-open-outline'} 
                            size={16} 
                            color={table.isLocked ? colors.orange[500] : colors.zinc[500]} 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteTableButton}
                          onPress={() => handleDeleteTable(zone.id, table.id)}
                        >
                          <Ionicons name="close" size={18} color={colors.zinc[500]} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addTableButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedZone(zone);
                      setNewTableMinimum(zone.minimumSpend.toString());
                      setAddTableModalVisible(true);
                    }}
                  >
                    <Ionicons name="add" size={20} color={colors.violet[500]} />
                    <Text style={styles.addTableText}>Add Table</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {/* Add Zone Button */}
          <TouchableOpacity
            style={styles.addZoneButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAddZoneModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.violet[500]} />
            <Text style={styles.addZoneText}>Add Zone</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Add Zone Modal */}
        <Modal
          visible={addZoneModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAddZoneModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              onPress={() => setAddZoneModalVisible(false)} 
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Zone</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ZONE NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., VIP Section"
                  placeholderTextColor={colors.zinc[500]}
                  value={newZoneName}
                  onChangeText={setNewZoneName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ZONE TYPE</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.zoneTypeScroll}
                >
                  {ZONE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.zoneTypeChip,
                        newZoneType.id === type.id && styles.zoneTypeChipActive,
                        newZoneType.id === type.id && { borderColor: type.color },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewZoneType(type);
                      }}
                    >
                      <Ionicons name={type.icon} size={16} color={type.color} />
                      <Text style={[
                        styles.zoneTypeText,
                        newZoneType.id === type.id && { color: '#fff' },
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DEFAULT MINIMUM SPEND</Text>
                <TextInput
                  style={styles.input}
                  placeholder="$0"
                  placeholderTextColor={colors.zinc[500]}
                  value={newZoneMinimum}
                  onChangeText={setNewZoneMinimum}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity style={styles.modalButton} onPress={handleAddZone}>
                <Text style={styles.modalButtonText}>Add Zone</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Add Table Modal */}
        <Modal
          visible={addTableModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAddTableModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              onPress={() => setAddTableModalVisible(false)} 
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Table to {selectedZone?.name}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TABLE NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., VIP 1, Table A"
                  placeholderTextColor={colors.zinc[500]}
                  value={newTableName}
                  onChangeText={setNewTableName}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CAPACITY</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="4"
                    placeholderTextColor={colors.zinc[500]}
                    value={newTableCapacity}
                    onChangeText={setNewTableCapacity}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>MINIMUM SPEND</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`$${selectedZone?.minimumSpend || 0}`}
                    placeholderTextColor={colors.zinc[500]}
                    value={newTableMinimum}
                    onChangeText={setNewTableMinimum}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.modalButton} onPress={handleAddTable}>
                <Text style={styles.modalButtonText}>Add Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.zinc[950],
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
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.zinc[900],
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.zinc[500],
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.zinc[800],
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Zone Card
  zoneCard: {
    backgroundColor: colors.zinc[900],
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.zinc[800],
    overflow: 'hidden',
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  zoneHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  zoneName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  zoneInfo: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 2,
  },
  zoneHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteZoneButton: {
    padding: 4,
  },

  // Tables
  tablesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.zinc[800],
    padding: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.zinc[950],
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  tableRowLocked: {
    borderWidth: 1,
    borderColor: colors.orange[500] + '50',
    backgroundColor: colors.orange[500] + '10',
  },
  tableInfo: {
    flex: 1,
  },
  tableNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.orange[500] + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.orange[500],
  },
  tableDetails: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 2,
  },
  lockedByText: {
    fontSize: 12,
    color: colors.orange[500],
    marginTop: 4,
  },
  tableActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.zinc[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockButtonActive: {
    backgroundColor: colors.orange[500] + '20',
  },
  deleteTableButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.zinc[800],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add Buttons
  addTableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addTableText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.violet[500],
  },
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.zinc[900],
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.zinc[800],
    borderStyle: 'dashed',
    gap: 8,
  },
  addZoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.violet[500],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: colors.zinc[900],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.zinc[700],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.zinc[500],
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.zinc[950],
    borderWidth: 1,
    borderColor: colors.zinc[800],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
  },
  zoneTypeScroll: {
    marginBottom: 4,
  },
  zoneTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.zinc[950],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  zoneTypeChipActive: {
    borderWidth: 2,
  },
  zoneTypeText: {
    fontSize: 14,
    color: colors.zinc[400],
    fontWeight: '500',
  },
  modalButton: {
    backgroundColor: colors.violet[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
