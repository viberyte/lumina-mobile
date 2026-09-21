import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const API = 'https://viberyte.com';

const VENUE_TYPES = [
  { key: 'nightclub', label: 'Nightclub', icon: 'musical-notes' },
  { key: 'bar', label: 'Bar & Lounge', icon: 'wine' },
  { key: 'restaurant', label: 'Restaurant', icon: 'restaurant' },
  { key: 'rooftop', label: 'Rooftop', icon: 'sunny' },
  { key: 'event_space', label: 'Event Space', icon: 'calendar' },
  { key: 'promoter', label: 'Promoter', icon: 'megaphone' },
];

const ROLES = [
  { key: 'owner', label: 'Owner', icon: 'business' },
  { key: 'manager', label: 'Manager', icon: 'people' },
  { key: 'promoter', label: 'Promoter', icon: 'megaphone' },
  { key: 'marketing', label: 'Marketing', icon: 'megaphone-outline' },
  { key: 'dj', label: 'DJ', icon: 'musical-note' },
  { key: 'chef', label: 'Chef / Restaurant Owner', icon: 'restaurant' },
];

const VIBE_OPTIONS = [
  'Intimate','Energetic','Trendy','Upscale','Chill',
  'Hidden Gem','Lively','Romantic','Late Night','Rooftop',
  'Speakeasy','Live Music','DJ','Outdoor','BYOB',
];

const GENRE_OPTIONS = [
  'Hip Hop','R&B','Afrobeats','House','Latin',
  'Reggaeton','Amapiano','Open Format','Jazz','Soul',
];

type Mode = 'welcome' | 'login' | 'signup';

