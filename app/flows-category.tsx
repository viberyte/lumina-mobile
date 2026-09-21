import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FlowCardLarge from '../components/FlowCardLarge';
import { spacing } from '../theme';

const API_BASE = 'https://viberyte.com';

export default function FlowsCategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { intent, label } = useLocalSearchParams<{ intent: string; label: string }>();

  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, [intent]);

  const load = async () => {
    try {
      setLoading(true);
      const savedCity = await AsyncStorage.getItem('@lumina_selected_city');
      const city = savedCity && savedCity !== 'Near Me' ? savedCity : 'Manhattan';
      const res = await fetch(`${API_BASE}/api/flows?city=${encodeURIComponent(city)}&intent=${intent}&variations=15`);
      const data = await res.json();
      setFlows(data.ok && data.flows ? data.flows : []);
    } catch (e) {
      console.log('[FlowsCategory] error', e);
      setFlows([]);
    } finally {
      setLoading(false);
    }
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    setVisibleIds(new Set(viewableItems.map((v: any) => v.key)));
  }).current;

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
          <Text style={styles.headerTitle}>{label || 'Flows'}</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Curating your options' : `${flows.length} curated experiences`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color="#fff" size="large" /></View>
      ) : (
        <FlatList
          data={flows}
          keyExtractor={(item, i) => `${item.slug || "flow"}-${i}`}
          renderItem={({ item, index }) => (
            <FlowCardLarge flow={item} isVisible={visibleIds.has(`${item.slug || "flow"}-${index}`)} />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
});
