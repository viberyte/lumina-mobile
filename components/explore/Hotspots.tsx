// components/explore/Hotspots.tsx — VBR_HOTSPOTS_V2: "Tonight's Hotspots" map layer + sheet.
// Server decides everything (/api/hotspots, lib/hotspots.ts: verified events, ≥3 parties, ≥2 venues, every pair ≤300 m,
// starts within 3 h). Off unless the server flag allows this caller.
// V2: a soft, deep-red glow sized to the real cluster, a marker that reads "3 PARTIES · FRI" without tapping, time-aware
// copy ("From 10 PM" / "Starting soon" / "Parties underway") that never claims a crowd, and same-area hotspots on
// different nights merged into one marker ("6 PARTIES · FRI · SAT") so the map never stacks circles.
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Linking, AppState } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API_BASE } from '../../config';

import { groupHotspots, markerCopy, sheetCopy, dayLong, startOf, type Hotspot, type HotspotEvent, type HotspotGroup } from './hotspotGroups';
export type { Hotspot, HotspotEvent, HotspotGroup } from './hotspotGroups';

const IVORY = '#F3F0E9';
const MUTED = 'rgba(243,240,233,0.62)';
const FAINT = 'rgba(243,240,233,0.38)';
const HOT = '#E0544C';                          // deep, muted red
const hot = (a: number) => `rgba(224,84,76,${a})`;

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
        .then((d) => { if (my === seq.current) setList(d?.enabled && Array.isArray(d.hotspots) ? d.hotspots.map((h: Hotspot) => ({ ...h, __tonight: d?.now?.night })) : []); })
        .catch(() => { if (my === seq.current) setList([]); });
    };
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    const a = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => { clearInterval(t); a.remove(); seq.current++; };
  }, [active, scope]);
  return list;
}

