// components/VenueReels.tsx — VBR_EVENT_VENUE_REELS_V1
// On an event page: what the venue itself looks like, from the venue's own Instagram reels.
// Labeled plainly as the venue's content — not footage of this event.
// Data: GET /api/venues/:id/detail (same vetted reels as the venue page: owner-posted, approved venues only).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, FlatList, Dimensions, Platform, ViewToken } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const API = 'https://viberyte.com';
const { width: W, height: H } = Dimensions.get('window');
const C = { raise: '#1C1C1E', ivory: '#F3F0E9', muted: '#A7A4A0', faint: 'rgba(243,240,233,0.45)' };
type Reel = { url: string; poster: string | null; duration: number };
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

function Player({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = false; });
  useEffect(() => { try { player.play(); } catch {} }, [player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

function Viewer({ reels, start, handle, venue, onClose }: { reels: Reel[]; start: number; handle: string | null; venue: string; onClose: () => void }) {
  const [active, setActive] = useState(start);
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index != null) setActive(first.index);
  }).current;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={reels}
          keyExtractor={(r) => r.url}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: H, offset: H * i, index: i })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          windowSize={3}
          renderItem={({ item, index }) => (
            <View style={{ width: W, height: H, backgroundColor: '#000' }}>
              {item.poster ? <Image source={{ uri: item.poster }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              {index === active ? <Player uri={item.url} /> : null}
            </View>
          )}
        />
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']} style={s.viewerScrim} />
        <View style={s.viewerTop} pointerEvents="box-none">
          <View style={{ flex: 1 }}>
            <Text style={s.viewerVenue} numberOfLines={1}>{venue}</Text>
            <Text style={s.viewerNote} numberOfLines={1}>{handle ? `@${handle.replace('@', '')} · ` : ''}Venue’s own post, not this event · {active + 1}/{reels.length}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.circle} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={C.ivory} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function VenueReels({ venueId, venueName }: { venueId: number | string | null; venueName: string | null }) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [handle, setHandle] = useState<string | null>(null);
  const [name, setName] = useState<string>(venueName || '');
  const [at, setAt] = useState<number | null>(null);

  useEffect(() => {
    if (!venueId) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    fetch(`${API}/api/venues/${venueId}/detail`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok || !j.venue) return;
        const list: Reel[] = (j.venue.reels || []).filter((r: Reel, i: number, a: Reel[]) => !!r?.url && !!r.poster && a.findIndex((x) => x.url === r.url) === i);
        setReels(list); setHandle(j.venue.instagram_handle || null); if (j.venue.name) setName(j.venue.name);
        if (__DEV__) console.log('[venue reels]', venueId, list.length);
      })
      .catch(() => {})
      .finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [venueId]);

  if (!venueId || reels.length === 0) return null;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.label}>Inside the venue</Text>
        <TouchableOpacity onPress={() => { tap(); router.push(`/venue/${venueId}`); }} hitSlop={10} accessibilityLabel={`Open ${name}`}>
          <Text style={s.link}>View venue</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.note}>{handle ? `From @${handle.replace('@', '')}` : `From ${name}`} · the venue’s own posts, not footage of this event</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={s.row}>
        {reels.map((r, i) => (
          <TouchableOpacity key={r.url} activeOpacity={0.85} onPress={() => { tap(); setAt(i); }} style={s.thumb}
            accessibilityLabel={`Play ${name} reel ${i + 1} of ${reels.length}`}>
            <Image source={{ uri: r.poster! }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
            <LinearGradient pointerEvents="none" colors={['rgba(9,9,11,0)', 'rgba(9,9,11,0.7)']} style={s.scrim} />
            <View style={s.play}><Ionicons name="play" size={11} color={C.ivory} style={{ marginLeft: 1 }} /></View>
            {r.duration ? <Text style={s.dur}>{fmtDur(r.duration)}</Text> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
      {at !== null ? <Viewer reels={reels} start={at} handle={handle} venue={name} onClose={() => setAt(null)} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 28 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  label: { fontSize: 11, fontWeight: '700', color: '#52525b', letterSpacing: 1.2, textTransform: 'uppercase' },
  link: { color: C.ivory, fontSize: 14, fontWeight: '600' },
  note: { color: C.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 20, marginTop: 6 },
  row: { paddingHorizontal: 20, gap: 10, paddingTop: 12 },
  thumb: { width: 132, height: 176, borderRadius: 12, overflow: 'hidden', backgroundColor: C.raise },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 64 },
  play: {
    position: 'absolute', left: 10, bottom: 10, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(9,9,11,0.55)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  dur: { position: 'absolute', right: 10, bottom: 13, color: C.ivory, fontSize: 12, fontWeight: '600' },
  viewerScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  viewerTop: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 32, left: 20, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewerVenue: { color: C.ivory, fontSize: 16, fontWeight: '700' },
  viewerNote: { color: C.faint, fontSize: 12, marginTop: 2 },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,23,0.8)', alignItems: 'center', justifyContent: 'center' },
});
