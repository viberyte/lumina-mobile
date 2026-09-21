import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView , Linking} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const STEPS = [
  { key: 'photos', label: 'Add Photos', route: '/partner/settings' },
  { key: 'reels', label: 'Upload Reels', route: '/partner/media' },
  { key: 'hours', label: 'Set Hours', route: '/partner/settings' },
  { key: 'event', label: 'Publish First Event', route: '/partner/events/new' },
];

export default function OnboardingComplete() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [completed, setCompleted] = useState<string[]>([]);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggle = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompleted(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  };

  const progress = Math.round((completed.length / STEPS.length) * 100);

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={[s.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

          {/* Check mark */}
          <View style={s.iconWrap}>
            <Ionicons name="checkmark" size={28} color="#fff" />
          </View>

          {/* Headline */}
          <Text style={s.title}>Profile Live</Text>
          <Text style={s.sub}>Your venue is now discoverable on Viberyte.</Text>

          {/* Divider */}
          <View style={s.divider} />

          {/* Progress */}
          {completed.length > 0 && (
            <Text style={s.progressLabel}>{progress}% complete</Text>
          )}
          {completed.length === 0 && (
            <Text style={s.progressLabel}>{STEPS.length} steps left</Text>
          )}

          {/* Checklist */}
          <View style={s.list}>
            {STEPS.map((step) => {
              const done = completed.includes(step.key);
              return (
                <TouchableOpacity
                  key={step.key}
                  style={s.row}
                  onPress={() => toggle(step.key)}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkbox, done && s.checkboxDone]}>
                    {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={[s.rowLabel, done && s.rowLabelDone]}>{step.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.12)" />
                </TouchableOpacity>
              );
            })}
          </View>

        </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.replace('/partner/dashboard')}
            activeOpacity={0.88}
          >
            <Text style={s.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.secondaryLink}
            onPress={() => Linking.openURL('https://viberyte.com/partner/upgrade')}
          >
            <Text style={s.secondaryLinkText}>Manage subscription at viberyte.com</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 64,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.38)',
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 28,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  rowLabelDone: {
    color: 'rgba(255,255,255,0.25)',
    textDecorationLine: 'line-through',
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 17,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryLinkText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
  },
});
