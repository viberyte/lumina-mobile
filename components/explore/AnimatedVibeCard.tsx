import React, { useEffect, useRef } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Dimensions,
  Animated,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;
const CARD_HEIGHT = 140;

// Richer, more vibrant gradients for each vibe
const VIBE_GRADIENTS: Record<string, { colors: string[]; glow: string }> = {
  // Nightlife
  outside: { 
    colors: ['#ff6b35', '#f7931e', '#c73e1d'], 
    glow: 'rgba(255, 107, 53, 0.4)' 
  },
  latin_nights: { 
    colors: ['#e91e63', '#9c27b0', '#673ab7'], 
    glow: 'rgba(233, 30, 99, 0.4)' 
  },
  low_light: { 
    colors: ['#1a237e', '#283593', '#3949ab'], 
    glow: 'rgba(57, 73, 171, 0.4)' 
  },
  pulse: { 
    colors: ['#00bcd4', '#0097a7', '#006064'], 
    glow: 'rgba(0, 188, 212, 0.4)' 
  },
  main_stage: { 
    colors: ['#8e24aa', '#7b1fa2', '#6a1b9a'], 
    glow: 'rgba(142, 36, 170, 0.4)' 
  },
  lounges: { 
    colors: ['#5c6bc0', '#3f51b5', '#303f9f'], 
    glow: 'rgba(92, 107, 192, 0.4)' 
  },
  clubs: { 
    colors: ['#ec407a', '#d81b60', '#ad1457'], 
    glow: 'rgba(236, 64, 122, 0.4)' 
  },
  rooftops: { 
    colors: ['#26c6da', '#00acc1', '#00838f'], 
    glow: 'rgba(38, 198, 218, 0.4)' 
  },
  
  // Dining
  italian: { 
    colors: ['#c62828', '#b71c1c', '#8e0000'], 
    glow: 'rgba(198, 40, 40, 0.4)' 
  },
  caribbean: { 
    colors: ['#00c853', '#00e676', '#1b5e20'], 
    glow: 'rgba(0, 200, 83, 0.4)' 
  },
  japanese: { 
    colors: ['#d32f2f', '#c62828', '#212121'], 
    glow: 'rgba(211, 47, 47, 0.3)' 
  },
  mexican: { 
    colors: ['#ff5722', '#e64a19', '#bf360c'], 
    glow: 'rgba(255, 87, 34, 0.4)' 
  },
  soul_food: { 
    colors: ['#ff8f00', '#ff6f00', '#e65100'], 
    glow: 'rgba(255, 143, 0, 0.4)' 
  },
  mediterranean: { 
    colors: ['#0288d1', '#0277bd', '#01579b'], 
    glow: 'rgba(2, 136, 209, 0.4)' 
  },
  chinese: { 
    colors: ['#d50000', '#c51162', '#aa00ff'], 
    glow: 'rgba(213, 0, 0, 0.4)' 
  },
  korean: { 
    colors: ['#ff3d00', '#dd2c00', '#bf360c'], 
    glow: 'rgba(255, 61, 0, 0.4)' 
  },
  thai: { 
    colors: ['#ffab00', '#ff6d00', '#ff3d00'], 
    glow: 'rgba(255, 171, 0, 0.4)' 
  },
  indian: { 
    colors: ['#ff6f00', '#f57c00', '#e65100'], 
    glow: 'rgba(255, 111, 0, 0.4)' 
  },
  french: { 
    colors: ['#1565c0', '#0d47a1', '#002171'], 
    glow: 'rgba(21, 101, 192, 0.4)' 
  },
  american: { 
    colors: ['#5d4037', '#4e342e', '#3e2723'], 
    glow: 'rgba(93, 64, 55, 0.4)' 
  },
  latin: { 
    colors: ['#f4511e', '#e64a19', '#d84315'], 
    glow: 'rgba(244, 81, 30, 0.4)' 
  },
  seafood: { 
    colors: ['#0097a7', '#00838f', '#006064'], 
    glow: 'rgba(0, 151, 167, 0.4)' 
  },
  steakhouse: { 
    colors: ['#6d4c41', '#5d4037', '#4e342e'], 
    glow: 'rgba(109, 76, 65, 0.4)' 
  },
};

// Default gradient for unknown vibes
const DEFAULT_GRADIENT = { 
  colors: ['#424242', '#303030', '#212121'], 
  glow: 'rgba(66, 66, 66, 0.3)' 
};

interface AnimatedVibeCardProps {
  vibeKey: string;
  title: string;
  subtitle: string;
  index: number;
  onPress: () => void;
}

export default function AnimatedVibeCard({ 
  vibeKey, 
  title, 
  subtitle, 
  index, 
  onPress 
}: AnimatedVibeCardProps) {
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Wave animation - staggered by index
  useEffect(() => {
    const delay = index * 200; // Stagger each card
    const duration = 3000 + (index % 3) * 500; // Vary duration slightly

    const waveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );

    // Start with delay
    const timeout = setTimeout(() => {
      waveAnimation.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      waveAnimation.stop();
    };
  }, [index]);

  // Glow pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  // Wave translation - subtle floating effect
  const translateY = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8], // Float up 8px
  });

  const gradientConfig = VIBE_GRADIENTS[vibeKey] || DEFAULT_GRADIENT;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          transform: [
            { translateY },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* Glow effect */}
      <Animated.View 
        style={[
          styles.glow, 
          { 
            backgroundColor: gradientConfig.glow,
            opacity: glowAnim,
          }
        ]} 
      />
      
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradientConfig.colors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Subtle noise/texture overlay */}
          <View style={styles.noiseOverlay} />
          
          {/* Shine effect */}
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'transparent', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shine}
          />
          
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 0,
  },
  glow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 20,
    transform: [{ scale: 1.05 }],
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    opacity: 0.5,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
});
