import React, { useState, useEffect, useMemo, useRef } from "react";
import { Image } from 'expo-image';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from "../../theme";
import luminaApi from "../../services/luminaApi";
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 170;
const MAX_SECTIONS = 6;
const HERO_HEIGHT = 280;

// Timezone-safe date parser
const parseEventDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // If ISO datetime with time (2025-01-30T20:00:00), parse normally
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  
  // If date-only string (2025-01-30), parse as local date to avoid timezone shift
  const parts = dateString.split('-').map(p => parseInt(p));
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  
  return new Date(dateString);
};

// Animated pressable card wrapper
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

// Hero Module Component
const HeroModule = ({ event, onPress }: { event: Event | null; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Pulsing glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scale, {
      toValue: 0.98,
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

  if (!event) return null;

  const imageUrl = event.image_url || event.cover_image_url;
  const { label, time } = formatEventDate(event);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.heroContainer, { transform: [{ scale }] }]}>
        {/* Glow effect behind */}
        <Animated.View style={[styles.heroGlow, { opacity: glowOpacity }]} />
        
        <View style={styles.heroCard}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.heroImage} 
              contentFit="cover" 
              transition={200}
              priority="high"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="musical-notes" size={64} color={colors.zinc[700]} />
            </View>
          )}
          
          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
            locations={[0, 0.5, 1]}
            style={styles.heroGradient}
          />
          
          {/* Featured badge */}
          <View style={styles.heroBadge}>
            <Ionicons name="flame" size={12} color="#000" />
            <Text style={styles.heroBadgeText}>FEATURED TONIGHT</Text>
          </View>
          
          {/* Content */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} numberOfLines={2}>{event.name}</Text>
            
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaRow}>
                <Ionicons name="location-outline" size={14} color={colors.violet[400]} />
                <Text style={styles.heroVenue} numberOfLines={1}>{event.venue_name || 'Venue TBA'}</Text>
              </View>
              
              <View style={styles.heroMetaRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.violet[400]} />
                <Text style={styles.heroDate}>{label}</Text>
                {time && (
                  <>
                    <Text style={styles.heroDateDivider}>•</Text>
                    <Text style={styles.heroTime}>{time}</Text>
                  </>
                )}
              </View>
              
              {event.music_genre && (
                <View style={styles.heroGenreTag}>
                  <Text style={styles.heroGenreText}>{event.music_genre}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// Editorial control: Categories appear in this exact order
const CATEGORY_ORDER = [
  '🔥 Tonight',
  'This Weekend',
  'Afrobeats Parties',
  'Hip-Hop Shows',
  'Latin Nights',
  'House Music',
  'R&B Soul',
  'EDM Parties',
  'Reggae & Dancehall',
  'Jazz Nights',
  'All Events',
];

interface Event {
  id: number;
  name: string;
  venue_name?: string;
  image_url?: string;
  cover_image_url?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  music_genre?: string;
  event_type?: string;
  neighborhood?: string;
}

interface EventsFilters {
  city?: string;
  searchQuery?: string;
  genre?: string[];
  day?: string[];
  type?: string[];
}

interface EventsTabProps {
  filters?: EventsFilters;
}

// Get event date using timezone-safe parser
const getEventDate = (event: Event): Date | null => {
  if (event.date) return parseEventDate(event.date);
  if (event.start_time) return parseEventDate(event.start_time);
  return null;
};

// City normalization helper
const normalizeCity = (city?: string): string => {
  if (city === 'Near Me') return 'New York';
  
  const cityMap: { [key: string]: string } = {
    'Manhattan': 'New York',
    'Brooklyn': 'New York',
    'Queens': 'New York',
    'Bronx': 'New York',
    'Staten Island': 'New York',
    'Jersey City': 'New Jersey',
    'Hoboken': 'New Jersey',
    'Newark': 'New Jersey',
    'North Jersey': 'New York',
    'New Jersey': 'New York',
  };
  return cityMap[city || ''] || city || 'New York';
};

// Smart date formatting
const formatEventDate = (event: Event): { label: string; time: string; isTonight: boolean; isTomorrow: boolean } => {
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

  let label = '';
  const isTonight = diffDays === 0;
  const isTomorrow = diffDays === 1;

  if (isTonight) {
    label = 'Tonight';
  } else if (isTomorrow) {
    label = 'Tomorrow';
  } else if (diffDays > 1 && diffDays <= 6) {
    label = `This ${dayOfWeek}`;
  } else if (diffDays > 6 && diffDays <= 13) {
    label = `Next ${dayOfWeek}`;
  } else {
    label = monthDay;
  }

  return { label, time: formattedTime, isTonight, isTomorrow };
};

// Check if event is this weekend
const isThisWeekend = (event: Event): boolean => {
  const eventDate = getEventDate(event);
  if (!eventDate) return false;
  
  const today = new Date();
  const dayOfWeek = eventDate.getDay();
  
  const isWeekendDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
  const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  return isWeekendDay && diffDays >= 0 && diffDays <= 7;
};

// Check if event is tonight
const isTonight = (event: Event): boolean => {
  const eventDate = getEventDate(event);
  if (!eventDate) return false;
  
  const today = new Date();
  return eventDate.toDateString() === today.toDateString();
};

// Genre categorization
const categorizeByGenre = (event: Event): string | null => {
  const name = event.name.toLowerCase();
  const genre = (event.music_genre || '').toLowerCase();
  
  if (genre.includes('afrobeat') || name.includes('afrobeat') || name.includes('amapiano')) return 'Afrobeats Parties';
  if (genre.includes('hip-hop') || genre.includes('hip hop') || name.includes('hip-hop') || name.includes('hip hop') || genre.includes('rap')) return 'Hip-Hop Shows';
  if (genre.includes('latin') || genre.includes('reggaeton') || genre.includes('bachata') || genre.includes('salsa') || genre.includes('merengue')) return 'Latin Nights';
  if (genre.includes('house') || genre.includes('deep house') || genre.includes('tech house') || genre.includes('afro house')) return 'House Music';
  if (genre.includes('r&b') || genre.includes('rnb') || genre.includes('soul') || genre.includes('neo-soul')) return 'R&B Soul';
  if (genre.includes('edm') || genre.includes('electronic') || genre.includes('techno') || genre.includes('trance') || genre.includes('dubstep')) return 'EDM Parties';
  if (genre.includes('reggae') || genre.includes('dancehall') || genre.includes('soca')) return 'Reggae & Dancehall';
  if (genre.includes('jazz')) return 'Jazz Nights';
  
  return null;
};

// Select best hero event (tonight's most appealing event with an image)
const selectHeroEvent = (events: Event[]): Event | null => {
  const tonightWithImages = events
    .filter(e => isTonight(e) && (e.image_url || e.cover_image_url))
    .sort((a, b) => {
      const aScore = (a.music_genre ? 1 : 0) + (a.venue_name ? 1 : 0);
      const bScore = (b.music_genre ? 1 : 0) + (b.venue_name ? 1 : 0);
      return bScore - aScore;
    });
  
  if (tonightWithImages.length > 0) return tonightWithImages[0];
  
  const withImages = events
    .filter(e => e.image_url || e.cover_image_url)
    .sort((a, b) => {
      const aDate = getEventDate(a);
      const bDate = getEventDate(b);
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });
  
  return withImages[0] || null;
};

export default function EventsTab({ filters = {} }: EventsTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [filters.city]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const city = normalizeCity(filters.city);
      console.log('[EventsTab] Fetching events for city:', city);
      const events = await luminaApi.getEvents(city);
      console.log('[EventsTab] Received events:', events?.length || 0);
      setAllEvents(events || []);
    } catch (error) {
      console.error('[EventsTab] Error fetching events:', error);
      setAllEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (events: Event[]): Event[] => {
    let filtered = [...events];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.venue_name?.toLowerCase().includes(query) ||
        e.music_genre?.toLowerCase().includes(query) ||
        e.event_type?.toLowerCase().includes(query)
      );
    }

    if (filters.genre && filters.genre.length > 0) {
      filtered = filtered.filter(e => {
        const eventGenre = (e.music_genre || '').toLowerCase();
        const eventName = e.name.toLowerCase();
        return filters.genre!.some((g: string) => {
          const genreLower = g.toLowerCase();
          return eventGenre.includes(genreLower) || eventName.includes(genreLower);
        });
      });
    }

    if (filters.day && filters.day.length > 0) {
      const today = new Date();
      
      filtered = filtered.filter(e => {
        const eventDate = getEventDate(e);
        if (!eventDate) return false;
        
        const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const dayOfWeek = eventDate.getDay();
        
        return filters.day!.some((d: string) => {
          const dayLower = d.toLowerCase();
          if (dayLower === 'tonight') return eventDate.toDateString() === today.toDateString();
          if (dayLower === 'tomorrow') return diffDays >= 0 && diffDays < 2;
          if (dayLower === 'thisweek' || dayLower === 'this week') return diffDays >= 0 && diffDays <= 7;
          if (dayLower === 'weekend') return (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) && diffDays >= 0 && diffDays <= 7;
          return true;
        });
      });
    }

    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(e => {
        const eventType = (e.event_type || '').toLowerCase();
        const eventName = e.name.toLowerCase();
        return filters.type!.some((t: string) => {
          const typeLower = t.toLowerCase();
          return eventType.includes(typeLower) || eventName.includes(typeLower);
        });
      });
    }

    filtered.sort((a, b) => {
      const aDate = getEventDate(a);
      const bDate = getEventDate(b);
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });

    return filtered;
  };

  const filteredEvents = useMemo(() => {
    const result = applyFilters(allEvents);
    console.log('[EventsTab] Filtered events:', result.length, 'from', allEvents.length);
    return result;
  }, [allEvents, filters.searchQuery, filters.genre, filters.day, filters.type]);

  const heroEvent = useMemo(() => {
    const hasActiveFilters = filters.searchQuery || 
      (filters.genre && filters.genre.length > 0) ||
      (filters.day && filters.day.length > 0) ||
      (filters.type && filters.type.length > 0);
    
    if (hasActiveFilters) return null;
    return selectHeroEvent(allEvents);
  }, [allEvents, filters]);

  const sections = useMemo(() => {
    const usedEventIds = new Set<number>();
    
    if (heroEvent) {
      usedEventIds.add(heroEvent.id);
    }
    
    const sectionMap: { [key: string]: Event[] } = {
      '🔥 Tonight': [],
      'This Weekend': [],
      'Afrobeats Parties': [],
      'Hip-Hop Shows': [],
      'Latin Nights': [],
      'House Music': [],
      'R&B Soul': [],
      'EDM Parties': [],
      'Reggae & Dancehall': [],
      'Jazz Nights': [],
      'All Events': [],
    };
    
    filteredEvents.forEach(event => {
      if (usedEventIds.has(event.id)) return;
      if (isTonight(event) && sectionMap['🔥 Tonight'].length < 10) {
        sectionMap['🔥 Tonight'].push(event);
        usedEventIds.add(event.id);
      }
    });
    
    filteredEvents.forEach(event => {
      if (usedEventIds.has(event.id)) return;
      if (isThisWeekend(event) && sectionMap['This Weekend'].length < 10) {
        sectionMap['This Weekend'].push(event);
        usedEventIds.add(event.id);
      }
    });
    
    filteredEvents.forEach(event => {
      if (usedEventIds.has(event.id)) return;
      
      const category = categorizeByGenre(event);
      if (category && sectionMap[category] && sectionMap[category].length < 10) {
        sectionMap[category].push(event);
        usedEventIds.add(event.id);
      }
    });
    
    filteredEvents.forEach(event => {
      if (usedEventIds.has(event.id)) return;
      if (sectionMap['All Events'].length < 10) {
        sectionMap['All Events'].push(event);
        usedEventIds.add(event.id);
      }
    });
    
    console.log('[EventsTab] Sections built:', Object.entries(sectionMap).map(([k, v]) => `${k}: ${v.length}`).join(', '));
    
    return CATEGORY_ORDER
      .map(title => ({ 
        title, 
        data: sectionMap[title] || [],
        highlight: title === '🔥 Tonight',
        key: title.replace(/[🔥\s]/g, '_').toLowerCase()
      }))
      .filter(section => section.data.length > 0)
      .slice(0, MAX_SECTIONS);
  }, [filteredEvents, heroEvent]);

  const handleSectionPress = (sectionTitle: string) => {
    const cleanTitle = sectionTitle.replace(/[🔥]/g, '').trim();
    router.push({
      pathname: "/see-all-events",
      params: {
        title: cleanTitle === 'Tonight' ? 'All Events' : cleanTitle,
        city: filters.city || "New York"
      }
    });
  };

  const goToEvent = (event: Event) => {
    router.push(`/event/${event.id}`);
  };

  const renderEventCard = (event: Event) => {
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
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.image} 
              contentFit="cover" 
              transition={200}
              cachePolicy="memory-disk"
            />
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
              tonight && styles.dateBadgeTextDark,
              isTomorrow && styles.dateBadgeTextDark
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.violet[500]} />
        <Text style={styles.loadingText}>Finding events near you…</Text>
      </View>
    );
  }

  if (sections.length === 0 && !heroEvent) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={48} color={colors.zinc[700]} />
        <Text style={styles.emptyText}>No events found</Text>
        <Text style={styles.emptySubtext}>Check back soon for upcoming events</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {heroEvent && (
        <HeroModule 
          event={heroEvent} 
          onPress={() => goToEvent(heroEvent)} 
        />
      )}
      
      {sections.map((section, index) => (
        <View key={section.key || index} style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => handleSectionPress(section.title)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.sectionTitle,
              section.highlight && styles.sectionTitleHighlight
            ]}>
              {section.title}
            </Text>
            <View style={styles.seeAllRow}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.violet[400]} />
            </View>
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {section.data.map((event) => renderEventCard(event))}
          </ScrollView>
        </View>
      ))}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  loadingText: { color: colors.zinc[500], fontSize: typography.sizes.sm },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: colors.zinc[500], fontSize: typography.sizes.md, fontWeight: '600' },
  emptySubtext: { color: colors.zinc[600], fontSize: typography.sizes.sm },
  heroContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, marginBottom: spacing.sm },
  heroGlow: { position: 'absolute', top: spacing.md + 10, left: spacing.lg + 10, right: spacing.lg + 10, bottom: 10, backgroundColor: colors.violet[500], borderRadius: 20, transform: [{ scale: 1.02 }] },
  heroCard: { height: HERO_HEIGHT, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.zinc[900] },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.zinc[800], justifyContent: 'center', alignItems: 'center' },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  heroBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fb923c', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: '#000', letterSpacing: 0.5 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md },
  heroTitle: { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  heroMeta: { gap: 6 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroVenue: { fontSize: 14, color: colors.zinc[300], fontWeight: '500', flex: 1 },
  heroDate: { fontSize: 13, color: colors.zinc[300], fontWeight: '500' },
  heroDateDivider: { fontSize: 13, color: colors.zinc[500] },
  heroTime: { fontSize: 13, color: colors.violet[400], fontWeight: '600' },
  heroGenreTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(139, 92, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  heroGenreText: { fontSize: 11, color: colors.violet[400], fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginTop: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.white },
  sectionTitleHighlight: { color: '#fb923c' },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 14, color: colors.violet[400], fontWeight: '600' },
  horizontalScroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: { width: CARD_WIDTH, backgroundColor: colors.zinc[900], borderRadius: 12, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 130, position: 'relative' },
  image: { width: '100%', height: '100%' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: colors.zinc[800], justifyContent: 'center', alignItems: 'center' },
  dateBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0, 0, 0, 0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dateBadgeTonight: { backgroundColor: '#fb923c' },
  dateBadgeTomorrow: { backgroundColor: '#8b5cf6' },
  dateBadgeText: { fontSize: 11, fontWeight: '600', color: colors.white },
  dateBadgeTextDark: { color: '#000' },
  cardContent: { padding: spacing.sm },
  eventName: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.white, marginBottom: 4, lineHeight: 18 },
  eventVenue: { fontSize: typography.sizes.xs, color: colors.zinc[500], marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventTime: { fontSize: typography.sizes.xs, color: colors.violet[400], fontWeight: '500' },
  bottomPadding: { height: 100 },
});
