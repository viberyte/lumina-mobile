// app/onboarding.tsx — Viberyte Welcome V2 (VBR_WELCOME_V2)
// One screen, one ask: location. No questionnaire. Taste is learned from what people save and open.
// V2: a quiet live map of the city fills the top and fades into black; an ivory "you are here" pulse sits at its centre.
// Black and ivory only. The button says Continue (Apple guidance: the system alert that follows is where "Allow" lives).
// When location is found, the map glides to the person before the app opens. Reduce Motion: no pulse, no glide.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, AccessibilityInfo, Linking, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const C = { bg: '#09090B', ivory: '#F3F0E9', dim: 'rgba(243,240,233,0.62)', faint: 'rgba(243,240,233,0.38)', hair: 'rgba(243,240,233,0.12)' };
const { height: H } = Dimensions.get('window');
const MAP_H = Math.round(H * 0.58);
const CITY = { latitude: 40.7306, longitude: -73.9866, latitudeDelta: 0.09, longitudeDelta: 0.09 };

async function finish(router: ReturnType<typeof useRouter>) {
  await AsyncStorage.multiSet([['@lumina_persona', 'completed'], ['@lumina_onboarded_at', new Date().toISOString()]]).catch(() => {});
  router.replace('/(tabs)' as any);
}

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<'ask' | 'asking' | 'found' | 'denied'>('ask');
  const [place, setPlace] = useState<string | null>(null);
  const [reduce, setReduce] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      setReduce(r);
      if (r) return;
      Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
    }).catch(() => {});
    // Already allowed (reinstall, or asked elsewhere)? Don't ask twice.
    Location.getForegroundPermissionsAsync().then((p) => { if (p.granted) locate(); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = async () => {
    try {
      // VBR_LOC_TIMEOUT: never hang the welcome screen — 8s max, then last known position, then just continue
      const pos: any = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
      ]) || await Location.getLastKnownPositionAsync().catch(() => null);
      if (!pos) return finish(router);
      const { latitude: lat, longitude: lng } = pos.coords;
      if (!reduce) mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.025, longitudeDelta: 0.025 }, 900);
      let city = '';
      try {
        const g = (await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }))[0];
        city = g?.district || g?.city || g?.subregion || '';
      } catch {}
      await AsyncStorage.setItem('@lumina_location', JSON.stringify({ city, lat, lng })).catch(() => {});
      setPlace(city || null); setState('found');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => finish(router), 1400);
    } catch { finish(router); }
  };

  const allow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setState('asking');
    try {
      const r = await Location.requestForegroundPermissionsAsync();
      if (r.granted) return locate();
      setState('denied');
    } catch { setState('denied'); }
  };

  const ring = (k: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2 + k] }) }],
  });

  const title = state === 'found' ? (place ? `Tonight in ${place}` : 'You’re all set')
    : state === 'denied' ? 'No problem' : 'See what’s good\nnearby';
  const body = state === 'found' ? 'Pulling up what’s good around you…'
    : state === 'denied' ? 'You can still explore every neighborhood on the map. Turn on location anytime in Settings to see what’s closest.'
    : 'Viberyte uses your location to show the spots, reels and nights closest to you.';

  return (
    <View style={s.container}>
      {/* The city, quietly. Not interactive. */}
      <View style={[s.mapWrap, { height: MAP_H }]} pointerEvents="none">
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={CITY}
          userInterfaceStyle="dark"
          mapType="mutedStandard"
          showsPointsOfInterests={false}
          showsCompass={false}
          showsScale={false}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        />
        <LinearGradient colors={['rgba(9,9,11,0.55)', 'rgba(9,9,11,0)']} style={[s.fadeTop, { height: insets.top + 90 }]} />
        <LinearGradient colors={['rgba(9,9,11,0)', 'rgba(9,9,11,0.85)', C.bg]} locations={[0, 0.7, 1]} style={s.fadeBottom} />
        <View style={s.here}>
          {!reduce ? <><Animated.View style={[s.ring, ring(0)]} /><Animated.View style={[s.ring, ring(0.8)]} /></> : null}
          <View style={s.dotHalo}><View style={s.dot} /></View>
        </View>
      </View>

      <Image source={require('../assets/images/lumina-icon.png')} style={[s.mark, { top: insets.top + 10 }]} contentFit="contain" accessibilityLabel="Viberyte" />

      <Animated.View style={[s.content, { paddingBottom: insets.bottom + 20, opacity: fade, transform: [{ translateY: rise }] }]}>
        <Text style={s.title} accessibilityRole="header">{title}</Text>
        <Text style={s.body}>{body}</Text>
        {state === 'ask' || state === 'asking' ? (
          <View style={s.trust}>
            <Ionicons name="lock-closed" size={13} color={C.faint} />
            <Text style={s.trustText}>Only while you use the app · never sold or shared with venues</Text>
          </View>
        ) : null}

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
          ) : state === 'found' ? (
            <View style={s.foundRow}><ActivityIndicator color={C.dim} /></View>
          ) : (
            <>
              <TouchableOpacity style={s.primary} onPress={allow} disabled={state === 'asking'} activeOpacity={0.85} accessibilityLabel="Continue and share location">
                {state === 'asking' ? <ActivityIndicator color={C.bg} /> : <Text style={s.primaryText}>Continue</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.secondary} onPress={() => { Haptics.selectionAsync().catch(() => {}); finish(router); }} hitSlop={10}>
                <Text style={s.secondaryText}>Not now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  mapWrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  fadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  here: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.ivory },
  dotHalo: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(243,240,233,0.18)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.ivory, borderWidth: 2, borderColor: C.bg },
  mark: { position: 'absolute', alignSelf: 'center', width: 40, height: 40, borderRadius: 10 },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28 },
  title: { color: C.ivory, fontSize: 34, fontWeight: '700', letterSpacing: -0.8, lineHeight: 40, marginBottom: 12 },
  body: { color: C.dim, fontSize: 17, lineHeight: 24, maxWidth: 340 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hair },
  trustText: { color: C.faint, fontSize: 13, flexShrink: 1 },
  actions: { gap: 6, marginTop: 28 },
  primary: { height: 56, borderRadius: 28, backgroundColor: C.ivory, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: C.bg, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  secondary: { height: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: C.faint, fontSize: 15, fontWeight: '500' },
  foundRow: { height: 104, alignItems: 'center', justifyContent: 'center' },
});
