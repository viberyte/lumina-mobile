import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';
import { API_BASE } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = (SCREEN_WIDTH - spacing.md * 2 - spacing.xs * 2) / 3;

interface CrowdPhoto {
  id: number;
  image_url: string;
  likes_count: number;
  caption?: string;
  posted_at?: string;
  username?: string;
}

interface Props {
  venueId: number;
  venueName: string;
}

export default function CrowdPhotosTab({ venueId, venueName }: Props) {
  const [photos, setPhotos] = useState<CrowdPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<CrowdPhoto | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  useEffect(() => {
    fetchPhotos();
  }, [venueId, sortBy]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/venues/${venueId}/photos/crowd?limit=30&sort=${sortBy}`
      );
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setPhotos([]);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setPhotos(data.photos || []);
      } else {
        setPhotos([]);
      }
    } catch (error) {
      console.log('Error fetching crowd photos:', error);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const openInstagram = () => {
    Linking.openURL(`https://instagram.com/explore/locations/${venueId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
        <Text style={styles.loadingText}>Loading crowd vibes...</Text>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="camera-outline" size={48} color={colors.zinc[700]} />
        <Text style={styles.emptyTitle}>No crowd photos yet</Text>
        <Text style={styles.emptySubtitle}>Be the first to share your experience at {venueName}</Text>
        <TouchableOpacity style={styles.instagramButton} onPress={openInstagram}>
          <Ionicons name="logo-instagram" size={20} color="#fff" />
          <Text style={styles.instagramButtonText}>View on Instagram</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Crowd Vibes</Text>
          <Text style={styles.headerSubtitle}>{photos.length} photos from real visitors</Text>
        </View>
        
        {/* Sort Toggle */}
        <View style={styles.sortToggle}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortBy('recent'); }}
          >
            <Text style={[styles.sortButtonText, sortBy === 'recent' && styles.sortButtonTextActive]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'popular' && styles.sortButtonActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortBy('popular'); }}
          >
            <Text style={[styles.sortButtonText, sortBy === 'popular' && styles.sortButtonTextActive]}>Popular</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo Grid */}
      <View style={styles.grid}>
        {photos.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            style={styles.photoContainer}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPhoto(photo); }}
            activeOpacity={0.8}
          >
            <Image source={{ uri: photo.image_url }} style={styles.photo} />
            {photo.likes_count > 0 && (
              <View style={styles.likesOverlay}>
                <Ionicons name="heart" size={12} color="#fff" />
                <Text style={styles.likesText}>{formatNumber(photo.likes_count)}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Photo Detail Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedPhoto && (
            <View style={styles.modalContent}>
              <Image source={{ uri: selectedPhoto.image_url }} style={styles.modalPhoto} resizeMode="contain" />
              <View style={styles.modalInfo}>
                {selectedPhoto.username && <Text style={styles.modalUsername}>@{selectedPhoto.username}</Text>}
                {selectedPhoto.likes_count > 0 && (
                  <View style={styles.modalLikes}>
                    <Ionicons name="heart" size={16} color={colors.rose[500]} />
                    <Text style={styles.modalLikesText}>{formatNumber(selectedPhoto.likes_count)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.zinc[950] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: colors.zinc[500], marginTop: spacing.md, fontSize: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.zinc[400], marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, color: colors.zinc[600], textAlign: 'center', marginTop: spacing.xs },
  instagramButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.violet[500], paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: spacing.lg },
  instagramButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  header: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.zinc[800] },
  headerTop: { marginBottom: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: colors.zinc[500], marginTop: 2 },
  sortToggle: { flexDirection: 'row', gap: spacing.xs },
  sortButton: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.zinc[800] },
  sortButtonActive: { backgroundColor: colors.violet[500] },
  sortButtonText: { fontSize: 13, fontWeight: '600', color: colors.zinc[500] },
  sortButtonTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.xs },
  photoContainer: { width: GRID_SIZE, height: GRID_SIZE, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.zinc[800] },
  photo: { width: '100%', height: '100%' },
  likesOverlay: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  likesText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  modalContent: { width: '90%', maxHeight: '80%' },
  modalPhoto: { width: '100%', height: 400, borderRadius: 12 },
  modalInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingHorizontal: spacing.sm },
  modalUsername: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalLikes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalLikesText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
