import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Subtle particle - "dust in light"
const Particle = ({ delay, startX, startY, size }: { delay: number; startX: number; startY: number; size: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -60, duration: 3000, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          width: size,
          height: size,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

export default function SplashScreen() {
  const router = useRouter();
  
  // Animation values - minimal, intentional
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;
  const ambientGlow = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    
    // Apple-tier sequence: introduce, settle, breathe, transition
    Animated.sequence([
      // Phase 1: Ambient glow fades in (sets mood)
      Animated.timing(ambientGlow, { toValue: 0.25, duration: 400, useNativeDriver: true }),
      
      // Phase 2: Ring fades in subtly (no scale)
      Animated.timing(ringOpacity, { toValue: 0.2, duration: 300, useNativeDriver: true }),
      
      // Phase 3: Logo appears with subtle scale
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, damping: 20, stiffness: 100, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      
      // Phase 4: Glow peaks once, then settles
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.7, duration: 400, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
      
      // Phase 5: Tagline fades in (no slide - just confident appearance)
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      
      // Phase 6: Let emotion land (the human beat)
      Animated.delay(600),
      
      // Phase 7: Graceful exit
      Animated.timing(screenFade, { toValue: 0, duration: 350, useNativeDriver: true }),
      
      // Phase 8: Micro-pause before navigation
      Animated.delay(150),
    ]).start(() => {
      router.replace('/login');
    });
  }, []);

  // 8 particles - intentional, not decorative
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: 600 + i * 150,
    startX: SCREEN_WIDTH * 0.2 + Math.random() * SCREEN_WIDTH * 0.6,
    startY: SCREEN_HEIGHT * 0.45 + Math.random() * SCREEN_HEIGHT * 0.15,
    size: 3 + Math.random() * 3,
  }));

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      <LinearGradient
        colors={['#0a0a0f', '#0d0a14', '#0a0a0f']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Single ambient glow - subtle, centered */}
      <Animated.View style={[styles.ambientGlow, { opacity: ambientGlow }]} />
      
      {/* Dust particles - atmosphere, not feature */}
      {particles.map((p) => (
        <Particle key={p.id} delay={p.delay} startX={p.startX} startY={p.startY} size={p.size} />
      ))}
      
      {/* Subtle ring - fade only, no scale */}
      <Animated.View style={[styles.ring, { opacity: ringOpacity }]} />
      
      {/* Logo */}
      <View style={styles.logoContainer}>
        {/* Glow layer */}
        <Animated.Text style={[styles.logoGlow, { opacity: glowOpacity }]}>
          LUMINA
        </Animated.Text>
        
        {/* Main logo */}
        <Animated.Text
          style={[
            styles.logoText,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          LUMINA
        </Animated.Text>
        
        {/* Tagline - inviting, not declarative */}
        <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
          <View style={styles.taglineLine} />
          <Text style={styles.taglineText}>Your night, understood</Text>
          <View style={styles.taglineLine} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Single ambient glow
  ambientGlow: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: colors.violet[600],
    top: SCREEN_HEIGHT * 0.25,
    alignSelf: 'center',
  },
  
  // Subtle particles
  particle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.violet[300],
  },
  
  // Ring - smaller, fade only
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: colors.violet[400],
  },
  
  // Logo
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    fontSize: 52,
    fontWeight: '700',
    color: colors.violet[400],
    letterSpacing: 10,
    textShadowColor: colors.violet[500],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 50,
  },
  logoText: {
    fontSize: 52,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 10,
  },
  
  // Tagline
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    gap: 14,
  },
  taglineLine: {
    width: 24,
    height: 1,
    backgroundColor: colors.zinc[700],
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.zinc[400],
    letterSpacing: 1,
  },
});
