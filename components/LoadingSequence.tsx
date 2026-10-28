// components/LoadingSequence.tsx — VBR_INTRO_V2
// First launch only (gated in app/_layout.tsx). Three beats: mark → "find your <morning|day|night>." → location ask.
// V2: the location beat is alive. The city map pulls back to you, Broadway draws in, your dot pulses,
// and places light up around you one by one. The map then breathes slowly while you decide.
// Copy follows the time of day (dayPart). Reduce Motion: no loops, no camera move, everything simply fades in.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFonts, Fraunces_700Bold_Italic, Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { dayPart } from '../constants/intents';

const INK = '#0a0a0a';
const BURGUNDY = '#2a0f14';
const CHAMPAGNE = '#c8b89a';
const MIST = '#f5f4f0';
const MIST_DIM = 'rgba(245,244,240,0.45)';
const MIST_FAINT = 'rgba(245,244,240,0.18)';

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const AVE = 32; // avenue spacing
const ST = 24;  // street spacing
const B3 = 5900; // when the location beat starts

// Places around you, in grid cells from your dot. Each lights up in turn.
const SPOTS: { dx: number; dy: number; at: number; size: number }[] = [
  { dx: -3, dy: -2, at: 0, size: 5 },
  { dx: 2, dy: -3, at: 160, size: 4 },
  { dx: 3, dy: 1, at: 300, size: 6 },
  { dx: -1, dy: 3, at: 420, size: 4 },
  { dx: -5, dy: 1, at: 560, size: 5 },
  { dx: 1, dy: -1, at: 680, size: 4 },
  { dx: -2, dy: -5, at: 820, size: 4 },
  { dx: 5, dy: -2, at: 940, size: 5 },
];

type Props = { onComplete: (shareLocation: boolean) => void };

function Spot({ x, y, size, delay, reduce }: { x: number; y: number; size: number; delay: number; reduce: boolean }) {
  const op = useSharedValue(0);
  const sc = useSharedValue(reduce ? 1 : 0.2);
  useEffect(() => {
    if (reduce) { op.value = withDelay(delay, withTiming(0.7, { duration: 600 })); return; }
    sc.value = withDelay(delay, withTiming(1, { duration: 700, easing: EASE }));
    // Light up, then twinkle softly forever, each at its own pace.
    const period = 1800 + ((x * 7 + y * 3) % 1400);
    op.value = withDelay(delay, withSequence(
      withTiming(0.95, { duration: 500 }),
      withRepeat(withTiming(0.4, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true),
    ));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }] }));
  return <Animated.View style={[styles.spot, { left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2 }, st]} />;
}

function Ring({ x, y, delay }: { x: number; y: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - t.value), transform: [{ scale: 1 + t.value * 6 }] }));
  return <Animated.View style={[styles.ring, { left: x - 7, top: y - 7 }, st]} />;
}

