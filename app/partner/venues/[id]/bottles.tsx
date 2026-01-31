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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://lumina.viberyte.com';

const CATEGORIES = [
  'Vodka',
  'Tequila',
  'Whiskey',
  'Cognac',
  'Rum',
  'Gin',
  'Champagne',
  'Wine',
];

type Bottle = {
  id: number;
  name: string;
  category: string;
  price: number;
  is_active: boolean;
};

export default function BottleMenu() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const venueId = parseInt(id as string);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [venueName, setVenueName] = useState('');

  // Flow-based form
  const [showSheet, setShowSheet] = useState(false);
  const [flowStep, setFlowStep] = useState(1);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    fetchBottles();
  }, []);

  const fetchBottles = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const venueRes = await fetch(`${API_BASE}/api/partner/venues/${venueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (venueRes.ok) {
        const venueData = await venueRes.json();
        setVenueName(venueData.venue?.name || '');
      }

      const res = await fetch(`${API_BASE}/api/partner/venues/${venueId}/bottles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setBottles(data.bottles || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const openSheet = () => {
    setFlowStep(1);
    setNewName('');
    setNewCategory('');
    setNewPrice('');
    setShowSheet(true);
  };

  const nextStep = () => {
    if (flowStep === 1 && !newName.trim()) return;
    if (flowStep === 2 && !newCategory) return;
    if (flowStep < 3) {
      setFlowStep(flowStep + 1);
    } else {
      addBottle();
    }
  };

  const addBottle = async () => {
    if (!newPrice) return;

    setSaving(true);

    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      const res = await fetch(`${API_BASE}/api/partner/venues/${venueId}/bottles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          category: newCategory,
          price: parseFloat(newPrice),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBottles([...bottles, data.bottle]);
        setShowSheet(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleBottle = async (bottleId: number, isActive: boolean) => {
    // Optimistic update
    setBottles(bottles.map(b => b.id === bottleId ? { ...b, is_active: !isActive } : b));

    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      await fetch(`${API_BASE}/api/partner/venues/${venueId}/bottles/${bottleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });
    } catch (error) {
      // Revert on error
      setBottles(bottles.map(b => b.id === bottleId ? { ...b, is_active: isActive } : b));
    }
  };

  const handleLongPress = (bottle: Bottle) => {
    Alert.alert(
      bottle.name,
      undefined,
      [
        {
          text: bottle.is_active ? 'Hide from menu' : 'Show on menu',
          onPress: () => toggleBottle(bottle.id, bottle.is_active),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBottle(bottle),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const deleteBottle = async (bottle: Bottle) => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return;

      const { token } = JSON.parse(session);

      await fetch(`${API_BASE}/api/partner/venues/${venueId}/bottles/${bottle.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      setBottles(bottles.filter(b => b.id !== bottle.id));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete');
    }
  };

  // Group bottles by category
  const groupedBottles = bottles.reduce((acc, bottle) => {
    if (!acc[bottle.category]) acc[bottle.category] = [];
    acc[bottle.category].push(bottle);
    return acc;
  }, {} as Record<string, Bottle[]>);

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
          <Text style={styles.headerTitle}>Bottles</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.venueName}>{venueName}</Text>
          {bottles.length > 0 && (
            <Text style={styles.subtitle}>{bottles.filter(b => b.is_active).length} available</Text>
          )}

          {Object.keys(groupedBottles).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bottles yet</Text>
              <Text style={styles.emptySubtext}>Add bottles to build packages</Text>
            </View>
          ) : (
            Object.entries(groupedBottles).map(([category, categoryBottles]) => (
              <View key={category}>
                <Text style={styles.categoryLabel}>{category}</Text>
                {categoryBottles.map((bottle) => (
                  <TouchableOpacity
                    key={bottle.id}
                    style={styles.bottleRow}
                    onLongPress={() => handleLongPress(bottle)}
                    delayLongPress={400}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bottleInfo}>
                      <Text style={[styles.bottleName, !bottle.is_active && styles.inactive]}>
                        {bottle.name}
                      </Text>
                    </View>
                    <Text style={[styles.bottlePrice, !bottle.is_active && styles.inactive]}>
                      ${bottle.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity style={styles.fab} onPress={openSheet}>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>

        {/* Flow-based Bottom Sheet */}
        <Modal visible={showSheet} animationType="slide" transparent>
          <View style={styles.sheetOverlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />

              {flowStep === 1 && (
                <View style={styles.flowStep}>
                  <Text style={styles.flowTitle}>What's the bottle?</Text>
                  <TextInput
                    style={styles.flowInput}
                    placeholder="Hennessy VS"
                    placeholderTextColor="#52525b"
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={nextStep}
                  />
                </View>
              )}

              {flowStep === 2 && (
                <View style={styles.flowStep}>
                  <Text style={styles.flowTitle}>Category</Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryOption, newCategory === cat && styles.categoryOptionSelected]}
                        onPress={() => setNewCategory(cat)}
                      >
                        <Text style={[styles.categoryOptionText, newCategory === cat && styles.categoryOptionTextSelected]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {flowStep === 3 && (
                <View style={styles.flowStep}>
                  <Text style={styles.flowTitle}>Price</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceDollar}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="350"
                      placeholderTextColor="#52525b"
                      value={newPrice}
                      onChangeText={setNewPrice}
                      keyboardType="number-pad"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={nextStep}
                    />
                  </View>
                </View>
              )}

              <View style={styles.sheetButtons}>
                <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowSheet(false)}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetNext, (!newName && flowStep === 1) || (!newCategory && flowStep === 2) ? styles.sheetNextDisabled : null]}
                  onPress={nextStep}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.sheetNextText}>{flowStep === 3 ? 'Add' : 'Next'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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

  scrollView: { flex: 1, paddingHorizontal: 20 },

  venueName: { fontSize: 28, fontWeight: '600', color: '#fff', marginTop: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontWeight: '400', color: '#52525b', marginTop: 4, marginBottom: 32 },

  emptyState: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontSize: 17, fontWeight: '400', color: '#71717a' },
  emptySubtext: { fontSize: 15, fontWeight: '400', color: '#3f3f46', marginTop: 4 },

  categoryLabel: { fontSize: 13, fontWeight: '400', color: '#52525b', marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  bottleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  bottleInfo: { flex: 1 },
  bottleName: { fontSize: 16, fontWeight: '400', color: '#fff' },
  bottlePrice: { fontSize: 15, fontWeight: '400', color: '#71717a' },
  inactive: { color: '#3f3f46' },

  fab: { position: 'absolute', bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#18181b', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#3f3f46', alignSelf: 'center', marginTop: 12, marginBottom: 24 },

  flowStep: { minHeight: 160 },
  flowTitle: { fontSize: 24, fontWeight: '600', color: '#fff', marginBottom: 24, letterSpacing: -0.5 },
  flowInput: { fontSize: 20, fontWeight: '400', color: '#fff', borderBottomWidth: 1, borderBottomColor: '#27272a', paddingVertical: 12 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  categoryOptionSelected: { backgroundColor: '#fff' },
  categoryOptionText: { fontSize: 15, fontWeight: '400', color: '#a1a1aa' },
  categoryOptionTextSelected: { color: '#000', fontWeight: '500' },

  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceDollar: { fontSize: 24, fontWeight: '400', color: '#52525b', marginRight: 4 },
  priceInput: { fontSize: 32, fontWeight: '400', color: '#fff', flex: 1 },

  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 32 },
  sheetCancel: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  sheetCancelText: { fontSize: 16, fontWeight: '400', color: '#fff' },
  sheetNext: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 12, backgroundColor: '#fff' },
  sheetNextDisabled: { backgroundColor: '#27272a' },
  sheetNextText: { fontSize: 16, fontWeight: '500', color: '#000' },
});
