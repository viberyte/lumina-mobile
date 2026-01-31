import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

const API_BASE = 'https://lumina.viberyte.com';

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
type Section = { id: string; name: string; tableCount: number; capacity: number };
type Package = { tempId: string; name: string; description: string; bottleCount: number; price: number; sectionId: string; maxGuests: number };

export default function NewEvent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState(() => {
    const d = new Date();
    d.setHours(22, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [flyerUri, setFlyerUri] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

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

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) return null;
      return JSON.parse(session).token;
    } catch {
      return null;
    }
  };

  const fetchVenues = async () => {
    try {
      const token = await getAuthToken();
      if (!token) { router.replace('/partner'); return; }
      
      const res = await partnerFetch('/api/partner/venues', { 
        headers: { Authorization: 'Bearer ' + token } 
      });
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
      
      const res = await partnerFetch('/api/partner/venues/' + venue.id, { 
        headers: { Authorization: 'Bearer ' + token } 
      });
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);
      }
    } catch {}
  };

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

  const pickFlyer = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [9, 16], 
      quality: 0.8 
    });
    if (!r.canceled && r.assets[0]) {
      setFlyerUri(r.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const pickPhoto = async () => {
    if (photos.length >= 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Limit reached', 'Maximum 5 additional photos');
      return;
    }
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [16, 9], 
      quality: 0.8 
    });
    if (!r.canceled && r.assets[0]) {
      setPhotos([...photos, r.assets[0].uri]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setEventDate(selectedDate);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) setEventTime(selectedTime);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPackageSheet(false);
  };

  const handlePackageLongPress = (pkg: Package) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(pkg.name, undefined, [
      { 
        text: 'Edit', 
        onPress: () => { 
          setEditingPackage(pkg); 
          setPkgName(pkg.name); 
          setPkgDesc(pkg.description); 
          setPkgBottles(pkg.bottleCount.toString()); 
          setPkgPrice(pkg.price.toString()); 
          setPkgSection(pkg.sectionId); 
          setPkgGuests(pkg.maxGuests.toString()); 
          setPackageStep(1); 
          setShowPackageSheet(true); 
        } 
      },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: () => {
          setPackages(packages.filter(p => p.tempId !== pkg.tempId));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const combineDateTime = (): string => {
    const combined = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
      eventTime.getHours(),
      eventTime.getMinutes()
    );
    return combined.toISOString();
  };

  const handleCreate = async () => {
    if (!selectedVenue || !title) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Required', 'Venue and event name required'); 
      return; 
    }
    
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        setSaving(false);
        return;
      }

      let flyerUrl = null;
      if (flyerUri) {
        const fd = new FormData();
        fd.append('image', { uri: flyerUri, type: 'image/jpeg', name: 'flyer.jpg' } as any);
        const up = await partnerFetch('/api/partner/upload', { 
          method: 'POST', 
          headers: { Authorization: 'Bearer ' + token }, 
          body: fd 
        });
        if (up.ok) flyerUrl = (await up.json()).url;
      }

      const photoUrls: string[] = [];
      for (const photoUri of photos) {
        const fd = new FormData();
        fd.append('image', { uri: photoUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
        const up = await partnerFetch('/api/partner/upload', { 
          method: 'POST', 
          headers: { Authorization: 'Bearer ' + token }, 
          body: fd 
        });
        if (up.ok) photoUrls.push((await up.json()).url);
      }

      const packagesPayload = packages.map(p => ({
        name: p.name,
        description: p.description,
        bottle_count: p.bottleCount,
        price: p.price,
        section_id: p.sectionId || null,
        max_guests: p.maxGuests,
      }));

      const res = await partnerFetch('/api/partner/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ 
          venue_id: selectedVenue.id, 
          title, 
          event_datetime: combineDateTime(),
          address: address || null,
          genre: selectedGenres.length > 0 ? selectedGenres.join(', ') : null, 
          description: description || null, 
          packages: packagesPayload.length > 0 ? packagesPayload : null, 
          flyer_url: flyerUrl,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
        }),
      });
      
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', (await res.json()).error || 'Failed to create event');
      }
    } catch (e) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Connection failed'); 
    } finally { 
      setSaving(false); 
    }
  };

  const canProceed = () => {
    if (step === 1) return !!selectedVenue;
    if (step === 2) return !!title.trim();
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

  const totalSteps = 3;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleBack} 
            disabled={saving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.headerBtn, saving && styles.headerDisabled]}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.progress}>
            {[1,2,3].map(s => (
              <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
            ))}
          </View>
          
          {step < totalSteps ? (
            <TouchableOpacity onPress={handleNext} disabled={!canProceed() || saving}>
              <Text style={[
                styles.headerBtn, 
                styles.headerPrimary, 
                (!canProceed() || saving) && styles.headerDisabled
              ]}>
                Next
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Text style={[styles.headerBtn, styles.headerPrimary]}>Create</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView 
              style={styles.scroll} 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {step === 1 && (
                <View>
                  <Text style={styles.title}>Where?</Text>
                  <Text style={styles.subtitle}>Select a venue for your event</Text>
                  
                  {venues.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="location-outline" size={48} color="#3f3f46" />
                      <Text style={styles.emptyTitle}>No venues yet</Text>
                      <Text style={styles.emptyText}>Add your first venue to create events</Text>
                    </View>
                  ) : (
                    venues.map(v => (
                      <TouchableOpacity 
                        key={v.id} 
                        style={[styles.venueRow, selectedVenue?.id === v.id && styles.venueRowActive]} 
                        onPress={() => selectVenue(v)}
                      >
                        <View style={styles.venueInfo}>
                          <Text style={styles.venueName}>{v.name}</Text>
                          {v.is_home === 1 && (
                            <View style={styles.homeBadge}>
                              <Text style={styles.homeBadgeText}>Home</Text>
                            </View>
                          )}
                        </View>
                        {selectedVenue?.id === v.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                  
                  <TouchableOpacity 
                    style={styles.addVenueBtn} 
                    onPress={() => router.push('/partner/venues/new')}
                  >
                    <Ionicons name="add-circle-outline" size={22} color="#8b5cf6" />
                    <Text style={styles.addVenueText}>Add new venue</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                <View>
                  <Text style={styles.title}>Event Details</Text>
                  <Text style={styles.subtitle}>{selectedVenue?.name}</Text>

                  <Text style={styles.inputLabel}>Event name *</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g. Saturday Night Live" 
                    placeholderTextColor="#52525b" 
                    value={title} 
                    onChangeText={setTitle} 
                    returnKeyType="done"
                    autoFocus
                  />

                  <Text style={styles.inputLabel}>Date & Time</Text>
                  <View style={styles.row}>
                    <TouchableOpacity 
                      style={[styles.pickerBtn, { flex: 1 }]} 
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
                      <Text style={styles.pickerText}>{formatDate(eventDate)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.pickerBtn, { flex: 1, marginLeft: 12 }]} 
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                      <Text style={styles.pickerText}>{formatTime(eventTime)}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Street address (uses venue address if empty)" 
                    placeholderTextColor="#52525b" 
                    value={address} 
                    onChangeText={setAddress}
                  />

                  <Text style={styles.inputLabel}>Music vibe ({selectedGenres.length}/3)</Text>
                  <View style={styles.genreWrap}>
                    {GENRES.map(g => (
                      <TouchableOpacity 
                        key={g} 
                        style={[styles.genre, selectedGenres.includes(g) && styles.genreActive]} 
                        onPress={() => toggleGenre(g)}
                      >
                        <Text style={[
                          styles.genreText, 
                          selectedGenres.includes(g) && styles.genreTextActive
                        ]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="Tell people what to expect..." 
                    placeholderTextColor="#52525b" 
                    value={description} 
                    onChangeText={setDescription} 
                    multiline 
                    textAlignVertical="top"
                  />

                  <Text style={styles.inputLabel}>Event Flyer</Text>
                  <TouchableOpacity style={styles.flyerBtn} onPress={pickFlyer}>
                    {flyerUri ? (
                      <>
                        <Image source={{ uri: flyerUri }} style={styles.flyerPreview} />
                        <TouchableOpacity 
                          style={styles.flyerRemove} 
                          onPress={() => setFlyerUri(null)}
                        >
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

                  <Text style={styles.inputLabel}>Additional Photos ({photos.length}/5)</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.photosScroll}
                    contentContainerStyle={styles.photosContent}
                  >
                    {photos.map((uri, i) => (
                      <View key={i} style={styles.photoThumb}>
                        <Image source={{ uri }} style={styles.photoThumbImg} />
                        <TouchableOpacity 
                          style={styles.photoRemove} 
                          onPress={() => removePhoto(i)}
                        >
                          <Ionicons name="close-circle" size={24} color="#fff" />
                        </TouchableOpacity>
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

              {step === 3 && (
                <View>
                  <Text style={styles.title}>Packages</Text>
                  <Text style={styles.subtitle}>Add bottle service or table packages (optional)</Text>

                  {packages.length > 0 ? (
                    <>
                      {packages.map(pkg => (
                        <TouchableOpacity 
                          key={pkg.tempId} 
                          style={styles.packageRow} 
                          onLongPress={() => handlePackageLongPress(pkg)} 
                          delayLongPress={400}
                        >
                          <View style={styles.packageInfo}>
                            <Text style={styles.packageName}>{pkg.name}</Text>
                            <Text style={styles.packageMeta}>
                              {pkg.bottleCount} bottles · {pkg.maxGuests} guests
                            </Text>
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

                  <TouchableOpacity 
                    style={styles.addPackageBtn} 
                    onPress={() => openPackageSheet()}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#8b5cf6" />
                    <Text style={styles.addPackageText}>Add Package</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.skipNote}>
                    <Ionicons name="information-circle-outline" size={18} color="#52525b" />
                    <Text style={styles.skipNoteText}>
                      You can skip this and add packages later
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ height: 120 }} />
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* Date Picker */}
        {showDatePicker && (
          <Modal transparent animationType="fade">
            <TouchableOpacity 
              style={styles.pickerOverlay} 
              activeOpacity={1} 
              onPress={() => setShowDatePicker(false)}
            >
              <View style={styles.pickerModal}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                  textColor="#fff"
                  themeVariant="dark"
                  style={{ height: 200 }}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <Modal transparent animationType="fade">
            <TouchableOpacity 
              style={styles.pickerOverlay} 
              activeOpacity={1} 
              onPress={() => setShowTimePicker(false)}
            >
              <View style={styles.pickerModal}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Time</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={eventTime}
                  mode="time"
                  display="spinner"
                  onChange={onTimeChange}
                  textColor="#fff"
                  themeVariant="dark"
                  style={{ height: 200 }}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Package Sheet */}
        <Modal visible={showPackageSheet} animationType="slide" transparent>
          <KeyboardAvoidingView 
            style={styles.sheetOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />

                {packageStep === 1 && (
                  <View>
                    <Text style={styles.sheetTitle}>Package name</Text>
                    <TextInput 
                      style={styles.sheetInput} 
                      value={pkgName} 
                      onChangeText={setPkgName} 
                      placeholder="VIP Table" 
                      placeholderTextColor="#52525b" 
                      autoFocus 
                    />
                    
                    <Text style={styles.sheetLabel}>Quick templates</Text>
                    {PACKAGE_TEMPLATES.map(t => (
                      <TouchableOpacity 
                        key={t.name} 
                        style={[
                          styles.templateRow,
                          pkgName === t.name && styles.templateRowActive
                        ]} 
                        onPress={() => { 
                          setPkgName(t.name); 
                          setPkgDesc(t.description); 
                          setPkgBottles(t.bottles.toString());
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={[
                          styles.templateName, 
                          pkgName === t.name && styles.templateNameActive
                        ]}>
                          {t.name}
                        </Text>
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

                    <View style={[styles.row, { marginTop: 24 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetLabel}>Bottles</Text>
                        <TextInput 
                          style={styles.sheetInputSmall} 
                          value={pkgBottles} 
                          onChangeText={setPkgBottles} 
                          keyboardType="number-pad" 
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.sheetLabel}>Max Guests</Text>
                        <TextInput 
                          style={styles.sheetInputSmall} 
                          value={pkgGuests} 
                          onChangeText={setPkgGuests} 
                          keyboardType="number-pad" 
                        />
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
                          onPress={() => {
                            setPkgSection(s.id);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <Text style={[
                            styles.sectionOptionText, 
                            pkgSection === s.id && styles.sectionOptionActive
                          ]}>
                            {s.name}
                          </Text>
                          {pkgSection === s.id && (
                            <Ionicons name="checkmark" size={20} color="#8b5cf6" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noSectionsWrap}>
                        <Ionicons name="grid-outline" size={32} color="#3f3f46" />
                        <Text style={styles.noSections}>
                          No sections set up yet
                        </Text>
                        <Text style={styles.noSectionsHint}>
                          You can add sections to your venue later
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.sheetBtns}>
                  <TouchableOpacity 
                    style={styles.sheetCancel} 
                    onPress={() => setShowPackageSheet(false)}
                  >
                    <Text style={styles.sheetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.sheetNext, 
                      ((packageStep === 1 && !pkgName) || (packageStep === 2 && !pkgPrice)) 
                        && styles.sheetNextDisabled
                    ]} 
                    onPress={packageSheetNext}
                  >
                    <Text style={styles.sheetNextText}>
                      {packageStep === 3 ? 'Save Package' : 'Next'}
                    </Text>
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

  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
  },
  headerBtn: { fontSize: 17, color: '#fff', fontWeight: '500' },
  headerPrimary: { color: '#8b5cf6', fontWeight: '600' },
  headerDisabled: { color: '#3f3f46' },
  progress: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27272a' },
  dotActive: { backgroundColor: '#8b5cf6' },

  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 20, marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#71717a', marginBottom: 28 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#a1a1aa', marginBottom: 10, marginTop: 24, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#18181b', borderRadius: 14, padding: 16, fontSize: 17, color: '#fff', borderWidth: 1, borderColor: '#27272a' },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 16 },

  row: { flexDirection: 'row' },

  pickerBtn: { 
    backgroundColor: '#18181b', 
    borderRadius: 14, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  pickerText: { fontSize: 17, color: '#fff', fontWeight: '500' },

  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genre: { 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    borderRadius: 24, 
    backgroundColor: '#18181b', 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  genreActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  genreText: { fontSize: 15, color: '#71717a', fontWeight: '500' },
  genreTextActive: { color: '#fff' },

  flyerBtn: { 
    height: 220, 
    borderRadius: 16, 
    backgroundColor: '#18181b', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#27272a', 
    overflow: 'hidden' 
  },
  flyerPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  flyerPlaceholder: { alignItems: 'center', gap: 8 },
  flyerPlaceholderText: { fontSize: 16, color: '#71717a', fontWeight: '500' },
  flyerHint: { fontSize: 13, color: '#52525b' },
  flyerRemove: { position: 'absolute', top: 12, right: 12 },

  photosScroll: { marginTop: 4 },
  photosContent: { paddingRight: 20 },
  photoThumb: { width: 110, height: 110, borderRadius: 14, marginRight: 12, overflow: 'hidden' },
  photoThumbImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 6, right: 6 },
  addPhotoBtn: { 
    width: 110, 
    height: 110, 
    borderRadius: 14, 
    backgroundColor: '#18181b', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },

  venueRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
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

  packageRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  packageInfo: { flex: 1 },
  packageName: { fontSize: 17, color: '#fff', fontWeight: '600' },
  packageMeta: { fontSize: 14, color: '#71717a', marginTop: 4 },
  packagePrice: { fontSize: 20, color: '#fff', fontWeight: '700' },

  packagesEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  packagesEmptyText: { fontSize: 16, color: '#52525b' },

  addPackageBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    paddingVertical: 18, 
    marginTop: 16, 
    backgroundColor: '#18181b', 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#8b5cf6' 
  },
  addPackageText: { fontSize: 17, color: '#8b5cf6', fontWeight: '600' },

  hint: { fontSize: 13, color: '#52525b', textAlign: 'center', marginTop: 16 },
  skipNote: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    marginTop: 32, 
    paddingVertical: 16,
    backgroundColor: '#18181b',
    borderRadius: 12,
  },
  skipNoteText: { fontSize: 14, color: '#71717a' },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#2c2c2e' },
  pickerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  pickerDone: { fontSize: 17, color: '#8b5cf6', fontWeight: '600' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, minHeight: 400 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3f3f46', alignSelf: 'center', marginTop: 12, marginBottom: 28 },
  sheetTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 20 },
  sheetInput: { fontSize: 18, color: '#fff', backgroundColor: '#27272a', borderRadius: 14, padding: 16 },
  sheetInputSmall: { fontSize: 18, color: '#fff', backgroundColor: '#27272a', borderRadius: 12, padding: 14, marginTop: 10, textAlign: 'center' },
  sheetLabel: { fontSize: 13, fontWeight: '600', color: '#71717a', marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },

  templateRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#27272a',
    borderRadius: 12,
  },
  templateRowActive: { backgroundColor: '#3f3f46' },
  templateName: { fontSize: 16, color: '#a1a1aa', fontWeight: '500' },
  templateNameActive: { color: '#fff' },
  templateMeta: { fontSize: 14, color: '#52525b' },

  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceDollar: { fontSize: 36, color: '#52525b', marginRight: 4 },
  priceInput: { fontSize: 48, color: '#fff', flex: 1, fontWeight: '700' },

  sectionOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#27272a',
    borderRadius: 12,
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
