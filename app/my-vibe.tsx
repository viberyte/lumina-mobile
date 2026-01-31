import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme';

const API_BASE = 'https://lumina.viberyte.com';

const MUSIC_OPTIONS = [
  { id: 'afrobeats', label: 'Afrobeats' },
  { id: 'hiphop', label: 'Hip-Hop' },
  { id: 'rnb', label: 'R&B' },
  { id: 'latin', label: 'Latin' },
  { id: 'edm', label: 'EDM' },
  { id: 'house', label: 'House' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'live', label: 'Live Music' },
  { id: 'top40', label: 'Top 40' },
  { id: 'open', label: 'Open Format' },
];

const ENERGY_OPTIONS = [
  { id: 'chill', label: 'Chill vibes' },
  { id: 'social', label: 'Social scene' },
  { id: 'turnup', label: 'Turn up' },
  { id: 'whatever', label: 'Whatever fits' },
];

const CROWD_OPTIONS = [
  { id: 'young_lit', label: 'Young & Lit' },
  { id: 'social_mix', label: 'Social Mix' },
  { id: 'mature', label: 'Mature & Refined' },
  { id: 'lowkey', label: 'Low-Key / Grown' },
  { id: 'any', label: "Doesn't matter" },
];

const NIGHT_STYLE_OPTIONS = [
  { id: 'date', label: 'Date night' },
  { id: 'friends', label: 'Friends night' },
  { id: 'solo', label: 'Solo explorer' },
  { id: 'group', label: 'Big group' },
];

const STATUS_OPTIONS = [
  { id: 'single', label: 'Single' },
  { id: 'relationship', label: 'In a relationship' },
  { id: 'complicated', label: "It's complicated" },
];

const SUPPORT_OPTIONS = [
  { id: 'black_owned', label: 'Black-owned' },
  { id: 'minority_owned', label: 'Minority-owned' },
  { id: 'women_owned', label: 'Women-owned' },
  { id: 'lgbtq_friendly', label: 'LGBTQ+ friendly' },
];

const EXTRAS_OPTIONS = [
  { id: 'hookah', label: 'Hookah' },
  { id: 'dancing', label: 'Dancing' },
  { id: 'live_dj', label: 'Live DJ' },
  { id: 'outdoor', label: 'Outdoor seating' },
];

const DAYTIME_OPTIONS = [
  { id: 'cafes', label: 'Cafes' },
  { id: 'brunch', label: 'Brunch spots' },
  { id: 'late_eats', label: 'Late night eats' },
  { id: 'work_friendly', label: 'Work-friendly spots' },
];

const DIETARY_OPTIONS = [
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'halal', label: 'Halal' },
  { id: 'gluten_free', label: 'Gluten-free' },
];

interface Preferences {
  music_genres: string[];
  energy_level: string;
  crowd_vibe: string;
  night_style: string[];
  support_preferences: string[];
  extras: string[];
  relationship_status: string | null;
  daytime_interests: string[];
  dietary: string[];
}

