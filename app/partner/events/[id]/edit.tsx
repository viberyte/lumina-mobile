import React, { useState, useEffect } from 'react';
import { partnerFetch } from '../../../../utils/partnerApi';
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
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const API_BASE = 'https://viberyte.com';

const PACKAGE_TEMPLATES = [
  { name: 'Standard Table', description: 'Great energy, prime seating', bottles: 2 },
  { name: 'Premium Table', description: 'Best sections, elevated service', bottles: 3 },
  { name: 'VIP Table', description: 'High-demand tables, curated experience', bottles: 4 },
];

type Section = { id: string; name: string; tableCount: number; capacity: number };
type Package = {
  tempId: string;
  name: string;
  description: string;
  bottleCount: number;
  price: number;
  sectionId: string;
  maxGuests: number;
};

export default function EditPackages() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueId, setVenueId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Package sheet state
  const [showPackageSheet, setShowPackageSheet] = useState(false);
  const [packageStep, setPackageStep] = useState(1);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgBottles, setPkgBottles] = useState('2');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgSection, setPkgSection] = useState('');
  const [pkgGuests, setPkgGuests] = useState('6');

  useEffect(() => { fetchEvent(); }, []);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return null;
      return JSON.parse(session).token;
    } catch { return null; }
  };

  const fetchEvent = async () => {
    try {
      const token = await getAuthToken();
      if (!token) { router.replace('/partner'); return; }

      const res = await partnerFetch(`/api/partner/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const evt = data.event;
        setEventTitle(evt.title || '');
        setVenueName(evt.venue_name || '');
        setVenueId(evt.venue_id || null);

        // Parse packages from event
        let pkgs: any[] = [];
        if (evt.packages) {
          try {
            pkgs = typeof evt.packages === 'string' ? JSON.parse(evt.packages) : evt.packages;
          } catch (e) { console.warn('Failed to parse packages:', e); }
        }
        if (data.packages && data.packages.length > 0) {
          pkgs = data.packages;
        }

        setPackages(pkgs.map((p: any, i: number) => ({
          tempId: p.id ? `db_${p.id}` : `pkg_${i}_${Date.now()}`,
          name: p.name || '',
          description: p.description || '',
          bottleCount: p.bottle_count ?? p.bottleCount ?? 2,
          price: p.price ?? 0,
          sectionId: p.section_id ?? p.sectionId ?? '',
          maxGuests: p.max_guests ?? p.maxGuests ?? 6,
        })));

        // Fetch venue sections
        if (evt.venue_id) {
          const secRes = await partnerFetch(`/api/partner/venues/${evt.venue_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (secRes.ok) {
            const secData = await secRes.json();
            setSections(secData.sections || []);
          }
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const openPackageSheet = (template?: typeof PACKAGE_TEMPLATES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPackageStep(1);
    setEditingPackage(null);
    if (template) {
      setPkgName(template.name);
      setPkgDesc(template.description);
      setPkgBottles(template.bottles.toString());
    } else {
      setPkgName('');
      setPkgDesc('');
      setPkgBottles('2');
    }
    setPkgPrice('');
    setPkgSection(sections[0]?.id || '');
    setPkgGuests('6');
    setShowPackageSheet(true);
  };

  const editExistingPackage = (pkg: Package) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingPackage(pkg);
    setPkgName(pkg.name);
    setPkgDesc(pkg.description);
    setPkgBottles(pkg.bottleCount.toString());
    setPkgPrice(pkg.price.toString());
    setPkgSection(pkg.sectionId);
    setPkgGuests(pkg.maxGuests.toString());
    setPackageStep(1);
    setShowPackageSheet(true);
  };

  const packageSheetNext = () => {
    if (packageStep === 1 && !pkgName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (packageStep === 2 && !pkgPrice) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (packageStep < 3) setPackageStep(packageStep + 1);
    else savePackage();
  };

  const savePackage = () => {
    const pkg: Package = {
      tempId: editingPackage?.tempId || 'pkg_' + Date.now(),
      name: pkgName,
      description: pkgDesc,
      bottleCount: parseInt(pkgBottles) || 2,
      price: parseFloat(pkgPrice) || 0,
      sectionId: pkgSection,
      maxGuests: parseInt(pkgGuests) || 6,
    };
    if (editingPackage) {
      setPackages(packages.map(p => p.tempId === editingPackage.tempId ? pkg : p));
    } else {
      setPackages([...packages, pkg]);
    }
    setHasChanges(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPackageSheet(false);
  };

  const deletePackage = (pkg: Package) => {
    Alert.alert('Delete Package', `Remove "${pkg.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setPackages(packages.filter(p => p.tempId !== pkg.tempId));
          setHasChanges(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const token = await getAuthToken();
      if (!token) { setSaving(false); return; }

      const packagesPayload = packages.map(p => ({
        name: p.name,
        description: p.description,
        bottle_count: p.bottleCount,
        price: p.price,
        section_id: p.sectionId || null,
        max_guests: p.maxGuests,
      }));

      const res = await partnerFetch(`/api/partner/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packages: packagesPayload }),
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        const errData = await res.json().catch(() => ({}));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', errData.error || 'Failed to update packages');
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Connection failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert('Discard Changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} disabled={saving}>
            <Text style={[styles.headerBtn, saving && styles.headerDisabled]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Packages</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <Text style={[styles.headerBtn, styles.headerPrimary, !hasChanges && styles.headerDisabled]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Event Info */}
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{eventTitle}</Text>
            <Text style={styles.eventVenue}>{venueName}</Text>
          </View>

          {/* Current Packages */}
          {packages.length > 0 ? (
            <>
              {packages.map((pkg) => (
                <View key={pkg.tempId} style={styles.packageCard}>
                  <TouchableOpacity style={styles.packageContent} onPress={() => editExistingPackage(pkg)} activeOpacity={0.7}>
                    <View style={styles.packageLeft}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      {pkg.description ? <Text style={styles.packageDesc}>{pkg.description}</Text> : null}
                      <Text style={styles.packageMeta}>{pkg.bottleCount} bottles · {pkg.maxGuests} guests</Text>
                    </View>
                    <View style={styles.packageRight}>
                      <Text style={styles.packagePrice}>${pkg.price}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#52525b" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.packageActions}>
                    <TouchableOpacity style={styles.packageActionBtn} onPress={() => editExistingPackage(pkg)}>
                      <Ionicons name="pencil-outline" size={16} color="#8b5cf6" />
                      <Text style={styles.packageActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.packageActionBtn} onPress={() => deletePackage(pkg)}>
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      <Text style={[styles.packageActionText, { color: '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="wine-outline" size={48} color="#3f3f46" />
              <Text style={styles.emptyTitle}>No packages</Text>
              <Text style={styles.emptyText}>Add bottle service or table packages for this event</Text>
            </View>
          )}

          {/* Add Package Button */}
          <TouchableOpacity style={styles.addBtn} onPress={() => openPackageSheet()}>
            <Ionicons name="add-circle-outline" size={24} color="#8b5cf6" />
            <Text style={styles.addBtnText}>Add Package</Text>
          </TouchableOpacity>

          {/* Quick Templates */}
          {packages.length === 0 && (
            <View style={styles.templatesSection}>
              <Text style={styles.sectionLabel}>QUICK START</Text>
              {PACKAGE_TEMPLATES.map(t => (
                <TouchableOpacity key={t.name} style={styles.templateRow} onPress={() => openPackageSheet(t)}>
                  <View>
                    <Text style={styles.templateName}>{t.name}</Text>
                    <Text style={styles.templateMeta}>{t.description} · {t.bottles} bottles</Text>
                  </View>
                  <Ionicons name="add" size={22} color="#8b5cf6" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Package Sheet Modal */}
        <Modal visible={showPackageSheet} animationType="slide" transparent>
          <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />

                {/* Step indicator */}
                <View style={styles.sheetSteps}>
                  {[1, 2, 3].map(s => (
                    <View key={s} style={[styles.sheetDot, packageStep >= s && styles.sheetDotActive]} />
                  ))}
                </View>

                {packageStep === 1 && (
                  <View>
                    <Text style={styles.sheetTitle}>{editingPackage ? 'Edit Package' : 'Package name'}</Text>
                    <TextInput
                      style={styles.sheetInput}
                      value={pkgName}
                      onChangeText={setPkgName}
                      placeholder="VIP Table"
                      placeholderTextColor="#52525b"
                      autoFocus
                    />
                    <Text style={styles.sheetFieldLabel}>Description</Text>
                    <TextInput
                      style={styles.sheetInput}
                      value={pkgDesc}
                      onChangeText={setPkgDesc}
                      placeholder="Best sections, elevated service"
                      placeholderTextColor="#52525b"
                    />

                    {!editingPackage && (
                      <>
                        <Text style={styles.sheetFieldLabel}>Templates</Text>
                        {PACKAGE_TEMPLATES.map(t => (
                          <TouchableOpacity
                            key={t.name}
                            style={[styles.templateOption, pkgName === t.name && styles.templateOptionActive]}
                            onPress={() => {
                              setPkgName(t.name);
                              setPkgDesc(t.description);
                              setPkgBottles(t.bottles.toString());
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                          >
                            <Text style={[styles.templateOptionName, pkgName === t.name && styles.templateOptionNameActive]}>{t.name}</Text>
                            <Text style={styles.templateOptionMeta}>{t.bottles} bottles</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                )}

                {packageStep === 2 && (
                  <View>
                    <Text style={styles.sheetTitle}>Set the price</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceDollar}>$</Text>
                      <TextInput
                        style={styles.priceInput}
                        value={pkgPrice}
                        onChangeText={setPkgPrice}
                        placeholder="500"
                        placeholderTextColor="#3f3f46"
                        keyboardType="number-pad"
                        autoFocus
                      />
                    </View>
                    <View style={styles.priceFields}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetFieldLabel}>Bottles</Text>
                        <TextInput style={styles.sheetInputSmall} value={pkgBottles} onChangeText={setPkgBottles} keyboardType="number-pad" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.sheetFieldLabel}>Max Guests</Text>
                        <TextInput style={styles.sheetInputSmall} value={pkgGuests} onChangeText={setPkgGuests} keyboardType="number-pad" />
                      </View>
                    </View>
                  </View>
                )}

                {packageStep === 3 && (
                  <View>
                    <Text style={styles.sheetTitle}>Which section?</Text>
                    {sections.length > 0 ? (
                      sections.map(s => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.sectionOption}
                          onPress={() => { setPkgSection(s.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                          <Text style={[styles.sectionOptionText, pkgSection === s.id && styles.sectionOptionActive]}>{s.name}</Text>
                          {pkgSection === s.id && <Ionicons name="checkmark" size={20} color="#8b5cf6" />}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noSectionsWrap}>
                        <Ionicons name="grid-outline" size={32} color="#3f3f46" />
                        <Text style={styles.noSections}>No sections set up</Text>
                        <Text style={styles.noSectionsHint}>You can add sections to your venue later</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.sheetBtns}>
                  <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPackageSheet(false)}>
                    <Text style={styles.sheetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sheetNext, ((packageStep === 1 && !pkgName) || (packageStep === 2 && !pkgPrice)) && styles.sheetNextDisabled]}
                    onPress={packageSheetNext}
                  >
                    <Text style={styles.sheetNextText}>{packageStep === 3 ? 'Save Package' : 'Next'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f23',
  },
  headerBtn: { fontSize: 17, color: '#fff', fontWeight: '500' },
  headerPrimary: { color: '#8b5cf6', fontWeight: '600' },
  headerDisabled: { color: '#3f3f46' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  eventInfo: { marginBottom: 28 },
  eventTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  eventVenue: { fontSize: 15, color: '#71717a', marginTop: 4 },

  packageCard: { backgroundColor: '#18181b', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' },
  packageContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  packageLeft: { flex: 1 },
  packageName: { fontSize: 17, fontWeight: '600', color: '#fff' },
  packageDesc: { fontSize: 14, color: '#71717a', marginTop: 4 },
  packageMeta: { fontSize: 13, color: '#52525b', marginTop: 6 },
  packageRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  packagePrice: { fontSize: 20, fontWeight: '700', color: '#fff' },
  packageActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#27272a' },
  packageActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  packageActionText: { fontSize: 14, fontWeight: '500', color: '#8b5cf6' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 18, color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#52525b', textAlign: 'center' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 18, marginTop: 8, backgroundColor: '#18181b', borderRadius: 14, borderWidth: 1, borderColor: '#8b5cf6',
  },
  addBtnText: { fontSize: 17, color: '#8b5cf6', fontWeight: '600' },

  templatesSection: { marginTop: 32 },
  sectionLabel: { fontSize: 12, color: '#52525b', marginBottom: 12, letterSpacing: 0.5 },
  templateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8, backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1, borderColor: '#27272a',
  },
  templateName: { fontSize: 16, color: '#fff', fontWeight: '500' },
  templateMeta: { fontSize: 13, color: '#71717a', marginTop: 2 },

  // Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, minHeight: 420 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3f3f46', alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  sheetSteps: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  sheetDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27272a' },
  sheetDotActive: { backgroundColor: '#8b5cf6' },
  sheetTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 20 },
  sheetInput: { fontSize: 18, color: '#fff', backgroundColor: '#27272a', borderRadius: 14, padding: 16 },
  sheetInputSmall: { fontSize: 18, color: '#fff', backgroundColor: '#27272a', borderRadius: 12, padding: 14, marginTop: 10, textAlign: 'center' },
  sheetFieldLabel: { fontSize: 13, fontWeight: '600', color: '#71717a', marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  templateOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8, backgroundColor: '#27272a', borderRadius: 12,
  },
  templateOptionActive: { backgroundColor: '#3f3f46' },
  templateOptionName: { fontSize: 16, color: '#a1a1aa', fontWeight: '500' },
  templateOptionNameActive: { color: '#fff' },
  templateOptionMeta: { fontSize: 14, color: '#52525b' },

  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceDollar: { fontSize: 36, color: '#52525b', marginRight: 4 },
  priceInput: { fontSize: 48, color: '#fff', flex: 1, fontWeight: '700' },
  priceFields: { flexDirection: 'row', marginTop: 24 },

  sectionOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 18, paddingHorizontal: 16, marginBottom: 8, backgroundColor: '#27272a', borderRadius: 12,
  },
  sectionOptionText: { fontSize: 17, color: '#a1a1aa' },
  sectionOptionActive: { color: '#fff', fontWeight: '600' },
  noSectionsWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noSections: { fontSize: 16, color: '#71717a', fontWeight: '500' },
  noSectionsHint: { fontSize: 14, color: '#52525b' },

  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 32 },
  sheetCancel: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 14, backgroundColor: '#27272a' },
  sheetCancelText: { fontSize: 17, color: '#fff', fontWeight: '600' },
  sheetNext: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 14, backgroundColor: '#8b5cf6' },
  sheetNextDisabled: { backgroundColor: '#3f3f46' },
  sheetNextText: { fontSize: 17, fontWeight: '600', color: '#fff' },
});
