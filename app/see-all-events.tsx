import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme';
import luminaApi from '../services/luminaApi';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2;

// Animated pressable card
const AnimatedPressable = ({ children, style, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ✅ NORMALIZE EVENT DATE - handles both date and start_time fields
const getEventDate = (event: any): Date | null => {
  if (event.date) return new Date(event.date);
  if (event.start_time) return new Date(event.start_time);
  if (event.time) return new Date(event.time);
  return null;
};

// Smart date formatting
const formatEventDate = (event: any) => {
  const eventDate = getEventDate(event);
  if (!eventDate) return { label: 'Date TBA', time: '', isTonight: false, isTomorrow: false };

  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

  const diffDays = Math.floor((eventDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24));
  const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Format time
  let formattedTime = '';
  const hours = eventDate.getHours();
  const minutes = eventDate.getMinutes();
  if (hours > 0 || minutes > 0) {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    formattedTime = `${displayHours}${minutes > 0 ? ':' + minutes.toString().padStart(2, '0') : ''} ${ampm}`;
  }

  const isTonight = diffDays === 0;
  const isTomorrow = diffDays === 1;

  let label = '';
  if (isTonight) label = 'Tonight';
  else if (isTomorrow) label = 'Tomorrow';
  else if (diffDays > 1 && diffDays <= 6) label = `This ${dayOfWeek}`;
  else if (diffDays > 6 && diffDays <= 13) label = `Next ${dayOfWeek}`;
  else label = monthDay;

  return { label, time: formattedTime, isTonight, isTomorrow };
};

// City normalization
const normalizeCity = (city?: string): string => {
  const cityMap: { [key: string]: string } = {
    'Manhattan': 'New York',
    'Brooklyn': 'New York',
    'Queens': 'New York',
    'Jersey City': 'New Jersey',
    'Newark': 'New Jersey',
    'North Jersey': 'New York',
    'New Jersey': 'New York',
  };
  return cityMap[city || ''] || city || 'New York';
};

// Check if event is tonight
const isTonight = (event: any): boolean => {
  const eventDate = getEventDate(event);
  if (!eventDate) return false;
  const today = new Date();
  return eventDate.toDateString() === today.toDateString();
};

// Check if event is this weekend
const isThisWeekend = (event: any): boolean => {
  const eventDate = getEventDate(event);
  if (!eventDate) return false;
  
  const today = new Date();
  const dayOfWeek = eventDate.getDay();
  const isWeekendDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
  const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  return isWeekendDay && diffDays >= 0 && diffDays <= 7;
};

// Genre filter for section titles
const matchesSection = (event: any, title: string): boolean => {
  const name = event.name?.toLowerCase() || '';
  const genre = event.music_genre?.toLowerCase() || '';
  const titleLower = title.toLowerCase();

  if (titleLower.includes('tonight')) {
    return isTonight(event);
  }
  if (titleLower.includes('weekend')) {
    return isThisWeekend(event);
  }
  if (titleLower.includes('afrobeat')) return genre.includes('afrobeat') || name.includes('afrobeat');
  if (titleLower.includes('hip-hop') || titleLower.includes('hip hop')) return genre.includes('hip-hop') || genre.includes('hip hop') || genre.includes('rap');
  if (titleLower.includes('latin')) return genre.includes('latin') || genre.includes('reggaeton') || genre.includes('salsa');
  if (titleLower.includes('house')) return genre.includes('house');
  if (titleLower.includes('r&b') || titleLower.includes('soul')) return genre.includes('r&b') || genre.includes('soul');
  if (titleLower.includes('edm')) return genre.includes('edm') || genre.includes('electronic');
  if (titleLower.includes('reggae') || titleLower.includes('dancehall')) return genre.includes('reggae') || genre.includes('dancehall');
  if (titleLower.includes('jazz')) return genre.includes('jazz');

  return true; // "All Events" - show everything
};

export default function SeeAllEventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const title = (params.title as string) || 'All Events';
  const city = (params.city as string) || 'New York';

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [city, title]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const normalizedCity = normalizeCity(city);
      console.log('[SeeAllEvents] Fetching for city:', normalizedCity, 'title:', title);
      const allEvents = await luminaApi.getEvents(normalizedCity);
      console.log('[SeeAllEvents] Received events:', allEvents?.length || 0);
      setEvents(allEvents || []);
    } catch (error) {
      console.error('[SeeAllEvents] Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    const filtered = events.filter(event => matchesSection(event, title));
    
    // Sort by date
    filtered.sort((a, b) => {
      const aDate = getEventDate(a);
      const bDate = getEventDate(b);
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });
    
    console.log('[SeeAllEvents] Filtered:', filtered.length, 'from', events.length);
    return filtered;
  }, [events, title]);

  // Group events by date - sorted chronologically
  const groupedEvents = useMemo(() => {
    const groups: Record<string, { date: Date; data: any[] }> = {};

    filteredEvents.forEach(event => {
      const eventDate = getEventDate(event);
      const date = eventDate || new Date('2099-12-31');
      const { label } = formatEventDate(event);

      if (!groups[label]) {
        groups[label] = { date, data: [] };
      }
      groups[label].data.push(event);
    });

    return Object.entries(groups)
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([label, value]) => ({ label, data: value.data }));
  }, [filteredEvents]);

  const goToEvent = (event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  };

  const renderEventCard = (event: any) => {
    const imageUrl = event.image_url || event.cover_image_url;
    const { label, time, isTonight: tonight, isTomorrow } = formatEventDate(event);

    return (
      <AnimatedPressable
        key={event.id}
        style={styles.card}
        onPress={() => goToEvent(event)}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="ticket-outline" size={32} color={colors.zinc[700]} />
            </View>
          )}
          <View style={[
            styles.dateBadge,
            tonight && styles.dateBadgeTonight,
            isTomorrow && styles.dateBadgeTomorrow
          ]}>
            <Text style={[
              styles.dateBadgeText,
              (tonight || isTomorrow) && styles.dateBadgeTextDark
            ]}>
              {label}
            </Text>
          </View>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
          <Text style={styles.eventVenue} numberOfLines={1}>
            {event.venue_name || 'Venue TBA'}
          </Text>
          {time ? (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color={colors.violet[400]} />
              <Text style={styles.eventTime}>{time}</Text>
            </View>
          ) : null}
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{filteredEvents.length} events in {city}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.violet[500]} />
          <Text style={styles.loadingText}>Finding events...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={colors.zinc[700]} />
          <Text style={styles.emptyText}>Nothing scheduled yet</Text>
          <Text style={styles.emptySubtext}>The night is young — check back soon</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {groupedEvents.map((group) => (
            <View key={group.label} style={styles.dateSection}>
              <View style={styles.dateSectionHeader}>
                <View style={styles.dateDot} />
                <Text style={styles.dateSectionTitle}>{group.label}</Text>
                <Text style={styles.dateSectionCount}>{group.data.length} events</Text>
              </View>
              <View style={styles.eventsGrid}>
                {group.data.map(event => renderEventCard(event))}
              </View>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc[900],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.zinc[900],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.zinc[500],
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: colors.zinc[500],
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.zinc[400],
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.zinc[600],
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },
  dateSection: {
    marginBottom: spacing.xl,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.violet[500],
    marginRight: spacing.sm,
  },
  dateSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  dateSectionCount: {
    fontSize: 13,
    color: colors.zinc[500],
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.zinc[900],
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  imageContainer: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.zinc[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dateBadgeTonight: {
    backgroundColor: '#fb923c',
  },
  dateBadgeTomorrow: {
    backgroundColor: colors.violet[500],
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  dateBadgeTextDark: {
    color: '#000',
  },
  cardContent: {
    padding: spacing.sm,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
    lineHeight: 18,
  },
  eventVenue: {
    fontSize: 12,
    color: colors.zinc[500],
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTime: {
    fontSize: 12,
    color: colors.violet[400],
    fontWeight: '500',
  },
});
