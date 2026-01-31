import React, { useState, useEffect } from 'react';
import { partnerFetch } from '../../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://lumina.viberyte.com';

type Package = {
  id: string;
  name: string;
  description: string;
  bottle_count: number;
  price: number;
  max_guests: number;
};

export default function EventDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    fetchEvent();
  }, []);

  const fetchEvent = async () => {
    try {
      const session = await AsyncStorage.getItem('lumina_partner_session');
      if (!session) {
        router.replace('/partner');
        return;
      }

      const { token } = JSON.parse(session);

      const res = await partnerFetch(`/api/partner/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setPackages(data.packages || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const copyLink = () => {
    const slug = event?.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || id;
    const link = `https://lumina.viberyte.com/e/${slug}-${id}`;
    Alert.alert('Link Copied', link);
    // In production: Clipboard.setString(link);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasPackages = packages.length > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event</Text>
          <TouchableOpacity onPress={copyLink} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.subtitle}>{event.venue_name || 'No venue'}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#52525b" />
              <Text style={styles.metaText}>{formatDate(event.event_date)}</Text>
            </View>
            {event.event_time && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#52525b" />
                <Text style={styles.metaText}>{event.event_time}</Text>
              </View>
            )}
            {event.genre && (
              <View style={styles.metaItem}>
                <Ionicons name="musical-notes-outline" size={16} color="#52525b" />
                <Text style={styles.metaText}>{event.genre}</Text>
              </View>
            )}
          </View>

          {event.description && (
            <Text style={styles.description}>{event.description}</Text>
          )}

          {/* Status */}
          <View style={styles.statusCard}>
            <View style={[styles.statusDot, hasPackages ? styles.statusLive : styles.statusDraft]} />
            <Text style={styles.statusText}>{hasPackages ? 'Live' : 'Needs Setup'}</Text>
          </View>

          {/* Packages */}
          <Text style={styles.sectionLabel}>PACKAGES</Text>
          
          {packages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No packages yet</Text>
              <Text style={styles.emptySubtext}>Add packages so guests can book</Text>
            </View>
          ) : (
            packages.map((pkg) => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePrice}>${pkg.price}</Text>
                </View>
                {pkg.description && <Text style={styles.packageDesc}>{pkg.description}</Text>}
                <Text style={styles.packageMeta}>{pkg.bottle_count} bottles · {pkg.max_guests} guests</Text>
              </View>
            ))
          )}

          {/* Actions */}
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push(`/partner/events/${id}/edit`)}>
            <Text style={styles.primaryBtnText}>{hasPackages ? 'Edit Packages' : 'Set Up Packages'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={copyLink}>
            <Ionicons name="link-outline" size={18} color="#3b82f6" />
            <Text style={styles.secondaryBtnText}>Copy Booking Link</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  errorText: { fontSize: 16, color: '#71717a' },
  backLink: { fontSize: 16, color: '#3b82f6', marginTop: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },

  scroll: { flex: 1, paddingHorizontal: 20 },

  title: { fontSize: 28, fontWeight: '600', color: '#fff', letterSpacing: -0.5, marginTop: 8 },
  subtitle: { fontSize: 16, color: '#52525b', marginTop: 4 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: '#71717a' },

  description: { fontSize: 15, color: '#a1a1aa', marginTop: 20, lineHeight: 22 },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLive: { backgroundColor: '#22c55e' },
  statusDraft: { backgroundColor: '#f59e0b' },
  statusText: { fontSize: 14, color: '#fff' },

  sectionLabel: { fontSize: 12, color: '#52525b', marginTop: 32, marginBottom: 12, letterSpacing: 0.5 },

  emptyCard: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#71717a' },
  emptySubtext: { fontSize: 13, color: '#3f3f46', marginTop: 4 },

  packageCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, marginBottom: 8 },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageName: { fontSize: 16, fontWeight: '500', color: '#fff' },
  packagePrice: { fontSize: 16, color: '#fff' },
  packageDesc: { fontSize: 14, color: '#71717a', marginTop: 4 },
  packageMeta: { fontSize: 13, color: '#3f3f46', marginTop: 8 },

  primaryBtn: { backgroundColor: '#fff', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },

  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 12 },
  secondaryBtnText: { fontSize: 15, color: '#3b82f6' },
});
