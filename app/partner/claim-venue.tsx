import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Linking,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const API_BASE = 'https://viberyte.com';

interface VenueResult {
  id: number;
  business_name: string;
  instagram_handle: string;
  profile_picture: string;
  claim_token: string;
  city: string;
  state: string;
  address: string;
  category: string;
  professional_photo_url: string;
}

export default function ClaimVenueScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VenueResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const getToken = async () => {
    const session = await AsyncStorage.getItem('lumina_partner_session');
    if (!session) return null;
    try { return JSON.parse(session).token; } catch { return null; }
  };

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { Alert.alert('Error', 'Please log in first'); return; }
      const res = await fetch(`${API_BASE}/api/partner/claim-search?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setResults(data.venues || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => search(query), 400);
    setTimer(t);
    return () => clearTimeout(t);
  }, [query]);

  const handleClaim = async (venue: VenueResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setClaiming(venue.id);

    try {
      const token = await getToken();
      if (!token) { Alert.alert('Error', 'Please log in first'); return; }

      const res = await fetch(`${API_BASE}/api/partner/claim-venue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partner_page_id: venue.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to start claim');
        return;
      }

      await Linking.openURL(data.auth_url);
      Alert.alert(
        'Verification Started',
        'Log in to Instagram to verify you manage ' + venue.business_name + '. Once verified, the page will be linked to your account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setClaiming(null);
    }
  };

  const getPhoto = (venue: VenueResult) => {
    if (venue.profile_picture) return { uri: venue.profile_picture };
    if (venue.professional_photo_url) {
      const url = venue.professional_photo_url.startsWith('/')
        ? `${API_BASE}${venue.professional_photo_url}`
        : venue.professional_photo_url;
      return { uri: url };
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Claim a Venue</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Search for your venue and verify ownership with Instagram
      </Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search venue name..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator color="#a78bfa" style={{ marginTop: 24 }} />}

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
        {results.map((venue) => {
          const photo = getPhoto(venue);
          const ig = venue.instagram_handle && !venue.instagram_handle.startsWith('venue_')
            ? venue.instagram_handle : null;

          return (
            <View key={venue.id} style={styles.card}>
              <View style={styles.cardRow}>
                {photo ? (
                  <Image source={photo} style={styles.photo} />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Ionicons name="business" size={20} color="rgba(255,255,255,0.2)" />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.venueName}>{venue.business_name}</Text>
                  <Text style={styles.venueDetail}>
                    {venue.city}{venue.state ? `, ${venue.state}` : ''} · {venue.category}
                  </Text>
                  {ig && <Text style={styles.venueIg}>@{ig.replace('@', '')}</Text>}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.claimBtn, claiming === venue.id && styles.claimBtnLoading]}
                onPress={() => handleClaim(venue)}
                disabled={claiming !== null}
              >
                {claiming === venue.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-instagram" size={16} color="#fff" />
                    <Text style={styles.claimBtnText}>Verify & Claim</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {query.length >= 2 && !loading && results.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyText}>No unclaimed venues found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        )}

        {query.length < 2 && (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={40} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyText}>Find your venue</Text>
            <Text style={styles.emptySubtext}>
              {'Type at least 2 characters to search\nYou\'ll verify ownership by connecting your venue\'s Instagram'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 40, marginBottom: 20 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 14, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },
  list: { flex: 1, paddingTop: 16 },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  photo: { width: 56, height: 56, borderRadius: 12, marginRight: 14 },
  photoPlaceholder: { backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  venueName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 3 },
  venueDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' },
  venueIg: { fontSize: 12, color: '#a78bfa', marginTop: 2 },
  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 14 },
  claimBtnLoading: { opacity: 0.6 },
  claimBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  emptySubtext: { fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 20 },
});
