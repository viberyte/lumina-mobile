import React, { useEffect, useState } from 'react';
import { partnerFetch } from '../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors } from '../../theme';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 52) / 2;
const API_BASE = 'https://lumina.viberyte.com';

const TIERS = {
  claimed: { display: 'Verified', color: colors.zinc[400], bgColor: 'rgba(113, 113, 122, 0.15)', icon: 'checkmark-circle' },
  spotlight: { display: 'Spotlight', color: '#FBBF24', bgColor: 'rgba(251, 191, 36, 0.15)', icon: 'flashlight' },
  elite: { display: 'Elite', color: colors.violet[400], bgColor: 'rgba(139, 92, 246, 0.2)', icon: 'diamond' },
};

type TierKey = 'claimed' | 'spotlight' | 'elite';

function CommandCard({ icon, title, subtitle, gradient, glowColor, badge, onPress, locked = false, lockLabel }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string | null;
  gradient: [string, string]; glowColor?: string; badge?: number;
  onPress: () => void; locked?: boolean; lockLabel?: string;
}) {
  const handlePress = () => {
    if (locked) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={styles.cardWrapper}>
      <LinearGradient colors={locked ? ['#18181B', '#09090B'] : gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {!locked && glowColor && <View style={[styles.cardGlowOverlay, { backgroundColor: glowColor }]} />}
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>
        )}
        {locked && lockLabel && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={8} color="rgba(255,255,255,0.4)" />
            <Text style={styles.lockText}>{lockLabel}</Text>
          </View>
        )}
        <View style={[styles.iconContainer, locked && styles.iconContainerLocked]}>
          <Ionicons name={icon} size={28} color={locked ? 'rgba(255,255,255,0.25)' : '#fff'} />
        </View>
        <Text style={[styles.cardTitle, locked && styles.cardTitleLocked]}>{title}</Text>
        {subtitle && <Text style={[styles.cardSubtitle, locked && styles.cardSubtitleLocked]}>{subtitle}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function PartnerCommandCenter() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [claimedVenue, setClaimedVenue] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const tier: TierKey = partner?.tier || 'claimed';
  const tierConfig = TIERS[tier] || TIERS.claimed;
  const isSpotlightPlus = tier === 'spotlight' || tier === 'elite';
  const isElite = tier === 'elite';

  useEffect(() => { loadPartnerData(); }, []);

  const loadPartnerData = async () => {
    try {
      const res = await partnerFetch(`/api/partner/profile`, { credentials: 'include' });
      if (res.status === 401) { router.replace('/profile'); return; }
      if (res.ok) {
        const data = await res.json();
        setPartner(data.partner);
        setClaimedVenue(data.claimedVenue);
        if (data.claimedVenue?.id) {
          try {
            const reqRes = await partnerFetch(`/api/partner/requests/pending?venueId=${data.claimedVenue.id}`, { credentials: 'include' });
            if (reqRes.ok) { const reqData = await reqRes.json(); setPendingRequests(reqData.count || 0); }
          } catch (e) {}
        }
      }
    } catch (e) { console.error('Failed to load partner data:', e); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadPartnerData(); setRefreshing(false); };

  const handleLockedFeature = (feature: string, requiredTier: string) => {
    Alert.alert(`${feature} Locked`, `Upgrade to ${requiredTier} to unlock this feature.`, [
      { text: 'Maybe Later', style: 'cancel' },
      { text: 'View Plans', onPress: () => Linking.openURL(`${API_BASE}/partner/settings?tab=subscription`) },
    ]);
  };

  const handleOpenPortal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/partner/dashboard');
  };

  if (loading) {
    return <View style={styles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.violet[500]} /></View></View>;
  }

  const venuePhoto = claimedVenue?.professional_photo_url || claimedVenue?.image_url || 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
        
        <View style={styles.heroContainer}>
          {!imageLoaded && (
            <View style={styles.heroSkeleton}>
              <LinearGradient colors={['#18181b', '#27272a', '#18181b']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            </View>
          )}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: imageLoaded ? 1 : 0 }]} entering={FadeIn.duration(300)}>
            <Image source={{ uri: venuePhoto }} style={styles.heroImage} cachePolicy="memory-disk" contentFit="cover" onLoad={() => setImageLoaded(true)} />
          </Animated.View>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)', '#000']} style={styles.heroGradient} />
          <SafeAreaView edges={['top']} style={styles.heroContent}>
            <View style={styles.heroTop}>
              <View style={[styles.tierPill, { backgroundColor: tierConfig.bgColor }]}>
                <Ionicons name={tierConfig.icon as any} size={12} color={tierConfig.color} />
                <Text style={[styles.tierPillText, { color: tierConfig.color }]}>{tierConfig.display}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/partner/settings')} style={styles.settingsButton}>
                <BlurView intensity={40} tint="dark" style={styles.settingsBlur}>
                  <Ionicons name="settings-outline" size={20} color="#fff" />
                </BlurView>
              </TouchableOpacity>
            </View>
            <View style={styles.heroBottom}>
              <Text style={styles.venueName}>{claimedVenue?.name || 'Your Venue'}</Text>
              <Text style={styles.partnerName}>{partner?.business_name || partner?.name}</Text>
              {!claimedVenue && <Text style={styles.claimHint}>Claim your venue to unlock partner tools</Text>}
            </View>
          </SafeAreaView>
        </View>

        <TouchableOpacity style={styles.openPortalButton} onPress={handleOpenPortal} activeOpacity={0.8}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.openPortalGradient}>
            <Ionicons name="grid" size={20} color="#fff" />
            <Text style={styles.openPortalText}>Open Partner Portal</Text>
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.quickActionsLabel}>Quick Actions</Text>

        <View style={styles.cardGrid}>
          <View style={styles.cardRow}>
            <CommandCard icon="qr-code-outline" title="Door" subtitle="Check-In" gradient={['#1C1C24', '#12121A']} glowColor="rgba(139, 92, 246, 0.08)" locked={!isElite} lockLabel="ELITE" onPress={() => isElite ? router.push('/partner/door') : handleLockedFeature('Door Management', 'Lumina Elite')} />
            <CommandCard icon="flash" title="Boost" subtitle="Promote Now" gradient={['#1A142A', '#0C0C1A']} glowColor="rgba(139, 92, 246, 0.1)" locked={!isElite} lockLabel="ELITE" onPress={() => isElite ? router.push("/partner/boost") : handleLockedFeature("Boost", "Lumina Elite")} />
          </View>
          <View style={styles.cardRow}>
            <CommandCard icon="mail-unread" title="Requests" subtitle={pendingRequests > 0 ? `${pendingRequests} pending` : 'Inbox'} gradient={['#14202A', '#0C1620']} glowColor="rgba(59, 130, 246, 0.1)" badge={isElite ? pendingRequests : undefined} locked={!isElite} lockLabel="ELITE" onPress={() => isElite ? router.push('/partner/requests') : handleLockedFeature('Booking Requests', 'Lumina Elite')} />
            <CommandCard icon="calendar" title="Bookings" subtitle="Tonight" gradient={['#142A20', '#0C1A14']} glowColor="rgba(34, 197, 94, 0.1)" locked={!isElite} lockLabel="ELITE" onPress={() => isElite ? router.push('/partner/bookings') : handleLockedFeature('Bookings', 'Lumina Elite')} />
          </View>
          <View style={styles.cardRow}>
            <CommandCard icon="sparkles" title="Events" subtitle="Manage" gradient={['#2A1428', '#1A0C1A']} glowColor="rgba(168, 85, 247, 0.1)" onPress={() => router.push('/partner/events')} />
            <CommandCard icon="stats-chart" title="Stats" subtitle="Analytics" gradient={['#2A2414', '#1A180C']} glowColor="rgba(234, 179, 8, 0.1)" locked={!isElite} lockLabel="ELITE" onPress={() => isElite ? router.push('/partner/analytics') : handleLockedFeature('Analytics', 'Lumina Elite')} />
          </View>
        </View>

        {!isElite && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`${API_BASE}/partner/settings?tab=subscription`); }}>
            <LinearGradient colors={['rgba(139, 92, 246, 0.15)', 'rgba(99, 102, 241, 0.1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upgradeGradient}>
              <View style={styles.upgradeContent}>
                <View style={styles.upgradeHeader}>
                  <Ionicons name="rocket" size={20} color={colors.violet[400]} />
                  <Text style={styles.upgradeTitle}>{tier === 'claimed' ? 'Go Spotlight' : 'Go Elite'}</Text>
                </View>
                <Text style={styles.upgradeSubtitle}>{tier === 'claimed' ? 'Event boost, Happy Hour placement & more' : 'Bookings, analytics, door management & more'}</Text>
              </View>
              <View style={styles.upgradePrice}>
                <Text style={styles.upgradePriceText}>${tier === 'claimed' ? '25' : '45'}</Text>
                <Text style={styles.upgradePricePeriod}>/mo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.violet[400]} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.webPortalButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`${API_BASE}/partner/dashboard`); }}>
          <Ionicons name="globe-outline" size={16} color={colors.zinc[600]} />
          <Text style={styles.webPortalText}>Open Web Portal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 120 },
  heroContainer: { height: 220, position: 'relative' },
  heroSkeleton: { ...StyleSheet.absoluteFillObject, backgroundColor: '#18181b' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroContent: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  heroBottom: { paddingBottom: 20 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tierPillText: { fontSize: 12, fontWeight: '600' },
  settingsButton: { borderRadius: 20, overflow: 'hidden' },
  settingsBlur: { padding: 10, borderRadius: 20 },
  venueName: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  partnerName: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  claimHint: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  openPortalButton: { marginHorizontal: 16, marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  openPortalGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  openPortalText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  quickActionsLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginLeft: 20, marginTop: 24, marginBottom: 12, letterSpacing: 0.5 },
  cardGrid: { paddingHorizontal: 16, gap: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardWrapper: { width: CARD_SIZE, height: CARD_SIZE * 0.9, borderRadius: 20 },
  card: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  cardGlowOverlay: { position: 'absolute', top: -50, left: -50, right: -50, bottom: -50, opacity: 0.5 },
  badge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.violet[500], borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  lockBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  lockText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  iconContainer: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  iconContainerLocked: { backgroundColor: 'rgba(255,255,255,0.04)' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardTitleLocked: { color: 'rgba(255,255,255,0.35)' },
  cardSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  cardSubtitleLocked: { color: 'rgba(255,255,255,0.2)' },
  upgradeBanner: { marginHorizontal: 16, marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  upgradeGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)', borderRadius: 16 },
  upgradeContent: { flex: 1 },
  upgradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  upgradeTitle: { fontSize: 16, fontWeight: '600', color: colors.violet[400] },
  upgradeSubtitle: { fontSize: 12, color: colors.zinc[500], marginTop: 4 },
  upgradePrice: { flexDirection: 'row', alignItems: 'baseline', marginRight: 8 },
  upgradePriceText: { fontSize: 22, fontWeight: '700', color: colors.violet[400] },
  upgradePricePeriod: { fontSize: 12, color: colors.violet[400], opacity: 0.7 },
  webPortalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 6 },
  webPortalText: { fontSize: 13, color: colors.zinc[600] },
});
