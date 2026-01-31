import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme';
import { useToast } from '../../contexts/ToastContext';

const API_URL = 'https://lumina.viberyte.com';

interface Package {
  id: string;
  name: string;
  description?: string;
  bottleCount?: number;
  price: number;
  maxGuests?: number;
}

export default function NewBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  // Parse params
  const eventId = params.event_id as string;
  const eventTitle = params.event_title as string;
  const venueName = params.venue_name as string;
  const partnerId = params.partner_id as string;
  const venueId = params.venue_id as string;
  
  const packages: Package[] = useMemo(() => {
    try {
      return JSON.parse(params.packages as string) || [];
    } catch {
      return [];
    }
  }, [params.packages]);

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectPackage = (pkg: Package) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPackage(pkg);
    // Auto-set party size to package max if current is higher
    if (pkg.maxGuests && partySize > pkg.maxGuests) {
      setPartySize(pkg.maxGuests);
    }
  };

  const handlePartySize = (delta: number) => {
    const newSize = partySize + delta;
    const maxGuests = selectedPackage?.maxGuests || 20;
    if (newSize >= 1 && newSize <= maxGuests) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPartySize(newSize);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPackage) {
      showToast('Please select a package', 'error');
      return;
    }

    if (!partnerId) {
      showToast('Booking not available for this event', 'error');
      return;
    }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get user token
      const token = await AsyncStorage.getItem('@lumina_token');
      
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          eventId: eventId ? parseInt(eventId) : null,
          venueId: venueId ? parseInt(venueId) : null,
          partnerId: parseInt(partnerId),
          sectionName: selectedPackage.name,
          sectionMinSpend: selectedPackage.price,
          bottles: [{
            name: selectedPackage.name,
            price: selectedPackage.price,
            quantity: 1,
          }],
          partySize,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.requiresVerification) {
        showToast('Please verify your Instagram first', 'info');
        router.push('/verify/instagram');
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Booking failed');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Booking request sent!', 'success');

      // Navigate to chat
      router.replace({
        pathname: '/booking/chat',
        params: {
          bookingId: String(data.booking.id),
          partner_id: partnerId,
          event_id: eventId,
          venue_name: venueName,
          confirmation_code: data.booking.confirmationCode,
        },
      });

    } catch (error: any) {
      console.error('Booking error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(error.message || 'Failed to submit booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Book a Table</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{eventTitle || venueName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Packages Section */}
          <Text style={styles.sectionTitle}>Select Package</Text>
          <View style={styles.packagesGrid}>
            {packages.map((pkg, index) => {
              const isSelected = selectedPackage?.id === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id || index}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => handleSelectPackage(pkg)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.violet[400]} />
                    </View>
                  )}
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePrice}>${pkg.price}</Text>
                  {pkg.description && (
                    <Text style={styles.packageDesc}>{pkg.description}</Text>
                  )}
                  <View style={styles.packageMeta}>
                    {pkg.bottleCount && (
                      <View style={styles.metaItem}>
                        <Ionicons name="wine" size={14} color={colors.zinc[400]} />
                        <Text style={styles.metaText}>{pkg.bottleCount} bottles</Text>
                      </View>
                    )}
                    {pkg.maxGuests && (
                      <View style={styles.metaItem}>
                        <Ionicons name="people" size={14} color={colors.zinc[400]} />
                        <Text style={styles.metaText}>Up to {pkg.maxGuests}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Party Size */}
          <Text style={styles.sectionTitle}>Party Size</Text>
          <View style={styles.partySizeRow}>
            <TouchableOpacity 
              style={[styles.partySizeBtn, partySize <= 1 && styles.partySizeBtnDisabled]}
              onPress={() => handlePartySize(-1)}
              disabled={partySize <= 1}
            >
              <Ionicons name="remove" size={24} color={partySize <= 1 ? colors.zinc[600] : '#fff'} />
            </TouchableOpacity>
            <View style={styles.partySizeValue}>
              <Text style={styles.partySizeNumber}>{partySize}</Text>
              <Text style={styles.partySizeLabel}>guests</Text>
            </View>
            <TouchableOpacity 
              style={[styles.partySizeBtn, partySize >= (selectedPackage?.maxGuests || 20) && styles.partySizeBtnDisabled]}
              onPress={() => handlePartySize(1)}
              disabled={partySize >= (selectedPackage?.maxGuests || 20)}
            >
              <Ionicons name="add" size={24} color={partySize >= (selectedPackage?.maxGuests || 20) ? colors.zinc[600] : '#fff'} />
            </TouchableOpacity>
          </View>
          {selectedPackage?.maxGuests && (
            <Text style={styles.maxGuestsHint}>
              Max {selectedPackage.maxGuests} guests for {selectedPackage.name}
            </Text>
          )}

          {/* Notes */}
          <Text style={styles.sectionTitle}>Special Requests (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Birthday celebration, specific table preference, etc."
            placeholderTextColor={colors.zinc[500]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            maxLength={500}
          />

          {/* Summary */}
          {selectedPackage && (
            <View style={styles.summaryCard}>
              <LinearGradient
                colors={[colors.violet[600] + '20', colors.violet[700] + '10']}
                style={styles.summaryGradient}
              >
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Package</Text>
                  <Text style={styles.summaryValue}>{selectedPackage.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Party Size</Text>
                  <Text style={styles.summaryValue}>{partySize} guests</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated Total</Text>
                  <Text style={styles.summaryTotal}>${selectedPackage.price}</Text>
                </View>
                <Text style={styles.summaryNote}>
                  Final pricing confirmed by promoter
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* How it works */}
          <View style={styles.howItWorks}>
            <Text style={styles.howItWorksTitle}>How it works</Text>
            <View style={styles.howItWorksStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>Submit your booking request</Text>
            </View>
            <View style={styles.howItWorksStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>Chat with the promoter to confirm details</Text>
            </View>
            <View style={styles.howItWorksStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepText}>Pay via Venmo, Zelle, or CashApp</Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, (!selectedPackage || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedPackage || submitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedPackage ? [colors.violet[600], colors.violet[700]] : [colors.zinc[700], colors.zinc[800]]}
            style={styles.submitGradient}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text style={styles.submitText}>Send Booking Request</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.zinc[900] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc[800],
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: colors.zinc[400], marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12, marginTop: 8 },
  // Packages
  packagesGrid: { gap: 12 },
  packageCard: {
    backgroundColor: colors.zinc[800],
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageCardSelected: {
    borderColor: colors.violet[500],
    backgroundColor: colors.violet[600] + '10',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  packageName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  packagePrice: { fontSize: 24, fontWeight: '800', color: colors.violet[400], marginBottom: 8 },
  packageDesc: { fontSize: 14, color: colors.zinc[400], marginBottom: 12 },
  packageMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: colors.zinc[400] },
  // Party Size
  partySizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
    backgroundColor: colors.zinc[800],
    borderRadius: 16,
  },
  partySizeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.zinc[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  partySizeBtnDisabled: {
    backgroundColor: colors.zinc[800],
  },
  partySizeValue: { alignItems: 'center' },
  partySizeNumber: { fontSize: 36, fontWeight: '800', color: '#fff' },
  partySizeLabel: { fontSize: 14, color: colors.zinc[400] },
  maxGuestsHint: {
    fontSize: 12,
    color: colors.zinc[500],
    textAlign: 'center',
    marginTop: 8,
  },
  // Notes
  notesInput: {
    backgroundColor: colors.zinc[800],
    borderRadius: 14,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Summary
  summaryCard: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  summaryGradient: { padding: 20 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14, color: colors.zinc[400] },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#fff' },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.zinc[700],
    marginVertical: 12,
  },
  summaryTotal: { fontSize: 20, fontWeight: '800', color: colors.violet[400] },
  summaryNote: {
    fontSize: 12,
    color: colors.zinc[500],
    textAlign: 'center',
    marginTop: 8,
  },
  // How it works
  howItWorks: {
    marginTop: 32,
    padding: 20,
    backgroundColor: colors.zinc[800] + '50',
    borderRadius: 16,
  },
  howItWorksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.zinc[400],
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  howItWorksStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.violet[600] + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: { fontSize: 14, fontWeight: '700', color: colors.violet[400] },
  stepText: { fontSize: 14, color: colors.zinc[300], flex: 1 },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.zinc[900],
    borderTopWidth: 1,
    borderTopColor: colors.zinc[800],
  },
  submitBtn: { borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
