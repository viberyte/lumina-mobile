// components/explore/Hotspots.tsx — VBR_HOTSPOTS_V1: "Tonight's Hotspots" map layer + sheet.
// Server decides everything (/api/hotspots, lib/hotspots.ts). Off unless the server flag is on; dev builds preview it.
// Look: soft ivory illumination (three faint concentric circles) and one quiet label pill. No red, no crowd claims.
// Tap → sheet listing each party (time, title, venue) with a status, directions to each venue and to the area.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Linking, AppState } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API_BASE } from '../../config';

export type HotspotEvent = {
  id: number; title: string; venue_id: number; venue_name: string; lat: number; lng: number;
  start: string; start_label: string; image_url: string | null; ticket_url: string | null; genre: string | null;
  status: 'later' | 'soon' | 'on' | 'upcoming';
};
export type Hotspot = {
  id: string; night: string; lat: number; lng: number; radius_m: number; area: string; count: number; venues: number;
  first_start: string; last_start: string; label: string; sublabel: string; status: 'later' | 'soon' | 'on' | 'upcoming';
  events: HotspotEvent[];
};

const IVORY = '#F3F0E9';
const MUTED = 'rgba(243,240,233,0.6)';
const FAINT = 'rgba(243,240,233,0.38)';
const glow = (a: number) => `rgba(243,240,233,${a})`;

/** Fetches hotspots while `active`. Refreshes every 10 min and when the app returns to the foreground. */
export function useHotspots(active: boolean, scope: 'tonight' | 'weekend'): Hotspot[] {
  const [list, setList] = useState<Hotspot[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    if (!active) { setList([]); return; }
    const load = () => {
      const my = ++seq.current;
      fetch(`${API_BASE}/api/hotspots?scope=${scope}${__DEV__ ? '&preview=1' : ''}`)
        .then((r) => r.json())
        .then((d) => { if (my === seq.current) setList(d?.enabled && Array.isArray(d.hotspots) ? d.hotspots : []); })
        .catch(() => { if (my === seq.current) setList([]); });
    };
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    const a = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => { clearInterval(t); a.remove(); seq.current++; };
  }, [active, scope]);
  return list;
}

