import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../../theme';

const API_BASE = 'https://lumina.viberyte.com';

interface ChipData {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

const PRIMARY_CHOICES: ChipData[] = [
  { id: 'dinner', label: 'Dinner', value: 'dinner', icon: 'restaurant-outline' },
  { id: 'drinks', label: 'Drinks', value: 'drinks', icon: 'wine-outline' },
  { id: 'nightlife', label: 'Nightlife', value: 'nightlife', icon: 'moon-outline' },
  { id: 'events', label: 'Events', value: 'events', icon: 'ticket-outline' },
];

const OCCASIONS: ChipData[] = [
  { id: 'date', label: 'Date Night', value: 'date', icon: 'heart-outline' },
  { id: 'friends', label: 'Friends', value: 'friends', icon: 'people-outline' },
  { id: 'solo', label: 'Solo', value: 'solo', icon: 'person-outline' },
  { id: 'business', label: 'Business', value: 'business', icon: 'briefcase-outline' },
];

const CUISINES: ChipData[] = [
  { id: 'sushi', label: 'Sushi', value: 'japanese' },
  { id: 'italian', label: 'Italian', value: 'italian' },
  { id: 'mexican', label: 'Mexican', value: 'mexican' },
  { id: 'steakhouse', label: 'Steakhouse', value: 'steakhouse' },
  { id: 'soulfood', label: 'Soul Food', value: 'soul food' },
  { id: 'seafood', label: 'Seafood', value: 'seafood' },
];

const VENUE_TYPES: ChipData[] = [
  { id: 'clubs', label: 'Clubs', value: 'club' },
  { id: 'lounges', label: 'Lounges', value: 'lounge' },
  { id: 'rooftops', label: 'Rooftops', value: 'rooftop' },
  { id: 'bars', label: 'Bars', value: 'bar' },
];

const DRINK_VIBES: ChipData[] = [
  { id: 'cocktails', label: 'Cocktails', value: 'cocktails' },
  { id: 'wine', label: 'Wine Bar', value: 'wine' },
  { id: 'rooftop', label: 'Rooftop', value: 'rooftop' },
  { id: 'speakeasy', label: 'Speakeasy', value: 'speakeasy' },
];

const MUSIC_PREFERENCES: ChipData[] = [
  { id: 'hiphop', label: 'Hip-Hop / R&B', value: 'hip-hop', icon: 'musical-notes-outline' },
  { id: 'house', label: 'House', value: 'house', icon: 'radio-outline' },
  { id: 'afrobeats', label: 'Afrobeats', value: 'afrobeats', icon: 'globe-outline' },
  { id: 'latin', label: 'Latin', value: 'latin', icon: 'flame-outline' },
  { id: 'live', label: 'Live / Jazz', value: 'live', icon: 'mic-outline' },
];

const MOODS: ChipData[] = [
  { id: 'chill', label: 'Chill', value: 'chill' },
  { id: 'social', label: 'Social', value: 'social' },
  { id: 'turnup', label: 'Turn Up', value: 'turnup' },
];

const getDateOptions = (): ChipData[] => {
  const options: ChipData[] = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i <= 4; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const isoDate = date.toISOString().split('T')[0];
    
    let label = '';
    if (i === 0) label = 'Tonight';
    else if (i === 1) label = 'Tomorrow';
    else label = days[date.getDay()];
    
    options.push({ id: `day${i}`, label, value: isoDate });
  }
  return options;
};

const TIME_SLOTS: ChipData[] = [
  { id: 'early', label: '6-7 PM', value: '6:00 PM' },
  { id: 'prime', label: '8-9 PM', value: '8:00 PM' },
  { id: 'late', label: '10+ PM', value: '10:00 PM' },
];

