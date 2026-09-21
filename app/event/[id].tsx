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
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingScreen from '../../components/LoadingScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import luminaApi from '../../services/lumina';
import { colors } from '../../theme';
import AddEventToPlanSheet from '../../components/AddEventToPlanSheet';
import { useToast } from '../../contexts/ToastContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.55;
const API_URL = 'https://viberyte.com';

const parseEventDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  if (dateString.includes('T')) return new Date(dateString);
  const parts = dateString.split('-').map(p => parseInt(p));
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date(dateString);
};

const formatEventDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = parseEventDate(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const formatEventTime = (timeString: string): string => {
  if (!timeString) return '';
  if (timeString.includes('AM') || timeString.includes('PM')) return timeString;
  const parts = timeString.split(':');
  let hours = parseInt(parts[0]);
  const minutes = parts[1] || '00';
  if (isNaN(hours)) return timeString;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return minutes === '00' ? `${hours} ${ampm}` : `${hours}:${minutes} ${ampm}`;
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
  const [isSaved, setIsSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddToPlan, setShowAddToPlan] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const safePackages = useMemo(() => {
    return (event?.packages || []).filter(
      (p): p is Package => !!p?.name && typeof p.price === 'number'
    );
  }, [event?.packages]);

  // Trust the server's gate: only paying NightLink venues get booking options.
  // Free + scraped events come back hasBookingOptions=false (flyer only).
  const hasBookingOptions = event?.hasBookingOptions === true;

  // Parallax hero
  const heroTranslate = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [HERO_HEIGHT * 0.4, 0, -HERO_HEIGHT * 0.3],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.5],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const navOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT * 0.4, HERO_HEIGHT * 0.7],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (id) loadUserIdThenFetch();
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
    } catch {}
    setUserId('guest');
    return 'guest';
  };

  const checkInstagramVerified = async (): Promise<boolean> => {
    try {
      const profile = await AsyncStorage.getItem('@lumina_profile');
      const user = profile ? JSON.parse(profile) : null;
      return !!user?.instagram_verified_at;
    } catch { return false; }
  };

  const checkIfSaved = async (uid: string) => {
    if (!uid || uid === 'guest') return;
    try {
      const response = await fetch(`${API_URL}/api/favorites?userId=${uid}&type=event`);
      const data = await response.json();
      const saved = data.items?.some((item: { item_id: number }) => item.item_id === Number(id));
      setIsSaved(saved || false);
    } catch {}
  };

  const handleSaveEvent = async () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (isSaved) {
        await fetch(`${API_URL}/api/favorites?userId=${userId}&itemType=event&itemId=${id}`, { method: 'DELETE' });
        setIsSaved(false);
        showToast('Removed from saved', 'info');
      } else {
        await fetch(`${API_URL}/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, itemType: 'event', itemId: Number(id) }),
        });
        setIsSaved(true);
        showToast('Saved', 'success');
      }
    } catch {
      showToast('Could not save', 'error');
    }
  };

  const handleBookTable = async () => {
    if (bookingLoading || !event) return;
    setBookingLoading(true);
    const isVerified = await checkInstagramVerified();
    if (!isVerified) {
      showToast('Verify Instagram to book tables', 'info');
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

  const handleMessagePromoter = async () => {
    if (!event?.partner?.id) return;
    const isVerified = await checkInstagramVerified();
    if (!isVerified) {
      router.push('/verify/instagram');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/booking/chat',
      params: { partner_id: String(event.partner.id), event_id: String(event.id), venue_name: event.venue_name || '' },
    });
  };

  const fetchEvent = async (uid: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/events/${id}`);
      const result = await response.json();
      if (!result.success || !result.event) throw new Error('Event not found');
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
      if (eventData.genre) {
        try {
          const related = await luminaApi.getEventsByGenre(eventData.city, eventData.genre);
          setRelatedEvents((related || []).filter((e: RelatedEvent) => e.id !== eventData.id).slice(0, 6));
        } catch {}
      }
    } catch (error) {
      showToast('Could not load event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openDirections = () => {
    if (!event?.venue_address) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const encoded = encodeURIComponent(event.venue_address);
    const url = `https://maps.apple.com/?daddr=${encoded}`;
    Linking.openURL(url);
  };

  const handleShare = async () => {
    if (!event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${event.title} at ${event.venue_name || event.city}\n${formatEventDate(event.date)}\n\nhttps://viberyte.com/e/${event.id}`,
      });
    } catch {}
  };

  const getLineupArray = (): string[] => {
    if (!event?.lineup) return [];
    if (Array.isArray(event.lineup)) return event.lineup;
    try { return JSON.parse(event.lineup); } catch {}
    return event.lineup.split(',').map(s => s.trim()).filter(Boolean);
  };

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: '#8b5cf6' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lineup = getLineupArray();
  const timeDisplay = event.time ? formatEventTime(event.time) : null;
  const dateDisplay = event.date ? formatEventDate(event.date) : null;
  const primaryCTA = event.ticket_url ? 'tickets' : hasBookingOptions ? 'book' : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Floating nav bar — appears on scroll */}
      <Animated.View style={[styles.floatingNav, { opacity: navOpacity, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingNavBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.floatingNavTitle} numberOfLines={1}>{event.title}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.floatingNavBtn}>
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── HERO ── */}
        <View style={styles.heroContainer}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: heroTranslate }] }]}>
            <ExpoImage
              source={{ uri: event.image_url || '' }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={300}
            />
          </Animated.View>

          {/* Deep gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)', '#000']}
            locations={[0, 0.4, 0.75, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back + Share — always visible */}
          <View style={[styles.heroTopRow, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.heroBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTopRight}>
              <TouchableOpacity onPress={handleSaveEvent} style={styles.heroBtn} activeOpacity={0.8}>
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved ? '#a78bfa' : '#fff'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.heroBtn} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero content */}
          <Animated.View style={[styles.heroContent, { opacity: heroOpacity }]}>
            {event.genre && (
              <View style={styles.genrePill}>
                <Ionicons name="musical-note" size={11} color="#a78bfa" />
                <Text style={styles.genrePillText}>{event.genre}</Text>
              </View>
            )}
            <Text style={styles.heroTitle}>{event.title}</Text>
            <Text style={styles.heroMeta}>
              {event.venue_name}{dateDisplay ? ` · ${dateDisplay}` : ''}{timeDisplay ? ` · ${timeDisplay}` : ''}
            </Text>
          </Animated.View>
        </View>

        {/* ── PRIMARY CTA ── */}
        <View style={styles.ctaSection}>
          {primaryCTA === 'tickets' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Linking.openURL(event.ticket_url!); }}
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.primaryButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="ticket-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Get Tickets</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {primaryCTA === 'book' && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleBookTable} activeOpacity={0.9} disabled={bookingLoading}>
              <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.primaryButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="wine-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>{bookingLoading ? 'Loading...' : 'Reserve a Table'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddToPlan(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#a78bfa" />
            <Text style={styles.secondaryButtonText}>Add to Plan</Text>
          </TouchableOpacity>
        </View>

        {/* ── ABOUT ── */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.bodyText}>{event.description}</Text>
          </View>
        )}

        {/* ── LINEUP ── */}
        {lineup.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Lineup</Text>
            <View style={styles.lineupList}>
              {lineup.map((artist, i) => (
                <View key={i} style={styles.lineupItem}>
                  <View style={styles.lineupDot} />
                  <Text style={styles.lineupName}>{artist}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── YOUR NIGHT TIMELINE ── */}
        {event.venue_name && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your Night</Text>
            <View style={styles.timeline}>
              {timeDisplay && (
                <View style={styles.timelineRow}>
                  <Text style={styles.timelineTime}>{timeDisplay}</Text>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Arrive at {event.venue_name}</Text>
                    <Text style={styles.timelineSub}>{event.venue_address?.split(',').slice(0, 2).join(',') || event.city}</Text>
                  </View>
                </View>
              )}
              {event.peak_hours && (
                <View style={styles.timelineRow}>
                  <Text style={styles.timelineTime}>{event.peak_hours}</Text>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Peak energy</Text>
                    <Text style={styles.timelineSub}>Best time to be on the floor</Text>
                  </View>
                </View>
              )}
              {!timeDisplay && !event.peak_hours && (
                <View style={styles.timelineRow}>
                  <Text style={styles.timelineTime}>Tonight</Text>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{event.venue_name}</Text>
                    <Text style={styles.timelineSub}>{event.city}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── LOCATION MAP CARD ── */}
        {event.venue_address && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <TouchableOpacity style={styles.mapCard} onPress={openDirections} activeOpacity={0.85}>
              {/* Static map via Google Static Maps API */}
              <ExpoImage
                source={{ uri: `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(event.venue_address)}&zoom=15&size=600x200&scale=2&style=feature:all|element:labels.text.fill|color:0xffffff&style=feature:all|element:geometry|color:0x1a1a2e&style=feature:road|element:geometry|color:0x4a4a6a&style=feature:poi|visibility:off&markers=color:0x8b5cf6|${encodeURIComponent(event.venue_address)}&key=AIzaSyDemo` }}
                style={styles.mapImage}
                contentFit="cover"
              />
              {/* Fallback dark map placeholder */}
              <View style={styles.mapOverlay}>
                <View style={styles.mapInfo}>
                  <View style={styles.mapPin}>
                    <Ionicons name="location" size={16} color="#8b5cf6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapVenueName}>{event.venue_name}</Text>
                    <Text style={styles.mapAddress} numberOfLines={1}>{event.venue_address}</Text>
                  </View>
                  <View style={styles.directionsChip}>
                    <Text style={styles.directionsChipText}>Directions</Text>
                    <Ionicons name="arrow-forward" size={12} color="#a78bfa" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PROMOTER MESSAGE ── */}
        {event.partner?.id && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.promoterRow} onPress={handleMessagePromoter} activeOpacity={0.8}>
              <View style={styles.promoterIcon}>
                <Ionicons name="chatbubble-outline" size={18} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoterTitle}>Message the Promoter</Text>
                <Text style={styles.promoterSub}>Ask about the night, packages, or guest list</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#52525b" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── SIMILAR EVENTS — bottom, minimal ── */}
        {relatedEvents.length > 0 && (
          <View style={[styles.section, { marginTop: 32 }]}>
            <Text style={styles.sectionLabel}>More {event.genre} Events</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll} contentContainerStyle={{ gap: 12 }}>
              {relatedEvents.map(rel => (
                <TouchableOpacity
                  key={rel.id}
                  style={styles.relatedCard}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/event/${rel.id}`); }}
                  activeOpacity={0.85}
                >
                  <ExpoImage source={{ uri: rel.image_url || '' }} style={styles.relatedImage} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.relatedContent}>
                    <Text style={styles.relatedTitle} numberOfLines={2}>{rel.title}</Text>
                    <Text style={styles.relatedVenue} numberOfLines={1}>{rel.venue_name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {primaryCTA === 'tickets' ? (
          <TouchableOpacity
            style={styles.bottomPrimary}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Linking.openURL(event.ticket_url!); }}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.bottomPrimaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.bottomPrimaryText}>Get Tickets</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : primaryCTA === 'book' ? (
          <TouchableOpacity style={styles.bottomPrimary} onPress={handleBookTable} activeOpacity={0.9}>
            <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.bottomPrimaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.bottomPrimaryText}>Reserve a Table</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.bottomPrimary}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddToPlan(true); }}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.bottomPrimaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.bottomPrimaryText}>Add to Plan</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {showAddToPlan && event && (
        <AddEventToPlanSheet
          event={{ id: event.id, title: event.title, date: event.date, venue_name: event.venue_name || '', image_url: event.image_url || '' }}
          onClose={() => setShowAddToPlan(false)}
          onSuccess={() => { setShowAddToPlan(false); showToast('Added to your plan!', 'success'); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#fff', fontSize: 16, marginBottom: 16 },
  backBtn: { padding: 12 },

  // Floating nav
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  floatingNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  floatingNavTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },

  // Hero
  heroContainer: { height: HERO_HEIGHT, overflow: 'hidden' },
  heroTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  heroTopRight: { flexDirection: 'row', gap: 8 },
  heroBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  genrePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  genrePillText: { fontSize: 11, fontWeight: '600', color: '#a78bfa', letterSpacing: 0.5 },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 8,
  },
  heroMeta: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '400', letterSpacing: 0.1 },

  // CTA section
  ctaSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 10,
  },
  primaryButton: { borderRadius: 14, overflow: 'hidden' },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '500', color: '#a78bfa' },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#52525b',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  bodyText: { fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 24, fontWeight: '400' },

  // Lineup
  lineupList: { gap: 10 },
  lineupItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineupDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7c3aed' },
  lineupName: { fontSize: 16, color: '#e4e4e7', fontWeight: '500' },

  // Timeline
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingBottom: 20 },
  timelineTime: { width: 60, fontSize: 13, color: '#71717a', fontWeight: '500', paddingTop: 2 },
  timelineLine: { width: 1, backgroundColor: '#27272a', alignSelf: 'stretch', marginHorizontal: 0, marginTop: 6 },
  timelineContent: { flex: 1, paddingLeft: 14 },
  timelineTitle: { fontSize: 16, color: '#e4e4e7', fontWeight: '600', marginBottom: 3 },
  timelineSub: { fontSize: 13, color: '#71717a' },

  // Map card
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    height: 160,
  },
  mapImage: { ...StyleSheet.absoluteFillObject },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 14,
  },
  mapInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mapPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapVenueName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  mapAddress: { fontSize: 12, color: '#a1a1aa' },
  directionsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  directionsChipText: { fontSize: 12, color: '#a78bfa', fontWeight: '500' },

  // Promoter
  promoterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f1f',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f1f',
  },
  promoterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoterTitle: { fontSize: 15, fontWeight: '600', color: '#e4e4e7', marginBottom: 2 },
  promoterSub: { fontSize: 13, color: '#71717a' },

  // Related
  relatedScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  relatedCard: { width: 160, height: 200, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111' },
  relatedImage: { ...StyleSheet.absoluteFillObject },
  relatedContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  relatedTitle: { fontSize: 13, fontWeight: '600', color: '#fff', lineHeight: 17, marginBottom: 3 },
  relatedVenue: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bottomPrimary: { borderRadius: 14, overflow: 'hidden' },
  bottomPrimaryGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  bottomPrimaryText: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
});
