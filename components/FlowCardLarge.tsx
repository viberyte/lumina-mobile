import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { cacheFlow } from '../utils/flowCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const REEL_HEIGHT = Math.round(CARD_WIDTH * 0.62);

const MOODS: Record<string, { grad: [string, string]; accent: string }> = {
  date:        { grad: ['#6b0f2a', '#1a0008'], accent: '#f9a8c9' },
  friends:     { grad: ['#4c1d95', '#0a0020'], accent: '#d8b4fe' },
  celebration: { grad: ['#0e4c78', '#010810'], accent: '#7dd3fc' },
  late_night:  { grad: ['#1e1b4b', '#020208'], accent: '#a5b4fc' },
  weekend:     { grad: ['#054d2a', '#011008'], accent: '#6ee7b7' },
  afro:        { grad: ['#2d4a0a', '#0f1400'], accent: '#bef264' },
  latin:       { grad: ['#7c0a2e', '#1a0008'], accent: '#fb7185' },
  culture:     { grad: ['#7c2d12', '#1a0f00'], accent: '#fdba74' },
  business:    { grad: ['#1e3a5f', '#060810'], accent: '#93c5fd' },
  solo:        { grad: ['#312e81', '#020208'], accent: '#a5b4fc' },
  tomorrow:    { grad: ['#2a2760', '#08080f'], accent: '#c4b5fd' },
  brunch:      { grad: ['#7c3d12', '#1a0a00'], accent: '#fdba74' },
};
const DEFAULT_MOOD = MOODS.late_night;

function getStopName(stop: any): string {
  return (stop?.type === 'event' ? stop?.event?.title : stop?.venue?.name) || stop?.roleLabel || '';
}

export default function FlowCardLarge({ flow, isVisible }: { flow: any; isVisible: boolean }) {
  const router = useRouter();
  const mood = MOODS[flow.intent] || DEFAULT_MOOD;

  const mainStop = flow.stops?.[flow.stops.length - 1];
  const reelUrl: string | null = mainStop?.venue?.reel_url || null;
  const posterUrl: string | null =
    mainStop?.venue?.photo || flow.stops?.[0]?.venue?.photo || null;

  const player = useVideoPlayer(reelUrl ? { uri: reelUrl } : null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!reelUrl || !player) return;
    if (isVisible) {
      try { player.play(); setShowVideo(true); } catch {}
    } else {
      try { player.pause(); setShowVideo(false); } catch {}
    }
  }, [isVisible, reelUrl]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cacheFlow(flow.slug, flow);
    router.push(`/flow/${flow.slug}` as any);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.9}>
      <View style={styles.reelWrap}>
        {posterUrl && (
          <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        {reelUrl && showVideo && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.85)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.reelOverlay}>
          <Text style={styles.title}>{flow.title}</Text>
          {flow.subtitle ? <Text style={styles.subtitle}>{flow.subtitle}</Text> : null}
        </View>
      </View>

      <LinearGradient colors={mood.grad} style={styles.info}>
        <View style={styles.stops}>
          {flow.stops.map((stop: any, i: number) => (
            <View key={i} style={styles.stopRow}>
              <View style={[styles.dot, { backgroundColor: mood.accent }]} />
              <View style={styles.stopText}>
                <Text style={[styles.role, { color: mood.accent }]}>
                  {String(stop.roleLabel || '').toUpperCase()}
                </Text>
                <Text style={styles.venue} numberOfLines={1}>{getStopName(stop)}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.meta}>
            {flow.stopCount} stops{flow.durationLabel ? `  ·  ${flow.durationLabel}` : ''}
          </Text>
          <View style={[styles.viewBtn, { borderColor: mood.accent + '55', backgroundColor: mood.accent + '1a' }]}>
            <Text style={[styles.viewBtnText, { color: mood.accent }]}>View Flow</Text>
            <Ionicons name="chevron-forward" size={12} color={mood.accent} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, borderRadius: 22, overflow: 'hidden', marginBottom: 20, backgroundColor: '#0a0a0a' },
  reelWrap: { width: '100%', height: REEL_HEIGHT, backgroundColor: '#111' },
  reelOverlay: { position: 'absolute', left: 18, right: 18, bottom: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  info: { padding: 18 },
  stops: { gap: 12 },
  stopRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  stopText: { flex: 1 },
  role: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 1 },
  venue: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.96)', letterSpacing: -0.3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  viewBtnText: { fontSize: 13, fontWeight: '600' },
});
