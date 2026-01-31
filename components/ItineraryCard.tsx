import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ItineraryCardProps {
  venues: any[];
  flow: any;
  city: string;
}

export default function ItineraryCard({ venues, flow, city }: ItineraryCardProps) {
  // Generate times for itinerary
  const getTimeSlots = () => {
    const slots = [];
    let startHour = 19; // 7 PM
    
    venues.forEach((venue, idx) => {
      const hour = startHour + (idx * 2);
      const displayHour = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      slots.push(`${displayHour}:00 ${period}`);
    });
    
    return slots;
  };

  const times = getTimeSlots();

  return (
    <LinearGradient
      colors={['#050508', '#111119']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logo}>
            <Text style={styles.logoSparkle}>✨</Text>
          </View>
          <Text style={styles.logoText}>Lumina</Text>
        </View>
        <Text style={styles.headerTitle}>Your Night in {city}</Text>
        <Text style={styles.headerSubtitle}>
          {flow.who} • {flow.when}
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {venues.map((venue, idx) => (
          <View key={idx} style={styles.timelineItem}>
            {/* Time & Connector */}
            <View style={styles.timelineLeft}>
              <Text style={styles.time}>{times[idx]}</Text>
              {idx < venues.length - 1 && <View style={styles.connector} />}
            </View>

            {/* Venue Card */}
            <LinearGradient
              colors={['#FFFFFF', '#F4F4F4', '#E8E8E8']}
              style={styles.venueCard}
            >
              {venue.professional_photo_url && (
                <Image
                  source={{ uri: venue.professional_photo_url }}
                  style={styles.venueImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.venueContent}>
                <Text style={styles.venueName} numberOfLines={1}>
                  {venue.name}
                </Text>
                
                <View style={styles.venueRow}>
                  <Ionicons name="location" size={12} color="#52525B" />
                  <Text style={styles.venueAddress} numberOfLines={1}>
                    {venue.neighborhood || venue.address}
                  </Text>
                </View>

                {venue.cuisine_primary && (
                  <View style={styles.venueTag}>
                    <Text style={styles.venueTagText}>{venue.cuisine_primary}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Created with Lumina</Text>
        <Text style={styles.footerSubtext}>Your nightlife concierge</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    borderRadius: 24,
    padding: spacing.xl,
    alignSelf: 'center',
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.violet[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  logoSparkle: {
    fontSize: 16,
  },
  logoText: {
    fontSize: typography.sizes.xl,
    fontWeight: '300',
    color: colors.white,
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '300',
    color: colors.zinc[500],
  },
  timeline: {
    marginBottom: spacing.xl,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timelineLeft: {
    width: 80,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  time: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.violet[500],
    marginBottom: spacing.xs,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.zinc[800],
    marginTop: spacing.xs,
  },
  venueCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  venueImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.zinc[200],
  },
  venueContent: {
    padding: spacing.md,
  },
  venueName: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: '#000000',
    marginBottom: spacing.xs,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  venueAddress: {
    fontSize: typography.sizes.xs,
    color: '#52525B',
    flex: 1,
  },
  venueTag: {
    backgroundColor: colors.violet[600] + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  venueTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.violet[600],
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.zinc[900],
  },
  footerText: {
    fontSize: typography.sizes.sm,
    fontWeight: '300',
    color: colors.zinc[500],
  },
  footerSubtext: {
    fontSize: typography.sizes.xs,
    fontWeight: '300',
    color: colors.zinc[700],
  },
});
