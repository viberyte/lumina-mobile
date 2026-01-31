import React, { useState, useCallback } from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

interface TripVenue {
  venueId: number;
  venueName: string;
  venueImage: string;
  neighborhood?: string;
  addedAt: string;
}

interface Trip {
  id: string;
  name: string;
  date: string | null;
  venues: TripVenue[];
  createdAt: string;
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [userId, setUserId] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      initUser();
      loadTrip();
    }, [])
  );

  const initUser = async () => {
    let uid = await AsyncStorage.getItem('lumina_user_id');
    if (!uid) {
      uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('lumina_user_id', uid);
    }
    setUserId(uid);
  };

  const loadTrip = async () => {
    try {
      const { data, error } = await supabase
        .from('lumina_trips')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading trip:', error);
        return;
      }

      if (data) {
        setTrip({
          id: data.id,
          name: data.name,
          date: data.date,
          venues: data.venues || [],
          createdAt: data.created_at,
        });
      }
    } catch (error) {
      console.error('Error loading trip:', error);
    }
  };

  const removeVenue = async (venueId: number) => {
    if (!trip) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Remove Venue',
      'Remove this venue from your plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedVenues = trip.venues.filter(v => v.venueId !== venueId);

              const { error } = await supabase
                .from('lumina_trips')
                .update({ venues: updatedVenues })
                .eq('id', trip.id)
                .eq('user_id', userId);

              if (error) {
                console.error('Error removing venue:', error);
                Alert.alert('Error', 'Failed to remove venue');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadTrip();
            } catch (error) {
              console.error('Error removing venue:', error);
              Alert.alert('Error', 'Failed to remove venue');
            }
          },
        },
      ]
    );
  };

  const shareTrip = async () => {
    if (!trip) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const shareUrl = `https://lumina.viberyte.com/trip/${trip.id}`;
      const venueCount = trip.venues.length;
      const venueText = venueCount === 1 ? '1 place' : `${venueCount} places`;
      
      await Share.share({
        message: `Check out my ${trip.name} plan on Lumina - ${venueText}!\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing trip:', error);
    }
  };

  if (!trip) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const heroImage = trip.venues[0]?.venueImage;

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        {heroImage ? (
          <Image source={{ uri: heroImage?.startsWith("/") ? `https://lumina.viberyte.com${heroImage}` : heroImage }} style={styles.heroImage} />
        ) : (
          <LinearGradient
            colors={['#18181b', '#27272a']}
            style={styles.heroImage}
          />
        )}
        
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{trip.name}</Text>
            <Text style={styles.heroSubtitle}>
              {trip.venues.length} {trip.venues.length === 1 ? 'place' : 'places'}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Venues */}
      <ScrollView style={styles.content}>
        {trip.venues.map((venue, index) => (
          <TouchableOpacity
            key={venue.venueId}
            style={styles.venueCard}
            onPress={() => router.push(`/venue/${venue.venueId}`)}
            activeOpacity={0.7}
          >
            <View style={styles.venueNumber}>
              <Text style={styles.venueNumberText}>{index + 1}</Text>
            </View>

            <Image
              source={{ uri: venue.venueImage?.startsWith("/") ? `https://lumina.viberyte.com${venue.venueImage}` : venue.venueImage }}
              style={styles.venueImage}
            />

            <View style={styles.venueInfo}>
              <Text style={styles.venueName}>{venue.venueName}</Text>
              {venue.neighborhood && (
                <Text style={styles.venueNeighborhood}>{venue.neighborhood}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={(e) => {
                e.stopPropagation();
                removeVenue(venue.venueId);
              }}
            >
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.addMoreButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#a855f7" />
          <Text style={styles.addMoreText}>Add More Places</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Share Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.shareButton} onPress={shareTrip}>
          <Ionicons name="share-outline" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>Share My {trip.name}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  hero: { height: 250, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  backButton: { position: 'absolute', left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 20 },
  heroContent: {},
  heroTitle: { fontSize: 32, fontWeight: '700', color: '#fff', marginBottom: 4 },
  heroSubtitle: { fontSize: 16, color: '#d1d5db' },
  content: { flex: 1, padding: 20 },
  venueCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#27272a' },
  venueNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  venueNumberText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  venueImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  venueInfo: { flex: 1 },
  venueName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  venueNeighborhood: { fontSize: 14, color: '#9ca3af' },
  removeButton: { padding: 8 },
  addMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1, borderColor: '#3f3f46', borderStyle: 'dashed', gap: 8 },
  addMoreText: { fontSize: 16, fontWeight: '600', color: '#a855f7' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#27272a' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#a855f7', paddingVertical: 16, borderRadius: 12, gap: 8 },
  shareButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  header: { padding: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#9ca3af' },
});
