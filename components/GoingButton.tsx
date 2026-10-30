// components/GoingButton.tsx — VBR_GOING_V1
// "I'm going" saves a place to the person's own list on this device. No account. One anonymous
// count is sent so intent can be measured. Same shape, color and selected state everywhere.
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const KEY = '@vbr_going_v1';
const IVORY = '#F3F0E9', INK = '#09090B', LINE = 'rgba(243,240,233,0.14)';
export type GoingItem = { slug: string; name: string; sub?: string | null; href: string; image?: string | null; at: number };

export async function readGoing(): Promise<GoingItem[]> {
  try { const r = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
}
async function writeGoing(list: GoingItem[]) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, 60))); } catch {}
}
function ping(slug: string, action: string) {
  fetch('https://viberyte.com/api/nl/track', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, action, ref: 'app' }) }).catch(() => {});
}

export default function GoingButton({ slug, name, sub, href, image, compact = false }:
  { slug: string; name: string; sub?: string | null; href: string; image?: string | null; compact?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => { readGoing().then((l) => setOn(l.some((x) => x.slug === slug))); }, [slug]);

  const toggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const list = (await readGoing()).filter((x) => x.slug !== slug);
    if (on) { await writeGoing(list); setOn(false); ping(slug, 'ungoing'); return; }
    await writeGoing([{ slug, name, sub: sub || null, href, image: image || null, at: Date.now() }, ...list]);
    setOn(true); ping(slug, 'going');
  };

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.9} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[st.btn, compact ? st.compact : st.wide, on ? st.on : st.off]}>
      {on ? <Ionicons name="checkmark" size={18} color={IVORY} /> : null}
      <Text style={[st.txt, { color: on ? IVORY : INK }]}>{on ? 'Going' : 'I’m going'}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  btn: { height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  wide: { flex: 1, paddingHorizontal: 20 },
  compact: { paddingHorizontal: 20 },
  off: { backgroundColor: IVORY },
  on: { backgroundColor: 'rgba(243,240,233,0.08)', borderWidth: 1, borderColor: LINE },
  txt: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
});
