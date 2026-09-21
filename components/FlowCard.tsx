import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { cacheFlow } from '../utils/flowCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_HEIGHT = 260;

interface FlowStop {
  stopNumber: number;
  roleLabel: string;
  roleSub?: string;
  type: 'venue' | 'event';
  venue?: { id: number; name: string; neighborhood: string; photo: string; };
  event?: { id: number; title: string; venueName: string; genre: string; };
}

interface Flow {
  id: number;
  slug: string;
  title: string;
  intent: string;
  stopCount: number;
  durationLabel: string;
  subtitle?: string;
  musicPersonalized: boolean;
  stops: FlowStop[];
}

// Apple Music style — each mood is a smooth multi-stop gradient wash
const MOODS: Record<string, {
  grad1: [string, string, string, string];
  grad2: [string, string, string, string];
  accent: string;
}> = {
  date: {
    grad1: ['#1a0008', '#6b0f2a', '#a01040', '#1a0008'],
    grad2: ['#3d0018', '#c41850', '#6b0f2a', '#0d0004'],
    accent: '#f9a8c9',
  },
  friends: {
    grad1: ['#0a0020', '#3b0f8c', '#6d28d9', '#0a0020'],
    grad2: ['#1a0050', '#7c3aed', '#4c1d95', '#050010'],
    accent: '#d8b4fe',
  },
  bros: {
    grad1: ['#000814', '#0c2461', '#1a56db', '#000814'],
    grad2: ['#001233', '#1e40af', '#0c2461', '#000814'],
    accent: '#93c5fd',
  },
  late_night: {
    grad1: ['#020208', '#0f0e30', '#1e1b4b', '#020208'],
    grad2: ['#050510', '#312e81', '#1e1b4b', '#020208'],
    accent: '#a5b4fc',
  },
  weekend: {
    grad1: ['#011008', '#054d2a', '#065f46', '#011008'],
    grad2: ['#022815', '#047857', '#054d2a', '#011008'],
    accent: '#6ee7b7',
  },
  pregame: {
    grad1: ['#0f0800', '#7c3d00', '#b45309', '#0f0800'],
    grad2: ['#1a0e00', '#d97706', '#78350f', '#0a0500'],
    accent: '#fcd34d',
  },
  celebration: {
    grad1: ['#010810', '#08304f', '#0369a1', '#010810'],
    grad2: ['#021020', '#0e4c78', '#0284c7', '#010810'],
    accent: '#7dd3fc',
  },
  brunch: {
    grad1: ['#1a0a00', '#7c3d12', '#c2692a', '#1a0a00'],
    grad2: ['#2a1000', '#e07b30', '#7c3d12', '#0f0800'],
    accent: '#fdba74',
  },
  business: {
    grad1: ['#060810', '#0f1a2e', '#1e2d4a', '#060810'],
    grad2: ['#0a0f1e', '#1e3a5f', '#0f1a2e', '#060810'],
    accent: '#93c5fd',
  },
  bros: {
    grad1: ['#050f08', '#0a2e1a', '#0f4a2a', '#050f08'],
    grad2: ['#081a10', '#0d6633', '#0a2e1a', '#050f08'],
    accent: '#6ee7b7',
  },
  ladies_night: {
    grad1: ['#1a0010', '#5c0a35', '#9c1060', '#1a0010'],
    grad2: ['#2a0020', '#b01050', '#5c0a35', '#0f0008'],
    accent: '#f9a8d4',
  },
  tomorrow: {
    grad1: ['#08080f', '#12102a', '#1e1c3a', '#08080f'],
    grad2: ['#100f20', '#2a2760', '#12102a', '#080810'],
    accent: '#c4b5fd',
  },
  culture: {
    grad1: ['#1a0f00', '#7c2d12', '#c2410c', '#1a0f00'],
    grad2: ['#2a1800', '#ea580c', '#7c2d12', '#0f0800'],
    accent: '#fdba74',
  },
  latin: {
    grad1: ['#1a0008', '#7c0a2e', '#d6195a', '#1a0008'],
    grad2: ['#2a0012', '#e0245e', '#7c0a2e', '#0f0006'],
    accent: '#fb7185',
  },
  afro: {
    grad1: ['#0f1400', '#2d4a0a', '#4d7c0f', '#0f1400'],
    grad2: ['#1a2400', '#65a30d', '#2d4a0a', '#0a0f00'],
    accent: '#bef264',
  },
};

const DEFAULT_MOOD = MOODS.late_night;

function getStopName(stop: FlowStop): string {
  const name = stop.type === 'event' ? stop.event?.title : stop.venue?.name;
  if (!name) return stop.roleLabel;
  return name.length > 18 ? name.slice(0, 17) + '…' : name;
}

function MoodBackground({ intent }: { intent: string }) {
  const mood = MOODS[intent] || DEFAULT_MOOD;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();
    return () => pulse.stopAnimation();
  }, []);

  const opacity2 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Base gradient */}
      <LinearGradient
        colors={mood.grad1}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Pulsing overlay gradient — crossfades smoothly */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacity2 }]}>
        <LinearGradient
          colors={mood.grad2}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Subtle dark vignette for text readability */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export default function FlowCard({ flow }: { flow: Flow }) {
  const router = useRouter();
  const mood = MOODS[flow.intent] || DEFAULT_MOOD;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cacheFlow(flow.slug, flow);
    router.push(`/flow/${flow.slug}` as any);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.88}>
      <MoodBackground intent={flow.intent} />

      <View style={styles.content}>
        {/* Title */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Text style={styles.title}>{flow.title}</Text>

          </View>
        </View>

        {/* Vertical stop list */}
        <View style={styles.stopsCol}>
          {flow.stops.map((stop, i) => (
            <View key={i} style={styles.stopRow}>
              <View style={styles.stopLine}>
                <View style={[styles.stopDot, { backgroundColor: mood.accent }]} />
                {i < flow.stops.length - 1 && (
                  <View style={[styles.connector, { backgroundColor: mood.accent + '35' }]} />
                )}
              </View>
              <View style={styles.stopText}>
                <Text style={styles.stopRole}>{stop.roleLabel.toUpperCase()}</Text>
                <Text style={styles.stopVenue} numberOfLines={1}>{getStopName(stop)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.meta}>
            {flow.stopCount} stops{flow.durationLabel ? `  ·  ${flow.durationLabel}` : ''}
          </Text>
          <View style={[styles.viewBtn, { borderColor: mood.accent + '45', backgroundColor: mood.accent + '18' }]}>
            <Text style={[styles.viewBtnText, { color: mood.accent }]}>View Flow</Text>
            <Ionicons name="chevron-forward" size={11} color={mood.accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 22,
    marginRight: 14,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    flex: 1,
    lineHeight: 26,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    marginLeft: 8,
    marginTop: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  stopsCol: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 2,
    gap: 0,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 46,
  },
  stopLine: {
    width: 18,
    alignItems: 'center',
    paddingTop: 5,
  },
  stopDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connector: {
    width: 1.5,
    flex: 1,
    marginTop: 4,
    minHeight: 20,
  },
  stopText: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 8,
  },
  stopRole: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  stopVenue: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: -0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  meta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.38)',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