function HotspotMarker({ g, onPress }: { g: HotspotGroup; onPress: (g: HotspotGroup) => void }) {
  const c = markerCopy(g);
  // Custom marker views need tracksViewChanges briefly so the bitmap is drawn, then off (keeps the map smooth).
  const [track, setTrack] = useState(true);
  useEffect(() => { setTrack(true); const t = setTimeout(() => setTrack(false), 700); return () => clearTimeout(t); }, [c.line1, c.line2]);
  return (
    <Marker
      coordinate={{ latitude: g.lat, longitude: g.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={track}
      zIndex={2}
      onPress={(e) => { e.stopPropagation?.(); onPress(g); }}
      accessibilityLabel={`${c.line1}. ${c.line2}. ${g.area ? g.area + '. ' : ''}Show the parties`}
    >
      <View style={st.pin} collapsable={false}>
        <View style={st.pinDot} collapsable={false} />
        <View collapsable={false}>
          <Text style={st.pinTitle}>{c.line1}</Text>
          <Text style={st.pinSub}>{c.line2}</Text>
        </View>
      </View>
    </Marker>
  );
}

/** Rendered inside <MapView>. Circles are sized to the real cluster (server radius + a small margin). */
export function HotspotOverlays({ hotspots, onPress }: { hotspots: Hotspot[]; onPress: (g: HotspotGroup) => void }) {
  if (!hotspots.length) return null;
  const tonight = (hotspots[0] as any).__tonight || '';
  const groups = groupHotspots(hotspots, tonight);
  return (
    <>
      {groups.map((g) => (
        <React.Fragment key={g.key}>
          {g.items.map((h) => {
            // Each night's glow is drawn at its own true cluster (server radius = farthest venue + 60 m).
            const r = Math.max(150, h.radius_m);
            const c = { latitude: h.lat, longitude: h.lng };
            return (
              <React.Fragment key={h.id}>
                <Circle center={c} radius={r * 1.45} fillColor={hot(0.06)} strokeColor="transparent" strokeWidth={0} zIndex={0} />
                <Circle center={c} radius={r * 1.05} fillColor={hot(0.09)} strokeColor={hot(0.55)} strokeWidth={1} lineDashPattern={[5, 5]} zIndex={0} />
                <Circle center={c} radius={r * 0.55} fillColor={hot(0.14)} strokeColor="transparent" strokeWidth={0} zIndex={0} />
              </React.Fragment>
            );
          })}
          <HotspotMarker g={g} onPress={onPress} />
        </React.Fragment>
      ))}
    </>
  );
}

const statusWord = (s: HotspotEvent['status']) => (s === 'on' ? 'Underway' : s === 'soon' ? 'Starting soon' : null);
const directions = (lat: number, lng: number, name?: string) =>
  Linking.openURL(`http://maps.apple.com/?daddr=${lat},${lng}${name ? `&q=${encodeURIComponent(name)}` : ''}`).catch(() => {});

export function HotspotSheet({ hotspot, onClose, bottomInset }: { hotspot: HotspotGroup | null; onClose: () => void; bottomInset: number }) {
  const g = hotspot;
  const copy = g ? sheetCopy(g) : null;
  return (
    <Modal visible={g != null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Close" />
      {g && copy ? (
        <View style={[st.sheet, { paddingBottom: bottomInset + 16 }]}>
          <View style={st.grabber} />
          <View style={st.eyebrowRow}>
            <View style={st.eyebrowDot} />
            <Text style={st.eyebrow}>NIGHTLIFE HOTSPOT{g.area ? ` · ${g.area.toUpperCase()}` : ''}</Text>
          </View>
          <Text style={st.title} accessibilityRole="header">{copy.title}</Text>
          <Text style={st.sub}>{copy.sub}</Text>
          <ScrollView style={{ maxHeight: 380, marginTop: 8 }} showsVerticalScrollIndicator={false}>
            {g.items.map((h) => (
              <View key={h.id}>
                {g.items.length > 1 ? (
                  <Text style={st.night}>{(h.night === g.tonight ? 'TONIGHT' : dayLong(h.night).toUpperCase())} · FROM {startOf(h)}</Text>
                ) : null}
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
                        <Ionicons name="chevron-forward" size={16} color={FAINT} />
                      </Pressable>
                      <Pressable
                        style={st.dirBtn}
                        hitSlop={8}
                        onPress={() => { Haptics.selectionAsync().catch(() => {}); directions(e.lat, e.lng, e.venue_name); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Directions to ${e.venue_name}`}
                      >
                        <Ionicons name="navigate-outline" size={17} color={IVORY} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <Pressable
            style={({ pressed }) => [st.primary, pressed && { opacity: 0.9 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); directions(g.lat, g.lng, g.area || undefined); }}
            accessibilityRole="button"
          >
            <Ionicons name="navigate" size={16} color="#09090B" />
            <Text style={st.primaryText}>{g.area ? `Directions to ${g.area}` : 'Directions to the area'}</Text>
          </Pressable>
          <Text style={st.note}>Based on scheduled events from venue and ticket listings, not live crowds.</Text>
        </View>
      ) : null}
    </Modal>
  );
}

const st = StyleSheet.create({
  pin: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, paddingLeft: 10, paddingRight: 13, borderRadius: 20,
    backgroundColor: 'rgba(38,14,15,0.94)', borderWidth: 1.5, borderColor: HOT,
    shadowColor: HOT, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  pinDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: HOT },
  pinTitle: { color: IVORY, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.6 },
  pinSub: { color: 'rgba(243,240,233,0.72)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: '#141416', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(243,240,233,0.2)', marginBottom: 14 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: HOT },
  eyebrow: { color: HOT, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  title: { color: IVORY, fontSize: 25, fontWeight: '700', letterSpacing: -0.5, marginTop: 8, lineHeight: 30 },
  sub: { color: MUTED, fontSize: 14, marginTop: 4 },
  night: { color: FAINT, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 16, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(243,240,233,0.08)' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13 },
  time: { width: 62, color: IVORY, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  evTitle: { color: IVORY, fontSize: 15, fontWeight: '500' },
  evVenue: { color: MUTED, fontSize: 13, marginTop: 2 },
  live: { color: HOT, fontWeight: '600' },
  dirBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.25)', marginLeft: 10 },
  primary: { marginTop: 16, backgroundColor: IVORY, borderRadius: 100, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryText: { color: '#09090B', fontSize: 15, fontWeight: '600' },
  note: { color: FAINT, fontSize: 11.5, textAlign: 'center', marginTop: 10 },
});
