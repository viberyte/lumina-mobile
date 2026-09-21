import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Share,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import InlineReel from '../../components/InlineReel';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createPlan, addVenueToPlan } from '../../services/plansService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCachedFlow } from '../../utils/flowCache';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOODS: Record<string, { grad1: [string,string,string,string]; accent: string }> = {
  romantic:    { grad1: ['#1a0008','#6b0f2a','#a01040','#1a0008'], accent: '#f9a8c9' },
  girls_night: { grad1: ['#0a0020','#3b0f8c','#6d28d9','#0a0020'], accent: '#d8b4fe' },
  guys_night:  { grad1: ['#000814','#0c2461','#1a56db','#000814'], accent: '#93c5fd' },
  late_night:  { grad1: ['#020208','#0f0e30','#1e1b4b','#020208'], accent: '#a5b4fc' },
  weekend:     { grad1: ['#011008','#054d2a','#065f46','#011008'], accent: '#6ee7b7' },
  pregame:     { grad1: ['#0f0800','#7c3d00','#b45309','#0f0800'], accent: '#fcd34d' },
  group:       { grad1: ['#010810','#08304f','#0369a1','#010810'], accent: '#7dd3fc' },
};
const DEFAULT_MOOD = MOODS.late_night;

export default function FlowDetailScreen() {
  const { slug, flowData } = useLocalSearchParams<{ slug: string; flowData: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStop, setActiveStop] = useState(0);
  const [saved, setSaved] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const saveAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { loadFlow(); }, [slug, flowData]);

  const loadFlow = async () => {
    try {
      // Check in-memory cache first — guarantees same venues as card
      const cached = getCachedFlow(slug);
      if (cached) {
        setFlow(cached);
        setLoading(false);
        return;
      }
      // Fallback — fetch if navigated directly
      const savedCity = await AsyncStorage.getItem('@lumina_selected_city');
      const profile = await AsyncStorage.getItem('@lumina_profile');
      const persona = profile ? JSON.parse(profile) : null;
      const city = savedCity || 'Manhattan';
      const music = persona?.music_preferences?.[0] || '';
      const url = `https://viberyte.com/api/flows?city=${encodeURIComponent(city)}${music ? '&music=' + encodeURIComponent(music) : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && data.flows?.length > 0) {
        const matched = data.flows.find((f: any) => f.slug === slug) || data.flows[0];
        setFlow(matched);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved(!saved);
    Animated.sequence([
      Animated.timing(saveAnim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(saveAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    // Save to AsyncStorage
    try {
      const existing = await AsyncStorage.getItem('@lumina_saved_flows');
      const savedFlows = existing ? JSON.parse(existing) : [];
      if (!saved) {
        savedFlows.push({ slug: flow.slug, title: flow.title, savedAt: new Date().toISOString() });
      } else {
        const idx = savedFlows.findIndex((f: any) => f.slug === flow.slug);
        if (idx !== -1) savedFlows.splice(idx, 1);
      }
      await AsyncStorage.setItem('@lumina_saved_flows', JSON.stringify(savedFlows));
    } catch (e) {}
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this ${flow.title} flow on Lumina — ${flow.stops.map((s: any) => s.venue?.name || s.event?.title || s.roleLabel).join(' → ')}\n\nhttps://lumina.viberyte.com`,
        title: flow.title,
      });
    } catch (e) {}
  };

  const handleViewVenue = (stop: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stop.type === 'venue' && stop.venue?.id) {
      router.push(`/venue/${stop.venue.id}` as any);
    } else if (stop.type === 'event' && stop.event?.id) {
      router.push(`/event/${stop.event.id}` as any);
    }
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveStop(idx);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#8B5CF6" size="large" />
      </View>
    );
  }

  if (!flow) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff' }}>Flow not found</Text>
      </View>
    );
  }

  const mood = MOODS[flow.intent] || DEFAULT_MOOD;

  return (
    <View style={styles.container}>
      {/* Full screen stop carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {flow.stops.map((stop: any, i: number) => {
          const photo = stop.type === 'event' ? stop.event?.image : stop.venue?.photo;
          const reelUrl = stop.type === 'venue' ? stop.venue?.reel_url || null : null;
          const name = stop.type === 'event' ? stop.event?.title : stop.venue?.name;
          const sub = stop.type === 'event' ? stop.event?.venueName : stop.venue?.neighborhood;
          const photoUri = photo?.startsWith('http') ? photo : photo ? `https://viberyte.com${photo}` : null;

          return (
            <View key={i} style={[styles.stopPage, { width: SCREEN_WIDTH }]}>
              {/* Background */}
              {photoUri ? (
                <>
                  <InlineReel
                    reelUrl={reelUrl}
                    photoUrl={photoUri}
                    style={StyleSheet.absoluteFill}
                    shouldPlay={i === activeStop}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                    style={StyleSheet.absoluteFill}
                  />
                </>
              ) : (
                <LinearGradient colors={mood.grad1} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              )}

              {/* Stop content */}
              <View style={[styles.stopContent, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 160 }]}>
                {/* Stop label */}
                <View style={styles.stopLabelRow}>
                  <Text style={styles.stopNumber}>Stop {i + 1} of {flow.stops.length}</Text>
                  {stop.type === 'event' && (
                    <View style={[styles.eventBadge, { backgroundColor: mood.accent + '25', borderColor: mood.accent + '60' }]}>
                      <Text style={[styles.eventBadgeText, { color: mood.accent }]}>LIVE EVENT</Text>
                    </View>
                  )}
                </View>

                {/* Role */}
                <Text style={styles.stopRole}>{stop.roleLabel.toUpperCase()}</Text>

                {/* Venue name */}
                <Text style={styles.stopName}>{name || stop.roleLabel}</Text>

                {/* Neighborhood */}
                {sub ? <Text style={styles.stopSub}>{sub}</Text> : null}

                {/* View Venue button */}
                <TouchableOpacity
                  style={[styles.viewVenueBtn, { borderColor: mood.accent + '60', backgroundColor: mood.accent + '18' }]}
                  onPress={() => handleViewVenue(stop)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.viewVenueBtnText, { color: mood.accent }]}>
                    {stop.type === 'event' ? 'View Event' : 'View Venue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={mood.accent} />
                </TouchableOpacity>
              </View>

              {/* Swipe hint on first stop */}
              {i === 0 && flow.stops.length > 1 && (
                <View style={styles.swipeHint}>
                  <Text style={styles.swipeHintText}>Swipe to see next stop</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Top bar — back + title */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>{flow.title}</Text>
          {/* Stop dots */}
          <View style={styles.dotsRow}>
            {flow.stops.map((_: any, i: number) => (
              <TouchableOpacity
                key={i}
                onPress={() => scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true })}
              >
                <View style={[
                  styles.dot,
                  i === activeStop && { backgroundColor: mood.accent, width: 18 }
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Bottom CTA bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {/* Save */}
        <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleSave}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={24}
              color={saved ? mood.accent : 'rgba(255,255,255,0.7)'}
            />
            <Text style={[styles.iconBtnLabel, saved && { color: mood.accent }]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Start Night — main CTA */}
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: mood.accent }]}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              // Create a plan from this flow
              const plan = await createPlan({
                name: flow.title,
                emoji: '',
                date: new Date().toISOString().split('T')[0],
              });
              // Add all venue stops to the plan
              for (const stop of flow.stops) {
                if (stop.venue?.id) {
                  await addVenueToPlan(plan.id, {
                    id: stop.venue.id,
                    name: stop.venue.name,
                    neighborhood: stop.venue.neighborhood,
                    professional_photo_url: stop.venue.photo,
                  });
                }
              }
              // Navigate to the plan
              console.log('PLAN CREATED:', plan.id, 'navigating to /plan/');
              router.push(`/plan/${plan.id}` as any);
            } catch (e: any) {
              console.log('START NIGHT ERROR:', e?.message, e);
              const firstStop = flow.stops[0];
              if (firstStop?.venue?.id) router.push(`/venue/${firstStop.venue.id}` as any);
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>Start Night</Text>
          <Ionicons name="arrow-forward" size={16} color="#000" />
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.iconBtnLabel}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  stopPage: {
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  stopContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'flex-end',
  },
  stopLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stopNumber: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  eventBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  eventBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  stopRole: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  stopName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 8,
  },
  stopSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 20,
    fontWeight: '400',
  },
  viewVenueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginBottom: 8,
  },
  viewVenueBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 180,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  topCenter: { flex: 1, alignItems: 'center', gap: 6 },
  topTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  iconBtn: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  iconBtnLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.3,
  },
});
