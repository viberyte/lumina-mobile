import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, 
  Image, Dimensions, Animated, Platform, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import colors from '../../constants/colors';
import luminaApi from '../../services/lumina';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

const SUBCATEGORY_CONFIG: Record<string, { emoji: string; name: string; gradient: string[]; filters: string[] }> = {
  'afrobeats': { 
    emoji: '🎵', 
    name: 'Afrobeats Events', 
    gradient: ['#2D6A4F', '#40916C'],
    filters: ['afrobeats', 'afro', 'amapiano']
  },
  'latin': { 
    emoji: '🕺', 
    name: 'Latin Nights', 
    gradient: ['#E63946', '#F4A261'],
    filters: ['latin', 'reggaeton', 'salsa', 'bachata']
  },
  'edm': { 
    emoji: '🎧', 
    name: 'EDM & House', 
    gradient: ['#7209B7', '#3A0CA3'],
    filters: ['edm', 'house', 'techno', 'electronic', 'trance']
  },
  'hiphop': { 
    emoji: '🎤', 
    name: 'Hip-Hop Events', 
    gradient: ['#6D3A0A', '#A44A3F'],
    filters: ['hip-hop', 'hiphop', 'hip hop', 'rap', 'r&b']
  },
  'brunch': { 
    emoji: '🍾', 
    name: 'Brunch Parties', 
    gradient: ['#F9C74F', '#F8961E'],
    filters: ['brunch', 'day party', 'dayparty', 'bottomless']
  },
  'rnb': { 
    emoji: '🎷', 
    name: 'R&B & Soul', 
    gradient: ['#7B2CBF', '#9D4EDD'],
    filters: ['r&b', 'rnb', 'soul', 'neo-soul']
  },
  'live': { 
    emoji: '🎸', 
    name: 'Live Music', 
    gradient: ['#1D3557', '#457B9D'],
    filters: ['live', 'concert', 'band', 'acoustic']
  },
  'comedy': { 
    emoji: '🎭', 
    name: 'Comedy Shows', 
    gradient: ['#FF006E', '#FB5607'],
    filters: ['comedy', 'standup', 'stand-up', 'comedian']
  },
  'dayparty': { 
    emoji: '🪩', 
    name: 'Day Parties', 
    gradient: ['#3A86FF', '#8338EC'],
    filters: ['day party', 'dayparty', 'rooftop', 'pool party']
  },
  'trending': { 
    emoji: '🔥', 
    name: 'Trending Events', 
    gradient: ['#FF6B35', '#F7931A'],
    filters: []
  },
  'weekend': { 
    emoji: '📅', 
    name: 'This Weekend', 
    gradient: ['#9D4EDD', '#C77DFF'],
    filters: []
  },
  'tonight': { 
    emoji: '🌙', 
    name: 'Tonight', 
    gradient: ['#1D3557', '#457B9D'],
    filters: []
  },
  'popular': { 
    emoji: '📍', 
    name: 'Popular Near You', 
    gradient: ['#E63946', '#F4A261'],
    filters: []
  },
};

