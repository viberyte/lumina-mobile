import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '../theme';

interface PromptBuilderProps {
  onSubmit: (payload: PromptPayload) => void;
  onTypeInstead: () => void;
  isLoading?: boolean;
  userCity?: string;
}

export interface PromptPayload {
  message: string;
  city: string;
  sessionContext: {
    primaryChoice: string;
    cuisine: string | null;
    occasion: string | null;
    mood: string | null;
    musicPreference: string | null;
    venueType: string | null;
    date: string; // "tonight" or yyyy-mm-dd
    startTime: string | null;
    endTime: string | null;
    maxStops: number;
    travelMode: 'local' | 'city-hop' | 'anywhere';
  };
}

interface ChipData {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

const PRIMARY_CHOICES: ChipData[] = [
  { id: 'dinner', label: 'Dinner', value: 'dinner' },
  { id: 'drinks', label: 'Drinks', value: 'drinks' },
  { id: 'nightlife', label: 'Nightlife', value: 'nightlife' },
  { id: 'events', label: 'Events', value: 'events' },
];

const CUISINES: ChipData[] = [
  { id: 'sushi', label: 'Sushi', value: 'japanese' },
  { id: 'italian', label: 'Italian', value: 'italian' },
  { id: 'mexican', label: 'Mexican', value: 'mexican' },
  { id: 'steakhouse', label: 'Steakhouse', value: 'steakhouse' },
  { id: 'soulfood', label: 'Soul Food', value: 'soul food' },
  { id: 'american', label: 'American', value: 'american' },
  { id: 'mediterranean', label: 'Mediterranean', value: 'mediterranean' },
  { id: 'caribbean', label: 'Caribbean', value: 'caribbean' },
];

const DRINK_VIBES: ChipData[] = [
  { id: 'cocktails', label: 'Cocktails', value: 'cocktails' },
  { id: 'wine', label: 'Wine Bar', value: 'wine' },
  { id: 'rooftop', label: 'Rooftop', value: 'rooftop' },
  { id: 'speakeasy', label: 'Speakeasy', value: 'speakeasy' },
  { id: 'sports', label: 'Sports Bar', value: 'sports bar' },
  { id: 'dive', label: 'Dive Bar', value: 'dive bar' },
];

const VENUE_TYPES: ChipData[] = [
  { id: 'clubs', label: 'Clubs', value: 'club' },
  { id: 'lounges', label: 'Lounges', value: 'lounge' },
  { id: 'rooftops', label: 'Rooftops', value: 'rooftop' },
  { id: 'bars', label: 'Bars', value: 'bar' },
  { id: 'hookah', label: 'Hookah', value: 'hookah' },
];

const MUSIC_PREFERENCES: ChipData[] = [
  { id: 'hiphop', label: 'Hip-Hop / R&B', value: 'hip-hop', icon: 'musical-notes' },
  { id: 'house', label: 'House / Electronic', value: 'house', icon: 'radio' },
  { id: 'afrobeats', label: 'Afrobeats', value: 'afrobeats', icon: 'globe' },
  { id: 'latin', label: 'Latin / Reggaeton', value: 'latin', icon: 'flame' },
  { id: 'live', label: 'Live Music / Jazz', value: 'live', icon: 'mic' },
  { id: 'top40', label: 'Top 40 / Pop', value: 'top40', icon: 'star' },
];

const OCCASIONS: ChipData[] = [
  { id: 'date', label: 'Date Night', value: 'date' },
  { id: 'friends', label: 'Friends Night', value: 'friends' },
  { id: 'solo', label: 'Solo', value: 'solo' },
  { id: 'business', label: 'Business', value: 'business' },
];

const MOODS: ChipData[] = [
  { id: 'chill', label: 'Chill & Intimate', value: 'chill' },
  { id: 'social', label: 'Social & Stylish', value: 'social' },
  { id: 'turnup', label: 'Turn Up', value: 'turnup' },
];

const TRAVEL_MODES: ChipData[] = [
  { id: 'local', label: 'Stay Local', value: 'local' },
  { id: 'cityhop', label: 'City Hop', value: 'city-hop' },
  { id: 'anywhere', label: 'Anywhere', value: 'anywhere' },
];
  const getDateOptions = (): ChipData[] => {
  const options: ChipData[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i <= 6; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNum = date.getDate();
    const isoDate = date.toISOString().split('T')[0];
    
    let label = '';
    if (i === 0) label = 'Tonight';
    else if (i === 1) label = 'Tomorrow';
    else label = `${dayName} ${monthName} ${dayNum}`;
    
    options.push({ 
      id: `day${i}`, 
      label, 
      value: isoDate  // Real date like "2026-01-05"
    });
  }
  return options;
};

