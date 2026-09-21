import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function VenueSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.08],
  });

  const Block = ({ width, height, radius = 8, marginBottom = 0 }: any) => (
    <Animated.View
      style={{
        width, height, borderRadius: radius, marginBottom,
        backgroundColor: `rgba(255,255,255,1)`,
        opacity,
      }}
    />
  );

  return (
    <View style={styles.card}>
      <Block width="100%" height={180} radius={12} marginBottom={12} />
      <Block width="60%" height={18} marginBottom={8} />
      <Block width="40%" height={14} marginBottom={6} />
      <Block width="80%" height={12} />
    </View>
  );
}

export function VenueListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 16, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <VenueSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
});
