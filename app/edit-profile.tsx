import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
  Dimensions, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

const API_BASE = 'https://viberyte.com';
const { width: SCREEN_W } = Dimensions.get('window');
const GALLERY_COLS = 3;
const GALLERY_GAP = 2;
const GALLERY_SIZE = (SCREEN_W - 32 - GALLERY_GAP * (GALLERY_COLS - 1)) / GALLERY_COLS;

const VIBE_OPTIONS = ['Upscale', 'Intimate', 'Trendy', 'Chill', 'High Energy', 'Exclusive', 'Romantic', 'Lively', 'Cozy', 'Vibrant'];
const GENRE_OPTIONS = ['Hip-Hop', 'R&B', 'Afrobeats', 'Latin', 'Reggaeton', 'House', 'EDM', 'Top 40', 'Open Format', 'Jazz'];

type PartnerEvent = {
  id: number;
  title: string;
  event_date: string;
  event_time?: string;
  venue_name?: string;
  cover_image_url?: string;
  image_url?: string;
  status: string;
};

const getToken = async () => {
  const session = await AsyncStorage.getItem('lumina_partner_session');
  if (session) return JSON.parse(session).token;
  // Fallback to old key
  return await AsyncStorage.getItem('partner_token');
};

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showVibesModal, setShowVibesModal] = useState(false);
  const [showGenresModal, setShowGenresModal] = useState(false);

  // Profile data
  const [profile, setProfile] = useState({
    name: '', bio: '', coverPhoto: '', profilePhoto: '',
    vibes: [] as string[], genres: [] as string[],
    instagram: '', phone: '', website: '',
    galleryPhotos: [] as string[],
  });

  // Events
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Gallery upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
    loadEvents();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }

      // Try new auth endpoint first
      const meRes = await fetch(`${API_BASE}/api/partner/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (meRes.ok) {
        const meData = await meRes.json();
        const p = meData.partner || {};
        const v = meData.venues?.[0] || {};
        setProfile({
          name: p.business_name || '', bio: p.bio || '',
          coverPhoto: p.cover_photo_url || '',
          profilePhoto: p.profile_picture || '',
          vibes: safeParseArray(p.vibes),
          genres: safeParseArray(p.genres),
          instagram: p.instagram_handle || '',
          phone: p.phone || '',
          website: p.website || v.website || '',
          galleryPhotos: safeParseArray(p.gallery_photos),
        });
      } else {
        // Fallback to old endpoint
        const res = await fetch(`${API_BASE}/api/partner/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile({
            name: data.business_name || '', bio: data.bio || '',
            coverPhoto: data.cover_photo_url || '', profilePhoto: data.profile_picture || '',
            vibes: safeParseArray(data.vibes),
            genres: safeParseArray(data.genres),
            instagram: data.instagram_handle || '', phone: data.phone || '',
            website: data.website || '',
            galleryPhotos: safeParseArray(data.gallery_photos),
          });
        }
      }
    } catch (e) { console.error('Load profile error:', e); }
    setLoading(false);
  };

  const loadEvents = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/partner/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      }
    } catch (e) { console.error('Load events error:', e); }
    setLoadingEvents(false);
  };

  const safeParseArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; }
    catch { return typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : []; }
  };

  const update = (field: string, value: any) => {
    setProfile(p => ({ ...p, [field]: value }));
    setHasChanges(true);
  };

  const pickImage = async (type: 'cover' | 'profile') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'cover' ? [16, 9] : [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      update(type === 'cover' ? 'coverPhoto' : 'profilePhoto', result.assets[0].uri);
    }
  };

  const addGalleryPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPhotos = result.assets.map(a => a.uri);
      update('galleryPhotos', [...profile.galleryPhotos, ...newPhotos]);
    }
  };

  const removeGalleryPhoto = (index: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Remove Photo', 'Remove this photo from your gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          const updated = [...profile.galleryPhotos];
          updated.splice(index, 1);
          update('galleryPhotos', updated);
        },
      },
    ]);
  };

  const toggleItem = (field: 'vibes' | 'genres', item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const list = profile[field];
    update(field, list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  const save = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/partner/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: profile.name,
          bio: profile.bio,
          vibes: JSON.stringify(profile.vibes),
          genres: JSON.stringify(profile.genres),
          instagram_handle: profile.instagram,
          phone: profile.phone,
          website: profile.website,
          gallery_photos: JSON.stringify(profile.galleryPhotos),
          cover_photo_url: profile.coverPhoto,
          profile_picture: profile.profilePhoto,
        }),
      });
      if (res.ok) {
        setHasChanges(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved', 'Your profile has been updated');
      } else {
        Alert.alert('Error', 'Failed to save profile');
      }
    } catch (e) { Alert.alert('Error', 'Failed to save'); }
    setSaving(false);
  };

  const getStrength = () => {
    let s = 0;
    if (profile.name) s += 15;
    if (profile.bio.length > 50) s += 15;
    if (profile.vibes.length >= 2) s += 15;
    if (profile.genres.length >= 2) s += 15;
    if (profile.coverPhoto) s += 10;
    if (profile.profilePhoto) s += 10;
    if (profile.galleryPhotos.length >= 3) s += 10;
    if (profile.instagram) s += 5;
    if (events.length > 0) s += 5;
    return Math.min(s, 100);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return ` · ${hr}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
    } catch { return ''; }
  };

  const now = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.event_date >= now && e.status === 'published');
  const pastEvents = events.filter(e => e.event_date < now || e.status !== 'published');

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const strength = getStrength();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={() => {
          // Preview — open public profile
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Preview', 'Open your public profile page?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Preview', onPress: () => {} },
          ]);
        }}>
          <Ionicons name="eye-outline" size={22} color="#71717a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Profile Strength */}
          <Animated.View entering={FadeInDown.duration(300)} style={styles.strengthCard}>
            <Text style={styles.strengthLabel}>Profile Strength</Text>
            <Text style={[styles.strengthScore, { color: strength >= 80 ? '#22c55e' : strength >= 50 ? '#eab308' : '#ef4444' }]}>
              {strength}%
            </Text>
            <View style={styles.strengthBar}>
              <View style={[styles.strengthFill, {
                width: `${strength}%`,
                backgroundColor: strength >= 80 ? '#22c55e' : strength >= 50 ? '#eab308' : '#ef4444',
              }]} />
            </View>
          </Animated.View>

          {/* Cover Photo */}
          <Animated.View entering={FadeInDown.delay(50).duration(300)}>
            <TouchableOpacity style={styles.coverContainer} onPress={() => pickImage('cover')}>
              {profile.coverPhoto ? (
                <Image source={{ uri: profile.coverPhoto }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#52525b" />
                  <Text style={styles.placeholderText}>Add cover photo</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Profile Photo */}
            <View style={styles.profilePhotoSection}>
              <TouchableOpacity onPress={() => pickImage('profile')}>
                {profile.profilePhoto ? (
                  <Image source={{ uri: profile.profilePhoto }} style={styles.profilePhoto} />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <Ionicons name="person" size={32} color="#52525b" />
                  </View>
                )}
                <View style={styles.editBadgeSmall}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Name & Bio */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.card}>
            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => { setEditingField('name'); setEditValue(profile.name); }}
            >
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{profile.name || 'Add name'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cardRow, { borderBottomWidth: 0 }]}
              onPress={() => { setEditingField('bio'); setEditValue(profile.bio); }}
            >
              <Text style={styles.label}>Bio</Text>
              <Text style={styles.value} numberOfLines={3}>{profile.bio || 'Add bio'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ═══ GALLERY ═══ */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="images-outline" size={18} color="#71717a" />
                <Text style={styles.cardTitle}>Gallery</Text>
                <Text style={styles.sectionCount}>{profile.galleryPhotos.length}</Text>
              </View>
              {<TouchableOpacity onPress={addGalleryPhoto}>
                  <Ionicons name="add-circle" size={24} color="#8B5CF6" />
                </TouchableOpacity>}
            </View>
            <Text style={styles.helper}>Photos & videos guests see on your page</Text>

            {profile.galleryPhotos.length > 0 ? (
              <View style={styles.galleryGrid}>
                {profile.galleryPhotos.map((uri, idx) => (
                  <TouchableOpacity
                    key={`${uri}-${idx}`}
                    style={styles.galleryItem}
                    onLongPress={() => removeGalleryPhoto(idx)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.galleryImage} />
                    <TouchableOpacity
                      style={styles.galleryRemove}
                      onPress={() => removeGalleryPhoto(idx)}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                {(
                  <TouchableOpacity style={styles.galleryAdd} onPress={addGalleryPhoto}>
                    <Ionicons name="add" size={28} color="#52525b" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity style={styles.galleryEmpty} onPress={addGalleryPhoto}>
                <Ionicons name="cloud-upload-outline" size={32} color="#3f3f46" />
                <Text style={styles.galleryEmptyText}>Tap to add photos & videos</Text>
                <Text style={styles.galleryEmptyHint}>Photos & videos · Select multiple at once</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* ═══ EVENTS ═══ */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="sparkles-outline" size={18} color="#71717a" />
                <Text style={styles.cardTitle}>Events</Text>
                <Text style={styles.sectionCount}>{events.length}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/partner/events/new')}>
                <Ionicons name="add-circle" size={24} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helper}>Events shown on your public page</Text>

            {loadingEvents ? (
              <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 20 }} />
            ) : events.length === 0 ? (
              <TouchableOpacity style={styles.eventsEmpty} onPress={() => router.push('/partner/events/new')}>
                <Ionicons name="calendar-outline" size={32} color="#3f3f46" />
                <Text style={styles.galleryEmptyText}>No events yet</Text>
                <Text style={styles.galleryEmptyHint}>Create your first event to attract guests</Text>
              </TouchableOpacity>
            ) : (
              <View>
                {/* Upcoming */}
                {upcomingEvents.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.eventSectionLabel}>UPCOMING</Text>
                    {upcomingEvents.slice(0, 5).map(evt => (
                      <TouchableOpacity
                        key={evt.id}
                        style={styles.eventRow}
                        onPress={() => router.push(`/partner/events/${evt.id}`)}
                      >
                        <View style={styles.eventThumb}>
                          {(evt.cover_image_url || evt.image_url) ? (
                            <Image
                              source={{ uri: evt.cover_image_url || evt.image_url }}
                              style={styles.eventThumbImage}
                            />
                          ) : (
                            <View style={styles.eventThumbPlaceholder}>
                              <Ionicons name="sparkles" size={16} color="#52525b" />
                            </View>
                          )}
                        </View>
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventTitle} numberOfLines={1}>{evt.title}</Text>
                          <Text style={styles.eventDate}>
                            {formatDate(evt.event_date)}{formatTime(evt.event_time)}
                          </Text>
                          {evt.venue_name && (
                            <Text style={styles.eventVenue} numberOfLines={1}>{evt.venue_name}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#3f3f46" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Past */}
                {pastEvents.length > 0 && (
                  <View>
                    <Text style={styles.eventSectionLabel}>PAST</Text>
                    {pastEvents.slice(0, 3).map(evt => (
                      <TouchableOpacity
                        key={evt.id}
                        style={[styles.eventRow, { opacity: 0.5 }]}
                        onPress={() => router.push(`/partner/events/${evt.id}`)}
                      >
                        <View style={styles.eventThumb}>
                          {(evt.cover_image_url || evt.image_url) ? (
                            <Image
                              source={{ uri: evt.cover_image_url || evt.image_url }}
                              style={styles.eventThumbImage}
                            />
                          ) : (
                            <View style={styles.eventThumbPlaceholder}>
                              <Ionicons name="sparkles" size={16} color="#52525b" />
                            </View>
                          )}
                        </View>
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventTitle} numberOfLines={1}>{evt.title}</Text>
                          <Text style={styles.eventDate}>{formatDate(evt.event_date)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#3f3f46" />
                      </TouchableOpacity>
                    ))}
                    {pastEvents.length > 3 && (
                      <TouchableOpacity
                        style={styles.viewAllBtn}
                        onPress={() => router.push('/partner/events')}
                      >
                        <Text style={styles.viewAllText}>View all {pastEvents.length} past events</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </Animated.View>

          {/* ═══ VIBES ═══ */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Vibes</Text>
              <TouchableOpacity onPress={() => setShowVibesModal(true)}>
                <Ionicons name="add-circle" size={24} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helper}>Helps match you with the right guests</Text>
            {profile.vibes.length > 0 ? (
              <View style={styles.tags}>
                {profile.vibes.map(v => (
                  <View key={v} style={styles.tag}>
                    <Text style={styles.tagText}>{v}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyHint}>Tap + to add vibes</Text>
            )}
          </Animated.View>

          {/* ═══ MUSIC ═══ */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Music</Text>
              <TouchableOpacity onPress={() => setShowGenresModal(true)}>
                <Ionicons name="add-circle" size={24} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helper}>Used in AI search</Text>
            {profile.genres.length > 0 ? (
              <View style={styles.tags}>
                {profile.genres.map(g => (
                  <View key={g} style={[styles.tag, { borderColor: '#f97316' }]}>
                    <Text style={[styles.tagText, { color: '#f97316' }]}>{g}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyHint}>Tap + to add music genres</Text>
            )}
          </Animated.View>

          {/* ═══ CONTACT ═══ */}
          <Animated.View entering={FadeInDown.delay(350).duration(300)} style={styles.card}>
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => { setEditingField('instagram'); setEditValue(profile.instagram); }}
            >
              <Ionicons name="logo-instagram" size={20} color="#E1306C" />
              <Text style={styles.contactText}>
                {profile.instagram ? `@${profile.instagram}` : 'Add Instagram'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => { setEditingField('phone'); setEditValue(profile.phone); }}
            >
              <Ionicons name="call-outline" size={20} color="#8B5CF6" />
              <Text style={styles.contactText}>{profile.phone || 'Add phone'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactRow, { borderBottomWidth: 0 }]}
              onPress={() => { setEditingField('website'); setEditValue(profile.website); }}
            >
              <Ionicons name="globe-outline" size={20} color="#8B5CF6" />
              <Text style={styles.contactText}>{profile.website || 'Add website'}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Save Bar */}
      {hasChanges && (
        <View style={[styles.saveContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Field Modal */}
      <Modal visible={editingField !== null} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditingField(null)}>
                <Text style={{ color: '#71717a', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                Edit {editingField}
              </Text>
              <TouchableOpacity onPress={() => {
                if (editingField) update(editingField, editValue);
                setEditingField(null);
              }}>
                <Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, editingField === 'bio' && { minHeight: 120 }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editingField}`}
              placeholderTextColor="#52525b"
              multiline={editingField === 'bio'}
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Vibes Modal */}
      <Modal visible={showVibesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowVibesModal(false)}>
                <Text style={{ color: '#71717a', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Select Vibes</Text>
              <TouchableOpacity onPress={() => setShowVibesModal(false)}>
                <Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.optionsGrid}>
              {VIBE_OPTIONS.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.option, profile.vibes.includes(v) && styles.optionSelected]}
                  onPress={() => toggleItem('vibes', v)}
                >
                  <Text style={[styles.optionText, profile.vibes.includes(v) && { color: '#8B5CF6' }]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Genres Modal */}
      <Modal visible={showGenresModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowGenresModal(false)}>
                <Text style={{ color: '#71717a', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Select Music</Text>
              <TouchableOpacity onPress={() => setShowGenresModal(false)}>
                <Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.optionsGrid}>
              {GENRE_OPTIONS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.option, profile.genres.includes(g) && { backgroundColor: 'rgba(249,115,22,0.2)', borderColor: '#f97316' }]}
                  onPress={() => toggleItem('genres', g)}
                >
                  <Text style={[styles.optionText, profile.genres.includes(g) && { color: '#f97316' }]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },

  // Strength
  strengthCard: { backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 16, padding: 16, marginBottom: 16 },
  strengthLabel: { color: '#a1a1aa', fontSize: 13 },
  strengthScore: { fontSize: 32, fontWeight: '700', marginVertical: 4 },
  strengthBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
  strengthFill: { height: '100%', borderRadius: 3 },

  // Cover & Profile Photo
  coverContainer: { height: 160, backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#52525b', marginTop: 8, fontSize: 13 },
  editBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 },
  profilePhotoSection: { alignItems: 'center', marginTop: -50, marginBottom: 16 },
  profilePhoto: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#000' },
  profilePhotoPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
  editBadgeSmall: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B5CF6', borderRadius: 10, padding: 4 },

  // Cards
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  label: { color: '#71717a', fontSize: 12, marginBottom: 4 },
  value: { color: '#fff', fontSize: 15 },
  helper: { color: '#52525b', fontSize: 12, marginBottom: 12 },
  emptyHint: { color: '#3f3f46', fontSize: 13, fontStyle: 'italic' },

  // Section title with icon
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionCount: { fontSize: 12, color: '#52525b', fontWeight: '500' },

  // Gallery
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GALLERY_GAP },
  galleryItem: { width: GALLERY_SIZE, height: GALLERY_SIZE, borderRadius: 8, overflow: 'hidden' },
  galleryImage: { width: '100%', height: '100%' },
  galleryRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  galleryAdd: {
    width: GALLERY_SIZE, height: GALLERY_SIZE, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  galleryEmpty: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed',
  },
  galleryEmptyText: { color: '#52525b', fontSize: 14, fontWeight: '500', marginTop: 10 },
  galleryEmptyHint: { color: '#3f3f46', fontSize: 12, marginTop: 4 },

  // Events
  eventSectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#52525b',
    letterSpacing: 0.5, marginBottom: 8,
  },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  eventThumb: { width: 48, height: 48, borderRadius: 10, overflow: 'hidden', backgroundColor: '#18181b' },
  eventThumbImage: { width: '100%', height: '100%' },
  eventThumbPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eventInfo: { flex: 1 },
  eventTitle: { color: '#e4e4e7', fontSize: 15, fontWeight: '500' },
  eventDate: { color: '#71717a', fontSize: 12, marginTop: 2 },
  eventVenue: { color: '#52525b', fontSize: 12, marginTop: 1 },
  eventsEmpty: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed',
  },
  viewAllBtn: { paddingVertical: 12, alignItems: 'center' },
  viewAllText: { color: '#8B5CF6', fontSize: 13, fontWeight: '500' },

  // Tags
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: 'rgba(139,92,246,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#8B5CF6' },
  tagText: { color: '#8B5CF6', fontSize: 13, fontWeight: '500' },

  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  contactText: { color: '#d4d4d8', fontSize: 15, flex: 1 },

  // Save
  saveContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.95)' },
  saveButton: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, margin: 16, fontSize: 16, color: '#fff', minHeight: 50 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  option: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  optionSelected: { backgroundColor: 'rgba(139,92,246,0.2)', borderColor: '#8B5CF6' },
  optionText: { color: '#a1a1aa', fontSize: 14 },
});