  const getTimeOptions = (): ChipData[] => {
  return [
    { id: '5pm', label: '5 PM', value: '5:00 PM' },
    { id: '6pm', label: '6 PM', value: '6:00 PM' },
    { id: '7pm', label: '7 PM', value: '7:00 PM' },
    { id: '8pm', label: '8 PM', value: '8:00 PM' },
    { id: '9pm', label: '9 PM', value: '9:00 PM' },
    { id: '10pm', label: '10 PM', value: '10:00 PM' },
  ];
};

const END_TIMES: ChipData[] = [
  { id: 'midnight', label: 'Midnight', value: '24' },
  { id: '1am', label: '1 AM', value: '25' },
  { id: '2am', label: '2 AM+', value: '26' },
];

export default function PromptBuilder({
  onSubmit,
  onTypeInstead,
  isLoading,
  userCity = 'Manhattan',
}: PromptBuilderProps) {
  const [selectedDate, setSelectedDate] = useState<string>('tonight');
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);

  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [selectedVenueType, setSelectedVenueType] = useState<string | null>(null);

  const [travelMode, setTravelMode] = useState<'local' | 'city-hop' | 'anywhere'>('local');

  const showMusicSection = selectedPrimary === 'drinks' || selectedPrimary === 'nightlife';
  const showVenueTypeSection = selectedPrimary === 'nightlife';
  const hasSelection = !!selectedPrimary;

  const dateOptions = useMemo(() => getDateOptions(), []);
  const timeOptions = useMemo(() => getTimeOptions(), []);

  const calculateStops = (): number => {
    if (!selectedStartTime || !selectedEndTime) return 2;
    const startMatch = selectedStartTime.match(/(\d+)/);
    if (!startMatch) return 2;

    let startHour = parseInt(startMatch[1], 10);
    if (selectedStartTime.includes('PM') && startHour !== 12) startHour += 12;

    const endHour = parseInt(selectedEndTime, 10);
    const hours = endHour - startHour;

    if (hours <= 2) return 1;
    if (hours <= 4) return 2;
    return 3;
  };

  const maxStops = calculateStops();

  const getSecondaryOptions = (): ChipData[] => {
    if (selectedPrimary === 'dinner') return CUISINES;
    if (selectedPrimary === 'drinks') return DRINK_VIBES;
    return [];
  };

  const getSecondaryLabel = (): string => {
    if (selectedPrimary === 'dinner') return 'CUISINE';
    if (selectedPrimary === 'drinks') return 'VIBE';
    return 'TYPE';
  };

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const toggleValue = (current: any, next: any) => (current === next ? null : next);

  const buildPayload = (): PromptPayload => {
    const parts: string[] = [];

    if (selectedPrimary === 'dinner' && selectedSecondary) {
      parts.push(`${CUISINES.find(c => c.value === selectedSecondary)?.label ?? 'Dinner'} dinner`);
    } else if (selectedPrimary === 'drinks' && selectedSecondary) {
      parts.push(DRINK_VIBES.find(c => c.value === selectedSecondary)?.label ?? 'Drinks');
    } else if (selectedPrimary === 'nightlife') {
      if (selectedVenueType) {
        parts.push(VENUE_TYPES.find(v => v.value === selectedVenueType)?.label ?? 'Nightlife');
      } else {
        parts.push('Nightlife');
      }
    } else if (selectedPrimary) {
      parts.push(selectedPrimary);
    }

    if (selectedMusic) {
      parts.push(`${MUSIC_PREFERENCES.find(m => m.value === selectedMusic)?.label ?? selectedMusic} music`);
    }

    if (selectedOccasion) {
      const occ = OCCASIONS.find(o => o.value === selectedOccasion)?.label?.toLowerCase();
      parts.push(`for ${occ ?? selectedOccasion}`);
    }

    const message = parts.length ? parts.join(', ') : 'Plan my night';

    // IMPORTANT: explicitly use nulls (never undefined) so JSON includes keys.
    const payload: PromptPayload = {
      message,
      city: userCity,
      sessionContext: {
        primaryChoice: selectedPrimary ?? 'dinner',
        cuisine: selectedPrimary === 'dinner' ? (selectedSecondary ?? null) : null,
        occasion: selectedOccasion ?? null,
        mood: selectedMood ?? null,
        musicPreference: showMusicSection ? (selectedMusic ?? null) : null,
        venueType: showVenueTypeSection ? (selectedVenueType ?? null) : null,
        date: selectedDate,
        startTime: selectedStartTime ?? null,
        endTime: selectedEndTime ?? null,
        maxStops: Number.isFinite(maxStops) ? maxStops : 2,
        travelMode: travelMode ?? 'local',
      },
    };

    console.log('BUILD PAYLOAD (sessionContext):', JSON.stringify(payload.sessionContext, null, 2));
    return payload;
  };

