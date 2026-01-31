import React, { useState, useEffect } from 'react';
import { partnerFetch } from '../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

const { width } = Dimensions.get('window');

type BoostType = 'sections' | 'happy_hour' | 'event' | 'special';

type Section = {
  id: string;
  name: string;
  price: number;
  bottles: number;
  quantity: number;
  priority: number;
};

const BOOST_TYPES = [
  { key: 'sections', label: 'Sections', icon: 'grid-outline', desc: 'Tables & VIP' },
  { key: 'happy_hour', label: 'Happy Hour', icon: 'time-outline', desc: 'Specials & deals' },
  { key: 'event', label: 'Event', icon: 'calendar-outline', desc: 'Tonight\'s party' },
  { key: 'special', label: 'Special', icon: 'sparkles-outline', desc: 'Custom promo' },
];

const SECTION_PRESETS = [
  { name: 'Main Floor', price: 500, bottles: 2 },
  { name: 'VIP Section', price: 1000, bottles: 3 },
  { name: 'Rooftop', price: 800, bottles: 2 },
  { name: 'Balcony', price: 1200, bottles: 3 },
];

export default function Boost() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = select type, 1 = capture, 2 = details, 3 = preview
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // Boost type
  const [boostType, setBoostType] = useState<BoostType>('sections');

  // Venue info
  const [venue, setVenue] = useState<any>(null);
  const [venuePhotos, setVenuePhotos] = useState<string[]>([]);
  const [lastDrop, setLastDrop] = useState<any>(null);
  const [hasActiveDrop, setHasActiveDrop] = useState(false);

  // Step 1: Media
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');

  // Step 2: Sections (for sections boost type)
  const [sections, setSections] = useState<Section[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionPrice, setSectionPrice] = useState('');
  const [sectionBottles, setSectionBottles] = useState('2');
  const [sectionQty, setSectionQty] = useState('3');

  // Step 2: Happy Hour (for happy_hour boost type)
  const [happyHourStart, setHappyHourStart] = useState('5:00 PM');
  const [happyHourEnd, setHappyHourEnd] = useState('8:00 PM');
  const [happyHourDeals, setHappyHourDeals] = useState('');

  // Step 2: Special (for special boost type)
  const [specialTitle, setSpecialTitle] = useState('');
  const [specialDetails, setSpecialDetails] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await partnerFetch('/api/partner/profile');
      if (res.ok) {
        const data = await res.json();
        setVenue(data.claimedVenue);

        if (data.claimedVenue?.id) {
          const mediaRes = await partnerFetch(`/api/partner/media?venueId=${data.claimedVenue.id}`);
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            setVenuePhotos(mediaData.photos?.map((p: any) => p.url).slice(0, 8) || []);
          }

          const dropRes = await partnerFetch(`/api/partner/live-drops/latest?venueId=${data.claimedVenue.id}`);
          if (dropRes.ok) {
            const dropData = await dropRes.json();
            setLastDrop(dropData.drop);
            setHasActiveDrop(dropData.isActive || false);
          }
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Media functions
  const takePhoto = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) {
      Alert.alert('Permission needed', 'Camera access required');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (!r.canceled && r.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setMediaUri(r.assets[0].uri);
      setMediaType(r.assets[0].type === 'video' ? 'video' : 'photo');
    }
  };

  const pickFromGallery = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (!r.canceled && r.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMediaUri(r.assets[0].uri);
      setMediaType(r.assets[0].type === 'video' ? 'video' : 'photo');
    }
  };

  const selectVenuePhoto = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMediaUri(url);
    setMediaType('photo');
  };

  // Section functions
  const addPreset = (preset: typeof SECTION_PRESETS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSections([...sections, {
      id: Date.now().toString(),
      name: preset.name,
      price: preset.price,
      bottles: preset.bottles,
      quantity: 3,
      priority: sections.length,
    }]);
  };

  const openAddSection = () => {
    setEditingSection(null);
    setSectionName('');
    setSectionPrice('');
    setSectionBottles('2');
    setSectionQty('3');
    setShowAddSection(true);
  };

  const openEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionName(section.name);
    setSectionPrice(section.price.toString());
    setSectionBottles(section.bottles.toString());
    setSectionQty(section.quantity.toString());
    setShowAddSection(true);
  };

  const saveSection = () => {
    if (!sectionName || !sectionPrice) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newSection: Section = {
      id: editingSection?.id || Date.now().toString(),
      name: sectionName,
      price: parseFloat(sectionPrice),
      bottles: parseInt(sectionBottles) || 2,
      quantity: parseInt(sectionQty) || 3,
      priority: editingSection?.priority ?? sections.length,
    };

    if (editingSection) {
      setSections(sections.map(s => s.id === editingSection.id ? newSection : s));
    } else {
      setSections([...sections, newSection]);
    }
    setShowAddSection(false);
  };

  const removeSection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const filtered = sections.filter(s => s.id !== id);
    setSections(filtered.map((s, i) => ({ ...s, priority: i })));
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id);
    if (direction === 'up' && idx > 0) {
      const newSections = [...sections];
      [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
      setSections(newSections.map((s, i) => ({ ...s, priority: i })));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (direction === 'down' && idx < sections.length - 1) {
      const newSections = [...sections];
      [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
      setSections(newSections.map((s, i) => ({ ...s, priority: i })));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const reuseLastDrop = () => {
    if (!lastDrop?.sections?.length) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSections(lastDrop.sections.map((s: any, i: number) => ({
      id: Date.now().toString() + i,
      name: s.name,
      price: s.price,
      bottles: s.bottles,
      quantity: s.quantity,
      priority: s.priority ?? i,
    })));
  };

  // Post
  const handlePost = async () => {
    if (!mediaUri) {
      Alert.alert('Add media', 'Snap or select a photo/video');
      return;
    }

    if (hasActiveDrop) {
      Alert.alert(
        'Replace current boost?',
        'This will replace your active boost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: submitPost },
        ]
      );
    } else {
      submitPost();
    }
  };

  const submitPost = async () => {
    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      let mediaUrl = mediaUri;
      if (mediaUri?.startsWith('file://')) {
        const fd = new FormData();
        fd.append('file', {
          uri: mediaUri,
          type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          name: mediaType === 'video' ? 'boost.mp4' : 'boost.jpg',
        } as any);

        const upRes = await partnerFetch('/api/partner/upload', { method: 'POST', body: fd });
        if (upRes.ok) {
          const upData = await upRes.json();
          mediaUrl = upData.url;
        }
      }

      // Build boost data based on type
      const boostData: any = {
        venue_id: venue?.id,
        boost_type: boostType,
        media_url: mediaUrl,
        media_type: mediaType,
        caption,
      };

      if (boostType === 'sections') {
        boostData.sections = sections.sort((a, b) => a.priority - b.priority);
      } else if (boostType === 'happy_hour') {
        boostData.happy_hour = { start: happyHourStart, end: happyHourEnd, deals: happyHourDeals };
      } else if (boostType === 'special') {
        boostData.special = { title: specialTitle, details: specialDetails };
      }

      const res = await partnerFetch('/api/partner/live-drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boostData),
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to boost');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setPosting(false);
    }
  };

  const selectBoostType = (type: BoostType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBoostType(type);
    setStep(1);
  };

  const canProceed = () => {
    if (step === 1) return !!mediaUri;
    return true;
  };

  const nextStep = () => {
    if (canProceed()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step + 1);
    }
  };

  const totalSteps = 3;
  const currentProgress = step;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : router.back()}>
            <Text style={styles.headerBtn}>{step > 0 ? 'Back' : 'Cancel'}</Text>
          </TouchableOpacity>
          {step > 0 && (
            <View style={styles.progress}>
              {[1, 2, 3].map(s => (
                <View key={s} style={[styles.dot, currentProgress >= s && styles.dotActive]} />
              ))}
            </View>
          )}
          {step > 0 && step < 3 ? (
            <TouchableOpacity onPress={nextStep} disabled={!canProceed()}>
              <Text style={[styles.headerBtn, styles.headerPrimary, !canProceed() && styles.headerDisabled]}>Next</Text>
            </TouchableOpacity>
          ) : step === 3 ? (
            <TouchableOpacity onPress={handlePost} disabled={posting}>
              {posting ? <ActivityIndicator size="small" color={colors.violet[500]} /> : <Text style={[styles.headerBtn, styles.headerPrimary]}>Boost</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* STEP 0: SELECT BOOST TYPE */}
          {step === 0 && (
            <View>
              <Text style={styles.title}>Boost</Text>
              <Text style={styles.subtitle}>What do you want to promote?</Text>

              <View style={styles.boostTypeGrid}>
                {BOOST_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={styles.boostTypeCard}
                    onPress={() => selectBoostType(type.key as BoostType)}
                  >
                    <LinearGradient
                      colors={['#1A1A22', '#121218']}
                      style={styles.boostTypeCardInner}
                    >
                      <View style={styles.boostTypeIcon}>
                        <Ionicons name={type.icon as any} size={28} color={colors.violet[400]} />
                      </View>
                      <Text style={styles.boostTypeLabel}>{type.label}</Text>
                      <Text style={styles.boostTypeDesc}>{type.desc}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 1: CAPTURE */}
          {step === 1 && (
            <View>
              <Text style={styles.title}>Capture the vibe</Text>
              <Text style={styles.subtitle}>Show them what's happening</Text>

              {hasActiveDrop && (
                <View style={styles.activeWarning}>
                  <Ionicons name="alert-circle" size={18} color={colors.yellow[500]} />
                  <Text style={styles.activeWarningText}>This will replace your active boost</Text>
                </View>
              )}

              {mediaUri ? (
                <TouchableOpacity style={styles.mediaPreview} onPress={takePhoto}>
                  <Image source={{ uri: mediaUri }} style={styles.previewImage} contentFit="cover" />
                  <View style={styles.changeBtn}>
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.changeBtnText}>Change</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                  <LinearGradient colors={[colors.violet[600], colors.violet[800]]} style={styles.captureBtnInner}>
                    <Ionicons name="camera" size={48} color="#fff" />
                    <Text style={styles.captureBtnText}>Capture</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
                <Ionicons name="images-outline" size={20} color={colors.zinc[400]} />
                <Text style={styles.galleryBtnText}>Choose from gallery</Text>
              </TouchableOpacity>

              {venuePhotos.length > 0 && (
                <View style={styles.venuePhotos}>
                  <Text style={styles.label}>From {venue?.name}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {venuePhotos.map((url, i) => (
                      <TouchableOpacity key={i} onPress={() => selectVenuePhoto(url)}>
                        <Image source={{ uri: url }} style={styles.venueThumb} contentFit="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {mediaUri && (
                <TextInput
                  style={styles.captionInput}
                  placeholder="Add a caption..."
                  placeholderTextColor={colors.zinc[600]}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={200}
                />
              )}
            </View>
          )}

          {/* STEP 2: DETAILS (varies by boost type) */}
          {step === 2 && (
            <View>
              {/* SECTIONS */}
              {boostType === 'sections' && (
                <>
                  <Text style={styles.title}>Tonight's Floor</Text>
                  <Text style={styles.subtitle}>What's available?</Text>

                  {lastDrop?.sections?.length > 0 && sections.length === 0 && (
                    <TouchableOpacity style={styles.reuseBtn} onPress={reuseLastDrop}>
                      <Ionicons name="refresh" size={18} color={colors.violet[400]} />
                      <Text style={styles.reuseBtnText}>Reuse last boost</Text>
                    </TouchableOpacity>
                  )}

                  {sections.length === 0 && (
                    <View style={styles.presets}>
                      <Text style={styles.label}>Quick add</Text>
                      <View style={styles.presetGrid}>
                        {SECTION_PRESETS.map((p, i) => (
                          <TouchableOpacity key={i} style={styles.presetCard} onPress={() => addPreset(p)}>
                            <Text style={styles.presetName}>{p.name}</Text>
                            <Text style={styles.presetPrice}>${p.price}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {sections.length > 0 && (
                    <View style={styles.sectionsList}>
                      {sections.map((s, idx) => (
                        <View key={s.id} style={styles.sectionCard}>
                          <View style={styles.reorderBtns}>
                            <TouchableOpacity onPress={() => moveSection(s.id, 'up')} disabled={idx === 0}>
                              <Ionicons name="chevron-up" size={20} color={idx === 0 ? colors.zinc[800] : colors.zinc[500]} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => moveSection(s.id, 'down')} disabled={idx === sections.length - 1}>
                              <Ionicons name="chevron-down" size={20} color={idx === sections.length - 1 ? colors.zinc[800] : colors.zinc[500]} />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity style={styles.sectionInfo} onPress={() => openEditSection(s)}>
                            <Text style={styles.sectionName}>{s.name}</Text>
                            <Text style={styles.sectionMeta}>{s.bottles} bottles · {s.quantity} available</Text>
                          </TouchableOpacity>
                          <Text style={styles.sectionPrice}>${s.price}</Text>
                          <TouchableOpacity onPress={() => removeSection(s.id)}>
                            <Ionicons name="close-circle" size={22} color={colors.zinc[600]} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {!showAddSection ? (
                    <TouchableOpacity style={styles.addSectionBtn} onPress={openAddSection}>
                      <Ionicons name="add" size={20} color={colors.violet[400]} />
                      <Text style={styles.addSectionText}>Add section</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.addForm}>
                      <Text style={styles.addFormTitle}>{editingSection ? 'Edit Section' : 'Add Section'}</Text>
                      <TextInput style={styles.input} placeholder="Section name" placeholderTextColor={colors.zinc[600]} value={sectionName} onChangeText={setSectionName} autoFocus />
                      <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Price</Text>
                          <TextInput style={styles.input} placeholder="500" placeholderTextColor={colors.zinc[600]} value={sectionPrice} onChangeText={setSectionPrice} keyboardType="number-pad" />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Bottles</Text>
                          <TextInput style={styles.input} placeholder="2" placeholderTextColor={colors.zinc[600]} value={sectionBottles} onChangeText={setSectionBottles} keyboardType="number-pad" />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Qty</Text>
                          <TextInput style={styles.input} placeholder="3" placeholderTextColor={colors.zinc[600]} value={sectionQty} onChangeText={setSectionQty} keyboardType="number-pad" />
                        </View>
                      </View>
                      <View style={styles.addFormBtns}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddSection(false)}>
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={saveSection}>
                          <Text style={styles.saveBtnText}>{editingSection ? 'Save' : 'Add'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* HAPPY HOUR */}
              {boostType === 'happy_hour' && (
                <>
                  <Text style={styles.title}>Happy Hour</Text>
                  <Text style={styles.subtitle}>When and what's special?</Text>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <TextInput style={styles.input} placeholder="5:00 PM" placeholderTextColor={colors.zinc[600]} value={happyHourStart} onChangeText={setHappyHourStart} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>End Time</Text>
                      <TextInput style={styles.input} placeholder="8:00 PM" placeholderTextColor={colors.zinc[600]} value={happyHourEnd} onChangeText={setHappyHourEnd} />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Deals & Specials</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                    placeholder="$5 margaritas, half-off apps, 2-for-1 beers..."
                    placeholderTextColor={colors.zinc[600]}
                    value={happyHourDeals}
                    onChangeText={setHappyHourDeals}
                    multiline
                  />
                </>
              )}

              {/* EVENT */}
              {boostType === 'event' && (
                <>
                  <Text style={styles.title}>Tonight's Event</Text>
                  <Text style={styles.subtitle}>What's happening?</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Event name"
                    placeholderTextColor={colors.zinc[600]}
                    value={specialTitle}
                    onChangeText={setSpecialTitle}
                  />
                  <TextInput
                    style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                    placeholder="Details, lineup, dress code..."
                    placeholderTextColor={colors.zinc[600]}
                    value={specialDetails}
                    onChangeText={setSpecialDetails}
                    multiline
                  />
                </>
              )}

              {/* SPECIAL */}
              {boostType === 'special' && (
                <>
                  <Text style={styles.title}>Special Promo</Text>
                  <Text style={styles.subtitle}>What are you promoting?</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Promo title"
                    placeholderTextColor={colors.zinc[600]}
                    value={specialTitle}
                    onChangeText={setSpecialTitle}
                  />
                  <TextInput
                    style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                    placeholder="Details..."
                    placeholderTextColor={colors.zinc[600]}
                    value={specialDetails}
                    onChangeText={setSpecialDetails}
                    multiline
                  />
                </>
              )}

              <Text style={styles.hint}>Details are optional — skip if you just want to share vibes</Text>
            </View>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 3 && (
            <View>
              <Text style={styles.title}>Ready to boost?</Text>
              <Text style={styles.subtitle}>Preview your post</Text>

              <View style={styles.previewCard}>
                <Image source={{ uri: mediaUri! }} style={styles.previewCardImage} contentFit="cover" />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.previewCardOverlay}>
                  <View style={styles.previewHeader}>
                    <View style={styles.boostBadge}>
                      <Ionicons name="flash" size={12} color="#fff" />
                      <Text style={styles.boostBadgeText}>BOOSTED</Text>
                    </View>
                    <Text style={styles.previewVenue}>{venue?.name}</Text>
                  </View>
                  {caption ? <Text style={styles.previewCaption}>{caption}</Text> : null}

                  {boostType === 'sections' && sections.length > 0 && (
                    <View style={styles.previewSections}>
                      {sections.sort((a, b) => a.priority - b.priority).map(s => (
                        <View key={s.id} style={styles.previewSectionRow}>
                          <Text style={styles.previewSectionName}>{s.name}</Text>
                          <Text style={styles.previewSectionPrice}>${s.price}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {boostType === 'happy_hour' && (
                    <View style={styles.previewSections}>
                      <Text style={styles.previewSectionName}>🕐 {happyHourStart} - {happyHourEnd}</Text>
                      {happyHourDeals && <Text style={styles.previewCaption}>{happyHourDeals}</Text>}
                    </View>
                  )}

                  {(boostType === 'event' || boostType === 'special') && specialTitle && (
                    <View style={styles.previewSections}>
                      <Text style={styles.previewSectionName}>{specialTitle}</Text>
                      {specialDetails && <Text style={styles.previewCaption}>{specialDetails}</Text>}
                    </View>
                  )}
                </LinearGradient>
              </View>

              <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={posting}>
                <LinearGradient colors={[colors.violet[500], colors.violet[700]]} style={styles.postBtnInner}>
                  {posting ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="flash" size={24} color="#fff" />
                      <Text style={styles.postBtnText}>Boost Now</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerBtn: { fontSize: 16, color: '#fff' },
  headerPrimary: { color: colors.violet[400], fontWeight: '600' },
  headerDisabled: { color: colors.zinc[700] },
  progress: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.zinc[800] },
  dotActive: { backgroundColor: colors.violet[500] },

  scroll: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.zinc[500], marginBottom: 28 },
  label: { fontSize: 12, color: colors.zinc[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  hint: { fontSize: 13, color: colors.zinc[600], textAlign: 'center', marginTop: 32 },

  // Step 0: Boost type selector
  boostTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  boostTypeCard: { width: (width - 52) / 2, borderRadius: 16, overflow: 'hidden' },
  boostTypeCardInner: { padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16 },
  boostTypeIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(139, 92, 246, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  boostTypeLabel: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  boostTypeDesc: { fontSize: 12, color: colors.zinc[500] },

  // Warning
  activeWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: 14, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.2)' },
  activeWarningText: { fontSize: 13, color: colors.yellow[500], flex: 1 },

  // Step 1
  captureBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  captureBtnInner: { height: 200, justifyContent: 'center', alignItems: 'center' },
  captureBtnText: { fontSize: 20, fontWeight: '600', color: '#fff', marginTop: 12 },

  mediaPreview: { height: 300, borderRadius: 20, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  changeBtn: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  changeBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  galleryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: colors.zinc[900], borderRadius: 14, marginBottom: 24 },
  galleryBtnText: { fontSize: 15, color: colors.zinc[400] },

  venuePhotos: { marginBottom: 24 },
  venueThumb: { width: 72, height: 72, borderRadius: 12, marginRight: 10 },

  captionInput: { fontSize: 16, color: '#fff', backgroundColor: colors.zinc[900], borderRadius: 14, padding: 16, minHeight: 80, textAlignVertical: 'top' },

  // Step 2
  reuseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' },
  reuseBtnText: { fontSize: 15, color: colors.violet[400], fontWeight: '500' },

  presets: { marginBottom: 24 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetCard: { width: (width - 50) / 2, backgroundColor: colors.zinc[900], borderRadius: 14, padding: 16 },
  presetName: { fontSize: 15, color: '#fff', fontWeight: '500' },
  presetPrice: { fontSize: 18, color: colors.violet[400], fontWeight: '700', marginTop: 4 },

  sectionsList: { marginBottom: 16 },
  sectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.zinc[900], borderRadius: 14, padding: 14, marginBottom: 10 },
  reorderBtns: { marginRight: 10 },
  sectionInfo: { flex: 1 },
  sectionName: { fontSize: 16, color: '#fff', fontWeight: '500' },
  sectionMeta: { fontSize: 13, color: colors.zinc[500], marginTop: 2 },
  sectionPrice: { fontSize: 18, color: colors.violet[400], fontWeight: '600', marginRight: 12 },

  addSectionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.zinc[800], borderStyle: 'dashed' },
  addSectionText: { fontSize: 15, color: colors.violet[400] },

  addForm: { backgroundColor: colors.zinc[900], borderRadius: 16, padding: 20, marginBottom: 16 },
  addFormTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  input: { fontSize: 16, color: '#fff', backgroundColor: colors.zinc[800], borderRadius: 10, padding: 14, marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, color: colors.zinc[500], marginBottom: 6, marginTop: 8 },
  addFormBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 10, backgroundColor: colors.zinc[800] },
  cancelBtnText: { fontSize: 15, color: colors.zinc[400] },
  saveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 10, backgroundColor: colors.violet[600] },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  // Step 3
  previewCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 24 },
  previewCardImage: { width: '100%', height: 400 },
  previewCardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 80 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  boostBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.violet[600], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  boostBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  previewVenue: { fontSize: 18, fontWeight: '600', color: '#fff' },
  previewCaption: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  previewSections: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 12 },
  previewSectionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  previewSectionName: { fontSize: 14, color: '#fff' },
  previewSectionPrice: { fontSize: 14, fontWeight: '600', color: '#fff' },

  postBtn: { borderRadius: 16, overflow: 'hidden' },
  postBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  postBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
