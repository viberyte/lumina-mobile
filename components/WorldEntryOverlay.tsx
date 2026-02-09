import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface WorldData {
  key: string;
  title: string;
  emoji: string;
  gradient: [string, string];
  entry_tags: string[];
}

interface WorldEntryOverlayProps {
  world: WorldData | null;
  visible: boolean;
  onComplete: () => void;
}

export default function WorldEntryOverlay({ world, visible, onComplete }: WorldEntryOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const emojiAnim = useRef(new Animated.Value(0)).current;
  const tagAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    if (world) {
      tagAnims.current = world.entry_tags.map(() => new Animated.Value(0));
    }
  }, [world?.key]);

  useEffect(() => {
    if (visible && world) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      emojiAnim.setValue(0);
      tagAnims.current.forEach(anim => anim.setValue(0));

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.spring(emojiAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        delay: 100,
        useNativeDriver: true,
      }).start();

      tagAnims.current.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 200,
          delay: 200 + i * 60,
          useNativeDriver: true,
        }).start();
      });

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onComplete());
      }, 1100);

      return () => clearTimeout(timer);
    }
  }, [visible, world]);

  if (!visible || !world) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[world.gradient[0], world.gradient[1]]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.Text
          style={[
            styles.emoji,
            {
              opacity: emojiAnim,
              transform: [
                {
                  scale: emojiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {world.emoji}
        </Animated.Text>

        <View style={styles.tagsRow}>
          {world.entry_tags.map((tag, i) => (
            <Animated.View
              key={tag}
              style={{
                opacity: tagAnims.current[i] || 0,
                transform: [
                  {
                    translateY: (tagAnims.current[i] || new Animated.Value(0)).interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              }}
            >
              <Text style={styles.tag}>
                {tag}
                {i < world.entry_tags.length - 1 && (
                  <Text style={styles.dot}> • </Text>
                )}
              </Text>
            </Animated.View>
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tag: {
    fontSize: 18,
    fontWeight: '500',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  dot: {
    color: 'rgba(255,255,255,0.4)',
  },
});
