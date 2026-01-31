import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../../theme';
import luminaApi from '../../../services/luminaApi';

interface Event {
  id: number;
  title: string;
  name?: string;
  genre?: string;
  image_url?: string;
  date?: string;
  venue_name?: string;
  price?: string;
}

const SUBCATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Afrobeats', value: 'afrobeats' },
  { label: 'Hip-Hop', value: 'hip-hop' },
  { label: 'Latin', value: 'latin' },
  { label: 'EDM', value: 'edm' },
  { label: 'R&B', value: 'rnb' },
  { label: 'Reggae', value: 'reggae' },
  { label: 'House', value: 'house' },
  { label: 'Live Music', value: 'live' },
  { label: 'Jazz', value: 'jazz' },
];

export default function EventsSeeMore() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const category = params.category as string;
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await luminaApi.getEvents('New York');
      const now = new Date();
      const futureEvents = data.filter((e: Event) => !e.date || new Date(e.date) >= now);
      
      // Filter by main category
      let filtered = futureEvents;
      
      switch(category) {
        case 'this-weekend':
          filtered = futureEvents.filter((e: Event) => {
            if (!e.date) return false;
            const eventDate = new Date(e.date);
            const day = now.getDay();
            const daysToFriday = (5 - day + 7) % 7;
            const friday = new Date(now);
            friday.setDate(now.getDate() + daysToFriday);
            const sunday = new Date(friday);
            sunday.setDate(friday.getDate() + 2);
            return eventDate >= friday && eventDate <= sunday;
          });
          break;
        case 'tonight':
          filtered = futureEvents.filter((e: Event) => {
            if (!e.date) return false;
            const eventDate = new Date(e.date);
            return eventDate.toDateString() === now.toDateString();
          });
          break;
        case 'this-week':
          filtered = futureEvents.filter((e: Event) => {
            if (!e.date) return false;
            const eventDate = new Date(e.date);
            const weekEnd = new Date(now);
            weekEnd.setDate(now.getDate() + 7);
            return eventDate >= now && eventDate <= weekEnd;
          });
          break;
        case 'live-music':
          filtered = futureEvents.filter(e => 
            e.genre?.toLowerCase().includes('live') ||
            e.genre?.toLowerCase().includes('jazz') ||
            e.genre?.toLowerCase().includes('rock')
          );
          break;
        case 'brunch':
          filtered = futureEvents.filter(e => 
            e.genre?.toLowerCase().includes('brunch') ||
            e.genre?.toLowerCase().includes('day party')
          );
          break;
        case 'vip':
          filtered = futureEvents.filter(e => 
            e.title?.toLowerCase().includes('vip') ||
            e.title?.toLowerCase().includes('table')
          );
          break;
      }

      setEvents(filtered);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = selectedSubcategory === 'all' 
    ? events 
    : events.filter(e => {
        const genre = e.genre?.toLowerCase() || '';
        const title = e.title?.toLowerCase() || '';
        return genre.includes(selectedSubcategory) || title.includes(selectedSubcategory);
      });

  const getCategoryTitle = () => {
    switch(category) {
      case 'this-weekend': return 'This Weekend';
      case 'tonight': return 'Tonight';
      case 'this-week': return 'This Week';
      case 'live-music': return 'Live Music';
      case 'brunch': return 'Brunch & Day Parties';
      case 'vip': return 'VIP Tables Available';
      default: return 'Events';
    }
  };

  const renderEventCard = (event: Event) => (
    <TouchableOpacity
      key={event.id}
      style={styles.card}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <Image
        source={{ uri: event.image_url || 'https://via.placeholder.com/400' }}
        style={styles.cardImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.cardGradient}
      />
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {event.title || event.name}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {event.venue_name || event.genre}
        </Text>
        
        {event.date && (
          <View style={styles.dateBadge}>
            <Ionicons name="calendar" size={12} color={colors.orange[400]} />
            <Text style={styles.dateText}>
              {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getCategoryTitle()}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Subcategory Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {SUBCATEGORIES.map((sub) => (
          <TouchableOpacity
            key={sub.value}
            style={[
              styles.filterChip,
              selectedSubcategory === sub.value && styles.filterChipActive
            ]}
            onPress={() => setSelectedSubcategory(sub.value)}
          >
            <Text style={[
              styles.filterChipText,
              selectedSubcategory === sub.value && styles.filterChipTextActive
            ]}>
              {sub.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
      </Text>

      {/* Grid */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.map(renderEventCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.zinc[950],
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.zinc[950],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    backgroundColor: colors.zinc[950],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.white,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.zinc[900],
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  filterChipActive: {
    backgroundColor: colors.violet[600],
    borderColor: colors.violet[500],
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  filterChipTextActive: {
    color: colors.white,
  },
  resultsCount: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[500],
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[400],
    marginBottom: spacing.xs,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.zinc[900] + '90',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.white,
  },
});
