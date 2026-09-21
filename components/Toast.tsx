import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

const TOAST_CONFIG = {
  success: { icon: 'checkmark' as const, color: '#fff' },
  error: { icon: 'xmark' as const, color: '#ff453a' },
  info: { icon: 'info' as const, color: '#fff' },
};

export default function Toast({ visible, message, type = 'success', duration = 2500, onHide }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }),
      ]).start();

      const timer = setTimeout(hideToast, duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.92, duration: 200, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible) return null;
  const config = TOAST_CONFIG[type];

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + 12, transform: [{ translateY }, { scale }], opacity }]}
      pointerEvents="none"
    >
      <BlurView intensity={95} tint="dark" style={styles.blur}>
        <View style={styles.content}>
          <Ionicons name={config.icon as any} size={13} color={config.color} />
          <Text style={styles.message} numberOfLines={1}>{message}</Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  blur: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    gap: 7,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.1,
  },
});
