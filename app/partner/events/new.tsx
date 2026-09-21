import React, { useState, useEffect, useRef } from 'react';
import { partnerFetch } from '../../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Haptics from 'expo-haptics';

const API_BASE = 'https://viberyte.com';
const GOOGLE_PLACES_KEY = 'AIzaSyDvMcJrFjAc_Wrb_FJzqVRWv_z00YB_j0k';

const EVENT_CATEGORIES = [
  { key: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { key: 'dining', label: 'Dining Event', emoji: '🍽' },
  { key: 'brunch', label: 'Brunch', emoji: '🥂' },
  { key: 'happy_hour', label: 'Happy Hour', emoji: '🍻' },
  { key: 'live_music', label: 'Live Music', emoji: '🎵' },
];

const DAY_LABELS = [
  { key: 0, short: 'Sun', full: 'Sunday' },
  { key: 1, short: 'Mon', full: 'Monday' },
  { key: 2, short: 'Tue', full: 'Tuesday' },
  { key: 3, short: 'Wed', full: 'Wednesday' },
  { key: 4, short: 'Thu', full: 'Thursday' },
  { key: 5, short: 'Fri', full: 'Friday' },
  { key: 6, short: 'Sat', full: 'Saturday' },
];

const GENRES = [
  'Hip Hop', 'R&B', 'Latin', 'Reggaeton', 'House', 'EDM',
  'Afrobeats', 'Top 40', 'Throwbacks', 'Open Format',
];

const PACKAGE_TEMPLATES = [
  { name: 'Standard Table', description: 'Great energy, prime seating', bottles: 2 },
  { name: 'Premium Table', description: 'Best sections, elevated service', bottles: 3 },
  { name: 'VIP Table', description: 'High-demand tables, curated experience', bottles: 4 },
];

type Venue = { id: number; name: string; section_count: number; is_home: number };
type Section = { id: string; name: string; tableCount: number; capacity: number; minSpend: number };
type Package = { tempId: string; name: string; description: string; bottleCount: number; price: number; sectionId: string; maxGuests: number };
type PlacePrediction = { place_id: string; description: string; structured_formatting: { main_text: string; secondary_text: string } };

export default function NewEvent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Venue
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Event details
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventTime, setEventTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Address autocomplete
  const [address, setAddress] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Other details
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [eventCategory, setEventCategory] = useState('nightlife');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [flyerUri, setFlyerUri] = useState<string | null>(null);
  const [flyerBase64, setFlyerBase64] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedPackages, setExtractedPackages] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  // Sections & packages
  const [sections, setSections] = useState<Section[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  // Package sheet
  const [showPackageSheet, setShowPackageSheet] = useState(false);
  const [packageStep, setPackageStep] = useState(1);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgBottles, setPkgBottles] = useState('2');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgSection, setPkgSection] = useState('');
  const [pkgGuests, setPkgGuests] = useState('6');

  useEffect(() => { fetchVenues(); }, []);

  // ──────────────────────────────────────
  // AUTH
  // ──────────────────────────────────────
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return null;
      return JSON.parse(session).token;
    } catch { return null; }
  };

  // ──────────────────────────────────────
  // VENUES
  // ──────────────────────────────────────
  const fetchVenues = async () => {
    try {
      const token = await getAuthToken();
      if (!token) { router.replace('/partner'); return; }
      const res = await partnerFetch('/api/partner/venues', { headers: { Authorization: 'Bearer ' + token } });
      if (res.ok) {
        const data = await res.json();
        setVenues(data.venues || []);
        const home = data.venues?.find((v: Venue) => v.is_home === 1);
        if (home) selectVenue(home, token);
      }
      setLoading(false);
    } catch { setLoading(false); }
  };

  const selectVenue = async (venue: Venue, token?: string) => {
    setSelectedVenue(venue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (!token) token = await getAuthToken() || undefined;
      if (!token) return;
      const res = await partnerFetch('/api/partner/venues/' + venue.id, { headers: { Authorization: 'Bearer ' + token } });
      if (res.ok) {
        const data = await res.json();
        const secs = data.sections || [];
        console.log('Sections loaded:', secs.length, JSON.stringify(secs));
        setSections(secs);
      }
    } catch {}
  };

  // ──────────────────────────────────────
  // ADDRESS AUTOCOMPLETE
  // ──────────────────────────────────────
  const searchPlaces = async (query: string) => {
    if (query.length < 3) { setPredictions([]); setShowPredictions(false); return; }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&components=country:us&key=${GOOGLE_PLACES_KEY}`
      );
      const data = await res.json();
      if (data.predictions?.length > 0) {
        setPredictions(data.predictions.slice(0, 5));
        setShowPredictions(true);
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    } catch {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const onAddressChange = (text: string) => {
    setAddressQuery(text);
    setAddressConfirmed(false);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(text), 300);
  };

  const selectAddress = (prediction: PlacePrediction) => {
    setAddress(prediction.description);
    setAddressQuery(prediction.description);
    setAddressConfirmed(true);
    setPredictions([]);
    setShowPredictions(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
  };

  // ──────────────────────────────────────
  // DATE / TIME
  // ──────────────────────────────────────
  const handleDateConfirm = (date: Date) => {
    setEventDate(date);
    setShowDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTimeConfirm = (time: Date) => {
    setEventTime(time);
    setShowTimePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date';
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Select time';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDateForAPI = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatTimeForAPI = (time: Date): string => {
    const h = String(time.getHours()).padStart(2, '0');
    const m = String(time.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // ──────────────────────────────────────
  // GENRES
  // ──────────────────────────────────────
  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(selectedGenres.filter(x => x !== g));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (selectedGenres.length < 3) {
      setSelectedGenres([...selectedGenres, g]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Limit reached', 'You can select up to 3 music vibes');
    }
  };

  // ──────────────────────────────────────
  // IMAGES
  // ──────────────────────────────────────
  const pickFlyer = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) { Alert.alert('Permission needed', 'Please allow access to your photos'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.7, base64: true });
    if (!r.canceled && r.assets[0]) { setFlyerUri(r.assets[0].uri); setFlyerBase64(r.assets[0].base64 || null); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
  };



  const extractFromFlyer = async () => {
    if (!flyerUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExtracting(true);

    try {
      const base64 = flyerBase64;
      if (!base64) {
        Alert.alert('Error', 'Please re-upload the flyer to enable scanning.');
        setExtracting(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/partner/extract-flyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 }),
      });

      if (res.ok) {
        const data = await res.json();
        const e = data.extracted;

        // Use lineup as title if no event title, or combine
        if (e.title && e.lineup) {
          setTitle(e.title);
          setDescription(e.lineup + (e.description ? '\n\n' + e.description : ''));
        } else if (e.lineup) {
          setTitle(e.lineup);
          if (e.description) setDescription(e.description);
        } else if (e.title) {
          setTitle(e.title);
          if (e.description) setDescription(e.description);
        }
        // Store extracted packages for step 3
        if (e.packages && Array.isArray(e.packages) && e.packages.length > 0) {
          setExtractedPackages(e.packages);
        }
        // Auto-fill address field
        if (e.address) {
          setAddressQuery(e.address);
          setAddress(e.address);
          setAddressConfirmed(true);
        }
        if (e.genre) {
          const genres = e.genre.split(',').map((g: string) => g.trim());
          const matched = genres.filter((g: string) =>
            GENRES.some(known => known.toLowerCase() === g.toLowerCase())
          );
          if (matched.length > 0) setSelectedGenres(matched);
        }
        if (e.event_date) {
          try {
            const d = new Date(e.event_date + 'T00:00:00');
            if (!isNaN(d.getTime())) setEventDate(d);
          } catch {}
        }
        if (e.event_time) {
          try {
            const [h, m] = e.event_time.split(':').map(Number);
            const t = new Date();
            t.setHours(h, m, 0, 0);
            if (!isNaN(t.getTime())) setEventTime(t);
          } catch {}
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Flyer Scanned!', 'We auto-filled what we could. Review and adjust if needed.');
      } else {
        Alert.alert('Scan Failed', 'Could not read this flyer. Try a clearer image.');
      }
    } catch (error) {
      console.error('Extract error:', error);
      Alert.alert('Error', 'Something went wrong. Try again.');
    } finally {
      setExtracting(false);
    }
  };

  const pickPhoto = async () => {
    if (photos.length >= 5) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); Alert.alert('Limit reached', 'Maximum 5 additional photos'); return; }
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (!r.canceled && r.assets[0]) { setPhotos([...photos, r.assets[0].uri]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ──────────────────────────────────────
  // PACKAGES
  // ──────────────────────────────────────
  const openPackageSheet = (template?: typeof PACKAGE_TEMPLATES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPackageStep(1);
    setEditingPackage(null);
    if (template) { setPkgName(template.name); setPkgDesc(template.description); setPkgBottles(template.bottles.toString()); }
    else { setPkgName(''); setPkgDesc(''); setPkgBottles('2'); }
    setPkgPrice(''); setPkgSection(sections[0]?.id || ''); setPkgGuests('6');
    setShowPackageSheet(true);
  };

  const packageSheetNext = () => {
    if (packageStep === 1 && !pkgName.trim()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    if (packageStep === 2 && !pkgPrice) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (packageStep < 3) setPackageStep(packageStep + 1);
    else savePackage();
  };

  const savePackage = () => {
    const pkg: Package = {
      tempId: editingPackage?.tempId || 'pkg_' + Date.now(),
      name: pkgName, description: pkgDesc,
      bottleCount: parseInt(pkgBottles) || 2, price: parseFloat(pkgPrice) || 0,
      sectionId: pkgSection, maxGuests: parseInt(pkgGuests) || 6,
    };
    if (editingPackage) setPackages(packages.map(p => p.tempId === editingPackage.tempId ? pkg : p));
    else setPackages([...packages, pkg]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPackageSheet(false);
  };

  const handlePackageLongPress = (pkg: Package) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(pkg.name, undefined, [
      { text: 'Edit', onPress: () => {
        setEditingPackage(pkg); setPkgName(pkg.name); setPkgDesc(pkg.description);
        setPkgBottles(pkg.bottleCount.toString()); setPkgPrice(pkg.price.toString());
        setPkgSection(pkg.sectionId); setPkgGuests(pkg.maxGuests.toString());
        setPackageStep(1); setShowPackageSheet(true);
      }},
      { text: 'Delete', style: 'destructive', onPress: () => {
        setPackages(packages.filter(p => p.tempId !== pkg.tempId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ──────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────
  const handleCreate = async () => {
    if (!selectedVenue || !title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Required', 'Venue and event name are required');
      return;
    }
    if (!eventDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Required', 'Please select an event date');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const token = await getAuthToken();
      if (!token) { setSaving(false); return; }

      let flyerUrl = null;
      if (flyerUri) {
        const fd = new FormData();
        fd.append('file', { uri: flyerUri, type: 'image/jpeg', name: 'flyer.jpg' } as any);
        fd.append('type', 'event');
        const up = await partnerFetch('/api/partner/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
        if (up.ok) flyerUrl = (await up.json()).url;
      }

      const photoUrls: string[] = [];
      for (const photoUri of photos) {
        const fd = new FormData();
        fd.append('file', { uri: photoUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
        fd.append('type', 'event');
        const up = await partnerFetch('/api/partner/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
        if (up.ok) photoUrls.push((await up.json()).url);
      }

      const packagesPayload = packages.map(p => ({
        name: p.name, description: p.description,
        bottle_count: p.bottleCount, price: p.price,
        section_id: p.sectionId || null, max_guests: p.maxGuests,
      }));

      const res = await partnerFetch('/api/partner/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          venue_id: selectedVenue.id,
          title: title.trim(),
          event_date: formatDateForAPI(eventDate),
          event_time: eventTime ? formatTimeForAPI(eventTime) : null,
          address: addressConfirmed ? address : null,
          genre: selectedGenres.length > 0 ? selectedGenres.join(', ') : null,
          event_category: eventCategory,
          is_recurring: isRecurring,
          recurrence_days: isRecurring && recurrenceDays.length > 0 ? recurrenceDays : null,
          recurrence_type: isRecurring ? 'weekly' : null,
          description: description.trim() || null,
          packages: packagesPayload.length > 0 ? packagesPayload : null,
          image_url: flyerUrl,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
        }),
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errData = await res.json();
        Alert.alert('Error', errData.error || 'Failed to create event');
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Connection failed');
    } finally { setSaving(false); }
  };

  // ──────────────────────────────────────
  // NAVIGATION
  // ──────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return !!selectedVenue;
    if (step === 2) return !!title.trim() && !!eventDate;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (step === 2 && !eventDate) Alert.alert('Required', 'Please select an event date');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(step + 1);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#8b5cf6" size="large" />
    </View>
  );

  // ──────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.headerBtn, saving && styles.headerDisabled]}>{step > 1 ? 'Back' : 'Cancel'}</Text>
          </TouchableOpacity>
          <View style={styles.progressBar}>
            {[1,2,3].map(s => (
              <View key={s} style={[styles.progressSegment, step >= s && styles.progressSegmentActive]} />
            ))}
          </View>
          {step < 3 ? (
            <TouchableOpacity onPress={handleNext} disabled={!canProceed() || saving}>
              <Text style={[styles.headerBtn, styles.headerPrimary, (!canProceed() || saving) && styles.headerDisabled]}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#8b5cf6" /> : (
                <Text style={[styles.headerBtn, styles.headerPrimary]}>Create</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowPredictions(false); }}>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>

              {/* ════════ STEP 1: VENUE ════════ */}
              {step === 1 && (
                <View>
                  <Text style={styles.stepTitle}>Where?</Text>
                  <Text style={styles.stepSubtitle}>Select a venue for your event</Text>

                  {venues.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="location-outline" size={48} color="#3f3f46" />
                      <Text style={styles.emptyTitle}>No venues yet</Text>
                      <Text style={styles.emptyText}>Add your first venue to create events</Text>
                    </View>
                  ) : (
                    venues.map(v => (
                      <TouchableOpacity key={v.id} style={[styles.venueRow, selectedVenue?.id === v.id && styles.venueRowActive]} onPress={() => selectVenue(v)}>
                        <View style={styles.venueInfo}>
                          <Text style={styles.venueName}>{v.name}</Text>
                          {v.is_home === 1 && <View style={styles.homeBadge}><Text style={styles.homeBadgeText}>Home</Text></View>}
                        </View>
                        {selectedVenue?.id === v.id && <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />}
                      </TouchableOpacity>
                    ))
                  )}

                  <TouchableOpacity style={styles.addVenueBtn} onPress={() => router.push('/partner/venues/new')}>
                    <Ionicons name="add-circle-outline" size={22} color="#8b5cf6" />
                    <Text style={styles.addVenueText}>Add new venue</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ════════ STEP 2: DETAILS ════════ */}
              {step === 2 && (
                <View>
                  <Text style={styles.stepTitle}>Event Details</Text>
                  <Text style={styles.stepSubtitle}>{selectedVenue?.name}</Text>


                  {/* Event Type */}
                  <Text style={styles.inputLabel}>Event Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                    {EVENT_CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => { setEventCategory(cat.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                          backgroundColor: eventCategory === cat.key ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                          borderWidth: 1,
                          borderColor: eventCategory === cat.key ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: eventCategory === cat.key ? '#a78bfa' : '#71717a' }}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Recurring Toggle */}
                  <TouchableOpacity
                    onPress={() => { setIsRecurring(!isRecurring); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (isRecurring) setRecurrenceDays([]); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      padding: 14, borderRadius: 12,
                      backgroundColor: isRecurring ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                      borderWidth: 1,
                      borderColor: isRecurring ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                      marginBottom: isRecurring ? 8 : 20,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="repeat-outline" size={20} color={isRecurring ? '#22c55e' : '#52525b'} />
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: isRecurring ? '#22c55e' : '#a1a1aa' }}>Repeats Weekly</Text>
                        <Text style={{ fontSize: 12, color: '#52525b', marginTop: 1 }}>Set it once, runs every week</Text>
                      </View>
                    </View>
                    <View style={{
                      width: 44, height: 26, borderRadius: 13,
                      backgroundColor: isRecurring ? '#22c55e' : '#27272a',
                      justifyContent: 'center', paddingHorizontal: 2,
                    }}>
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: '#fff',
                        alignSelf: isRecurring ? 'flex-end' : 'flex-start',
                      }} />
                    </View>
                  </TouchableOpacity>

                  {/* Day Selector */}
                  {isRecurring && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 12, color: '#52525b', marginBottom: 10, letterSpacing: 0.5 }}>WHICH DAYS?</Text>
                      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
                        {DAY_LABELS.map(day => {
                          const selected = recurrenceDays.includes(day.key);
                          return (
                            <TouchableOpacity
                              key={day.key}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (selected) setRecurrenceDays(recurrenceDays.filter(d => d !== day.key));
                                else setRecurrenceDays([...recurrenceDays, day.key]);
                              }}
                              style={{
                                width: 44, height: 44, borderRadius: 22,
                                justifyContent: 'center', alignItems: 'center',
                                backgroundColor: selected ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                                borderWidth: 1,
                                borderColor: selected ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? '#fff' : '#71717a' }}>{day.short}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {recurrenceDays.length > 0 && (
                        <Text style={{ fontSize: 12, color: '#22c55e', marginTop: 8 }}>
                          {'Every ' + recurrenceDays.sort((a,b) => a-b).map(d => DAY_LABELS.find(l => l.key === d)?.full).join(', ')}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Event Name */}
                  <Text style={styles.inputLabel}>Event name *</Text>
                  <TextInput style={styles.input} placeholder="e.g. Saturday Night Live" placeholderTextColor="#52525b" value={title} onChangeText={setTitle} returnKeyType="done" autoFocus />

                  {/* Date & Time - Modern Cards */}
                  <Text style={styles.inputLabel}>Date & Time *</Text>
                  <View style={styles.dateTimeRow}>
                    <TouchableOpacity style={[styles.dateTimeCard, eventDate && styles.dateTimeCardFilled]} onPress={() => setShowDatePicker(true)}>
                      <View style={styles.dateTimeIconWrap}>
                        <Ionicons name="calendar" size={20} color={eventDate ? '#8b5cf6' : '#52525b'} />
                      </View>
                      <View style={styles.dateTimeInfo}>
                        <Text style={styles.dateTimeLabel}>Date</Text>
                        <Text style={[styles.dateTimeValue, !eventDate && styles.dateTimePlaceholder]}>{formatDate(eventDate)}</Text>
                      </View>
                      {eventDate && <Ionicons name="checkmark-circle" size={18} color="#22c55e" />}
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.dateTimeCard, eventTime && styles.dateTimeCardFilled]} onPress={() => setShowTimePicker(true)}>
                      <View style={styles.dateTimeIconWrap}>
                        <Ionicons name="time" size={20} color={eventTime ? '#8b5cf6' : '#52525b'} />
                      </View>
                      <View style={styles.dateTimeInfo}>
                        <Text style={styles.dateTimeLabel}>Time</Text>
                        <Text style={[styles.dateTimeValue, !eventTime && styles.dateTimePlaceholder]}>{formatTime(eventTime)}</Text>
                      </View>
                      {eventTime && <Ionicons name="checkmark-circle" size={18} color="#22c55e" />}
                    </TouchableOpacity>
                  </View>

                  {/* Address Autocomplete */}
                  <Text style={styles.inputLabel}>Address</Text>
                  <View style={styles.addressWrap}>
                    <View style={[styles.addressInputWrap, showPredictions && styles.addressInputActive]}>
                      <Ionicons name="location" size={18} color={addressConfirmed ? '#22c55e' : '#52525b'} style={{ marginLeft: 14 }} />
                      <TextInput
                        style={styles.addressInput}
                        placeholder="Search address..."
                        placeholderTextColor="#52525b"
                        value={addressQuery}
                        onChangeText={onAddressChange}
                        onFocus={() => { if (predictions.length > 0) setShowPredictions(true); }}
                      />
                      {addressConfirmed && (
                        <TouchableOpacity onPress={() => { setAddress(''); setAddressQuery(''); setAddressConfirmed(false); }} style={{ paddingRight: 14 }}>
                          <Ionicons name="close-circle" size={20} color="#52525b" />
                        </TouchableOpacity>
                      )}
                    </View>
                    {showPredictions && predictions.length > 0 && (
                      <View style={styles.predictionsContainer}>
                        {predictions.map((p, i) => (
                          <TouchableOpacity key={p.place_id} style={[styles.predictionRow, i < predictions.length - 1 && styles.predictionBorder]} onPress={() => selectAddress(p)}>
                            <Ionicons name="location-outline" size={16} color="#8b5cf6" />
                            <View style={styles.predictionText}>
                              <Text style={styles.predictionMain} numberOfLines={1}>{p.structured_formatting.main_text}</Text>
                              <Text style={styles.predictionSub} numberOfLines={1}>{p.structured_formatting.secondary_text}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {!addressConfirmed && addressQuery.length > 0 && (
                      <Text style={styles.addressHint}>Select an address from suggestions</Text>
                    )}
                  </View>

                  {/* Music Vibe */}
                  <Text style={styles.inputLabel}>Music vibe ({selectedGenres.length}/3)</Text>
                  <View style={styles.genreWrap}>
                    {GENRES.map(g => (
                      <TouchableOpacity key={g} style={[styles.genre, selectedGenres.includes(g) && styles.genreActive]} onPress={() => toggleGenre(g)}>
                        <Text style={[styles.genreText, selectedGenres.includes(g) && styles.genreTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Description */}
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput style={[styles.input, styles.textArea]} placeholder="Tell people what to expect..." placeholderTextColor="#52525b" value={description} onChangeText={setDescription} multiline textAlignVertical="top" />

                  {/* Flyer */}
                  <Text style={styles.inputLabel}>Event Flyer</Text>
                  <TouchableOpacity style={styles.flyerBtn} onPress={pickFlyer}>
                    {flyerUri ? (
                      <>
                        <Image source={{ uri: flyerUri }} style={styles.flyerPreview} />
                        <TouchableOpacity style={styles.flyerRemove} onPress={() => { setFlyerUri(null); setFlyerBase64(null); }}>
                          <Ionicons name="close-circle" size={28} color="#fff" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.flyerPlaceholder}>
                        <Ionicons name="image-outline" size={40} color="#52525b" />
                        <Text style={styles.flyerPlaceholderText}>Tap to add flyer</Text>
                        <Text style={styles.flyerHint}>Recommended: 9:16 portrait</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* AI Extract Button */}
                  {flyerUri && (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 14,
                        marginTop: 10,
                        marginBottom: 6,
                        backgroundColor: 'rgba(167,139,250,0.12)',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(167,139,250,0.25)',
                      }}
                      onPress={extractFromFlyer}
                      disabled={extracting}
                    >
                      {extracting ? (
                        <>
                          <ActivityIndicator size="small" color="#a78bfa" />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#a78bfa' }}>Scanning flyer...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={18} color="#a78bfa" />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#a78bfa' }}>Auto-fill from Flyer</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Photos */}
                  <Text style={styles.inputLabel}>Additional Photos ({photos.length}/5)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll} contentContainerStyle={styles.photosContent}>
                    {photos.map((uri, i) => (
                      <View key={i} style={styles.photoThumb}>
                        <Image source={{ uri }} style={styles.photoThumbImg} />
                        <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}><Ionicons name="close-circle" size={24} color="#fff" /></TouchableOpacity>
                      </View>
                    ))}
                    {photos.length < 5 && (
                      <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto}>
                        <Ionicons name="add" size={32} color="#52525b" />
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* ════════ STEP 3: PACKAGES ════════ */}
              {step === 3 && (
                <View>
                  <Text style={styles.stepTitle}>Packages</Text>
                  <Text style={styles.stepSubtitle}>Add bottle service or table packages (optional)</Text>

                  {/* Review Summary */}
                  <View style={styles.reviewCard}>
                    <Text style={styles.reviewTitle}>{title}</Text>
                    <View style={styles.reviewRow}>
                      <Ionicons name="location-outline" size={14} color="#71717a" />
                      <Text style={styles.reviewText}>{selectedVenue?.name}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Ionicons name="calendar-outline" size={14} color="#71717a" />
                      <Text style={styles.reviewText}>{formatDate(eventDate)}{eventTime ? ` · ${formatTime(eventTime)}` : ''}</Text>
                    </View>
                    {addressConfirmed && (
                      <View style={styles.reviewRow}>
                        <Ionicons name="navigate-outline" size={14} color="#71717a" />
                        <Text style={styles.reviewText} numberOfLines={1}>{address}</Text>
                      </View>
                    )}
                    {selectedGenres.length > 0 && (
                      <View style={styles.reviewRow}>
                        <Ionicons name="musical-notes-outline" size={14} color="#71717a" />
                        <Text style={styles.reviewText}>{selectedGenres.join(', ')}</Text>
                      </View>
                    )}
                  </View>


                  {/* Import from Venue Layout */}
                  {packages.length === 0 && sections.length > 0 && (
                    <TouchableOpacity 
                      style={styles.importLayoutBtn} 
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        const imported = sections.map((s) => ({
                          tempId: 'pkg_' + s.id,
                          name: s.name + ' Table',
                          description: s.tableCount + ' tables, ' + s.capacity + ' per table',
                          bottleCount: s.minSpend >= 500 ? 3 : 2,
                          price: s.minSpend || 300,
                          sectionId: s.id,
                          maxGuests: s.capacity || 6,
                        }));
                        setPackages(imported);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }}
                    >
                      <View style={styles.importLayoutIcon}>
                        <Ionicons name="grid-outline" size={24} color="#8b5cf6" />
                      </View>
                      <View style={styles.importLayoutInfo}>
                        <Text style={styles.importLayoutTitle}>Use Venue Layout</Text>
                        <Text style={styles.importLayoutSub}>Auto-create from {sections.length} sections</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={20} color="#8b5cf6" />
                    </TouchableOpacity>
                  )}

                  {packages.length > 0 ? (
                    <>
                      {packages.map(pkg => (
                        <TouchableOpacity key={pkg.tempId} style={styles.packageRow} onLongPress={() => handlePackageLongPress(pkg)} delayLongPress={400}>
                          <View style={styles.packageInfo}>
                            <Text style={styles.packageName}>{pkg.name}</Text>
                            <Text style={styles.packageMeta}>{pkg.bottleCount} bottles · {pkg.maxGuests} guests</Text>
                          </View>
                          <Text style={styles.packagePrice}>${pkg.price}</Text>
                        </TouchableOpacity>
                      ))}
                      <Text style={styles.hint}>Long press to edit or delete</Text>
                    </>
                  ) : (
                    <View style={styles.packagesEmpty}>
                      <Ionicons name="wine-outline" size={48} color="#3f3f46" />
                      <Text style={styles.packagesEmptyText}>No packages yet</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.addPackageBtn} onPress={() => openPackageSheet()}>
                    <Ionicons name="add-circle-outline" size={24} color="#8b5cf6" />
                    <Text style={styles.addPackageText}>Add Package</Text>
                  </TouchableOpacity>

                  <View style={styles.skipNote}>
                    <Ionicons name="information-circle-outline" size={18} color="#52525b" />
                    <Text style={styles.skipNoteText}>You can skip this and add packages later</Text>
                  </View>
                </View>
              )}

              <View style={{ height: 120 }} />
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* ════════ DATE PICKER MODAL ════════ */}
        <DateTimePickerModal accentColor="#8b5cf6" modalStyleIOS={{ backgroundColor: "rgba(0,0,0,0.8)" }} pickerContainerStyleIOS={{ backgroundColor: "#1c1c1e", borderRadius: 16, overflow: "hidden" }}
          isVisible={showDatePicker}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={() => setShowDatePicker(false)}
          minimumDate={new Date()}
          date={eventDate || new Date()}
          display="inline"
          isDarkMode={true}
          themeVariant="dark"
        />

        {/* ════════ TIME PICKER MODAL ════════ */}
        <DateTimePickerModal accentColor="#8b5cf6" modalStyleIOS={{ backgroundColor: "rgba(0,0,0,0.8)" }} pickerContainerStyleIOS={{ backgroundColor: "#1c1c1e", borderRadius: 16, overflow: "hidden" }}
          isVisible={showTimePicker}
          mode="time"
          onConfirm={handleTimeConfirm}
          onCancel={() => setShowTimePicker(false)}
          date={eventTime || (() => { const d = new Date(); d.setHours(22, 0, 0, 0); return d; })()}
          display="inline"
          isDarkMode={true}
          themeVariant="dark"
          minuteInterval={15}
        />

        {/* ════════ PACKAGE SHEET ════════ */}
        <Modal visible={showPackageSheet} animationType="slide" transparent>
          <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />

                {packageStep === 1 && (
                  <View>
                    <Text style={styles.sheetTitle}>Package name</Text>
                    <TextInput style={styles.sheetInput} value={pkgName} onChangeText={setPkgName} placeholder="VIP Table" placeholderTextColor="#52525b" autoFocus />
                    <Text style={styles.sheetLabel}>Quick templates</Text>
                    {PACKAGE_TEMPLATES.map(t => (
                      <TouchableOpacity key={t.name} style={[styles.templateRow, pkgName === t.name && styles.templateRowActive]} onPress={() => { setPkgName(t.name); setPkgDesc(t.description); setPkgBottles(t.bottles.toString()); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                        <Text style={[styles.templateName, pkgName === t.name && styles.templateNameActive]}>{t.name}</Text>
                        <Text style={styles.templateMeta}>{t.bottles} bottles</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {packageStep === 2 && (
                  <View>
                    <Text style={styles.sheetTitle}>Set the price</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceDollar}>$</Text>
                      <TextInput style={styles.priceInput} value={pkgPrice} onChangeText={setPkgPrice} placeholder="500" placeholderTextColor="#3f3f46" keyboardType="number-pad" autoFocus />
                    </View>
                    <View style={[styles.row, { marginTop: 24 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetLabel}>Bottles</Text>
                        <TextInput style={styles.sheetInputSmall} value={pkgBottles} onChangeText={setPkgBottles} keyboardType="number-pad" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.sheetLabel}>Max Guests</Text>
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
                        <TouchableOpacity key={s.id} style={styles.sectionOption} onPress={() => { setPkgSection(s.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                          <Text style={[styles.sectionOptionText, pkgSection === s.id && styles.sectionOptionActive]}>{s.name}</Text>
                          {pkgSection === s.id && <Ionicons name="checkmark" size={20} color="#8b5cf6" />}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noSectionsWrap}>
                        <Ionicons name="grid-outline" size={32} color="#3f3f46" />
                        <Text style={styles.noSections}>No sections set up yet</Text>
                        <Text style={styles.noSectionsHint}>You can add sections to your venue later</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.sheetBtns}>
                  <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPackageSheet(false)}>
                    <Text style={styles.sheetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sheetNext, ((packageStep === 1 && !pkgName) || (packageStep === 2 && !pkgPrice)) && styles.sheetNextDisabled]} onPress={packageSheetNext}>
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
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f23' },
  headerBtn: { fontSize: 17, color: '#fff', fontWeight: '500' },
  headerPrimary: { color: '#8b5cf6', fontWeight: '600' },
  headerDisabled: { color: '#3f3f46' },
  progressBar: { flexDirection: 'row', gap: 6 },
  progressSegment: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#27272a' },
  progressSegmentActive: { backgroundColor: '#8b5cf6' },

  // Step titles
  stepTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 20, marginBottom: 4 },
  stepSubtitle: { fontSize: 15, color: '#71717a', marginBottom: 28 },

  // Inputs
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#a1a1aa', marginBottom: 10, marginTop: 24, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#18181b', borderRadius: 14, padding: 16, fontSize: 17, color: '#fff', borderWidth: 1, borderColor: '#27272a' },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 16 },
  row: { flexDirection: 'row' },

  // Date/Time Cards
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateTimeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#27272a', gap: 10 },
  dateTimeCardFilled: { borderColor: 'rgba(139, 92, 246, 0.3)', backgroundColor: 'rgba(139, 92, 246, 0.05)' },
  dateTimeIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(139, 92, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  dateTimeInfo: { flex: 1 },
  dateTimeLabel: { fontSize: 11, color: '#71717a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateTimeValue: { fontSize: 15, color: '#fff', fontWeight: '600', marginTop: 2 },
  dateTimePlaceholder: { color: '#52525b', fontWeight: '400' },

  // Address Autocomplete
  addressWrap: { zIndex: 100 },
  addressInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 14, borderWidth: 1, borderColor: '#27272a' },
  addressInputActive: { borderColor: '#8b5cf6', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  addressInput: { flex: 1, padding: 16, paddingLeft: 10, fontSize: 16, color: '#fff' },
  predictionsContainer: { backgroundColor: '#1c1c1e', borderWidth: 1, borderTopWidth: 0, borderColor: '#8b5cf6', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, overflow: 'hidden' },
  predictionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  predictionBorder: { borderBottomWidth: 1, borderBottomColor: '#27272a' },
  predictionText: { flex: 1 },
  predictionMain: { fontSize: 15, color: '#fff', fontWeight: '500' },
  predictionSub: { fontSize: 13, color: '#71717a', marginTop: 2 },
  addressHint: { fontSize: 12, color: '#f59e0b', marginTop: 8, marginLeft: 4 },

  // Genres
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genre: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a' },
  genreActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  genreText: { fontSize: 15, color: '#71717a', fontWeight: '500' },
  genreTextActive: { color: '#fff' },

  // Flyer
  flyerBtn: { height: 220, borderRadius: 16, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' },
  flyerPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  flyerPlaceholder: { alignItems: 'center', gap: 8 },
  flyerPlaceholderText: { fontSize: 16, color: '#71717a', fontWeight: '500' },
  flyerHint: { fontSize: 13, color: '#52525b' },
  flyerRemove: { position: 'absolute', top: 12, right: 12 },

  // Photos
  photosScroll: { marginTop: 4 },
  photosContent: { paddingRight: 20 },
  photoThumb: { width: 110, height: 110, borderRadius: 14, marginRight: 12, overflow: 'hidden' },
  photoThumbImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 6, right: 6 },
  addPhotoBtn: { width: 110, height: 110, borderRadius: 14, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },

  // Venues
  venueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 16, marginBottom: 10, backgroundColor: '#18181b', borderRadius: 14, borderWidth: 1, borderColor: '#27272a' },
  venueRowActive: { borderColor: '#8b5cf6' },
  venueInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  venueName: { fontSize: 17, color: '#fff', fontWeight: '500' },
  homeBadge: { backgroundColor: '#27272a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  homeBadgeText: { fontSize: 11, color: '#a1a1aa', fontWeight: '600', textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 18, color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#52525b', textAlign: 'center' },
  addVenueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, marginTop: 8 },
  addVenueText: { fontSize: 17, color: '#8b5cf6', fontWeight: '600' },

  // Review Card (Step 3)
  reviewCard: { backgroundColor: 'rgba(139, 92, 246, 0.06)', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)' },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 10 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  reviewText: { fontSize: 14, color: '#a1a1aa', flex: 1 },

  // Packages
  packageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 16, marginBottom: 10, backgroundColor: '#18181b', borderRadius: 14, borderWidth: 1, borderColor: '#27272a' },
  packageInfo: { flex: 1 },
  packageName: { fontSize: 17, color: '#fff', fontWeight: '600' },
  packageMeta: { fontSize: 14, color: '#71717a', marginTop: 4 },
  packagePrice: { fontSize: 20, color: '#fff', fontWeight: '700' },
  packagesEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  packagesEmptyText: { fontSize: 16, color: '#52525b' },
  addPackageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, marginTop: 16, backgroundColor: '#18181b', borderRadius: 14, borderWidth: 1, borderColor: '#8b5cf6' },
  addPackageText: { fontSize: 17, color: '#8b5cf6', fontWeight: '600' },
  hint: { fontSize: 13, color: '#52525b', textAlign: 'center', marginTop: 16 },
  skipNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, paddingVertical: 16, backgroundColor: '#18181b', borderRadius: 12 },
  skipNoteText: { fontSize: 14, color: '#71717a' },

  importLayoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    marginBottom: 20, 
    backgroundColor: 'rgba(139, 92, 246, 0.08)', 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 12,
  },
  importLayoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importLayoutInfo: { flex: 1 },
  importLayoutTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  importLayoutSub: { fontSize: 13, color: '#a1a1aa', marginTop: 2 },

  // Package Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, minHeight: 400 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3f3f46', alignSelf: 'center', marginTop: 12, marginBottom: 28 },
  sheetTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 20 },
  sheetInput: { fontSize: 18, color: '#fff', backgroundColor: '#27272a', borderRadius: 14, padding: 16 },
  sheetInputSmall: { fontSize: 18, color: '#fff', backgroundColor: '#27272a', borderRadius: 12, padding: 14, marginTop: 10, textAlign: 'center' },
  sheetLabel: { fontSize: 13, fontWeight: '600', color: '#71717a', marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  templateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, marginTop: 10, backgroundColor: '#27272a', borderRadius: 12 },
  templateRowActive: { backgroundColor: '#3f3f46' },
  templateName: { fontSize: 16, color: '#a1a1aa', fontWeight: '500' },
  templateNameActive: { color: '#fff' },
  templateMeta: { fontSize: 14, color: '#52525b' },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceDollar: { fontSize: 36, color: '#52525b', marginRight: 4 },
  priceInput: { fontSize: 48, color: '#fff', flex: 1, fontWeight: '700' },
  sectionOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 16, marginTop: 10, backgroundColor: '#27272a', borderRadius: 12 },
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
