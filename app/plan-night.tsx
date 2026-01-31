import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API_BASE } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NightStop {
  id: number;
  name: string;
  image: string;
  neighborhood?: string;
  category?: string;
  time?: string;
  reason?: string;
}

export default function PlanNightScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const startVenueId = params.startVenueId as string;
  const startVenueName = params.startVenueName as string;
  const startVenueImage = params.startVenueImage as string;
  const neighborhood = params.neighborhood as string;

  const [loading, setLoading] = useState(true);
  const [nightPlan, setNightPlan] = useState<NightStop[]>([]);
  const [suggestions, setSuggestions] = useState<NightStop[]>([]);

  useEffect(() => {
    if (startVenueId) {
      initializePlan();
      fetchSuggestions();
    }
  }, [startVenueId]);

  const initializePlan = () => {
    // Start with the selected venue
    setNightPlan([{
      id: Number(startVenueId),
      name: startVenueName || 'Starting Point',
      image: startVenueImage || '',
      neighborhood: neighborhood,
      time: '8:00 PM',
      reason: 'Your starting point'
    }]);
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      // Fetch nearby venues for suggestions
      const response = await fetch(
        `${API_BASE}/api/venues?neighborhood=${encodeURIComponent(neighborhood || '')}&limit=10`
      );
      const data = await response.json();
      
      if (data.venues && Array.isArray(data.venues)) {
        const filtered = data.venues
          .filter((v: any) => v.id !== Number(startVenueId))
          .slice(0, 6)
          .map((v: any) => ({
            id: v.id,
            name: v.name,
            image: v.professional_photo_url || v.image_url || '',
            neighborhood: v.neighborhood,
            category: v.category || v.subcategory,
            reason: getCategoryReason(v.category || v.subcategory)
          }));
        setSuggestions(filtered);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryReason = (category?: string): string => {
    if (!category) return 'Great next stop';
    const lower = category.toLowerCase();
    if (lower.includes('bar') || lower.includes('lounge')) return 'Perfect for drinks after';
    if (lower.includes('club')) return 'Keep the night going';
    if (lower.includes('restaurant')) return 'Grab a bite';
    if (lower.includes('rooftop')) return 'Amazing views';
    return 'Nearby hotspot';
  };

  const getTimeForStop = (index: number): string => {
    const baseHour = 20; // 8 PM
    const hour = baseHour + (index * 2);
    if (hour >= 24) {
      return `${hour - 24}:00 AM`;
    }
    return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const addToNight = (venue: NightStop) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newStop = {
      ...venue,
      time: getTimeForStop(nightPlan.length)
    };
    setNightPlan([...nightPlan, newStop]);
    setSuggestions(suggestions.filter(s => s.id !== venue.id));
  };

  const removeFromNight = (venueId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (venueId === Number(startVenueId)) return; // Can't remove starting point
    const removed = nightPlan.find(s => s.id === venueId);
    setNightPlan(nightPlan.filter(s => s.id !== venueId));
    if (removed) {
      setSuggestions([...suggestions, removed]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Your Night</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Your Night Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR NIGHT</Text>
          <View style={styles.timeline}>
            {nightPlan.map((stop, index) => (
              <View key={stop.id} style={styles.timelineItem}>
                {/* Time indicator */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{stop.time}</Text>
                  {index < nightPlan.length - 1 && <View style={styles.timeLine} />}
                </View>
                
                {/* Venue card */}
                <View style={styles.stopCard}>
                  {stop.image ? (
                    <Image source={{ uri: stop.image }} style={styles.stopImage} />
                  ) : (
                    <View style={[styles.stopImage, styles.stopImagePlaceholder]}>
                      <Ionicons name="location" size={24} color="#71717a" />
                    </View>
                  )}
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
                    <Text style={styles.stopReason}>{stop.reason}</Text>
                  </View>
                  {index > 0 && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeFromNight(stop.id)}
                    >
                      <Ionicons name="close-circle" size={24} color="#f43f5e" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Add More Stops */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADD TO YOUR NIGHT</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 20 }} />
          ) : suggestions.length > 0 ? (
            <View style={styles.suggestionsGrid}>
              {suggestions.map((venue) => (
                <TouchableOpacity 
                  key={venue.id} 
                  style={styles.suggestionCard}
                  onPress={() => addToNight(venue)}
                  activeOpacity={0.8}
                >
                  {venue.image ? (
                    <Image source={{ uri: venue.image }} style={styles.suggestionImage} />
                  ) : (
                    <View style={[styles.suggestionImage, styles.stopImagePlaceholder]}>
                      <Ionicons name="location" size={20} color="#71717a" />
                    </View>
                  )}
                  <View style={styles.suggestionOverlay}>
                    <Text style={styles.suggestionName} numberOfLines={1}>{venue.name}</Text>
                    <Text style={styles.suggestionReason} numberOfLines={1}>{venue.reason}</Text>
                  </View>
                  <View style={styles.addBadge}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={32} color="#71717a" />
              <Text style={styles.emptyText}>No more suggestions nearby</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {nightPlan.length > 1 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Save the plan and go back
              router.back();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.confirmButtonText}>
              Save Night ({nightPlan.length} stops)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  
  scrollView: { flex: 1 },
  
  section: { paddingHorizontal: 16, marginBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#71717a', letterSpacing: 1, marginBottom: 16 },
  
  // Timeline
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: 16 },
  timeColumn: { width: 60, alignItems: 'center' },
  timeText: { fontSize: 13, fontWeight: '600', color: '#8B5CF6' },
  timeLine: { width: 2, flex: 1, backgroundColor: '#27272a', marginTop: 8, marginBottom: -8, minHeight: 40 },
  
  stopCard: { flex: 1, flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 16, padding: 12, marginBottom: 16, alignItems: 'center', gap: 12 },
  stopImage: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#27272a' },
  stopImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  stopReason: { fontSize: 13, color: '#71717a', marginTop: 2 },
  removeButton: { padding: 4 },
  
  // Suggestions
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  suggestionCard: { 
    width: (SCREEN_WIDTH - 32 - 12) / 2, 
    height: 140, 
    borderRadius: 16, 
    overflow: 'hidden',
    position: 'relative'
  },
  suggestionImage: { width: '100%', height: '100%', backgroundColor: '#27272a' },
  suggestionOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.7)'
  },
  suggestionName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  suggestionReason: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
  addBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: '#71717a' },
  
  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#09090b', borderTopWidth: 1, borderTopColor: '#27272a' },
  confirmButton: { 
    backgroundColor: '#7C3AED', 
    paddingVertical: 16, 
    borderRadius: 16, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
