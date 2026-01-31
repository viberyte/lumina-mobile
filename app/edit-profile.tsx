import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE = 'https://lumina.viberyte.com';
const VIBE_OPTIONS = ['Upscale', 'Intimate', 'Trendy', 'Chill', 'High Energy', 'Exclusive', 'Romantic', 'Lively', 'Cozy', 'Vibrant'];
const GENRE_OPTIONS = ['Hip-Hop', 'R&B', 'Afrobeats', 'Latin', 'Reggaeton', 'House', 'EDM', 'Top 40', 'Open Format', 'Jazz'];

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
  
  const [profile, setProfile] = useState({
    name: '', bio: '', coverPhoto: '', profilePhoto: '',
    vibes: [] as string[], genres: [] as string[],
    instagram: '', phone: '', website: '',
  });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('partner_token');
      if (!token) { setLoading(false); return; }
      const res = await fetch(`${API_BASE}/api/partner/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          name: data.business_name || '', bio: data.bio || '',
          coverPhoto: data.cover_photo_url || '', profilePhoto: data.profile_picture || '',
          vibes: data.vibes ? JSON.parse(data.vibes) : [],
          genres: data.genres ? JSON.parse(data.genres) : [],
          instagram: data.instagram_handle || '', phone: data.phone || '', website: data.website || '',
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const update = (field: string, value: any) => { setProfile(p => ({ ...p, [field]: value })); setHasChanges(true); };

  const pickImage = async (type: 'cover' | 'profile') => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: type === 'cover' ? [16, 9] : [1, 1], quality: 0.8 });
    if (!result.canceled) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update(type === 'cover' ? 'coverPhoto' : 'profilePhoto', result.assets[0].uri); }
  };

  const toggleItem = (field: 'vibes' | 'genres', item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const list = profile[field];
    update(field, list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  const save = async () => {
    setSaving(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const token = await AsyncStorage.getItem('partner_token');
      const res = await fetch(`${API_BASE}/api/partner/profile`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name: profile.name, bio: profile.bio, vibes: JSON.stringify(profile.vibes), genres: JSON.stringify(profile.genres), instagram_handle: profile.instagram, phone: profile.phone, website: profile.website }),
      });
      if (res.ok) { setHasChanges(false); Alert.alert('Success', 'Profile updated!'); }
    } catch (e) { Alert.alert('Error', 'Failed to save'); }
    setSaving(false);
  };

  const getStrength = () => {
    let s = 0;
    if (profile.name) s += 20;
    if (profile.bio.length > 50) s += 20;
    if (profile.vibes.length >= 2) s += 20;
    if (profile.genres.length >= 2) s += 20;
    if (profile.coverPhoto) s += 10;
    if (profile.instagram) s += 10;
    return s;
  };

  if (loading) return <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  const strength = getStrength();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.strengthCard}>
          <Text style={styles.strengthLabel}>Profile Strength</Text>
          <Text style={[styles.strengthScore, { color: strength >= 80 ? '#22c55e' : strength >= 50 ? '#eab308' : '#ef4444' }]}>{strength}%</Text>
          <View style={styles.strengthBar}><View style={[styles.strengthFill, { width: `${strength}%`, backgroundColor: strength >= 80 ? '#22c55e' : strength >= 50 ? '#eab308' : '#ef4444' }]} /></View>
        </View>

        <TouchableOpacity style={styles.coverContainer} onPress={() => pickImage('cover')}>
          {profile.coverPhoto ? <Image source={{ uri: profile.coverPhoto }} style={styles.coverImage} /> : <View style={styles.coverPlaceholder}><Ionicons name="image-outline" size={40} color="#52525b" /><Text style={styles.placeholderText}>Add cover photo</Text></View>}
          <View style={styles.editBadge}><Ionicons name="camera" size={16} color="#fff" /></View>
        </TouchableOpacity>

        <View style={styles.profilePhotoSection}>
          <TouchableOpacity onPress={() => pickImage('profile')}>
            {profile.profilePhoto ? <Image source={{ uri: profile.profilePhoto }} style={styles.profilePhoto} /> : <View style={styles.profilePhotoPlaceholder}><Ionicons name="person" size={32} color="#52525b" /></View>}
            <View style={styles.editBadgeSmall}><Ionicons name="camera" size={12} color="#fff" /></View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}><Text style={styles.label}>Name</Text><TouchableOpacity onPress={() => { setEditingField('name'); setEditValue(profile.name); }}><Text style={styles.value}>{profile.name || 'Add name'}</Text></TouchableOpacity></View>
          <View style={styles.cardRow}><Text style={styles.label}>Bio</Text><TouchableOpacity onPress={() => { setEditingField('bio'); setEditValue(profile.bio); }}><Text style={styles.value} numberOfLines={2}>{profile.bio || 'Add bio'}</Text></TouchableOpacity></View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}><Text style={styles.cardTitle}>Vibes</Text><TouchableOpacity onPress={() => setShowVibesModal(true)}><Ionicons name="add-circle" size={24} color="#8B5CF6" /></TouchableOpacity></View>
          <Text style={styles.helper}>Helps match you with the right guests</Text>
          <View style={styles.tags}>{profile.vibes.map(v => <View key={v} style={styles.tag}><Text style={styles.tagText}>{v}</Text></View>)}</View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}><Text style={styles.cardTitle}>Music</Text><TouchableOpacity onPress={() => setShowGenresModal(true)}><Ionicons name="add-circle" size={24} color="#8B5CF6" /></TouchableOpacity></View>
          <Text style={styles.helper}>Used in AI search</Text>
          <View style={styles.tags}>{profile.genres.map(g => <View key={g} style={[styles.tag, { borderColor: '#f97316' }]}><Text style={[styles.tagText, { color: '#f97316' }]}>{g}</Text></View>)}</View>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.contactRow} onPress={() => { setEditingField('instagram'); setEditValue(profile.instagram); }}><Ionicons name="logo-instagram" size={20} color="#E1306C" /><Text style={styles.contactText}>{profile.instagram ? `@${profile.instagram}` : 'Add Instagram'}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.contactRow} onPress={() => { setEditingField('phone'); setEditValue(profile.phone); }}><Ionicons name="call-outline" size={20} color="#8B5CF6" /><Text style={styles.contactText}>{profile.phone || 'Add phone'}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.contactRow} onPress={() => { setEditingField('website'); setEditValue(profile.website); }}><Ionicons name="globe-outline" size={20} color="#8B5CF6" /><Text style={styles.contactText}>{profile.website || 'Add website'}</Text></TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {hasChanges && <View style={[styles.saveContainer, { paddingBottom: insets.bottom + 16 }]}><TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}</TouchableOpacity></View>}

      <Modal visible={editingField !== null} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><TouchableOpacity onPress={() => setEditingField(null)}><Text style={{ color: '#71717a', fontSize: 16 }}>Cancel</Text></TouchableOpacity><Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Edit {editingField}</Text><TouchableOpacity onPress={() => { if (editingField) update(editingField, editValue); setEditingField(null); }}><Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '600' }}>Done</Text></TouchableOpacity></View>
            <TextInput style={styles.input} value={editValue} onChangeText={setEditValue} placeholder={`Enter ${editingField}`} placeholderTextColor="#52525b" multiline={editingField === 'bio'} autoFocus />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showVibesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><TouchableOpacity onPress={() => setShowVibesModal(false)}><Text style={{ color: '#71717a', fontSize: 16 }}>Cancel</Text></TouchableOpacity><Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Select Vibes</Text><TouchableOpacity onPress={() => setShowVibesModal(false)}><Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '600' }}>Done</Text></TouchableOpacity></View>
          <View style={styles.optionsGrid}>{VIBE_OPTIONS.map(v => <TouchableOpacity key={v} style={[styles.option, profile.vibes.includes(v) && styles.optionSelected]} onPress={() => toggleItem('vibes', v)}><Text style={[styles.optionText, profile.vibes.includes(v) && { color: '#8B5CF6' }]}>{v}</Text></TouchableOpacity>)}</View>
        </View></View>
      </Modal>

      <Modal visible={showGenresModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><TouchableOpacity onPress={() => setShowGenresModal(false)}><Text style={{ color: '#71717a', fontSize: 16 }}>Cancel</Text></TouchableOpacity><Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Select Music</Text><TouchableOpacity onPress={() => setShowGenresModal(false)}><Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '600' }}>Done</Text></TouchableOpacity></View>
          <View style={styles.optionsGrid}>{GENRE_OPTIONS.map(g => <TouchableOpacity key={g} style={[styles.option, profile.genres.includes(g) && { backgroundColor: 'rgba(249,115,22,0.2)', borderColor: '#f97316' }]} onPress={() => toggleItem('genres', g)}><Text style={[styles.optionText, profile.genres.includes(g) && { color: '#f97316' }]}>{g}</Text></TouchableOpacity>)}</View>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  strengthCard: { backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 16, padding: 16, marginBottom: 16 },
  strengthLabel: { color: '#a1a1aa', fontSize: 13 },
  strengthScore: { fontSize: 32, fontWeight: '700', marginVertical: 4 },
  strengthBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
  strengthFill: { height: '100%', borderRadius: 3 },
  coverContainer: { height: 160, backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#52525b', marginTop: 8 },
  editBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 },
  profilePhotoSection: { alignItems: 'center', marginTop: -50, marginBottom: 16 },
  profilePhoto: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#000' },
  profilePhotoPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
  editBadgeSmall: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B5CF6', borderRadius: 10, padding: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  label: { color: '#71717a', fontSize: 12, marginBottom: 4 },
  value: { color: '#fff', fontSize: 15 },
  helper: { color: '#52525b', fontSize: 12, marginBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: 'rgba(139,92,246,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#8B5CF6' },
  tagText: { color: '#8B5CF6', fontSize: 13, fontWeight: '500' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  contactText: { color: '#d4d4d8', fontSize: 15, flex: 1 },
  saveContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.9)' },
  saveButton: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, margin: 16, fontSize: 16, color: '#fff', minHeight: 50 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  option: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  optionSelected: { backgroundColor: 'rgba(139,92,246,0.2)', borderColor: '#8B5CF6' },
  optionText: { color: '#a1a1aa', fontSize: 14 },
});
