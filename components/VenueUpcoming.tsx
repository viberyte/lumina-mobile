// components/VenueUpcoming.tsx — VBR_VENUE_EVENTS_V1: "Upcoming here" on venue pages.
// Flyers at their own shape-ish (4:5), title + date under the artwork. Hidden when the venue has nothing coming up.
// Data: GET /api/venues/:id/events
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ink } from '../theme/editorial';

const API = 'https://viberyte.com';
type Ev = { id: number; title: string; date: string; time: string | null; image_url: string | null; price_low: number | null; is_free: boolean };
const img = (u?: string | null) => (u ? (u.startsWith('/') ? API + u : u) : null);
const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const hour = (t: string | null) => {
  if (!t) return null; if (/am|pm/i.test(t)) return t.toUpperCase().replace(/\s+/g, ' ');
  const [h, m] = t.split(':').map(Number); if (isNaN(h)) return null;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function VenueUpcoming({ venueId }: { venueId: number | string }) {
  const [events, setEvents] = useState<Ev[]>([]);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    fetch(`${API}/api/venues/${venueId}/events?limit=12`, { signal: ctrl.signal })
      .then((r) => r.json()).then((j) => { if (j?.ok) { setEvents(j.events || []); setTotal(j.total || 0); } })
      .catch(() => {}).finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [venueId]);
  if (!events.length) return null;
  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.h2}>Upcoming here</Text>
        {total > events.length ? <Text style={s.count}>{total} nights</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" contentContainerStyle={s.row}>
        {events.map((e) => (
          <TouchableOpacity key={e.id} style={s.card} activeOpacity={0.85} accessibilityLabel={`${e.title}, ${day(e.date)}`}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push(`/event/${e.id}`); }}>
            <View style={s.art}>{img(e.image_url) ? <Image source={{ uri: img(e.image_url)! }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} /> : (
              <View style={s.noArt}><Text style={s.noArtDay}>{new Date(`${e.date}T12:00:00`).getDate()}</Text><Text style={s.noArtMon}>{new Date(`${e.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' })}</Text></View>
            )}</View>
            <Text style={s.date} numberOfLines={1}>{[day(e.date), hour(e.time)].filter(Boolean).join(' · ')}</Text>
            <Text style={s.title} numberOfLines={2}>{e.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingBottom: 34 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20 },
  h2: { color: ink.ivory, fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  count: { color: ink.gray, fontSize: 14 },
  row: { paddingHorizontal: 20, gap: 12, paddingTop: 12 },
  card: { width: 150 },
  art: { width: 150, height: 188, borderRadius: 10, overflow: 'hidden', backgroundColor: ink.raise },
  noArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noArtDay: { color: ink.ivory, fontSize: 34, fontWeight: '600' },
  noArtMon: { color: ink.gray, fontSize: 14, marginTop: 2 },
  date: { color: ink.gray, fontSize: 13, marginTop: 8 },
  title: { color: ink.ivory, fontSize: 14, lineHeight: 18, fontWeight: '600', marginTop: 2 },
});
