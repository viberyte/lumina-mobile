import GoingButton from "../../components/GoingButton"; // VBR_GOING_V1
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
import { ink, hair } from '../../theme/editorial'; // VBR_EVENT_EDITORIAL_V1
import VenueReels from '../../components/VenueReels'; // VBR_EVENT_VENUE_REELS_V1

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
  price_low?: number | null; // VBR_EVENT_PRICE_V1
  is_free?: boolean;
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

// VBR_EVENT_COLOR_V1 helpers
const hexRgb = (h: string) => { const m = /^#?([0-9a-f]{6})/i.exec(h || ''); if (!m) return null; const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const hexA = (h: string, a: number) => { const c = hexRgb(h); return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : 'rgba(0,0,0,0)'; };
const lum = (h: string) => { const c = hexRgb(h); if (!c) return 0; const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const satLight = (h: string) => { const c = hexRgb(h); if (!c) return [0, 0]; const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; const d = mx - mn; return [d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l]; };
const pickAccent = (r: any): string | null => {
  const cands = [r?.primary, r?.detail, r?.secondary, r?.background, r?.vibrant, r?.dominant, r?.lightVibrant, r?.darkVibrant].filter((x) => typeof x === 'string');
  const ok = cands.filter((h) => { const [sa, l] = satLight(h); return sa >= 0.35 && l >= 0.28 && l <= 0.72; });
  return ok.sort((a, b) => satLight(b)[0] - satLight(a)[0])[0] || null;
};

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
  const [artRatio, setArtRatio] = useState(1.1); // VBR_EVENT_EDITORIAL_V1: artwork shown at its own shape
  const [accent, setAccent] = useState<string | null>(null); // VBR_EVENT_COLOR_V1
  useEffect(() => {
    setAccent(null);
    const url = event?.image_url; if (!url) return;
    let alive = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getColors } = require('react-native-image-colors');
      getColors(url, { fallback: '#000000', cache: true, key: url, quality: 'low' }).then((r: any) => { if (alive) setAccent(pickAccent(r)); }).catch(() => {});
    } catch {}
    return () => { alive = false; };
  }, [event?.image_url]);

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
        price_low: (() => { const p = Number(result.event.price_low ?? result.event.priceLow ?? result.event.price_min ?? NaN); return Number.isFinite(p) && p > 0 ? p : null; })(),
        is_free: result.event.is_free === 1 || result.event.is_free === true || result.event.isFree === true,
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
    // Skeleton in the page's own shape: artwork, title, facts (no spinner)
    const bar = (w: number | string, h: number, mt = 0) => <View style={{ width: w as any, height: h, borderRadius: 6, backgroundColor: ink.raise, marginTop: mt }} />;
    return (
      <View style={{ flex: 1, backgroundColor: ink.black }}>
        <View style={{ width: SCREEN_WIDTH, height: Math.round(SCREEN_WIDTH * 1.1), backgroundColor: ink.ground }} />
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          {bar('78%', 30)}{bar('52%', 30, 8)}{bar('44%', 16, 18)}{bar('60%', 14, 10)}
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: '#c5a36b' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lineup = getLineupArray();
  // VBR_EVENT_EDITORIAL_V1: artwork first, then plain facts, the venue, the description, one clear action.
  const d = event.date ? parseEventDate(event.date) : null;
  const dateLine = [d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null, event.time ? formatEventTime(event.time) : null].filter(Boolean).join(' · ');
  const genre = event.genre ? event.genre.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : null;
  const primaryCTA = (event.ticket_url ? 'tickets' : null) as 'tickets' | 'book' | null; // VIBERYTE_CONSUMER_ONLY_V1: no table booking
  const artH = Math.round(SCREEN_WIDTH * Math.min(1.3, Math.max(0.8, artRatio)));
  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  const bottomAction = primaryCTA === 'tickets'
    ? { label: event.is_free ? 'Get tickets · Free' : event.price_low ? `Get tickets · from ${Math.round(event.price_low)}` : 'Get tickets', run: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); Linking.openURL(event.ticket_url!); } }
    : event.venue_address ? { label: 'Directions', run: openDirections } : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Solid bar that appears on scroll */}
      <Animated.View style={[styles.floatingNav, { opacity: navOpacity, paddingTop: insets.top }]} pointerEvents="box-none">
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={ink.ivory} />
        </TouchableOpacity>
        <Text style={styles.floatingNavTitle} numberOfLines={1}>{event.title}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.navBtn} accessibilityLabel="Share">
          <Ionicons name="share-outline" size={20} color={ink.ivory} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomAction ? 120 : 48 }}
      >
        {accent ? <LinearGradient pointerEvents="none" colors={[hexA(accent, 0.34), hexA(accent, 0.1), 'rgba(0,0,0,0)']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: artH, height: 560 }} /> : null}
        {/* ── ARTWORK: shown whole, not cropped or darkened ── */}
        <View style={{ width: SCREEN_WIDTH, height: artH, backgroundColor: ink.ground }}>
          {event.image_url ? (
            <ExpoImage source={{ uri: event.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250}
              onLoad={(e: any) => { const w = e?.source?.width, h = e?.source?.height; if (w && h) setArtRatio(h / w); }} />
          ) : null}
          <View style={[styles.artTop, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.artBtn} activeOpacity={0.8} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={22} color={ink.ivory} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={handleSaveEvent} style={styles.artBtn} activeOpacity={0.8} accessibilityLabel={isSaved ? 'Saved' : 'Save'}>
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={ink.ivory} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.artBtn} activeOpacity={0.8} accessibilityLabel="Share">
                <Ionicons name="share-outline" size={19} color={ink.ivory} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── TITLE + FACTS ── */}
        <View style={styles.head}>
          <Text style={styles.title}>{event.title}</Text>
          {dateLine ? <Text style={styles.date}>{dateLine}</Text> : null}
          {event.venue_name ? (
            <Text style={styles.venueLine} numberOfLines={1}>
              {event.venue_name}
              {event.venue_address ? <Text style={styles.link} onPress={openDirections}>{'  ·  View location'}</Text> : null}
            </Text>
          ) : null}
          {genre ? <Text style={styles.genre}>{genre}</Text> : null}
        </View>

        <View style={styles.hair} />

        {/* ── THE VENUE: who's hosting + its own reels ── */}
        <VenueReels venueId={event.venue_id} venueName={event.venue_name} />

        {/* ── DESCRIPTION ── */}
        {event.description ? (
          <View style={styles.block}>
            <Text style={styles.body}>{event.description.trim()}</Text>
          </View>
        ) : null}

        {/* ── LINEUP ── */}
        {lineup.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.h2}>Lineup</Text>
            {lineup.map((artist, i) => (
              <Text key={`${artist}-${i}`} style={[styles.lineupName, i > 0 && styles.lineupHair]}>{artist}</Text>
            ))}
          </View>
        ) : null}

        {/* ── ACTIONS ── */}
        <View style={[styles.block, { paddingHorizontal: 16 }]}>
          <View style={styles.group}>
            {event.venue_address ? (
              <TouchableOpacity style={styles.row} onPress={openDirections} activeOpacity={0.7}>
                <Ionicons name="navigate-outline" size={20} color={ink.ivory} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>Directions</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{event.venue_address}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={ink.faint} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.row, !!event.venue_address && styles.rowHair]} onPress={handleSaveEvent} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: isSaved }}>{/* VBR_EVENT_SAVE_ROW_V1 */}
              <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={ink.ivory} />
              <Text style={[styles.rowText, { flex: 1 }]}>{isSaved ? 'Saved' : 'Save'}</Text>
              {isSaved ? <Ionicons name="checkmark" size={18} color={ink.ivory} /> : null}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, styles.rowHair]} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={20} color={ink.ivory} />
              <Text style={[styles.rowText, { flex: 1 }]}>Share</Text>
              <Ionicons name="chevron-forward" size={16} color={ink.faint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── MORE LIKE THIS ── */}
        {relatedEvents.length > 0 ? (
          <View style={styles.block}>
            <Text style={[styles.h2, { paddingHorizontal: 20 }]}>{genre ? `More ${genre.toLowerCase()} nights` : 'More nights like this'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 14 }}>
              {relatedEvents.map((rel) => (
                <TouchableOpacity key={rel.id} style={{ width: 150 }} onPress={() => { tap(); router.push(`/event/${rel.id}`); }} activeOpacity={0.85}>
                  <View style={styles.relArt}>
                    {rel.image_url ? <ExpoImage source={{ uri: rel.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
                  </View>
                  <Text style={styles.relTitle} numberOfLines={2}>{rel.title}</Text>
                  {rel.venue_name ? <Text style={styles.relVenue} numberOfLines={1}>{rel.venue_name}</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* ── ONE CLEAR ACTION ── */}
      {bottomAction ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10, flexDirection: 'row', gap: 10 }]}>
          <TouchableOpacity style={[styles.cta, { flex: 1 }]} onPress={bottomAction.run} activeOpacity={0.9} accessibilityRole="button">
            <Text style={styles.ctaText}>{bottomAction.label}</Text>
          </TouchableOpacity>
<GoingButton slug={`e${event.id}`} name={event.title} sub={[event.venue_name, dateLine].filter(Boolean).join(" · ")} href={`/event/${event.id}`} image={event.image_url} compact />{/* VBR_GOING_V1 */}
        </View>
      ) : null}

      {showAddToPlan && event && (
        <AddEventToPlanSheet
          visible={showAddToPlan}
          event={{ id: event.id, title: event.title, date: event.date, venue_name: event.venue_name || '', image_url: event.image_url || '' }}
          onClose={() => setShowAddToPlan(false)}
          onSuccess={() => { setShowAddToPlan(false); showToast('Added to your plan', 'success'); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ink.black },
  loadingContainer: { flex: 1, backgroundColor: ink.black, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: ink.ivory, fontSize: 16, marginBottom: 16 },
  backBtn: { padding: 12 },
  floatingNav: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingBottom: 8, backgroundColor: ink.black, borderBottomWidth: hair, borderBottomColor: ink.line,
  },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  floatingNavTitle: { flex: 1, color: ink.ivory, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  artTop: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  artBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  head: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 22 },
  title: { color: ink.ivory, fontSize: 34, lineHeight: 38, fontWeight: '700', letterSpacing: -0.9 },
  date: { color: ink.ivory, fontSize: 17, lineHeight: 22, fontWeight: '500', marginTop: 14 },
  venueLine: { color: ink.gray, fontSize: 16, lineHeight: 22, marginTop: 4 },
  link: { color: ink.ivory, fontWeight: '500' },
  genre: { color: ink.faint, fontSize: 14, marginTop: 8 },
  hair: { height: hair, backgroundColor: ink.line, marginHorizontal: 20 },
  block: { paddingTop: 26 },
  body: { color: 'rgba(243,240,233,0.86)', fontSize: 16, lineHeight: 24, paddingHorizontal: 20 },
  h2: { color: ink.ivory, fontSize: 21, lineHeight: 26, fontWeight: '600', letterSpacing: -0.3, marginBottom: 6, paddingHorizontal: 0 },
  lineupName: { color: ink.ivory, fontSize: 17, paddingVertical: 12, marginHorizontal: 20 },
  lineupHair: { borderTopWidth: hair, borderTopColor: ink.line },
  group: { borderRadius: 14, backgroundColor: ink.raise, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  rowHair: { borderTopWidth: hair, borderTopColor: ink.line },
  rowText: { color: ink.ivory, fontSize: 16, fontWeight: '500' },
  rowSub: { color: ink.gray, fontSize: 13, marginTop: 2 },
  relArt: { width: 150, height: 188, borderRadius: 10, overflow: 'hidden', backgroundColor: ink.raise },
  relTitle: { color: ink.ivory, fontSize: 14, lineHeight: 18, fontWeight: '600', marginTop: 8 },
  relVenue: { color: ink.gray, fontSize: 13, marginTop: 2 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: ink.black, borderTopWidth: hair, borderTopColor: ink.line },
  cta: { height: 54, borderRadius: 27, backgroundColor: ink.ivory, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: ink.black, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
});