function HotspotMarker({ h, onPress }: { h: Hotspot; onPress: (h: Hotspot) => void }) {
  // Custom marker views need tracksViewChanges briefly so the bitmap is drawn, then off (keeps the map smooth).
  const [track, setTrack] = useState(true);
  useEffect(() => { setTrack(true); const t = setTimeout(() => setTrack(false), 700); return () => clearTimeout(t); }, [h.label, h.sublabel]);
  const live = h.status === 'on' || h.status === 'soon';
  return (
    <Marker
      coordinate={{ latitude: h.lat, longitude: h.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={track}
      zIndex={1}
      onPress={(e) => { e.stopPropagation?.(); onPress(h); }}
      accessibilityLabel={`${h.label}, ${h.sublabel}${h.area ? ', ' + h.area : ''}. Show the parties`}
    >
      <View style={st.pin} collapsable={false}>
        <View style={st.pinDotWrap} collapsable={false}>
          <View style={[st.pinDot, live && st.pinDotLive]} collapsable={false} />
        </View>
        <View collapsable={false}>
          <Text style={st.pinTitle}>{h.label}</Text>
          <Text style={st.pinSub}>{h.sublabel}</Text>
        </View>
      </View>
    </Marker>
  );
}

/** Rendered inside <MapView>. */
export function HotspotOverlays({ hotspots, onPress }: { hotspots: Hotspot[]; onPress: (h: Hotspot) => void }) {
  if (!hotspots.length) return null;
  return (
    <>
      {hotspots.map((h) => {
        const r = Math.max(140, h.radius_m);
        const c = { latitude: h.lat, longitude: h.lng };
        return (
          <React.Fragment key={h.id}>
            <Circle center={c} radius={r * 1.35} fillColor={glow(0.045)} strokeColor={glow(0.16)} strokeWidth={1} zIndex={0} />
            <Circle center={c} radius={r * 0.9} fillColor={glow(0.06)} strokeColor="transparent" strokeWidth={0} zIndex={0} />
            <Circle center={c} radius={r * 0.45} fillColor={glow(0.08)} strokeColor="transparent" strokeWidth={0} zIndex={0} />
            <HotspotMarker h={h} onPress={onPress} />
          </React.Fragment>
        );
      })}
    </>
  );
}

const statusWord = (s: HotspotEvent['status']) => (s === 'on' ? 'On now' : s === 'soon' ? 'Soon' : null);
const walkTo = (lat: number, lng: number, name?: string) =>
  Linking.openURL(`http://maps.apple.com/?daddr=${lat},${lng}${name ? `&q=${encodeURIComponent(name)}` : ''}&dirflg=w`).catch(() => {});

export function HotspotSheet({ hotspot, onClose, bottomInset }: { hotspot: Hotspot | null; onClose: () => void; bottomInset: number }) {
  const h = hotspot;
  return (
    <Modal visible={h != null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Close" />
      {h ? (
        <View style={[st.sheet, { paddingBottom: bottomInset + 16 }]}>
          <View style={st.grabber} />
          <Text style={st.eyebrow}>{h.area ? `${h.area.toUpperCase()} · ` : ''}{h.venues} VENUES WITHIN A SHORT WALK</Text>
          <Text style={st.title} accessibilityRole="header">{h.label}</Text>
          <Text style={st.sub}>{h.sublabel}</Text>
          <ScrollView style={{ maxHeight: 360, marginTop: 10 }} showsVerticalScrollIndicator={false}>
            {h.events.map((e) => {
              const sw = statusWord(e.status);
              return (
                <View key={e.id} style={st.row}>
                  <Pressable
                    style={st.rowMain}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); onClose(); router.push(`/event/${e.id}` as any); }}
                    accessibilityRole="button"
                    accessibilityLabel={`${e.title} at ${e.venue_name}, ${e.start_label}${sw ? ', ' + sw : ''}`}
                  >
                    <Text style={st.time}>{e.start_label}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={st.evTitle} numberOfLines={1}>{e.title}</Text>
                      <Text style={st.evVenue} numberOfLines={1}>{e.venue_name}{sw ? <Text style={st.live}>{`  ·  ${sw}`}</Text> : null}</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={st.dirBtn}
                    hitSlop={8}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); walkTo(e.lat, e.lng, e.venue_name); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Directions to ${e.venue_name}`}
                  >
                    <Ionicons name="navigate-outline" size={18} color={IVORY} />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
          <Pressable
            style={({ pressed }) => [st.primary, pressed && { opacity: 0.9 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); walkTo(h.lat, h.lng, h.area || undefined); }}
            accessibilityRole="button"
          >
            <Text style={st.primaryText}>Walk to the area</Text>
          </Pressable>
          <Text style={st.note}>Scheduled events from venue and ticket listings. Not a live crowd count.</Text>
        </View>
      ) : null}
    </Modal>
  );
}

const st = StyleSheet.create({
  pin: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingLeft: 9, paddingRight: 12, borderRadius: 18,
    backgroundColor: 'rgba(12,12,13,0.92)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.28)' },
  pinDotWrap: { width: 14, height: 14, borderRadius: 7, backgroundColor: glow(0.18), alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(243,240,233,0.7)' },
  pinDotLive: { backgroundColor: IVORY },
  pinTitle: { color: IVORY, fontSize: 12, fontWeight: '600', letterSpacing: -0.1 },
  pinSub: { color: MUTED, fontSize: 10.5, marginTop: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: '#141416', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(243,240,233,0.2)', marginBottom: 14 },
  eyebrow: { color: FAINT, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { color: IVORY, fontSize: 24, fontWeight: '700', letterSpacing: -0.4, marginTop: 6 },
  sub: { color: MUTED, fontSize: 14, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(243,240,233,0.08)' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13 },
  time: { width: 62, color: IVORY, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  evTitle: { color: IVORY, fontSize: 15, fontWeight: '500' },
  evVenue: { color: MUTED, fontSize: 13, marginTop: 2 },
  live: { color: IVORY, fontWeight: '600' },
  dirBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.25)', marginLeft: 10 },
  primary: { marginTop: 16, backgroundColor: IVORY, borderRadius: 100, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#09090B', fontSize: 15, fontWeight: '600' },
  note: { color: FAINT, fontSize: 11.5, textAlign: 'center', marginTop: 10 },
});