export default function MyVibeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({
    music_genres: [],
    energy_level: '',
    crowd_vibe: '',
    night_style: [],
    support_preferences: [],
    extras: [],
    relationship_status: null,
    daytime_interests: [],
    dietary: [],
  });

  // Live vibe summary - prioritizes identity (music + crowd + night style) over extras
  const vibeSummary = useMemo(() => {
    const parts: string[] = [];
    
    // 1. Music (identity core)
    const musicLabels = prefs.music_genres.slice(0, 2).map(id => 
      MUSIC_OPTIONS.find(m => m.id === id)?.label
    ).filter(Boolean);
    if (musicLabels.length) parts.push(musicLabels.join(' & '));
    
    // 2. Crowd vibe (identity)
    const crowd = CROWD_OPTIONS.find(c => c.id === prefs.crowd_vibe)?.label;
    if (crowd && crowd !== "Doesn't matter") parts.push(crowd);
    
    // 3. Night style (identity)
    const nightLabel = prefs.night_style.slice(0, 1).map(id =>
      NIGHT_STYLE_OPTIONS.find(n => n.id === id)?.label
    ).filter(Boolean);
    if (nightLabel.length) parts.push(nightLabel[0]);
    
    // 4. Support (values)
    const supportLabels = prefs.support_preferences.slice(0, 1).map(id =>
      SUPPORT_OPTIONS.find(s => s.id === id)?.label?.replace('-owned', '')
    ).filter(Boolean);
    if (supportLabels.length) parts.push(`${supportLabels[0]}-owned spots`);
    
    // 5. Extras last (nice-to-have)
    const extrasLabels = prefs.extras.slice(0, 1).map(id =>
      EXTRAS_OPTIONS.find(e => e.id === id)?.label
    ).filter(Boolean);
    if (extrasLabels.length && parts.length < 4) parts.push(extrasLabels[0]);
    
    return parts.length > 0 ? parts.join(' • ') : 'Tap below to define your vibe';
  }, [prefs]);

  useEffect(() => { loadPreferences(); }, []);

  const loadPreferences = async () => {
    try {
      const id = await AsyncStorage.getItem('@lumina_user_id');
      if (id) {
        setUserId(parseInt(id));
        const response = await fetch(`${API_BASE}/api/preferences?userId=${id}`);
        const data = await response.json();
        if (data.exists && data.preferences) {
          setPrefs({
            music_genres: data.preferences.music_genres || [],
            energy_level: data.preferences.energy_level || '',
            crowd_vibe: data.preferences.crowd_vibe || '',
            night_style: data.preferences.night_style || [],
            support_preferences: data.preferences.support_preferences || [],
            extras: data.preferences.extras || [],
            relationship_status: data.preferences.relationship_status,
            daytime_interests: data.preferences.daytime_interests || [],
            dietary: data.preferences.dietary || [],
          });
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...prefs, onboarding_complete: true }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => router.back(), 800);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (key: keyof Preferences, itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = prefs[key] as string[];
    const updated = current.includes(itemId) ? current.filter(i => i !== itemId) : [...current, itemId];
    setPrefs({ ...prefs, [key]: updated });
  };

  const setSingleValue = (key: keyof Preferences, value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrefs({ ...prefs, [key]: value });
  };

  const renderChips = (options: { id: string; label: string }[], selected: string[], onToggle: (id: string) => void) => (
    <View style={styles.chipsContainer}>
      {options.map(opt => (
        <TouchableOpacity key={opt.id} style={[styles.chip, selected.includes(opt.id) && styles.chipSelected]} onPress={() => onToggle(opt.id)} activeOpacity={0.7}>
          <Text style={[styles.chipText, selected.includes(opt.id) && styles.chipTextSelected]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSingleSelect = (options: { id: string; label: string }[], selected: string | null, onSelect: (id: string) => void) => (
    <View style={styles.chipsContainer}>
      {options.map(opt => (
        <TouchableOpacity key={opt.id} style={[styles.chip, selected === opt.id && styles.chipSelected]} onPress={() => onSelect(opt.id)} activeOpacity={0.7}>
          <Text style={[styles.chipText, selected === opt.id && styles.chipTextSelected]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) return <View style={[styles.container, styles.centered]}><ActivityIndicator size="large" color={colors.violet[500]} /></View>;

  // Full-screen saving overlay
  if (saving || saved) return (
    <View style={[styles.container, styles.centered]}>
      {saving ? (
        <>
          <ActivityIndicator size="large" color={colors.violet[500]} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, color: colors.white, fontWeight: '500' }}>Saving your vibe...</Text>
        </>
      ) : (
        <>
          <Ionicons name="checkmark-circle" size={72} color={colors.violet[500]} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 20, color: colors.white, fontWeight: '600' }}>Vibe locked in</Text>
          <Text style={{ fontSize: 14, color: colors.zinc[500], marginTop: 8 }}>Your experience is now personalized</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={24} color={colors.white} /></TouchableOpacity>
        <Text style={styles.headerTitle}>My Vibe</Text>
        <TouchableOpacity onPress={savePreferences} disabled={saving || saved} style={styles.saveButton}>
          <Text style={[styles.saveText, (saving || saved) && styles.saveTextDisabled]}>{saved ? 'Locked in ✓' : saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.vibeSummaryCard}>
        <Text style={styles.vibeSummaryLabel}>Your Vibe</Text>
        <Text style={styles.vibeSummaryText}>{vibeSummary}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.chapter}><Text style={styles.chapterTitle}>🎶 YOUR SOUND</Text></View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Music</Text>
          <Text style={styles.sectionSubtitle}>What sounds get you moving?</Text>
          {renderChips(MUSIC_OPTIONS, prefs.music_genres, (id) => toggleArrayItem('music_genres', id))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy</Text>
          <Text style={styles.sectionSubtitle}>What's your typical vibe?</Text>
          {renderSingleSelect(ENERGY_OPTIONS, prefs.energy_level, (id) => setSingleValue('energy_level', id))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crowd Vibe</Text>
          <Text style={styles.sectionSubtitle}>What kind of crowd do you enjoy?</Text>
          {renderSingleSelect(CROWD_OPTIONS, prefs.crowd_vibe, (id) => setSingleValue('crowd_vibe', id))}
        </View>

        <View style={styles.chapter}><Text style={styles.chapterTitle}>🌙 HOW YOU GO OUT</Text></View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Night Style</Text>
          <Text style={styles.sectionSubtitle}>How do you usually go out?</Text>
          {renderChips(NIGHT_STYLE_OPTIONS, prefs.night_style, (id) => toggleArrayItem('night_style', id))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={styles.sectionSubtitle}>Helps us suggest the right spots</Text>
          {renderSingleSelect(STATUS_OPTIONS, prefs.relationship_status, (id) => setSingleValue('relationship_status', id))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Extras</Text>
          <Text style={styles.sectionSubtitle}>Must-haves for your night</Text>
          {renderChips(EXTRAS_OPTIONS, prefs.extras, (id) => toggleArrayItem('extras', id))}
        </View>

        <View style={styles.chapter}><Text style={styles.chapterTitle}>🖤 WHAT YOU CARE ABOUT</Text></View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Text style={styles.sectionSubtitle}>Where your money goes matters</Text>
          <Text style={styles.helperText}>Only used to prioritize when options exist.</Text>
          {renderChips(SUPPORT_OPTIONS, prefs.support_preferences, (id) => toggleArrayItem('support_preferences', id))}
        </View>

        <View style={styles.chapter}><Text style={styles.chapterTitle}>☀️ BEYOND THE NIGHT</Text></View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daytime</Text>
          <Text style={styles.sectionSubtitle}>When the sun's still up</Text>
          {renderChips(DAYTIME_OPTIONS, prefs.daytime_interests, (id) => toggleArrayItem('daytime_interests', id))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary</Text>
          <Text style={styles.sectionSubtitle}>We'll notify you when more options arrive</Text>
          {renderChips(DIETARY_OPTIONS, prefs.dietary, (id) => toggleArrayItem('dietary', id))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: '600', color: colors.white },
  saveButton: { padding: spacing.xs },
  saveText: { fontSize: typography.sizes.md, color: colors.violet[400], fontWeight: '600' },
  saveTextDisabled: { opacity: 0.5 },
  vibeSummaryCard: { marginHorizontal: spacing.lg, marginVertical: spacing.md, padding: spacing.lg, backgroundColor: 'rgba(139, 92, 246, 0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)' },
  vibeSummaryLabel: { fontSize: typography.sizes.xs, color: colors.violet[400], fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  vibeSummaryText: { fontSize: typography.sizes.md, color: colors.white, fontWeight: '500', lineHeight: 22 },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  chapter: { paddingTop: spacing.xl, paddingBottom: spacing.sm },
  chapterTitle: { fontSize: typography.sizes.xs, color: colors.zinc[500], fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5 },
  section: { paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: '600', color: colors.white, marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: typography.sizes.sm, color: colors.zinc[500], marginBottom: spacing.md },
  helperText: { fontSize: typography.sizes.xs, color: colors.zinc[600], marginBottom: spacing.lg, fontStyle: 'italic' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipSelected: { backgroundColor: colors.violet[600], borderColor: colors.violet[500] },
  chipText: { fontSize: typography.sizes.sm, color: colors.zinc[400], fontWeight: '500' },
  chipTextSelected: { color: colors.white },
});