export default function LoadingSequence({ onComplete }: Props) {
  const [fontsLoaded] = useFonts({
    Fraunces_700Bold_Italic,
    Fraunces_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const dp = dayPart();
  const [beat, setBeat] = useState(1);

  // Your dot sits on a grid crossing, right of centre, between the headline and the copy.
  const youX = Math.round((W * 0.64) / AVE) * AVE;
  const youY = Math.round((H * 0.5) / ST) * ST;

  const markScale = useSharedValue(0.92);
  const markOpacity = useSharedValue(0);
  const b1Opacity = useSharedValue(1);

  const b2Opacity = useSharedValue(0);
  const b2WordmarkOp = useSharedValue(0);
  const b2EyebrowOp = useSharedValue(0);
  const b2EyebrowY = useSharedValue(8);
  const b2W1 = useSharedValue(110);
  const b2W2 = useSharedValue(110);
  const b2W3 = useSharedValue(110);
  const b2Sub = useSharedValue(0);
  const b2SubY = useSharedValue(6);
  const b2RuleW = useSharedValue(0);
  const b2Footer = useSharedValue(0);

  const b3Opacity = useSharedValue(0);
  const b3Wordmark = useSharedValue(0);
  const h1 = useSharedValue(0);
  const h2 = useSharedValue(0);
  const h3 = useSharedValue(0);
  const b3Body = useSharedValue(0);
  const b3Ctas = useSharedValue(0);
  const gridOp = useSharedValue(0);
  const cam = useSharedValue(reduce ? 1 : 1.22);
  const broadway = useSharedValue(reduce ? 1 : 0);
  const you = useSharedValue(0);
  const [lit, setLit] = useState(false); // mounts the spots and rings once the map is in

  useEffect(() => {
    if (!fontsLoaded) return;
    markOpacity.value = withTiming(1, { duration: 900, easing: EASE });
    markScale.value = withTiming(1, { duration: 1400, easing: EASE });
    b1Opacity.value = withDelay(1500, withTiming(0, { duration: 500, easing: EASE }));
    b2Opacity.value = withDelay(1800, withTiming(1, { duration: 500 }, () => { runOnJS(setBeat)(2); }));
    b2WordmarkOp.value = withDelay(2200, withTiming(1, { duration: 900 }));
    b2EyebrowOp.value = withDelay(2400, withTiming(0.6, { duration: 800 }));
    b2EyebrowY.value = withDelay(2400, withTiming(0, { duration: 800, easing: EASE }));
    b2W1.value = withDelay(2300, withTiming(0, { duration: 1000, easing: EASE }));
    b2W2.value = withDelay(2480, withTiming(0, { duration: 1000, easing: EASE }));
    b2W3.value = withDelay(2660, withTiming(0, { duration: 1000, easing: EASE }));
    b2Sub.value = withDelay(3200, withTiming(1, { duration: 900 }));
    b2SubY.value = withDelay(3200, withTiming(0, { duration: 900, easing: EASE }));
    b2RuleW.value = withDelay(3000, withTiming(48, { duration: 1000, easing: EASE }));
    b2Footer.value = withDelay(3400, withTiming(1, { duration: 800 }));
    b2Opacity.value = withDelay(5600, withTiming(0, { duration: 500, easing: EASE }));

    // Beat 3 — the city comes into focus around you.
    b3Opacity.value = withDelay(B3, withTiming(1, { duration: 500 }, () => { runOnJS(setBeat)(3); }));
    gridOp.value = withDelay(B3 + 100, withTiming(0.2, { duration: 1400 }));
    if (!reduce) {
      // Pull back to you, then breathe slowly while they read.
      cam.value = withDelay(B3, withSequence(
        withTiming(1, { duration: 2400, easing: EASE }),
        withRepeat(withTiming(1.045, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true),
      ));
      broadway.value = withDelay(B3 + 500, withTiming(1, { duration: 1600, easing: EASE }));
    }
    you.value = withDelay(B3 + 900, withTiming(1, { duration: 600, easing: EASE }));
    const t = setTimeout(() => setLit(true), B3 + 1300);

    b3Wordmark.value = withDelay(B3 + 200, withTiming(0.9, { duration: 800 }));
    h1.value = withDelay(B3 + 250, withTiming(1, { duration: 900, easing: EASE }));
    h2.value = withDelay(B3 + 400, withTiming(1, { duration: 900, easing: EASE }));
    h3.value = withDelay(B3 + 550, withTiming(1, { duration: 900, easing: EASE }));
    b3Body.value = withDelay(B3 + 1300, withTiming(1, { duration: 900, easing: EASE }));
    b3Ctas.value = withDelay(B3 + 1650, withTiming(1, { duration: 900, easing: EASE }, (done) => {
      if (done) runOnJS(tick)();
    }));
    return () => clearTimeout(t);
  }, [fontsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function tick() { Haptics.selectionAsync().catch(() => {}); }

  const b1S = useAnimatedStyle(() => ({ opacity: b1Opacity.value }));
  const markS = useAnimatedStyle(() => ({ opacity: markOpacity.value, transform: [{ scale: markScale.value }] }));
  const b2S = useAnimatedStyle(() => ({ opacity: b2Opacity.value }));
  const b2WmS = useAnimatedStyle(() => ({ opacity: b2WordmarkOp.value }));
  const b2EyeS = useAnimatedStyle(() => ({ opacity: b2EyebrowOp.value, transform: [{ translateY: b2EyebrowY.value }] }));
  const w1S = useAnimatedStyle(() => ({ transform: [{ translateY: b2W1.value }] }));
  const w2S = useAnimatedStyle(() => ({ transform: [{ translateY: b2W2.value }] }));
  const w3S = useAnimatedStyle(() => ({ transform: [{ translateY: b2W3.value }] }));
  const b2SubS = useAnimatedStyle(() => ({ opacity: b2Sub.value, transform: [{ translateY: b2SubY.value }] }));
  const b2RuleS = useAnimatedStyle(() => ({ width: b2RuleW.value }));
  const b2FooterS = useAnimatedStyle(() => ({ opacity: b2Footer.value }));
  const b3S = useAnimatedStyle(() => ({ opacity: b3Opacity.value }));
  const b3WmS = useAnimatedStyle(() => ({ opacity: b3Wordmark.value }));
  const rise = (v: { value: number }, d: number) => { 'worklet'; return { opacity: v.value, transform: [{ translateY: (1 - v.value) * d }] }; };
  const h1S = useAnimatedStyle(() => rise(h1, 22));
  const h2S = useAnimatedStyle(() => rise(h2, 22));
  const h3S = useAnimatedStyle(() => rise(h3, 22));
  const b3BodyS = useAnimatedStyle(() => rise(b3Body, 10));
  const b3CtaS = useAnimatedStyle(() => rise(b3Ctas, 14));
  const camS = useAnimatedStyle(() => ({ transform: [{ scale: cam.value }] }));
  const gridS = useAnimatedStyle(() => ({ opacity: gridOp.value }));
  const broadwayS = useAnimatedStyle(() => ({ transform: [{ rotate: '28deg' }, { scaleY: broadway.value }] as any }));
  const youS = useAnimatedStyle(() => ({ opacity: you.value, transform: [{ scale: 0.4 + you.value * 0.6 }] }));

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: INK }} />;

  const aves = Math.ceil(W / AVE) + 4;
  const streets = Math.ceil(H / ST) + 4;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.beat, { backgroundColor: INK }, b1S]} pointerEvents={beat === 1 ? 'auto' : 'none'}>
        <Animated.View style={[styles.mark, markS]}>
          <Text style={styles.markV}>V</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.beat, styles.b2, b2S]} pointerEvents={beat === 2 ? 'auto' : 'none'}>
        <Animated.Text style={[styles.b2Wordmark, b2WmS]}>
          <Text style={{ color: MIST_DIM, fontWeight: '300' }}>(</Text>viberyte<Text style={{ color: MIST_DIM, fontWeight: '300' }}>)</Text>
        </Animated.Text>
        <View style={styles.b2Headline}>
          <Animated.Text style={[styles.b2Eyebrow, b2EyeS]}>{dp.eyebrow}</Animated.Text>
          <View>
            <View style={styles.wordClip}><Animated.Text style={[styles.b2Main, w1S]}>find</Animated.Text></View>
            <View style={styles.wordClip}><Animated.Text style={[styles.b2Main, w2S]}>your</Animated.Text></View>
            <View style={styles.wordClip}><Animated.Text style={[styles.b2Main, w3S]}>{dp.word}.</Animated.Text></View>
          </View>
          <Animated.Text style={[styles.b2Sub, b2SubS]}>
            The city, as the people who know it best are living it right now.
          </Animated.Text>
        </View>
        <Animated.View style={[styles.b2Rule, b2RuleS]} />
        <Animated.Text style={[styles.b2Footer, b2FooterS]}>EST. 2026</Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.beat, { backgroundColor: INK }, b3S]} pointerEvents={beat === 3 ? 'auto' : 'none'}>
        {/* The city. Camera pulls back to you, then breathes. */}
        <Animated.View style={[StyleSheet.absoluteFill, camS]} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, gridS]}>
            {Array.from({ length: aves }).map((_, i) => (
              <View key={'av' + i} style={[styles.mapAvenue, { left: (i - 2) * AVE + (youX % AVE) }]} />
            ))}
            {Array.from({ length: streets }).map((_, i) => (
              <View key={'st' + i} style={[styles.mapStreet, { top: (i - 2) * ST + (youY % ST) }]} />
            ))}
          </Animated.View>
          <Animated.View style={[styles.mapBroadway, { left: youX - 1, top: -H * 0.25, height: H * 1.5 }, broadwayS]} />
          {lit ? SPOTS.map((p, i) => (
            <Spot key={i} x={youX + p.dx * AVE} y={youY + p.dy * ST} size={p.size} delay={p.at} reduce={reduce} />
          )) : null}
          {lit && !reduce ? (<><Ring x={youX} y={youY} delay={0} /><Ring x={youX} y={youY} delay={1300} /></>) : null}
          <Animated.View style={[styles.you, { left: youX - 6, top: youY - 6 }, youS]} />
        </Animated.View>

        <Animated.Text style={[styles.b3Wordmark, { top: insets.top + 24 }, b3WmS]}>
          <Text style={{ color: MIST_FAINT, fontWeight: '300' }}>(</Text>viberyte<Text style={{ color: MIST_FAINT, fontWeight: '300' }}>)</Text>
        </Animated.Text>

        <View style={[styles.b3HeroWrap, { top: insets.top + 80 }]} pointerEvents="none">
          <Animated.Text style={[styles.b3Hero, h1S]}>what's</Animated.Text>
          <Animated.Text style={[styles.b3Hero, h2S]}>good</Animated.Text>
          <Animated.Text style={[styles.b3Hero, h3S]}>nearby</Animated.Text>
        </View>

        {/* One stacked column, so the copy can never overlap however it wraps. */}
        <View style={[styles.b3Bottom, { bottom: insets.bottom + 28 }]}>
          <Animated.View style={b3BodyS}>
            <Text style={styles.b3Privacy}>— YOUR LOCATION, BRIEFLY</Text>
            <Text style={styles.b3Body}>
              Viberyte uses your location to show the spots, reels and nights closest to you. <Text style={{ color: MIST, fontFamily: 'Inter_500Medium' }}>Only while you use the app.</Text> Never sold, never shared with venues.
            </Text>
          </Animated.View>
          <Animated.View style={[styles.b3Ctas, b3CtaS]}>
            <Pressable
              style={({ pressed }) => [styles.b3Primary, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onComplete(true); }}
              accessibilityRole="button"
              accessibilityLabel="Share location"
            >
              <Text style={styles.b3PrimaryText}>Share location</Text>
            </Pressable>
            <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onComplete(false); }} hitSlop={10} accessibilityRole="button">
              {({ pressed }) => <Text style={[styles.b3Ghost, pressed && { color: MIST }]}>Not now</Text>}
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK },
  beat: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  b2: { backgroundColor: BURGUNDY },
  mark: { width: 92, height: 92, borderRadius: 20, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  markV: { color: MIST, fontSize: 54, fontWeight: '900', fontFamily: 'Inter_600SemiBold', letterSpacing: -3 },
  b2Wordmark: { position: 'absolute', top: 72, left: 32, fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 2.2, color: CHAMPAGNE },
  b2Headline: { position: 'absolute', left: 36, right: 36, top: 0, bottom: 0, justifyContent: 'center' },
  b2Eyebrow: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 3.2, color: CHAMPAGNE, marginBottom: 20 },
  wordClip: { overflow: 'hidden' },
  b2Main: { fontFamily: 'Fraunces_700Bold_Italic', fontSize: 68, lineHeight: 64, letterSpacing: -2, color: MIST },
  b2Sub: { marginTop: 28, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: MIST_DIM, maxWidth: 280 },
  b2Rule: { position: 'absolute', bottom: 72, left: 36, height: 1, backgroundColor: CHAMPAGNE, opacity: 0.35 },
  b2Footer: { position: 'absolute', bottom: 56, left: 36, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 2.4, color: MIST_DIM },
  mapAvenue: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth * 2, backgroundColor: MIST },
  mapStreet: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: MIST, opacity: 0.5 },
  mapBroadway: { position: 'absolute', width: 2, backgroundColor: CHAMPAGNE, opacity: 0.35 },
  spot: { position: 'absolute', backgroundColor: MIST },
  ring: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: MIST },
  you: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: MIST, borderWidth: 2, borderColor: INK },
  b3Wordmark: { position: 'absolute', left: 32, fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 2.2, color: CHAMPAGNE },
  b3HeroWrap: { position: 'absolute', left: 32, right: 32 },
  b3Hero: { fontFamily: 'Fraunces_900Black', fontSize: 68, lineHeight: 68, letterSpacing: -2.5, color: MIST },
  b3Bottom: { position: 'absolute', left: 32, right: 32 },
  b3Privacy: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 2.2, color: MIST_DIM, marginBottom: 10 },
  b3Body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, color: MIST_DIM },
  b3Ctas: { marginTop: 28, alignItems: 'center', gap: 12 },
  b3Primary: { width: '100%', paddingVertical: 18, backgroundColor: MIST, borderRadius: 100, alignItems: 'center' },
  b3PrimaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: INK, letterSpacing: -0.15 },
  b3Ghost: { fontFamily: 'Inter_500Medium', fontSize: 13, color: MIST_DIM, paddingVertical: 8, paddingHorizontal: 12 },
});