const DURATION_OPTIONS: ChipData[] = [
  { id: 'quick', label: '2-3 hrs', value: '2' },
  { id: 'full', label: '4-5 hrs', value: '3' },
  { id: 'allnight', label: 'All Night', value: '4' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ChatScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userCity] = useState('Manhattan');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getDateOptions()[0]?.value || '');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);

  const dateOptions = getDateOptions();
  const showMusicSection = selectedPrimary === 'drinks' || selectedPrimary === 'nightlife';

  const canProceedStep1 = selectedPrimary && selectedOccasion;
  const canSubmit = selectedDate && selectedTime;

  const maxStops = selectedDuration ? parseInt(selectedDuration) : 2;

  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleChipPress = (setter: (v: any) => void, current: any, value: any, feedbackMsg?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = current === value ? null : value;
    setter(newValue);
    if (newValue && feedbackMsg) showFeedback(feedbackMsg);
  };

  const goToStep = (step: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(step);
  };

  const getCTAText = (): string => {
    if (selectedOccasion === 'date') return 'Plan Date Night';
    if (selectedPrimary === 'nightlife') return 'Build The Night';
    if (selectedPrimary === 'dinner') return 'Find My Table';
    if (selectedPrimary === 'drinks') return 'Find My Spot';
    return `Plan ${maxStops} Stops`;
  };

  const getPreviewText = (): string => {
    const parts: string[] = [];
    const dateLabel = dateOptions.find(d => d.value === selectedDate)?.label || '';
    parts.push(dateLabel);
    parts.push(userCity);
    if (selectedOccasion) parts.push(OCCASIONS.find(o => o.value === selectedOccasion)?.label || '');
    if (selectedMusic) parts.push(MUSIC_PREFERENCES.find(m => m.value === selectedMusic)?.label || '');
    return parts.filter(Boolean).join(' · ');
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);

    const message = buildMessage();

    try {
      const requestBody = {
        message,
        city: userCity,
        sessionContext: {
          primaryChoice: selectedPrimary || 'dinner',
          cuisine: selectedPrimary === 'dinner' ? selectedSecondary : null,
          occasion: selectedOccasion,
          mood: selectedMood,
          musicPreference: selectedMusic,
          venueType: selectedPrimary === 'nightlife' ? selectedSecondary : null,
          date: selectedDate,
          startTime: selectedTime,
          maxStops,
        },
      };

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.multiStop) {
       router.push({
  pathname: '/plan',
  params: {
    stops: JSON.stringify(data.timeline || []),
    meta: JSON.stringify({
      stopTimes: data.timeline?.map((t: any) => t.time) || [],
      occasion: selectedOccasion,
      music: selectedMusic,
    }),
    occasion: selectedOccasion || 'friends',
  },
});

      }
    } catch (error) {
      console.error('Error:', error);
      showFeedback('Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const buildMessage = (): string => {
    const parts: string[] = [];
    
    if (selectedPrimary === 'dinner' && selectedSecondary) {
      parts.push(CUISINES.find(c => c.value === selectedSecondary)?.label + ' dinner');
    } else if (selectedPrimary === 'drinks' && selectedSecondary) {
      parts.push(DRINK_VIBES.find(c => c.value === selectedSecondary)?.label || 'Drinks');
    } else if (selectedPrimary === 'nightlife' && selectedSecondary) {
      parts.push(VENUE_TYPES.find(v => v.value === selectedSecondary)?.label || 'Nightlife');
    } else if (selectedPrimary) {
      parts.push(PRIMARY_CHOICES.find(p => p.value === selectedPrimary)?.label || '');
    }

    if (selectedMusic) parts.push(MUSIC_PREFERENCES.find(m => m.value === selectedMusic)?.label + ' music');
    if (selectedOccasion) parts.push('for ' + OCCASIONS.find(o => o.value === selectedOccasion)?.label?.toLowerCase());

    return parts.length > 0 ? parts.join(', ') : 'Plan my night';
  };

  const renderChip = (chip: ChipData, isSelected: boolean, onPress: () => void, large?: boolean) => (
    <AnimatedTouchable 
      key={chip.id} 
      onPress={onPress} 
      activeOpacity={0.7} 
      style={[styles.chip, large && styles.chipLarge, isSelected && styles.chipSelected]}
      layout={Layout.springify()}
    >
      {chip.icon && (
        <Ionicons 
          name={chip.icon as any} 
          size={large ? 20 : 16} 
          color={isSelected ? colors.white : colors.text.secondary} 
          style={{ marginRight: 8 }} 
        />
      )}
      <Text style={[styles.chipText, large && styles.chipTextLarge, isSelected && styles.chipTextSelected]}>
        {chip.label}
      </Text>
    </AnimatedTouchable>
  );

  const renderStep1 = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What kind of night?</Text>
      <Text style={styles.stepSubtitle}>Let's start with the basics</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>I'M IN THE MOOD FOR</Text>
        <View style={styles.chipsGrid}>
          {PRIMARY_CHOICES.map(chip => renderChip(
            chip, 
            selectedPrimary === chip.value, 
            () => handleChipPress(setSelectedPrimary, selectedPrimary, chip.value, 'Great choice'),
            true
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>WHO'S IT FOR?</Text>
        <View style={styles.chipsGrid}>
          {OCCASIONS.map(chip => renderChip(
            chip, 
            selectedOccasion === chip.value, 
            () => handleChipPress(setSelectedOccasion, selectedOccasion, chip.value),
            true
          ))}
        </View>
      </View>

      {feedback && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </Animated.View>
      )}

      <View style={styles.stepCta}>
        <TouchableOpacity onPress={() => goToStep(2)} disabled={!canProceedStep1} activeOpacity={0.8}>
          <LinearGradient
            colors={canProceedStep1 ? [colors.amethyst.primary, colors.amethyst.deep] : ['#2a2a2a', '#2a2a2a']}
            style={[styles.ctaButton, !canProceedStep1 && styles.ctaButtonDisabled]}
          >
            <Text style={[styles.ctaText, !canProceedStep1 && styles.ctaTextDisabled]}>Set the Vibe</Text>
            <Ionicons name="arrow-forward" size={20} color={canProceedStep1 ? colors.white : '#666'} style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.stepContainer}>
      <TouchableOpacity onPress={() => goToStep(1)} style={styles.backButton}>
        <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Set the vibe</Text>
      <Text style={styles.stepSubtitle}>
        {selectedOccasion === 'date' ? 'Make it memorable' : 'Let\'s make it perfect'}
      </Text>

      {selectedPrimary === 'dinner' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CUISINE</Text>
          <View style={styles.chipsRow}>
            {CUISINES.map(chip => renderChip(chip, selectedSecondary === chip.value, () => handleChipPress(setSelectedSecondary, selectedSecondary, chip.value)))}
          </View>
        </View>
      )}

      {selectedPrimary === 'drinks' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VIBE</Text>
          <View style={styles.chipsRow}>
            {DRINK_VIBES.map(chip => renderChip(chip, selectedSecondary === chip.value, () => handleChipPress(setSelectedSecondary, selectedSecondary, chip.value)))}
          </View>
        </View>
      )}

      {selectedPrimary === 'nightlife' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VENUE TYPE</Text>
          <View style={styles.chipsRow}>
            {VENUE_TYPES.map(chip => renderChip(chip, selectedSecondary === chip.value, () => handleChipPress(setSelectedSecondary, selectedSecondary, chip.value)))}
          </View>
        </View>
      )}

      {showMusicSection && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MUSIC</Text>
          <View style={styles.chipsRow}>
            {MUSIC_PREFERENCES.map(chip => renderChip(chip, selectedMusic === chip.value, () => handleChipPress(setSelectedMusic, selectedMusic, chip.value, 'Great taste')))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ENERGY</Text>
        <View style={styles.chipsRow}>
          {MOODS.map(chip => renderChip(chip, selectedMood === chip.value, () => handleChipPress(setSelectedMood, selectedMood, chip.value)))}
        </View>
      </View>

      {feedback && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </Animated.View>
      )}

      <View style={styles.stepCta}>
        <TouchableOpacity onPress={() => goToStep(3)} activeOpacity={0.8}>
          <LinearGradient colors={[colors.amethyst.primary, colors.amethyst.deep]} style={styles.ctaButton}>
            <Text style={styles.ctaText}>Lock in Timing</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.stepContainer}>
      <TouchableOpacity onPress={() => goToStep(2)} style={styles.backButton}>
        <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>When's the move?</Text>
      <Text style={styles.stepSubtitle}>Almost there...</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DATE</Text>
        <View style={styles.chipsRow}>
          {dateOptions.map(chip => renderChip(chip, selectedDate === chip.value, () => handleChipPress(setSelectedDate, selectedDate, chip.value)))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>START TIME</Text>
        <View style={styles.chipsRow}>
          {TIME_SLOTS.map(chip => renderChip(chip, selectedTime === chip.value, () => handleChipPress(setSelectedTime, selectedTime, chip.value)))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>HOW LONG?</Text>
        <View style={styles.chipsRow}>
          {DURATION_OPTIONS.map(chip => renderChip(chip, selectedDuration === chip.value, () => handleChipPress(setSelectedDuration, selectedDuration, chip.value)))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Ionicons name="sparkles" size={16} color={colors.amethyst.primary} />
          <Text style={styles.previewTitle}>Your Night</Text>
        </View>
        <Text style={styles.previewText}>{getPreviewText()}</Text>
        <Text style={styles.previewStops}>{maxStops} stops planned</Text>
      </Animated.View>

      <View style={styles.stepCta}>
        <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit || isLoading} activeOpacity={0.8}>
          <LinearGradient
            colors={canSubmit ? [colors.amethyst.primary, colors.amethyst.deep] : ['#2a2a2a', '#2a2a2a']}
            style={[styles.ctaButtonFinal, !canSubmit && styles.ctaButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={canSubmit ? colors.white : '#666'} style={{ marginRight: 8 }} />
                <Text style={[styles.ctaTextFinal, !canSubmit && styles.ctaTextDisabled]}>{getCTAText()}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderProgress = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map(step => (
        <View 
          key={step} 
          style={[
            styles.progressDot, 
            currentStep >= step && styles.progressDotActive,
            currentStep === step && styles.progressDotCurrent
          ]} 
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={[colors.amethyst.primary, colors.amethyst.deep]} style={styles.headerIcon}>
            <Ionicons name="sparkles" size={20} color={colors.white} />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Lumina</Text>
            <Text style={styles.headerSubtitle}>{userCity}</Text>
          </View>
        </View>
        {renderProgress()}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: '600', color: '#fff' },
  headerSubtitle: { fontSize: typography.sizes.xs, color: '#888' },
  
  progressContainer: { flexDirection: 'row', gap: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2a2a' },
  progressDotActive: { backgroundColor: colors.amethyst.primary },
  progressDotCurrent: { width: 24 },
  
  content: { flex: 1, backgroundColor: '#0a0a0a' },
  contentContainer: { paddingBottom: 40, backgroundColor: '#0a0a0a' },
  
  stepContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, backgroundColor: '#0a0a0a' },
  stepTitle: { fontSize: 32, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  stepSubtitle: { fontSize: typography.sizes.md, color: '#888', marginTop: spacing.xs, marginBottom: spacing.xl },
  
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  backText: { fontSize: typography.sizes.sm, color: '#888', marginLeft: spacing.xs },
  
  section: { marginBottom: spacing.xl },
  sectionLabel: { 
    fontSize: 10, 
    fontWeight: '600', 
    color: '#555', 
    letterSpacing: 1.5, 
    marginBottom: spacing.sm,
  },
  
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderRadius: 100, 
    backgroundColor: '#1a1a1a',
  },
  chipLarge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  chipSelected: { 
    backgroundColor: colors.amethyst.primary,
  },
  chipText: { fontSize: typography.sizes.sm, fontWeight: '500', color: '#999' },
  chipTextLarge: { fontSize: typography.sizes.md },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  
  feedbackContainer: { 
    backgroundColor: 'rgba(139, 92, 246, 0.15)', 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderRadius: 12,
    marginTop: spacing.md,
  },
  feedbackText: { color: colors.amethyst.primary, fontSize: typography.sizes.sm, fontWeight: '500', textAlign: 'center' },
  
  previewCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  previewTitle: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.amethyst.primary, marginLeft: spacing.xs },
  previewText: { fontSize: typography.sizes.md, color: '#fff', fontWeight: '500' },
  previewStops: { fontSize: typography.sizes.sm, color: '#888', marginTop: spacing.xs },
  
  stepCta: { marginTop: spacing.xl, paddingBottom: spacing.xl },
  ctaButton: { 
    flexDirection: 'row', 
    borderRadius: 14, 
    paddingVertical: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  ctaButtonFinal: { 
    flexDirection: 'row', 
    borderRadius: 16, 
    paddingVertical: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaText: { fontSize: typography.sizes.md, fontWeight: '600', color: '#fff' },
  ctaTextFinal: { fontSize: 18, fontWeight: '700', color: '#fff' },
  ctaTextDisabled: { color: '#666' },
});