  const handleSubmit = () => {
    if (!hasSelection || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(buildPayload());
  };

  const renderChip = (chip: ChipData, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={chip.id}
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, isSelected && styles.chipSelected]}
    >
      {chip.icon && (
        <Ionicons
          name={chip.icon as any}
          size={14}
          color={isSelected ? colors.amethyst.glow : colors.text.secondary}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{chip.label}</Text>
    </TouchableOpacity>
  );

  const secondaryOptions = getSecondaryOptions();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>What's the move?</Text>
        <Text style={styles.headerSubtitle}>{userCity}</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={styles.section} entering={FadeIn}>
          <Text style={styles.sectionLabel}>WHEN</Text>
          <View style={styles.chipsRow}>
            {dateOptions.map(chip =>
              renderChip(chip, selectedDate === chip.value, () => {
                haptic();
                setSelectedDate(chip.value);
              })
            )}
          </View>
        </Animated.View>

        {timeOptions.length > 0 && (
          <Animated.View style={styles.section} entering={FadeIn}>
            <Text style={styles.sectionLabel}>START TIME</Text>
            <View style={styles.chipsRow}>
              {timeOptions.map(chip =>
                renderChip(chip, selectedStartTime === chip.value, () => {
                  haptic();
                  setSelectedStartTime(toggleValue(selectedStartTime, chip.value));
                  // If user changes start time, reset end time for consistency
                  setSelectedEndTime(null);
                })
              )}
            </View>
          </Animated.View>
        )}

        {selectedStartTime && (
          <Animated.View style={styles.section} entering={FadeIn}>
            <Text style={styles.sectionLabel}>END BY</Text>
            <View style={styles.chipsRow}>
              {END_TIMES.map(chip =>
                renderChip(chip, selectedEndTime === chip.value, () => {
                  haptic();
                  setSelectedEndTime(toggleValue(selectedEndTime, chip.value));
                })
              )}
            </View>
            {selectedEndTime && <Text style={styles.stopsHint}>{maxStops} stop{maxStops > 1 ? 's' : ''} planned</Text>}
          </Animated.View>
        )}

        <Animated.View style={styles.section} entering={FadeIn}>
          <Text style={styles.sectionLabel}>I'M LOOKING FOR</Text>
          <View style={styles.chipsRow}>
            {PRIMARY_CHOICES.map(chip =>
              renderChip(chip, selectedPrimary === chip.value, () => {
                haptic();

                const nextPrimary = toggleValue(selectedPrimary, chip.value);
                setSelectedPrimary(nextPrimary);

                // Always reset secondary when primary changes
                setSelectedSecondary(null);

                // Only reset music if switching to something that doesn't use music
                const usesMusic = nextPrimary === 'drinks' || nextPrimary === 'nightlife';
                if (!usesMusic) setSelectedMusic(null);

                // Venue type only applies to nightlife
                if (nextPrimary !== 'nightlife') setSelectedVenueType(null);
              })
            )}
          </View>
        </Animated.View>

        {secondaryOptions.length > 0 && (
          <Animated.View style={styles.section} entering={FadeIn}>
            <Text style={styles.sectionLabel}>{getSecondaryLabel()}</Text>
            <View style={styles.chipsRow}>
              {secondaryOptions.map(chip =>
                renderChip(chip, selectedSecondary === chip.value, () => {
                  haptic();
                  setSelectedSecondary(toggleValue(selectedSecondary, chip.value));
                })
              )}
            </View>
          </Animated.View>
        )}

        {showVenueTypeSection && (
          <Animated.View style={styles.section} entering={FadeIn}>
            <Text style={styles.sectionLabel}>VENUE TYPE</Text>
            <View style={styles.chipsRow}>
              {VENUE_TYPES.map(chip =>
                renderChip(chip, selectedVenueType === chip.value, () => {
                  haptic();
                  setSelectedVenueType(toggleValue(selectedVenueType, chip.value));
                  // IMPORTANT: do NOT clear selectedMusic here. ever.
                })
              )}
            </View>
          </Animated.View>
        )}

        {showMusicSection && (
          <Animated.View style={styles.section} entering={FadeIn}>
            <Text style={styles.sectionLabel}>MUSIC</Text>
            <View style={styles.chipsRow}>
              {MUSIC_PREFERENCES.map(chip =>
                renderChip(chip, selectedMusic === chip.value, () => {
                  haptic();
                  setSelectedMusic(toggleValue(selectedMusic, chip.value));
                })
              )}
            </View>
          </Animated.View>
        )}

        <Animated.View style={styles.section} entering={FadeIn}>
          <Text style={styles.sectionLabel}>OCCASION</Text>
          <View style={styles.chipsRow}>
            {OCCASIONS.map(chip =>
              renderChip(chip, selectedOccasion === chip.value, () => {
                haptic();
                setSelectedOccasion(toggleValue(selectedOccasion, chip.value));
              })
            )}
          </View>
        </Animated.View>

        <Animated.View style={styles.section} entering={FadeIn}>
          <Text style={styles.sectionLabel}>MOOD</Text>
          <View style={styles.chipsRow}>
            {MOODS.map(chip =>
              renderChip(chip, selectedMood === chip.value, () => {
                haptic();
                setSelectedMood(toggleValue(selectedMood, chip.value));
              })
            )}
          </View>
        </Animated.View>

        <Animated.View style={styles.section} entering={FadeIn}>
          <Text style={styles.sectionLabel}>TRAVEL</Text>
          <View style={styles.chipsRow}>
            {TRAVEL_MODES.map(chip =>
              renderChip(chip, travelMode === chip.value, () => {
                haptic();
                setTravelMode(chip.value as any);
              })
            )}
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.ctaContainer}>
        <TouchableOpacity onPress={handleSubmit} disabled={!hasSelection || isLoading} activeOpacity={0.8}>
          <LinearGradient
            colors={hasSelection ? [colors.amethyst.primary, colors.amethyst.deep] : [colors.graphite.elevated, colors.graphite.elevated]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.ctaButton, !hasSelection && styles.ctaButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={[styles.ctaText, !hasSelection && styles.ctaTextDisabled]}>
                Plan {maxStops} Stop{maxStops > 1 ? 's' : ''}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onTypeInstead} style={styles.typeInstead}>
          <Text style={styles.typeInsteadText}>Or type something specific…</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: typography.sizes.sm, color: colors.text.secondary, marginTop: spacing.xs },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 140 },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: colors.text.muted, letterSpacing: 1.2, marginBottom: spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    backgroundColor: colors.graphite.elevated,
    borderWidth: 1,
    borderColor: colors.graphite.border,
  },
  chipSelected: { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: colors.amethyst.primary, borderWidth: 2 },
  chipText: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.text.secondary },
  chipTextSelected: { color: colors.amethyst.glow, fontWeight: '600' },
  stopsHint: { fontSize: typography.sizes.xs, color: colors.amethyst.glow, marginTop: spacing.sm, fontWeight: '600' },
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.xl, paddingBottom: 34, paddingTop: spacing.md, backgroundColor: colors.graphite.darker }, 

  ctaButton: { borderRadius: 14, paddingVertical: spacing.md + 2, alignItems: 'center', justifyContent: 'center' },
  ctaButtonDisabled: { opacity: 0.5 },	
  ctaText: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.white, letterSpacing: 0.2 },
  ctaTextDisabled: { color: colors.text.muted },
  typeInstead: { alignItems: 'center', paddingVertical: spacing.sm },
  typeInsteadText: { fontSize: typography.sizes.xs, color: colors.text.muted },
});

