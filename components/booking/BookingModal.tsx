import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BookingModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  visible,
  event,
  onClose,
  onSuccess,
}) => {
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const ticketPrice = event?.ticket_price || 25;
  const conciergeFee = 2;
  const totalAmount = ticketPrice + conciergeFee;

  const handleBooking = async () => {
    if (!consentChecked) {
      Alert.alert('Consent Required', 'Please agree to the booking terms.');
      return;
    }

    setLoading(true);
    setLoadingStep('Processing payment...');

    try {
      // TODO: Get actual user ID from auth context
      const userId = 1;

      const response = await fetch('https://lumina.viberyte.com/api/booking/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          eventId: event.id,
          ticketPrice,
          conciergeFee,
          consentTimestamp: new Date().toISOString(),
          userIP: 'mobile-app',
        }),
      });

      const result = await response.json();

      setLoading(false);

      if (result.success) {
        Alert.alert(
          '✅ Booking Complete!',
          'Your ticket will be sent to your email within 15 minutes.',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                onSuccess();
              },
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Booking failed');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('❌ Booking Failed', error.message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Complete Booking</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Event Info */}
            <View style={styles.eventInfo}>
              <Text style={styles.eventName} numberOfLines={2}>
                {event?.name}
              </Text>
              <Text style={styles.eventVenue}>{event?.venue_name}</Text>
              <Text style={styles.eventDate}>{event?.date}</Text>
            </View>

            {/* How it Works */}
            <View style={styles.howItWorks}>
              <Text style={styles.howItWorksTitle}>How Lumina Booking Works:</Text>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>We securely charge your card (${totalAmount} total)</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>We instantly purchase your ticket</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Ticket sent to your email within 15 minutes</Text>
              </View>
            </View>

            {/* Price Breakdown */}
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Event Ticket</Text>
                <Text style={styles.priceValue}>${ticketPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Lumina Concierge Fee</Text>
                <Text style={styles.priceValue}>${conciergeFee.toFixed(2)}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitText}>
                  ✓ Instant booking  ✓ Calendar sync  ✓ Easy refunds
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Total Charge</Text>
                <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
              </View>
            </View>

            {/* Consent Checkbox */}
            <TouchableOpacity
              style={styles.consentContainer}
              onPress={() => setConsentChecked(!consentChecked)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
                {consentChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                I authorize Lumina to charge my card for ${totalAmount.toFixed(2)} and purchase
                this ticket on my behalf. I understand Lumina will handle the booking and email
                my ticket within 15 minutes.
              </Text>
            </TouchableOpacity>

            {/* Book Button */}
            <TouchableOpacity
              style={[styles.bookButton, !consentChecked && styles.bookButtonDisabled]}
              disabled={!consentChecked || loading}
              onPress={handleBooking}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={consentChecked ? ['#8B5CF6', '#EC4899'] : ['#4B5563', '#374151']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.buttonText}>{loadingStep}</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Complete Booking - ${totalAmount.toFixed(2)}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Fine Print */}
            <Text style={styles.finePrint}>
              Secure payment powered by Stripe. Questions? support@lumina.viberyte.com
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 32,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  eventInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 24,
  },
  eventVenue: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  howItWorks: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  howItWorksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  priceBreakdown: {
    backgroundColor: '#262626',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  priceValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  benefitRow: {
    marginTop: 4,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4B5563',
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  bookButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bookButtonDisabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  finePrint: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
