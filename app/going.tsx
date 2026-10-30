// app/going.tsx — VBR_GOING_V1: the person's own list, kept on this device. No account.
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readGoing, type GoingItem } from '../components/GoingButton';

const IVORY = '#F3F0E9', MUTED = 'rgba(243,240,233,0.62)', FAINT = 'rgba(243,240,233,0.38)', LINE = 'rgba(243,240,233,0.10)', CARD = '#141416', BG = '#09090B';

export default function GoingScreen() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<GoingItem[]>([]);
  useFocusEffect(useCallback(() => { readGoing().then(setList); }, []));

  const remove = async (slug: string) => {
    const next = list.filter((x) => x.slug !== slug);
    setList(next);
    try { await AsyncStorage.setItem('@vbr_going_v1', JSON.stringify(next)); } catch {}
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 6 }]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={12}><Ionicons name="chevron-back" size={24} color={IVORY} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>VIBERYTE</Text>
          <Text style={s.h1}>Your list</Text>
          <Text style={s.sub}>Places you said you’re going. Kept on this phone.</Text>
        </View>
      </View>

      {list.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyT}>Nothing here yet</Text>
          <Text style={s.emptyS}>Tap “I’m going” on any place or event and it shows up here.</Text>
          <TouchableOpacity style={s.cta} onPress={() => router.push('/explore')} activeOpacity={0.9}><Text style={s.ctaT}>Find somewhere</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList data={list} keyExtractor={(x) => x.slug} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <TouchableOpacity style={s.rowMain} onPress={() => router.push(item.href as any)} activeOpacity={0.85}>
                <View style={s.thumb}>{item.image ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}</View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                  {item.sub ? <Text style={s.meta} numberOfLines={1}>{item.sub}</Text> : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item.slug)} hitSlop={10}><Text style={s.remove}>Remove</Text></TouchableOpacity>
            </View>
          )} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingBottom: 16 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(243,240,233,0.07)', marginTop: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8, color: FAINT },
  h1: { fontSize: 32, lineHeight: 36, letterSpacing: -1, fontWeight: '800', color: IVORY, marginTop: 6 },
  sub: { fontSize: 14, color: MUTED, marginTop: 4 },
  empty: { margin: 20, padding: 22, borderRadius: 20, backgroundColor: CARD, borderWidth: StyleSheet.hairlineWidth, borderColor: LINE },
  emptyT: { fontSize: 17, fontWeight: '700', color: IVORY },
  emptyS: { fontSize: 14, color: MUTED, marginTop: 6, lineHeight: 20 },
  cta: { alignSelf: 'flex-start', marginTop: 16, paddingHorizontal: 18, height: 44, borderRadius: 22, backgroundColor: IVORY, alignItems: 'center', justifyContent: 'center' },
  ctaT: { color: BG, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 },
  thumb: { width: 56, height: 70, borderRadius: 12, overflow: 'hidden', backgroundColor: CARD },
  name: { fontSize: 16, fontWeight: '700', color: IVORY },
  meta: { fontSize: 13, color: MUTED, marginTop: 2 },
  remove: { fontSize: 13, fontWeight: '600', color: FAINT, paddingVertical: 6 },
});
