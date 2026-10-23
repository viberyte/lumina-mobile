// app/onboarding.tsx — Viberyte Welcome V1
// One screen, one ask: location. No questionnaire. Taste is learned from what people save and open.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, AccessibilityInfo, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const C = { bg: '#09090B', ivory: '#F3F0E9', dim: 'rgba(243,240,233,0.6)', faint: 'rgba(243,240,233,0.35)', gold: '#C5A36B' };

async function finish(router: ReturnType<typeof useRouter>) {
  await AsyncStorage.multiSet([['@lumina_persona', 'completed'], ['@lumina_onboarded_at', new Date().toISOString()]]).catch(() => {});
  router.replace('/(tabs)' as any);
}

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<'ask' | 'asking' | 'found' | 'denied'>('ask');
  const [place, setPlace] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) return;
      Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
    });
    // Already allowed (reinstall, or asked elsewhere)? Don't ask twice.
    Location.getForegroundPermissionsAsync().then(p => { if (p.granted) locate(); }).catch(() => {});
  }, []);

  const locate = async () => {
    try {
      // VBR_LOC_TIMEOUT: never hang the welcome screen — 8s max, then last known position, then just continue
      const pos: any = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise(resolve => setTimeout(() => resolve(null), 8000)),
      ]) || await Location.getLastKnownPositionAsync().catch(() => null);
      if (!pos) return finish(router);
      const { latitude: lat, longitude: lng } = pos.coords;
      let city = '';
      try {
        const g = (await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }))[0];
        city = g?.district || g?.city || g?.subregion || '';
      } catch {}
      await AsyncStorage.setItem('@lumina_location', JSON.stringify({ city, lat, lng })).catch(() => {});
      setPlace(city || null); setState('found');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => finish(router), 1100);
    } catch { finish(router); }
  };

  const allow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('asking');
    try {
      const r = await Location.requestForegroundPermissionsAsync();
      if (r.granted) return locate();
      setState('denied');
    } catch { setState('denied'); }
  };

  const ring = (delay: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9 + delay] }) }],
  });

  return (
    <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View style={[s.center, { opacity: fade }]}>
        <View style={s.iconWrap}>
          <Animated.View style={[s.ring, ring(0)]} />
          <Animated.View style={[s.ring, ring(0.5)]} />
          <View style={s.icon}><Ionicons name={state === 'found' ? 'checkmark' : 'location'} size={30} color={C.bg} /></View>
        </View>

        {state === 'found' ? (
          <>
            <Text style={s.title}>{place ? `Tonight in ${place}` : 'You’re all set'}</Text>
            <Text style={s.body}>Pulling up what’s good around you…</Text>
          </>
        ) : state === 'denied' ? (
          <>
            <Text style={s.title}>No problem</Text>
            <Text style={s.body}>You can still explore every neighborhood on the map. Turn on location anytime in Settings to see what’s closest.</Text>
          </>
        ) : (
          <>
            <Text style={s.kicker}>VIBERYTE</Text>
            <Text style={s.title}>See what’s good{'\n'}near you</Text>
            <Text style={s.body}>We use your location only to show the spots, reels and nights closest to you. We never sell it or share it with venues.</Text>
          </>
        )}
      </Animated.View>

      <View style={s.actions}>
        {state === 'denied' ? (
          <>
            <TouchableOpacity style={s.primary} onPress={() => finish(router)} activeOpacity={0.85}>
              <Text style={s.primaryText}>Start exploring</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondary} onPress={() => Linking.openSettings()} hitSlop={10}>
              <Text style={s.secondaryText}>Open Settings</Text>
            </TouchableOpacity>
          </>
        ) : state === 'found' ? null : (
          <>
            <TouchableOpacity style={s.primary} onPress={allow} disabled={state === 'asking'} activeOpacity={0.85} accessibilityLabel="Allow location">
              {state === 'asking' ? <ActivityIndicator color={C.bg} /> : <Text style={s.primaryText}>Allow location</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.secondary} onPress={() => { Haptics.selectionAsync(); finish(router); }} hitSlop={10}>
              <Text style={s.secondaryText}>Not now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  ring: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: C.gold },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: C.gold, fontSize: 12, fontWeight: '700', letterSpacing: 3, marginBottom: 14 },
  title: { color: C.ivory, fontSize: 32, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center', lineHeight: 38, marginBottom: 14 },
  body: { color: C.dim, fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 320 },
  actions: { gap: 8 },
  primary: { height: 56, borderRadius: 28, backgroundColor: C.ivory, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: C.bg, fontSize: 17, fontWeight: '600' },
  secondary: { height: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: C.faint, fontSize: 15, fontWeight: '500' },
});
