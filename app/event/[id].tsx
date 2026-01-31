import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Dimensions,
  Share,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import luminaApi from '../../services/lumina';
import { colors } from '../../theme';
import { getVibeGradient } from '../../theme/vibeGradients';
import EventCarousel from '../../components/EventCarousel';
import AddEventToPlanSheet from '../../components/AddEventToPlanSheet';
import { useToast } from '../../contexts/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 400;
const API_URL = 'https://lumina.viberyte.com';

// Timezone-safe date parser
const parseEventDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // If ISO datetime with time (2025-01-30T20:00:00), parse normally
  if (dateString.includes("T")) {
    return new Date(dateString);
  }
  
  // If date-only string (2025-01-30), parse as local date to avoid timezone shift
  const parts = dateString.split("-").map(p => parseInt(p));
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  
  return new Date(dateString);
};

// Format date for display
const formatEventDate = (dateString: string): string => {
  const date = parseEventDate(dateString);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return \`\${month} \${day}\`;
};

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

// Format date for display
const formatEventDate = (dateString: string): string => {
  const date = parseEventDate(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
};

interface Package {
  id: string;
  name: string;
  description?: string;
  bottleCount?: number;
  price: number;
  maxGuests?: number;
}

interface Partner {
  id: number;
  name: string | null;
  instagram: string | null;
  paymentMethods?: {
    venmo: string | null;
    zelle: string | null;
    cashapp: string | null;
  };
}

interface EventDetail {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  genre: string | null;
  image_url: string | null;
  ticket_url: string | null;
  venue_id: number | null;
  venue_name: string | null;
  venue_address: string | null;
  city: string;
  lineup: string | string[] | null;
  why_recommended: string | null;
  crowd_type: string | null;
  peak_hours: string | null;
  packages?: Package[];
  sections?: any[];
  hasBookingOptions?: boolean;
  bookingMode?: string;
  partner?: Partner;
}

interface RelatedEvent {
  id: number;
  title: string;
  date: string;
  image_url: string | null;
  venue_name: string | null;
  genre: string | null;
}

export default function EventDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { showToast } = useToast();
  
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [vibeGradient, setVibeGradient] = useState<{ colors: string[] } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddToPlan, setShowAddToPlan] = useState(false);
  const [showFullLineup, setShowFullLineup] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Memoize safe packages
  const safePackages = useMemo(() => {
    return (event?.packages || []).filter(
      (p): p is Package => !!p?.name && typeof p.price === 'number'
    );
  }, [event?.packages]);

  const hasBookingOptions = safePackages.length > 0 || (event?.sections || []).length > 0;

  useEffect(() => {
    if (id) {
      loadUserIdThenFetch();
    }
  }, [id]);

  const loadUserIdThenFetch = async () => {
    const uid = await loadUserId();
    await fetchEvent(uid);
  };

  const loadUserId = async (): Promise<string> => {
    try {
      const profile = await AsyncStorage.getItem('@lumina_profile');
      if (profile) {
        const data = JSON.parse(profile);
        const uid = data.id || 'guest';
        setUserId(uid);
        return uid;
      }
    } catch (error) {
      console.log('Could not load user ID');
    }
    setUserId('guest');
    return 'guest';
  };

  // Check Instagram verification from local profile
  const checkInstagramVerified = async (): Promise<boolean> => {
    try {
      const profile = await AsyncStorage.getItem('@lumina_profile');
      const user = profile ? JSON.parse(profile) : null;
      return !!user?.instagram_verified_at;
    } catch {
      return false;
    }
  };

  const checkIfSaved = async (uid: string) => {
    if (!uid || uid === 'guest') return;
    try {
      const response = await fetch(
        `${API_URL}/api/favorites?userId=${uid}&type=event`
      );
      const data = await response.json();
      const saved = data.items?.some((item: { item_id: number }) => item.item_id === Number(id));
      setIsSaved(saved || false);
    } catch (error) {
      console.log('Could not check saved status');
    }
  };

  const handleSaveEvent = async () => {
    if (!userId) return;
    try {
      if (isSaved) {
        await fetch(
          `${API_URL}/api/favorites?userId=${userId}&itemType=event&itemId=${id}`,
          { method: 'DELETE' }
        );
        setIsSaved(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Removed from saved', 'info');
      } else {
        await fetch(`${API_URL}/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            itemType: 'event',
            itemId: Number(id),
          }),
        });
        setIsSaved(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Event saved!', 'success');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Could not save event', 'error');
    }
  };

  const handleAddToPlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddToPlan(true);
  };

  const handleAddToPlanSuccess = () => {
    setShowAddToPlan(false);
    showToast('Added to your plan!', 'success');
  };

  // Book Table with IG verification gate
  const handleBookTable = async () => {
    if (bookingLoading) return;
    setBookingLoading(true);
    
    if (!event) { 
      setBookingLoading(false); 
      return; 
    }

    const isVerified = await checkInstagramVerified();
    
    if (!isVerified) {
      showToast('Verify Instagram to book tables', 'info');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/verify/instagram');
      setBookingLoading(false);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/booking/new',
      params: {
        event_id: String(event.id),
        event_title: event.title,
        venue_name: event.venue_name || '',
        partner_id: String(event.partner?.id || ''),
        venue_id: String(event.venue_id || ''),
        packages: JSON.stringify(safePackages),
      },
    });
    setBookingLoading(false);
  };

  // Message Promoter with IG verification gate
  const handleMessagePromoter = async () => {
    if (!event?.partner?.id) {
      showToast('Promoter not available', 'error');
      return;
    }

    const isVerified = await checkInstagramVerified();
    
    if (!isVerified) {
      showToast('Verify Instagram to message promoters', 'info');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/verify/instagram');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/booking/chat',
      params: {
        partner_id: String(event.partner.id),
        event_id: String(event.id),
        venue_name: event.venue_name || '',
      },
    });
  };

  const fetchEvent = async (uid: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/api/events/${id}`);
      const result = await response.json();
      
      if (!result.success || !result.event) {
        throw new Error('Event not found');
      }
      
      const eventData: EventDetail = {
        id: result.event.id,
        title: result.event.title,
        description: result.event.description,
        date: result.event.eventDate || result.event.date,
        time: result.event.eventTime || result.event.time,
        genre: result.event.genre,
        image_url: result.event.imageUrl || result.event.image_url,
        ticket_url: result.event.ticket_url || null,
        venue_id: result.event.venue?.id || null,
        venue_name: result.event.venue?.name || null,
        venue_address: result.event.venue?.address || null,
        city: result.event.city || 'New York',
        lineup: result.event.lineup || null,
        why_recommended: result.event.why_recommended || null,
        crowd_type: result.event.crowd_type || null,
        peak_hours: result.event.peak_hours || null,
        packages: result.event.packages || [],
        sections: result.event.sections || [],
        hasBookingOptions: result.event.hasBookingOptions || false,
        bookingMode: result.event.bookingMode || 'request',
        partner: result.event.partner || null,
      };
      
      setEvent(eventData);
      await checkIfSaved(uid);
      
      const genre = eventData.genre?.toLowerCase() || '';
      let gradientKey = 'high-energy';
      if (genre.includes('afrobeat')) gradientKey = 'afrobeats';
      else if (genre.includes('hip-hop') || genre.includes('rap')) gradientKey = 'hip-hop';
      else if (genre.includes('edm') || genre.includes('house')) gradientKey = 'edm';
      else if (genre.includes('latin')) gradientKey = 'afrobeats';
      else if (genre.includes('r&b') || genre.includes('rnb')) gradientKey = 'chill';
      
      const gradient = getVibeGradient([], [gradientKey], 'nightlife');
      setVibeGradient(gradient);
      
      if (eventData.genre) {
        try {
          const related = await luminaApi.getEventsByGenre(eventData.city, eventData.genre);
          setRelatedEvents(related.filter((e: RelatedEvent) => e.id !== Number(id)).slice(0, 6));
        } catch (e) {
          console.log('Could not fetch related events');
        }
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `Check out ${event.title} with Lumina - your AI nightlife assistant. ${event.ticket_url || ''}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleGetTickets = () => {
    if (event?.ticket_url) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(event.ticket_url);
    }
  };

  const handleVenuePress = () => {
    if (event?.venue_id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/venue/${event.venue_id}`);
    }
  };

  const handleDirections = () => {
    if (event?.venue_address) {
      const url = Platform.select({
        ios: `maps:?q=${encodeURIComponent(event.venue_address)}`,
        android: `geo:0,0?q=${encodeURIComponent(event.venue_address)}`,
      });
      if (url) Linking.openURL(url);
    } else if (event?.venue_name) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_name)}`;
      Linking.openURL(url);
    }
  };

  const partnerName = event?.partner?.name || 'Promoter';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="calendar-outline" size={48} color={colors.zinc[600]} />
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lineupArray = Array.isArray(event.lineup) 
    ? event.lineup 
    : typeof event.lineup === 'string' 
      ? event.lineup.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  
  const displayedLineup = showFullLineup ? lineupArray : lineupArray.slice(0, 5);
  const hasMoreLineup = lineupArray.length > 5;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image */}
        <View style={styles.header}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={styles.headerImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={vibeGradient?.colors || [colors.violet[600], colors.violet[900]]}
              style={styles.headerImage}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', colors.zinc[900]]}
            style={styles.headerGradient}
          />
        </View>

        {/* Back Button */}
        <TouchableOpacity 
          style={[styles.backButton, { top: insets.top + 10 }]} 
          onPress={() => router.back()}
        >
          <View style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, { top: insets.top + 10 }]} 
          onPress={handleSaveEvent}
        >
          <View style={styles.iconButton}>
            <Ionicons name={isSaved ? "heart" : "heart-outline"} size={22} color={isSaved ? colors.pink[500] : "#fff"} />
          </View>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity 
          style={[styles.shareButton, { top: insets.top + 10 }]} 
          onPress={handleShare}
        >
          <View style={styles.iconButton}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeBadge}>
              <Ionicons name="calendar" size={16} color={colors.violet[400]} />
              <Text style={styles.dateTimeText}>{formatEventDate(event.date)}</Text>
            </View>
            {event.time && (
              <View style={styles.dateTimeBadge}>
                <Ionicons name="time" size={16} color={colors.violet[400]} />
                <Text style={styles.dateTimeText}>{event.time}</Text>
              </View>
            )}
          </View>

          {event.genre && (
            <TouchableOpacity 
              style={styles.genreBadge}
              onPress={() => router.push(`/(tabs)/explore?genre=${encodeURIComponent(event.genre || '')}`)}
            >
              <Ionicons name="musical-notes" size={14} color={colors.violet[300]} />
              <Text style={styles.genreText}>{event.genre}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.violet[400]} />
            </TouchableOpacity>
          )}

          {/* Packages / Bottle Service */}
          {safePackages.length > 0 && (
            <View style={styles.packagesSection}>
              <Text style={styles.sectionTitle}>🍾 Bottle Service</Text>
              <View style={styles.packagesContainer}>
                {safePackages.map((pkg, index) => (
                  <View key={pkg.id || index} style={styles.packageCard}>
                    <View style={styles.packageHeader}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <Text style={styles.packagePrice}>${pkg.price}</Text>
                    </View>
                    {pkg.description && (
                      <Text style={styles.packageDescription}>{pkg.description}</Text>
                    )}
                    <View style={styles.packageDetails}>
                      {pkg.bottleCount && (
                        <View style={styles.packageDetail}>
                          <Ionicons name="wine" size={14} color={colors.violet[400]} />
                          <Text style={styles.packageDetailText}>{pkg.bottleCount} bottles</Text>
                        </View>
                      )}
                      {pkg.maxGuests && (
                        <View style={styles.packageDetail}>
                          <Ionicons name="people" size={14} color={colors.violet[400]} />
                          <Text style={styles.packageDetailText}>Up to {pkg.maxGuests} guests</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.bookNowBtn} onPress={handleBookTable}>
                <LinearGradient
                  colors={[colors.violet[600], colors.violet[700]]}
                  style={styles.bookNowGradient}
                >
                  <Ionicons name="wine" size={20} color="#fff" />
                  <Text style={styles.bookNowText}>Book a Table</Text>
                </LinearGradient>
              </TouchableOpacity>
              {event.bookingMode === 'request' && (
                <Text style={styles.bookingModeHint}>
                  Request-based booking • Chat with {partnerName} to confirm
                </Text>
              )}
            </View>
          )}

          {/* Why Recommended */}
          {event.why_recommended && (
            <View style={styles.whyCard}>
              <LinearGradient 
                colors={[colors.violet[600] + '30', colors.violet[700] + '20']} 
                style={styles.whyGradient}
              >
                <Ionicons name="sparkles" size={20} color={colors.violet[400]} />
                <View style={styles.whyContent}>
                  <Text style={styles.whyTitle}>WHY THIS EVENT IS WORTH GOING</Text>
                  <Text style={styles.whyText}>{event.why_recommended}</Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {event.crowd_type && (
            <View style={styles.infoCard}>
              <Ionicons name="people" size={20} color={colors.pink[400]} />
              <Text style={styles.infoLabel}>Expected Crowd:</Text>
              <Text style={styles.infoValue}>{event.crowd_type}</Text>
            </View>
          )}

          {event.peak_hours && (
            <View style={styles.peakCard}>
              <LinearGradient colors={[colors.orange[600] + '40', colors.red[600] + '30']} style={styles.peakGradient}>
                <View style={styles.peakHeader}>
                  <Ionicons name="flame" size={22} color={colors.orange[400]} />
                  <Text style={styles.peakTitle}>Peak Hours</Text>
                </View>
                <Text style={styles.peakText}>{event.peak_hours}</Text>
              </LinearGradient>
            </View>
          )}

          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}

          {lineupArray.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lineup</Text>
              <View style={styles.lineupContainer}>
                {displayedLineup.map((artist, index) => (
                  <View key={index} style={styles.lineupItem}>
                    <View style={styles.lineupAvatar}>
                      <Ionicons name="person" size={18} color={colors.violet[400]} />
                    </View>
                    <Text style={styles.lineupName}>{artist}</Text>
                    {index === 0 && (
                      <View style={styles.headlinerBadge}>
                        <Text style={styles.headlinerText}>HEADLINER</Text>
                      </View>
                    )}
                  </View>
                ))}
                {hasMoreLineup && (
                  <TouchableOpacity 
                    style={styles.seeMoreBtn}
                    onPress={() => setShowFullLineup(!showFullLineup)}
                  >
                    <Text style={styles.seeMoreText}>
                      {showFullLineup ? 'Show Less' : `See ${lineupArray.length - 5} More`}
                    </Text>
                    <Ionicons 
                      name={showFullLineup ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={colors.violet[400]} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {event.venue_name && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <TouchableOpacity style={styles.venueCard} onPress={handleVenuePress} activeOpacity={0.8}>
                <View style={styles.venueIcon}>
                  <Ionicons name="location" size={24} color={colors.violet[500]} />
                </View>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{event.venue_name}</Text>
                  {event.venue_address && (
                    <Text style={styles.venueAddress}>{event.venue_address}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.zinc[500]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.directionsBtn} onPress={handleDirections}>
                <Ionicons name="navigate" size={18} color={colors.violet[400]} />
                <Text style={styles.directionsBtnText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          )}

          {relatedEvents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More {event.genre} Events</Text>
              <EventCarousel events={relatedEvents} />
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <LinearGradient
          colors={[colors.zinc[900] + 'F0', colors.zinc[900]]}
          style={styles.bottomGradient}
        >
          <TouchableOpacity style={styles.addToPlanCompact} onPress={handleAddToPlan} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={22} color="#fff" />
            <Text style={styles.addToPlanCompactText}>Plan</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          {hasBookingOptions ? (
            <TouchableOpacity style={styles.bookTableBtn} onPress={handleBookTable} activeOpacity={0.8}>
              <Ionicons name="wine" size={18} color="#fff" />
              <Text style={styles.bookTableBtnText}>Book Table</Text>
            </TouchableOpacity>
          ) : event.ticket_url ? (
            <TouchableOpacity style={styles.ticketBtn} onPress={handleGetTickets} activeOpacity={0.8}>
              <Ionicons name="ticket" size={18} color={colors.violet[600]} />
              <Text style={styles.ticketBtnText}>Get Tickets</Text>
            </TouchableOpacity>
          ) : event.partner?.id ? (
            <TouchableOpacity style={styles.messageBtn} onPress={handleMessagePromoter} activeOpacity={0.8}>
              <Ionicons name="chatbubble" size={18} color={colors.violet[400]} />
              <Text style={styles.messageBtnText}>Message {partnerName}</Text>
            </TouchableOpacity>
          ) : null}
        </LinearGradient>
      </View>

      <AddEventToPlanSheet
        visible={showAddToPlan}
        onClose={() => setShowAddToPlan(false)}
        event={{
          id: event.id,
          title: event.title,
          image_url: event.image_url || undefined,
          genre: event.genre || undefined,
          venue_name: event.venue_name || undefined,
          date: event.date,
        }}
        onSuccess={handleAddToPlanSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.zinc[900] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.zinc[900], gap: 12 },
  loadingText: { fontSize: 16, color: colors.zinc[400] },
  errorText: { fontSize: 18, color: colors.zinc[400], marginTop: 12 },
  backBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.violet[600], borderRadius: 12 },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  scrollView: { flex: 1 },
  header: { height: HEADER_HEIGHT, position: 'relative' },
  headerImage: { width: '100%', height: '100%' },
  headerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%' },
  backButton: { position: 'absolute', left: 16, zIndex: 10 },
  saveButton: { position: 'absolute', right: 64, zIndex: 10 },
  shareButton: { position: 'absolute', right: 16, zIndex: 10 },
  iconButton: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  content: { 
    backgroundColor: colors.zinc[900], 
    borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    marginTop: -24, 
    paddingTop: 24, paddingHorizontal: 20,
  },
  eventTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 12 },
  dateTimeRow: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  dateTimeBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.zinc[800], paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  dateTimeText: { fontSize: 14, color: colors.zinc[300], fontWeight: '500' },
  genreBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: colors.violet[600] + '30', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    marginBottom: 20,
  },
  genreText: { fontSize: 14, color: colors.violet[300], fontWeight: '600' },
  packagesSection: { marginBottom: 24 },
  packagesContainer: { gap: 12, marginBottom: 16 },
  packageCard: {
    backgroundColor: colors.zinc[800],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.violet[600] + '30',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  packagePrice: { fontSize: 20, fontWeight: '700', color: colors.violet[400] },
  packageDescription: { fontSize: 14, color: colors.zinc[400], marginBottom: 12 },
  packageDetails: { flexDirection: 'row', gap: 16 },
  packageDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  packageDetailText: { fontSize: 13, color: colors.zinc[300] },
  bookNowBtn: { borderRadius: 14, overflow: 'hidden' },
  bookNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  bookNowText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  bookingModeHint: {
    fontSize: 12,
    color: colors.zinc[500],
    textAlign: 'center',
    marginTop: 8,
  },
  whyCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  whyGradient: { flexDirection: 'row', padding: 16, gap: 12, alignItems: 'flex-start' },
  whyContent: { flex: 1 },
  whyTitle: { fontSize: 12, color: colors.violet[300], fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  whyText: { fontSize: 15, color: '#fff', lineHeight: 22, fontStyle: 'italic' },
  infoCard: { 
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.zinc[800], padding: 14, borderRadius: 14, marginBottom: 12,
  },
  infoLabel: { fontSize: 14, color: colors.zinc[400], fontWeight: '500' },
  infoValue: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '600' },
  peakCard: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  peakGradient: { padding: 16 },
  peakHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  peakTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  peakText: { fontSize: 15, color: '#fff', lineHeight: 22 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  descriptionText: { fontSize: 15, color: colors.zinc[300], lineHeight: 24 },
  lineupContainer: { gap: 10 },
  lineupItem: { 
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.zinc[800], padding: 12, borderRadius: 12,
  },
  lineupAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.violet[600] + '30',
    justifyContent: 'center', alignItems: 'center',
  },
  lineupName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  headlinerBadge: {
    backgroundColor: colors.orange[600] + '40', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  headlinerText: { fontSize: 10, fontWeight: '700', color: colors.orange[400], letterSpacing: 0.5 },
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  seeMoreText: { fontSize: 14, color: colors.violet[400], fontWeight: '600' },
  venueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.zinc[800], padding: 16, borderRadius: 14,
  },
  venueIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: colors.violet[600] + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  venueInfo: { flex: 1 },
  venueName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  venueAddress: { fontSize: 13, color: colors.zinc[400] },
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12, backgroundColor: colors.zinc[800], borderRadius: 12,
  },
  directionsBtnText: { fontSize: 14, fontWeight: '600', color: colors.violet[400] },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  bottomGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 16, paddingHorizontal: 20, gap: 12,
  },
  addToPlanCompact: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.zinc[800], paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
  },
  addToPlanCompactText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionDivider: { width: 1, height: 30, backgroundColor: colors.zinc[700] },
  bookTableBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.violet[600], paddingVertical: 14, borderRadius: 14,
  },
  bookTableBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  ticketBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.violet[600] + '20', paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.violet[600],
  },
  ticketBtnText: { fontSize: 15, fontWeight: '600', color: colors.violet[400] },
  messageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.zinc[800], paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.violet[600] + '50',
  },
  messageBtnText: { fontSize: 15, fontWeight: '600', color: colors.violet[400] },
});
