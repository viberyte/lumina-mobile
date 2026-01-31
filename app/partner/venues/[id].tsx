import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

const API_BASE = 'https://lumina.viberyte.com';

type Section = {
  id: string;
  name: string;
  tableCount: number;
  capacity: number;
  minSpend: number;
};

const SECTION_PRESETS = [
  { name: 'VIP', icon: 'star' },
  { name: 'Lounge', icon: 'wine' },
  { name: 'Booth', icon: 'grid' },
  { name: 'Bar', icon: 'beer' },
  { name: 'Patio', icon: 'sunny' },
  { name: 'Main Floor', icon: 'people' },
];

export default function VenueDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    if (!isNew) {
      fetchVenue();
    }
  }, [id]);

  const fetchVenue = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/venues/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setVenueName(data.venue?.name || '');
        setVenueAddress(data.venue?.address || '');
        setSections(data.sections || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const addSection = (preset: { name: string; icon: string }) => {
    const newSection: Section = {
      id: Date.now().toString(),
      name: preset.name,
      tableCount: preset.name === 'Main Floor' ? 0 : 4,
      capacity: preset.name === 'Main Floor' ? 100 : 6,
      minSpend: preset.name === 'VIP' ? 500 : preset.name === 'Main Floor' ? 0 : 300,
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (sectionId: string, field: keyof Section, value: any) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s));
  };

  const removeSection = (sectionId: string) => {
    Alert.alert('Remove Section', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setSections(sections.filter(s => s.id !== sectionId)) },
    ]);
  };

  const saveVenue = async () => {
    if (!venueName.trim()) {
      Alert.alert('Required', 'Venue name is required');
      return;
    }

    setSaving(true);

    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      const endpoint = isNew 
        ? `${API_BASE}/api/partner/venues`
        : `${API_BASE}/api/partner/venues/${id}`;

      const res = await fetch(endpoint, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: venueName,
          address: venueAddress,
          sections,
        }),
      });

      if (res.ok) {
        router.back();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to save venue');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteVenue = () => {
    Alert.alert(
      'Delete Venue',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const session = await AsyncStorage.getItem('lumina_partner_session');
              if (!session) return;

              const { token } = JSON.parse(session);

              const res = await fetch(`${API_BASE}/api/partner/venues/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                router.back();
              } else {
                Alert.alert('Error', 'Failed to delete venue');
              }
            } catch (error) {
              Alert.alert('Error', 'Connection failed');
            }
          },
        },
      ]
    );
  };

  const totalTables = sections.reduce((sum, s) => sum + s.tableCount, 0);
  const totalCapacity = sections.reduce((sum, s) => sum + (s.tableCount > 0 ? s.tableCount * s.capacity : s.capacity), 0);

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isNew ? 'New Venue' : 'Edit Venue'}</Text>
          <TouchableOpacity onPress={saveVenue} disabled={saving} style={styles.saveButton}>
            {saving ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(200)}>
            <Text style={styles.sectionLabel}>VENUE INFO</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Club XYZ"
                  placeholderTextColor="#3f3f46"
                  value={venueName}
                  onChangeText={setVenueName}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123 Main St"
                  placeholderTextColor="#3f3f46"
                  value={venueAddress}
                  onChangeText={setVenueAddress}
                />
              </View>
            </View>
          </Animated.View>

          {sections.length > 0 && (
            <Animated.View entering={FadeInDown.delay(50).duration(200)}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{totalTables} tables</Text>
                <Text style={styles.summaryDot}>·</Text>
                <Text style={styles.summaryText}>{totalCapacity} capacity</Text>
              </View>
            </Animated.View>
          )}

          {sections.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100).duration(200)}>
              <Text style={styles.sectionLabel}>LAYOUT</Text>
              {sections.map((section) => (
                <View key={section.id} style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <TextInput
                      style={styles.sectionName}
                      value={section.name}
                      onChangeText={(v) => updateSection(section.id, 'name', v)}
                      placeholder="Section name"
                      placeholderTextColor="#52525b"
                    />
                    <TouchableOpacity onPress={() => removeSection(section.id)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.sectionFields}>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Tables</Text>
                      <View style={styles.stepper}>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => updateSection(section.id, 'tableCount', Math.max(0, section.tableCount - 1))}>
                          <Ionicons name="remove" size={16} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{section.tableCount}</Text>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => updateSection(section.id, 'tableCount', section.tableCount + 1)}>
                          <Ionicons name="add" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Capacity / table</Text>
                      <View style={styles.stepper}>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => updateSection(section.id, 'capacity', Math.max(1, section.capacity - 1))}>
                          <Ionicons name="remove" size={16} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{section.capacity}</Text>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => updateSection(section.id, 'capacity', section.capacity + 1)}>
                          <Ionicons name="add" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Min spend</Text>
                      <View style={styles.minSpendInput}>
                        <Text style={styles.dollarSign}>$</Text>
                        <TextInput
                          style={styles.minSpendValue}
                          value={section.minSpend.toString()}
                          onChangeText={(v) => updateSection(section.id, 'minSpend', parseInt(v) || 0)}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(150).duration(200)}>
            <Text style={styles.sectionLabel}>ADD SECTION</Text>
            <View style={styles.presetGrid}>
              {SECTION_PRESETS.filter(p => !sections.find(s => s.name === p.name)).map((preset) => (
                <TouchableOpacity key={preset.name} style={styles.presetBtn} onPress={() => addSection(preset)}>
                  <Ionicons name={preset.icon as any} size={20} color="#a1a1aa" />
                  <Text style={styles.presetText}>{preset.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {!isNew && (
            <TouchableOpacity style={styles.deleteButton} onPress={deleteVenue}>
              <Text style={styles.deleteText}>Delete Venue</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  cancelButton: { padding: 4 },
  cancelText: { fontSize: 15, color: '#fff' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  saveButton: { padding: 4 },
  saveText: { fontSize: 15, fontWeight: '500', color: '#3b82f6' },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '400', color: '#52525b', marginTop: 24, marginBottom: 12, letterSpacing: 0.5 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, overflow: 'hidden' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  inputLabel: { fontSize: 15, color: '#fff', width: 70 },
  input: { flex: 1, fontSize: 15, color: '#fff', textAlign: 'right' },
  divider: { height: 0.5, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginLeft: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  summaryText: { fontSize: 14, color: '#71717a' },
  summaryDot: { fontSize: 14, color: '#3f3f46' },
  sectionCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionName: { fontSize: 17, fontWeight: '500', color: '#fff', flex: 1 },
  sectionFields: { gap: 12 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 14, color: '#a1a1aa' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  stepperValue: { fontSize: 15, fontWeight: '500', color: '#fff', minWidth: 24, textAlign: 'center' },
  minSpendInput: { flexDirection: 'row', alignItems: 'center' },
  dollarSign: { fontSize: 14, color: '#52525b', marginRight: 2 },
  minSpendValue: { fontSize: 15, fontWeight: '500', color: '#fff', minWidth: 50, textAlign: 'right' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255, 255, 255, 0.04)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  presetText: { fontSize: 14, color: '#a1a1aa' },
  deleteButton: { marginTop: 40, paddingVertical: 14, alignItems: 'center' },
  deleteText: { fontSize: 15, color: '#ef4444' },
});