export default function EventsSubcategoryScreen() {
  const router = useRouter();
  const { subcategory } = useLocalSearchParams<{ subcategory: string }>();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const config = SUBCATEGORY_CONFIG[subcategory || ''] || { 
    emoji: '🎉', 
    name: subcategory || 'Events', 
    gradient: ['#E63946', '#F4A261'],
    filters: [subcategory || '']
  };

  useEffect(() => {
    fetchEvents();
  }, [subcategory]);

  // Helper functions
  const isTonight = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const isThisWeekend = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const friday = new Date(today);
    friday.setDate(today.getDate() + (5 - dayOfWeek + 7) % 7);
    friday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999);
    
    return eventDate >= friday && eventDate <= sunday;
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Tonight';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await luminaApi.getEvents('New York');
      const now = new Date();
      
      // Filter out past events
      let filteredEvents = data.filter((e: any) => {
        if (!e.date) return true;
        return new Date(e.date) >= now;
      });

      // Apply subcategory filters
      if (subcategory === 'trending') {
        filteredEvents = filteredEvents.sort((a: any, b: any) => 
          (b.popularity || b.viberyte_score || 0) - (a.popularity || a.viberyte_score || 0)
        );
      } else if (subcategory === 'tonight') {
        filteredEvents = filteredEvents.filter((e: any) => e.date && isTonight(e.date));
      } else if (subcategory === 'weekend') {
        filteredEvents = filteredEvents.filter((e: any) => e.date && isThisWeekend(e.date));
      } else if (subcategory === 'popular') {
        filteredEvents = filteredEvents.sort((a: any, b: any) => 
          (b.popularity || 0) - (a.popularity || 0)
        );
      } else if (config.filters.length > 0) {
        filteredEvents = filteredEvents.filter((e: any) => {
          const genre = e.genre?.toLowerCase() || '';
          const name = e.name?.toLowerCase() || '';
          
          return config.filters.some(filter => 
            genre.includes(filter) || name.includes(filter)
          );
        });
      }

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    events.forEach(event => {
      const dateKey = event.date ? formatEventDate(event.date) : 'Upcoming';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    
    return Object.entries(grouped).map(([date, items]) => ({
      title: date,
      data: items.slice(0, 15)
    }));
  }, [events]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return events.filter(e => 
      e.name?.toLowerCase().includes(query) ||
      e.venue_name?.toLowerCase().includes(query) ||
      e.genre?.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [events, searchQuery]);

  // Parallax header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Render event card
  const renderEventCard = (event: any, index: number) => (
    <TouchableOpacity
      key={event.id || index}
      style={styles.eventCard}
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/event/${event.id}`);
      }}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: event.image_url || event.flyer_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819' }}
        style={styles.eventImage}
      />
      <LinearGradient 
        colors={['transparent', 'rgba(0,0,0,0.95)']} 
        style={styles.eventGradient} 
      />
      
      {/* Date Badge */}
      <View style={styles.dateBadge}>
        <Text style={styles.dateBadgeText}>
          {event.date ? formatEventDate(event.date) : 'TBA'}
        </Text>
      </View>
      
      <View style={styles.eventInfo}>
        <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
        <View style={styles.eventMeta}>
          <Ionicons name="location-outline" size={14} color={colors.gray[400]} />
          <Text style={styles.eventVenue} numberOfLines={1}>
            {event.venue_name || 'Venue TBA'}
          </Text>
        </View>
        <View style={styles.eventFooter}>
          {event.genre && (
            <View style={styles.genreBadge}>
              <Text style={styles.genreText}>{event.genre}</Text>
            </View>
          )}
          {event.price !== undefined && (
            <Text style={styles.eventPrice}>
              {event.price === 0 || event.price === 'Free' ? 'Free' : `$${event.price}`}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render row
  const renderRow = (row: { title: string; data: any[] }) => {
    if (row.data.length === 0) return null;
    
    return (
      <View key={row.title} style={styles.rowContainer}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <Text style={styles.rowCount}>{row.data.length} events</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 16}
          contentContainerStyle={styles.rowScroll}
        >
          {row.data.map((event, idx) => renderEventCard(event, idx))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[config.gradient[0] + '60', config.gradient[1] + '30', '#1a0a0a'] as any}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Animated.View style={{ opacity: headerOpacity }}>
          <Text style={styles.headerTitle}>{config.emoji} {config.name}</Text>
          <Text style={styles.headerSubtitle}>{events.length} events</Text>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={colors.gray[500]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {searchQuery.length > 0 ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.searchResultsTitle}>
            {searchResults.length} results for "{searchQuery}"
          </Text>
          <View style={styles.searchResultsList}>
            {searchResults.map((event, idx) => renderEventCard(event, idx))}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <Animated.ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{events.length}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {events.filter(e => e.date && isTonight(e.date)).length}
              </Text>
              <Text style={styles.statLabel}>Tonight</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {events.filter(e => e.date && isThisWeekend(e.date)).length}
              </Text>
              <Text style={styles.statLabel}>This Weekend</Text>
            </View>
          </View>

          {/* Events by Date */}
          {eventsByDate.map(row => renderRow(row))}

          {/* All Events List */}
          {events.length > 0 && (
            <>
              <View style={styles.allEventsHeader}>
                <Text style={styles.allEventsTitle}>All {config.name}</Text>
              </View>
              <View style={styles.allEventsList}>
                {events.slice(0, 30).map((event, idx) => renderEventCard(event, idx))}
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.gray[400],
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray[400],
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rowContainer: {
    marginBottom: 28,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  rowTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  rowCount: {
    fontSize: 14,
    color: colors.gray[400],
  },
  rowScroll: {
    paddingLeft: 20,
    paddingRight: 8,
    gap: 16,
  },
  eventCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.gray[800],
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  eventInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  eventName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 22,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  eventVenue: {
    fontSize: 13,
    color: colors.gray[300],
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genreBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F4A261',
  },
  allEventsHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  allEventsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  allEventsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  searchResultsTitle: {
    fontSize: 16,
    color: colors.gray[400],
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchResultsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
});
