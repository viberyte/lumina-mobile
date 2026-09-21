import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FlowCard from '../components/FlowCard';
import { spacing } from '../theme';

const API_BASE = 'https://viberyte.com';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'date',        label: 'Date Night' },
  { key: 'friends',     label: 'Friends Night' },
  { key: 'celebration', label: 'Weekend Energy' },
  { key: 'late_night',  label: 'Late Night Move' },
  { key: 'afro',        label: 'Afro Night' },
  { key: 'latin',       label: 'Latin Night' },
  { key: 'culture',     label: 'Culture Vibes' },
  { key: 'business',    label: 'Business Dinner' },
  { key: 'solo',        label: 'Solo Adventure' },
  { key: 'tomorrow',    label: 'Tomorrow Moves' },
  { key: 'brunch',      label: 'Brunch' },
];

const INITIAL_LOAD = 4; // paint fast, lazy-load the rest on scroll

export default function AllFlowsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [city, setCity] = useState('Manhattan');
  const [data, setData] = useState<Record<string, any[]>>({});
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const savedCity = await AsyncStorage.getItem('@lumina_selected_city');
      const c = savedCity && savedCity !== 'Near Me' ? savedCity : 'Manhattan';
      setCity(c);
      CATEGORIES.slice(0, INITIAL_LOAD).forEach((cat) => fetchCategory(cat.key, c));
    })();
  }, []);

  const fetchCategory = async (key: string, c: string) => {
    if (fetchedRef.current.has(key)) return;
    fetchedRef.current.add(key);
    setLoadingKeys((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch(
        `${API_BASE}/api/flows?city=${encodeURIComponent(c)}&intent=${key}&variations=15`
      );
      const json = await res.json();
      const flows = json.ok && json.flows ? json.flows : [];
      setData((p) => ({ ...p, [key]: flows }));
    } catch (e) {
      console.log('[AllFlows] error', key, e);
      setData((p) => ({ ...p, [key]: [] }));
    } finally {
      setLoadingKeys((p) => ({ ...p, [key]: false }));
    }
  };

  // when user scrolls near the bottom, reveal + fetch the next categories
  const onScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 600;
    if (nearBottom && visibleCount < CATEGORIES.length) {
      const next = Math.min(visibleCount + 2, CATEGORIES.length);
      CATEGORIES.slice(visibleCount, next).forEach((cat) => fetchCategory(cat.key, city));
      setVisibleCount(next);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>All Flows</Text>
          <Text style={styles.headerSubtitle}>Every kind of night, planned out</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {CATEGORIES.slice(0, visibleCount).map((cat) => {
          const flows = data[cat.key];
          const isLoading = loadingKeys[cat.key];
          if (!isLoading && flows && flows.length === 0) return null; // skip empty categories

          return (
            <View key={cat.key} style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/flows-category?intent=${cat.key}&label=${encodeURIComponent(cat.label)}` as any);
                }}
              >
                <Text style={styles.sectionTitle}>{cat.label}</Text>
                <View style={styles.seeAll}>
                  <Text style={styles.seeAllText}>See all</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
                </View>
              </TouchableOpacity>
              {isLoading || !flows ? (
                <View style={styles.rowLoader}>
                  <ActivityIndicator color="rgba(255,255,255,0.5)" />
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH + 16}
                  decelerationRate="fast"
                  contentContainerStyle={styles.rowContent}
                >
                  {flows.map((flow: any, i: number) => (
                    <View key={`${cat.key}-${i}`} style={styles.cardSlot}>
                      <FlowCard flow={flow} />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: 14,
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  rowContent: { paddingHorizontal: spacing.lg, gap: 16 },
  cardSlot: { width: CARD_WIDTH },
  rowLoader: { height: 200, justifyContent: 'center', alignItems: 'center' },
});
