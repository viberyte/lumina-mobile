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
import { useRouter } from 'expo-router';
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

export default function LayoutBuilder() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [venueName, setVenueName] = useState('');
  const [venueId, setVenueId] = useState<number | null>(null);

  useEffect(() => {
    fetchLayout();
  }, []);

  const fetchLayout = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.venues?.length > 0) {
          const homeVenue = data.venues.find((v: any) => v.is_home) || data.venues[0];
          setVenueName(homeVenue.name);
          setVenueId(homeVenue.id);

          // Fetch existing layout
          const layoutRes = await fetch(`${API_BASE}/api/partner/venues/${homeVenue.id}/layout`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (layoutRes.ok) {
            const layoutData = await layoutRes.json();
            if (layoutData.sections?.length > 0) {
              setSections(layoutData.sections);
            }
          }
        }
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

  const updateSection = (id: string, field: keyof Section, value: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSection = (id: string) => {
    Alert.alert('Remove Section', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setSections(sections.filter(s => s.id !== id)) },
    ]);
  };

  const saveLayout = async () => {
    if (!venueId) return;

    setSaving(true);

    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/venues/${venueId}/layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sections }),
      });

      if (res.ok) {
        Alert.alert('Saved', 'Layout saved as primary');
      } else {
        Alert.alert('Error', 'Failed to save layout');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setSaving(false);
    }
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Layout</Text>
          <TouchableOpacity onPress={saveLayout} disabled={saving} style={styles.saveButton}>
            {saving ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(200)}>
            <Text style={styles.venueName}>{venueName}</Text>
            <Text style={styles.summary}>{totalTables} tables · {totalCapacity} capacity</Text>
          </Animated.View>

          {/* Existing Sections */}
          {sections.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100).duration(200)}>
              <Text style={styles.sectionLabel}>SECTIONS</Text>

              {sections.map((section, index) => (
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
                        <TouchableOpacity 
                          style={styles.stepperBtn}
                          onPress={() => updateSection(section.id, 'tableCount', Math.max(0, section.tableCount - 1))}
                        >
                          <Ionicons name="remove" size={16} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{section.tableCount}</Text>
                        <TouchableOpacity 
                          style={styles.stepperBtn}
                          onPress={() => updateSection(section.id, 'tableCount', section.tableCount + 1)}
                        >
                          <Ionicons name="add" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Capacity / table</Text>
                      <View style={styles.stepper}>
                        <TouchableOpacity 
                          style={styles.stepperBtn}
                          onPress={() => updateSection(section.id, 'capacity', Math.max(1, section.capacity - 1))}
                        >
                          <Ionicons name="remove" size={16} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{section.capacity}</Text>
                        <TouchableOpacity 
                          style={styles.stepperBtn}
                          onPress={() => updateSection(section.id, 'capacity', section.capacity + 1)}
                        >
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

          {/* Add Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(200)}>
            <Text style={styles.sectionLabel}>ADD SECTION</Text>
            <View style={styles.presetGrid}>
              {SECTION_PRESETS.filter(p => !sections.find(s => s.name === p.name)).map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={styles.presetBtn}
                  onPress={() => addSection(preset)}
                >
                  <Ionicons name={preset.icon as any} size={20} color="#a1a1aa" />
                  <Text style={styles.presetText}>{preset.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/dashboard')}>
            <Ionicons name="grid-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/bookings')}>
            <Ionicons name="calendar-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/events')}>
            <Ionicons name="sparkles-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/partner/settings')}>
            <Ionicons name="settings-outline" size={22} color="#52525b" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  saveButton: { padding: 4 },
  saveText: { fontSize: 15, fontWeight: '500', color: '#3b82f6' },

  scrollView: { flex: 1, paddingHorizontal: 16 },

  venueName: { fontSize: 24, fontWeight: '600', color: '#fff', marginTop: 8 },
  summary: { fontSize: 14, color: '#52525b', marginTop: 4, marginBottom: 24 },

  sectionLabel: { fontSize: 12, fontWeight: '400', color: '#52525b', marginBottom: 12, letterSpacing: 0.5 },

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

  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 28, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 10, color: '#52525b' },
});
