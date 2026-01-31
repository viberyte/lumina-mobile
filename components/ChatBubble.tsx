import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        isUser ? styles.userContainer : styles.assistantContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[colors.violet[500], colors.purple[600]]}
            style={styles.avatar}
          >
            <Text style={styles.sparkle}>✨</Text>
          </LinearGradient>
        </View>
      )}
      
      <View style={styles.bubbleWrapper}>
        {isUser ? (
          <LinearGradient
            colors={['#9333EA', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userBubble}
          >
            <Text style={styles.text}>{content}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.assistantBubble}>
            <Text style={styles.text}>{content}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: spacing.sm,
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.violet[500],
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  sparkle: {
    fontSize: 16,
  },
  bubbleWrapper: {
    maxWidth: '80%',
  },
  userBubble: {
    borderRadius: 24,
    borderBottomRightRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  assistantBubble: {
    backgroundColor: colors.glass.medium,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 24,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.light,
    color: colors.white,
    lineHeight: 20,
  },
});
