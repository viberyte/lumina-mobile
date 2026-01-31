import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';
import ItineraryCard from '../components/ItineraryCard';

export default function ItineraryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const itineraryRef = useRef(null);

  const venues = params.venues ? JSON.parse(params.venues as string) : [];
  const flow = params.flow ? JSON.parse(params.flow as string) : {};
  const city = params.city as string || 'Manhattan';

  const captureAndShare = async () => {
    try {
      
      const uri = await captureRef(itineraryRef, {
        format: 'png',
        quality: 1,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your night',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Could not share itinerary');
    }
  };

  const saveToPhotos = async () => {
    try {
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save to photos');
        return;
      }

      const uri = await captureRef(itineraryRef, {
        format: 'png',
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'Your itinerary has been saved to Photos');
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Could not save to photos');
    }
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Night</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Scrollable Itinerary */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View ref={itineraryRef} collapsable={false}>
          <ItineraryCard venues={venues} flow={flow} city={city} />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={captureAndShare}>
          <Ionicons name="share-social" size={20} color={colors.white} />
          <Text style={styles.primaryButtonText}>Share to Instagram</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={saveToPhotos}>
          <Ionicons name="download" size={20} color={colors.white} />
          <Text style={styles.secondaryButtonText}>Save to Photos</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc[900],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.light,
    color: colors.white,
  },
  scrollContent: {
    paddingVertical: spacing.xl,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.zinc[900],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.violet[600],
    borderRadius: 30,
    paddingVertical: spacing.md + 2,
  },
  primaryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.medium,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 30,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    color: colors.white,
  },
});
