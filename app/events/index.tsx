import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, 
  Image, Dimensions, Animated, Platform, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import colors from '../../constants/colors';
import luminaApi from '../../services/lumina';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.65;

const EVENT_CATEGORIES = [
  { emoji: '🎵', name: 'Afrobeats', key: 'afrobeats', gradient: ['#2D6A4F', '#40916C'] },
  { emoji: '🕺', name: 'Latin', key: 'latin', gradient: ['#E63946', '#F4A261'] },
  { emoji: '🎧', name: 'EDM/House', key: 'edm', gradient: ['#7209B7', '#3A0CA3'] },
  { emoji: '🎤', name: 'Hip-Hop', key: 'hiphop', gradient: ['#6D3A0A', '#A44A3F'] },
  { emoji: '🍾', name: 'Brunch', key: 'brunch', gradient: ['#F9C74F', '#F8961E'] },
  { emoji: '🎷', name: 'R&B/Soul', key: 'rnb', gradient: ['#7B2CBF', '#9D4EDD'] },
  { emoji: '🎸', name: 'Live Music', key: 'live', gradient: ['#1D3557', '#457B9D'] },
  { emoji: '🎭', name: 'Comedy', key: 'comedy', gradient: ['#FF006E', '#FB5607'] },
  { emoji: '🪩', name: 'Day Party', key: 'dayparty', gradient: ['#3A86FF', '#8338EC'] },
];

const EVENT_ROWS = [
  { title: '🔥 Trending Events', filter: 'trending', sort: 'popularity' },
  { title: '📅 This Weekend', filter: 'weekend', sort: 'date' },
  { title: '🌙 Tonight', filter: 'tonight', sort: 'date' },
  { title: '🎵 Afrobeats Nights', filter: 'afrobeats', sort: 'date' },
  { title: '🕺 Latin Nights', filter: 'latin', sort: 'date' },
  { title: '🎧 EDM & House', filter: 'edm', sort: 'date' },
  { title: '🎤 Hip-Hop Events', filter: 'hiphop', sort: 'date' },
  { title: '🍾 Brunch Parties', filter: 'brunch', sort: 'date' },
  { title: '🎷 R&B & Soul', filter: 'rnb', sort: 'date' },
  { title: '📍 Popular Near You', filter: 'popular', sort: 'popularity' },
];

export default function EventsScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await luminaApi.getEvents('New York');
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Check if date is today
  const isTonight = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  // Helper: Check if date is this weekend
  const isThisWeekend = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Get Friday of this week
    const friday = new Date(today);
    friday.setDate(today.getDate() + (5 - dayOfWeek));
    friday.setHours(0, 0, 0, 0);
    
    // Get Sunday of this week
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999);
    
    return eventDate >= friday && eventDate <= sunday;
  };

  // Format event date
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

  // Build featured rows
  const featuredRows = useMemo(() => {
    const now = new Date();
    
    return EVENT_ROWS.map(row => {
      let filtered = [...events];
      
      // Filter out past events
      filtered = filtered.filter(e => {
        if (!e.date) return true;
        return new Date(e.date) >= now;
      });
      
      switch (row.filter) {
        case 'trending':
          filtered = filtered.sort((a, b) => (b.popularity || b.viberyte_score || 0) - (a.popularity || a.viberyte_score || 0));
          break;
        case 'tonight':
          filtered = filtered.filter(e => e.date && isTonight(e.date));
          break;
        case 'weekend':
          filtered = filtered.filter(e => e.date && isThisWeekend(e.date));
          break;
        case 'afrobeats':
          filtered = filtered.filter(e => 
            e.genre?.toLowerCase().includes('afrobeats') ||
            e.name?.toLowerCase().includes('afrobeats')
          );
          break;
        case 'latin':
          filtered = filtered.filter(e => 
            e.genre?.toLowerCase().includes('latin') ||
            e.genre?.toLowerCase().includes('reggaeton') ||
            e.genre?.toLowerCase().includes('salsa') ||
            e.name?.toLowerCase().includes('latin')
          );
          break;
        case 'edm':
          filtered = filtered.filter(e => 
            e.genre?.toLowerCase().includes('edm') ||
            e.genre?.toLowerCase().includes('house') ||
            e.genre?.toLowerCase().includes('techno')
          );
          break;
        case 'hiphop':
          filtered = filtered.filter(e => 
            e.genre?.toLowerCase().includes('hip-hop') ||
            e.genre?.toLowerCase().includes('hiphop') ||
            e.genre?.toLowerCase().includes('hip hop') ||
            e.genre?.toLowerCase().includes('rap')
          );
          break;
        case 'brunch':
          filtered = filtered.filter(e => 
            e.genre?.toLowerCase().includes('brunch') ||
            e.name?.toLowerCase().includes('brunch')
          );
          break;
        case 'rnb':
          filtered = filtered.filter(e => 
            e.genre?.toLowerCase().includes('r&b') ||
            e.genre?.toLowerCase().includes('rnb') ||
            e.genre?.toLowerCase().includes('soul')
          );
          break;
        case 'popular':
          filtered = filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          break;
      }
      
      return { ...row, data: filtered.slice(0, 15) };
    }).filter(row => row.data.length > 0);
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
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [160, 100],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Render event card (larger, more prominent)
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
        {event.genre && (
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{event.genre}</Text>
          </View>
        )}
        {event.price && (
          <Text style={styles.eventPrice}>
            {event.price === 0 || event.price === 'Free' ? 'Free' : `$${event.price}`}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render category tile
  const renderCategoryTile = (cat: typeof EVENT_CATEGORIES[0], index: number) => (
    <TouchableOpacity
      key={cat.key}
      style={styles.categoryTile}
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/events/${cat.key}`);
      }}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={cat.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.categoryGradient}
      >
        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
        <Text style={styles.categoryName}>{cat.name}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Render row
  const renderRow = (row: { title: string; data: any[]; filter: string }) => {
    if (row.data.length === 0) return null;
    
    return (
      <View key={row.title} style={styles.rowContainer}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <TouchableOpacity onPress={() => router.push(`/events/${row.filter}`)}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
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
        colors={['#1a0a0a', '#2e1a0a', '#1a0a0a']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Animated.View style={{ opacity: headerOpacity }}>
          <Text style={styles.headerTitle}>🎉 Events</Text>
          <Text style={styles.headerSubtitle}>Parties, Concerts & Experiences</Text>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, genres..."
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
      </Animated.View>

      {/* Content */}
      {searchQuery.length > 0 ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.searchResultsTitle}>
            {searchResults.length} results for "{searchQuery}"
          </Text>
          <View style={styles.searchResultsGrid}>
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
          {/* Category Grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse by Genre</Text>
          </View>
          <View style={styles.categoryGrid}>
            {EVENT_CATEGORIES.map((cat, idx) => renderCategoryTile(cat, idx))}
          </View>

          {/* Featured Rows */}
          {featuredRows.map(row => renderRow(row))}

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
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 32,
  },
  categoryTile: {
    width: (SCREEN_WIDTH - 52) / 3,
    height: 90,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
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
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F4A261',
  },
  rowScroll: {
    paddingLeft: 20,
    paddingRight: 8,
    gap: 16,
  },
  eventCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.75,
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
  genreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
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
  searchResultsTitle: {
    fontSize: 16,
    color: colors.gray[400],
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchResultsGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
});