export default function PartnerIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('welcome');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [createNew, setCreateNew] = useState(false);

  const [role, setRole] = useState('');
  const [venueType, setVenueType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressTimeout = useRef<any>(null);
  const [reels, setReels] = useState<any[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const searchTimeout = useRef<any>(null);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API}/api/partner/venue-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(data.venues || []);
      } catch {}
      finally { setSearchLoading(false); }
    }, 350);
  };

  const handleAddressSearch = (q: string) => {
    setAddress(q);
    if (addressTimeout.current) clearTimeout(addressTimeout.current);
    if (q.length < 3) { setAddressSuggestions([]); return; }
    addressTimeout.current = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=establishment|geocode&key=AIzaSyDvMcJrFjAc_Wrb_FJzqVRWv_z00YB_j0k`
        );
        const data = await res.json();
        setAddressSuggestions(data.predictions || []);
      } catch {}
      finally { setAddressLoading(false); }
    }, 400);
  };

  const selectAddress = async (place: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddressSuggestions([]);
    // Show description immediately while we fetch details
    setAddress(place.description);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_address,address_components&key=AIzaSyDvMcJrFjAc_Wrb_FJzqVRWv_z00YB_j0k`
      );
      const data = await res.json();
      const result = data.result;
      if (result?.formatted_address) {
        setAddress(result.formatted_address);
      }
      // Extract city and neighborhood from components
      const components = result?.address_components || [];
      const getComponent = (type: string) =>
        components.find((c: any) => c.types.includes(type))?.long_name || '';
      const nbhd = getComponent('neighborhood') || getComponent('sublocality_level_1');
      const cityVal = getComponent('locality') || getComponent('sublocality');
      if (nbhd) setNeighborhood(nbhd);
      if (cityVal) setCity(cityVal);
    } catch {}
  };

  const selectVenue = (venue: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVenue(venue);
    setBusinessName(venue.name || '');
    setInstagram(venue.instagram_handle || '');
    setPhone(venue.phone || '');
    setCity(venue.city || '');
    setNeighborhood(venue.neighborhood || '');
    setAddress(venue.address || '');
    if (venue.category) setVenueType(venue.category);
  };

  const toggleVibe = (v: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVibes(p => p.includes(v) ? p.filter(x => x !== v) : p.length < 5 ? [...p, v] : p);
  };

  const toggleGenre = (g: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGenres(p => p.includes(g) ? p.filter(x => x !== g) : p.length < 4 ? [...p, g] : p);
  };

  const pickReel = async () => {
    if (reels.length >= 3) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to pick videos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] as any, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setReels(p => [...p, result.assets[0]]);
    }
  };

  const validateStep = () => {
    if (step === 1 && !selectedVenue && !createNew) { setError('Select your venue or tap "Create new"'); return false; }
    if (step === 2 && !role) { setError('Select your role'); return false; }
    if (step === 3 && !businessName.trim()) { setError('Enter your business name'); return false; }
    if (step === 3 && !phone.trim()) { setError('Phone number is required'); return false; }
    if (step === 3 && !address.trim()) { setError('Address is required'); return false; }
    if (step === 5 && !email.trim()) { setError('Email is required'); return false; }
    if (step === 5 && password.length < 8) { setError('Password must be at least 8 characters'); return false; }
    return true;
  };

  const nextStep = () => {
    setError('');
    if (!validateStep()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 5) setStep(s => s + 1);
    else handleSignup();
  };

  const prevStep = () => {
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) setStep(s => s - 1);
    else setMode('welcome');
  };

  const handleSignup = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/partner/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, business_name: businessName, instagram_handle: instagram.replace('@',''), phone, address, city, neighborhood, venue_type: venueType, partner_role: role, vibes: selectedVibes, music_genres: selectedGenres, tier: 'free' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed'); setLoading(false); return; }
      await AsyncStorage.setItem('lumina_partner_session', JSON.stringify({ token: data.token, partner: data.partner }));
      if (selectedVenue) {
        await fetch(`${API}/api/partner/claim-venue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
          body: JSON.stringify({ venue_id: selectedVenue.id }),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/partner/onboarding-complete' as any);
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { setError('Enter email and password'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/partner/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPassword.trim() }) });
      const data = await res.json();
      if (res.ok && data.token) {
        await AsyncStorage.setItem('lumina_partner_session', JSON.stringify({ token: data.token, partner: data.partner }));
        router.replace('/partner/dashboard');
      } else { setError(data.error || 'Invalid credentials'); }
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  if (mode === 'welcome') {
    return (
      <View style={s.root}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          <View style={{ gap: 12 }}>
            <Text style={s.eyebrow}>VIBERYTE</Text>
            <Text style={s.welcomeTitle}>Claim Your{'\n'}Venue</Text>
            <Text style={s.welcomeSub}>We've already built profiles for thousands of venues. Yours might be ready to claim.</Text>
          </View>
          <View style={{ gap: 10 }}>
            <TouchableOpacity style={s.primaryBtn} onPress={() => { setMode('signup'); setStep(1); }} activeOpacity={0.88}>
              <Text style={s.primaryBtnText}>Get Started — It's Free</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} onPress={() => setMode('login')} activeOpacity={0.88}>
              <Text style={s.ghostBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (mode === 'login') {
    return (
      <View style={s.root}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, padding: 28 }}>
            <TouchableOpacity onPress={() => setMode('welcome')} style={s.backBtn}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
            <Text style={[s.stepTitle, { marginTop: 20 }]}>Welcome back</Text>
            <Text style={s.stepSub}>Sign in to manage your venue</Text>
            <View style={{ gap: 12, marginTop: 28 }}>
              <TextInput style={s.input} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.2)" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={s.input} placeholder="Password" placeholderTextColor="rgba(255,255,255,0.2)" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity style={[s.primaryBtn, { marginTop: 8 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.88}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Sign In</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  const STEPS = ['Claim','Role','Basics','Reels','Account'];

  return (
    <View style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.header}>
            <TouchableOpacity onPress={prevStep} style={s.backBtn}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
            <View style={s.progressWrap}>
              {STEPS.map((_, i) => (
                <View key={i} style={[s.dot, i + 1 <= step && s.dotOn]} />
              ))}
            </View>
            <Text style={s.stepCount}>{step} / 5</Text>
          </View>

          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {step === 1 && (
              <View>
                <Text style={s.stepTitle}>Find your venue</Text>
                <Text style={s.stepSub}>We may have already built your profile. Search to find out.</Text>
                {!createNew && (
                  <>
                    <View style={s.searchBox}>
                      <Ionicons name="search" size={16} color="rgba(255,255,255,0.3)" />
                      <TextInput style={s.searchInput} placeholder="Search by name..." placeholderTextColor="rgba(255,255,255,0.2)" value={searchQuery} onChangeText={handleSearch} autoCapitalize="words" />
                      {searchLoading && <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />}
                    </View>
                    {selectedVenue && (
                      <View style={s.claimCard}>
                        {selectedVenue.photo && (
                          <Image source={{ uri: selectedVenue.photo.startsWith('/') ? `${API}${selectedVenue.photo}` : selectedVenue.photo }} style={s.claimPhoto} contentFit="cover" />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={s.claimName}>{selectedVenue.name}</Text>
                          <Text style={s.claimMeta}>{selectedVenue.neighborhood} · {selectedVenue.category}</Text>
                          <View style={s.magicRow}>
                            <Ionicons name="sparkles" size={12} color="#a78bfa" />
                            <Text style={s.magicText}>We've already built your profile</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => { setSelectedVenue(null); setSearchQuery(''); }}>
                          <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.25)" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {!selectedVenue && searchResults.length > 0 && (
                      <View style={{ gap: 8 }}>
                        {searchResults.map(v => (
                          <TouchableOpacity key={v.id} style={[s.resultRow, v.is_claimed && { opacity: 0.35 }]} onPress={() => !v.is_claimed && selectVenue(v)} activeOpacity={v.is_claimed ? 1 : 0.85}>
                            {v.photo && <Image source={{ uri: v.photo.startsWith('/') ? `${API}${v.photo}` : v.photo }} style={s.resultPhoto} contentFit="cover" />}
                            <View style={{ flex: 1 }}>
                              <Text style={s.resultName}>{v.name}</Text>
                              <Text style={s.resultMeta}>{v.neighborhood} · {v.category}</Text>
                            </View>
                            {v.is_claimed ? <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: '600' }}>Claimed</Text> : <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {searchQuery.length > 2 && searchResults.length === 0 && !searchLoading && (
                      <TouchableOpacity style={s.notFound} onPress={() => setCreateNew(true)}>
                        <Text style={s.notFoundText}>Not found? Create a new venue profile →</Text>
                      </TouchableOpacity>
                    )}

                    {!selectedVenue && (
                      <TouchableOpacity style={s.skipLink} onPress={() => setCreateNew(true)}>
                        <Text style={s.skipLinkText}>My venue isn't listed — create new</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
                {createNew && (
                  <View style={s.createNote}>
                    <Ionicons name="add-circle" size={20} color="#a78bfa" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 }}>Creating new profile</Text>
                      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 18 }}>Fill in your details in the next steps</Text>
                    </View>
                    <TouchableOpacity onPress={() => setCreateNew(false)}>
                      <Text style={{ fontSize: 12, color: '#a78bfa' }}>Search instead</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {step === 2 && (
              <View>
                <Text style={s.stepTitle}>Who are you?</Text>
                <Text style={s.stepSub}>This shapes your dashboard experience</Text>
                <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.07)' }}>
                  {ROLES.map((r, i) => (
                    <TouchableOpacity key={r.key} style={[s.card, i < ROLES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRole(r.key); }} activeOpacity={0.7}>
                      <Ionicons name={r.icon as any} size={18} color={role === r.key ? '#fff' : 'rgba(255,255,255,0.25)'} />
                      <Text style={[s.cardLabel, role === r.key && s.cardLabelOn]}>{r.label}</Text>
                      {role === r.key && <Ionicons name="checkmark" size={16} color="#7c3aed" />}
                    </TouchableOpacity>
                  ))}
                </View>
                {role && role !== 'promoter' && (
                  <>
                    <Text style={[s.stepSub, { marginTop: 24, marginBottom: 12 }]}>Venue type</Text>
                    <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.07)' }}>
                      {VENUE_TYPES.map((t, i) => (
                        <TouchableOpacity key={t.key} style={[s.card, i < VENUE_TYPES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVenueType(t.key); }} activeOpacity={0.7}>
                          <Ionicons name={t.icon as any} size={18} color={venueType === t.key ? '#fff' : 'rgba(255,255,255,0.25)'} />
                          <Text style={[s.cardLabel, venueType === t.key && s.cardLabelOn]}>{t.label}</Text>
                          {venueType === t.key && <Ionicons name="checkmark" size={16} color="#7c3aed" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            {step === 3 && (
              <View>
                <Text style={s.stepTitle}>{selectedVenue ? 'Review your basics' : 'Your basics'}</Text>
                <Text style={s.stepSub}>{selectedVenue ? "Pre-filled from our data — update anything that's changed." : 'Tell us about your venue'}</Text>
                {[
                  { label: 'Business Name', val: businessName, set: setBusinessName, placeholder: 'Venue name' },
                  { label: 'Instagram', val: instagram, set: setInstagram, placeholder: '@yourhandle', caps: 'none' as any },
                  { label: 'Phone', val: phone, set: setPhone, placeholder: '+1 (555) 000-0000', keyboard: 'phone-pad' as any },
                ].map(f => (
                  <View key={f.label} style={{ marginBottom: 14 }}>
                    <Text style={s.label}>{f.label}</Text>
                    <TextInput style={s.input} value={f.val} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor="rgba(255,255,255,0.2)" autoCapitalize={f.caps || 'words'} keyboardType={f.keyboard || 'default'} />
                  </View>
                ))}
                <View style={{ marginBottom: 14 }}>
                  <Text style={s.label}>Address <Text style={{ color: '#f87171', fontWeight: '700' }}>*</Text></Text>
                  <TextInput
                    style={s.input}
                    value={address}
                    onChangeText={handleAddressSearch}
                    placeholder="123 Main St, New York, NY"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    autoCapitalize="words"
                  />
                  {addressLoading && <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" style={{ marginTop: 8 }} />}
                  {addressSuggestions.length > 0 && (
                    <View style={{ marginTop: 6, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' }}>
                      {addressSuggestions.slice(0, 4).map((place, i) => (
                        <TouchableOpacity
                          key={place.place_id}
                          style={{ padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0, borderBottomColor: 'rgba(255,255,255,0.06)' }}
                          onPress={() => selectAddress(place)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 13, color: '#fff', marginBottom: 2 }} numberOfLines={1}>{place.structured_formatting?.main_text || place.description}</Text>
                          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }} numberOfLines={1}>{place.structured_formatting?.secondary_text || ''}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>City</Text>
                    <TextInput style={s.input} value={city} onChangeText={setCity} placeholder="New York" placeholderTextColor="rgba(255,255,255,0.2)" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Neighborhood</Text>
                    <TextInput style={s.input} value={neighborhood} onChangeText={setNeighborhood} placeholder="SoHo" placeholderTextColor="rgba(255,255,255,0.2)" />
                  </View>
                </View>
              </View>
            )}

            {step === 4 && (
              <View>
                <Text style={s.stepTitle}>Show your vibe</Text>
                <Text style={s.stepSub}>Venues with reels get 4× more engagement</Text>
                <View style={{ marginBottom: 28 }}>
                  <Text style={s.label}>Upload Reels <Text style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.3)' }}>(up to 3)</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    {reels.map((_, i) => (
                      <View key={i} style={s.reelThumb}>
                        <Ionicons name="videocam" size={20} color="rgba(255,255,255,0.6)" />
                        <TouchableOpacity style={s.reelRemove} onPress={() => setReels(p => p.filter((_,j) => j !== i))}>
                          <Ionicons name="close-circle" size={18} color="#f87171" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {reels.length < 3 && (
                      <TouchableOpacity style={s.reelAdd} onPress={pickReel}>
                        <Ionicons name="add" size={24} color="rgba(255,255,255,0.3)" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity style={s.skipReels}>
                    <Text style={s.skipReelsText}>Skip for now</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ marginBottom: 20 }}>
                  <Text style={s.label}>Vibes <Text style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.3)' }}>(up to 5)</Text></Text>
                  <View style={s.chips}>
                    {VIBE_OPTIONS.map(v => (
                      <TouchableOpacity key={v} style={[s.chip, selectedVibes.includes(v) && s.chipOn]} onPress={() => toggleVibe(v)} activeOpacity={0.85}>
                        <Text style={[s.chipText, selectedVibes.includes(v) && s.chipTextOn]}>{v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={s.label}>Music <Text style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.3)' }}>(up to 4)</Text></Text>
                  <View style={s.chips}>
                    {GENRE_OPTIONS.map(g => (
                      <TouchableOpacity key={g} style={[s.chip, selectedGenres.includes(g) && s.chipOn]} onPress={() => toggleGenre(g)} activeOpacity={0.85}>
                        <Text style={[s.chipText, selectedGenres.includes(g) && s.chipTextOn]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {step === 5 && (
              <View>
                <Text style={s.stepTitle}>Create your account</Text>
                <Text style={s.stepSub}>Almost done — your profile goes live immediately</Text>
                <View style={{ marginBottom: 14 }}>
                  <Text style={s.label}>Email</Text>
                  <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@yourvenue.com" placeholderTextColor="rgba(255,255,255,0.2)" autoCapitalize="none" keyboardType="email-address" />
                </View>
                <View style={{ marginBottom: 20 }}>
                  <Text style={s.label}>Password</Text>
                  <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Min 8 characters" placeholderTextColor="rgba(255,255,255,0.2)" secureTextEntry />
                </View>
                <View style={s.notice}>
                  <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
                  <Text style={[s.noticeText, { color: 'rgba(255,255,255,0.6)' }]}>Free profile — discoverable in Viberyte immediately</Text>
                </View>
                <View style={[s.notice, { borderColor: 'rgba(167,139,250,0.2)', backgroundColor: 'rgba(167,139,250,0.06)', marginTop: 8 }]}>
                  <Ionicons name="trending-up-outline" size={18} color="#a78bfa" />
                  <Text style={[s.noticeText, { color: '#a78bfa' }]}>Manage your subscription at viberyte.com</Text>
                </View>
              </View>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}
            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={s.primaryBtn} onPress={nextStep} disabled={loading} activeOpacity={0.88}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>{step === 5 ? 'Create Free Profile' : 'Continue'}</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  progressWrap: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  dotOn: { backgroundColor: 'rgba(255,255,255,0.7)', width: 18 },
  stepCount: { fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: '500' },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  stepTitle: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.8, lineHeight: 34, marginBottom: 8 },
  stepSub: { fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 20, marginBottom: 24 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },
  claimCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(124,58,237,0.3)', marginBottom: 12 },
  claimPhoto: { width: 52, height: 52, borderRadius: 10 },
  claimName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  claimMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  magicRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  magicText: { fontSize: 11, color: '#a78bfa', fontWeight: '600' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.07)' },
  resultPhoto: { width: 44, height: 44, borderRadius: 8 },
  resultName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  resultMeta: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  notFound: { paddingVertical: 16, alignItems: 'center' },
  skipLink: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  skipLinkText: { fontSize: 13, color: 'rgba(255,255,255,0.25)', fontWeight: '500' },
  notFoundText: { fontSize: 13, color: '#a78bfa', fontWeight: '500' },
  createNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(167,139,250,0.07)', borderRadius: 14, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(167,139,250,0.2)' },
  grid: { gap: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 0 },
  cardOn: { backgroundColor: 'transparent' },
  cardLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  cardLabelOn: { color: '#fff', fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' },
  reelThumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  reelRemove: { position: 'absolute', top: -8, right: -8 },
  reelAdd: { width: 80, height: 80, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  skipReels: { marginTop: 12, alignItems: 'center' },
  skipReelsText: { fontSize: 12, color: 'rgba(255,255,255,0.25)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.07)' },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)' },
  chipText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(74,222,128,0.05)', borderRadius: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(74,222,128,0.15)' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13, color: '#f87171', marginTop: 12, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingTop: 10 },
  primaryBtn: { backgroundColor: '#5b21b6', borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  primaryBtnText: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  ghostBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  ghostBtnText: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  eyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.2)', letterSpacing: 4 },
  welcomeTitle: { fontSize: 38, fontWeight: '700', color: '#fff', letterSpacing: -1.2, lineHeight: 44 },
  welcomeSub: { fontSize: 15, color: 'rgba(255,255,255,0.38)', lineHeight: 22 },
});
