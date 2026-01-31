import React, { useState, useEffect } from 'react';
import { partnerFetch } from '../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 48 - 8) / 3;
const API_BASE = 'https://lumina.viberyte.com';

type MediaItem = {
  id: number;
  url: string;
  type: 'photo' | 'video';
  is_primary: boolean;
  uploaded_at: string;
};

export default function PartnerMedia() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await partnerFetch(`/api/partner/media`, {
        
      });

      if (res.status === 401) {
        router.replace('/partner');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setMedia(data.media || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedia();
    setRefreshing(false);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets.length > 0) {
      uploadImages(result.assets);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      uploadImages(result.assets);
    }
  };

  const uploadImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      for (const asset of assets) {
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
        } as any);

        const res = await partnerFetch(`/api/partner/media/upload`, {
          method: 'POST',
          
          body: formData,
        });

        if (!res.ok) {
          throw new Error('Upload failed');
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchMedia();
    } catch (error) {
      Alert.alert('Upload Failed', 'Could not upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const toggleSelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleLongPress = (item: MediaItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isSelecting) {
      // Already selecting, just toggle
      toggleSelect(item.id);
      return;
    }

    // Show action sheet
    Alert.alert(
      item.is_primary ? 'Primary Photo' : 'Photo Options',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select Multiple',
          onPress: () => {
            setIsSelecting(true);
            setSelectedIds([item.id]);
          },
        },
        ...(!item.is_primary ? [{
          text: 'Set as Primary',
          onPress: () => setPrimary(item.id),
        }] : []),
        {
          text: 'Delete',
          style: 'destructive' as const,
          onPress: () => confirmDelete([item.id]),
        },
      ]
    );
  };

  const handleTap = (item: MediaItem) => {
    if (isSelecting) {
      toggleSelect(item.id);
    }
    // When not selecting, tap does nothing (prevents accidental changes)
  };

  const cancelSelecting = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const confirmDelete = (ids: number[]) => {
    Alert.alert(
      'Delete Photo' + (ids.length > 1 ? 's' : ''),
      `Are you sure you want to delete ${ids.length} photo${ids.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePhotos(ids),
        },
      ]
    );
  };

  const deletePhotos = async (ids: number[]) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    try {
      for (const id of ids) {
        await partnerFetch(`/api/partner/media/${id}`, {
          method: 'DELETE',
          
        });
      }
      
      setMedia(prev => prev.filter(m => !ids.includes(m.id)));
      cancelSelecting();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete photos.');
    }
  };

  const setPrimary = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const res = await partnerFetch(`/api/partner/media/${id}/primary`, {
        method: 'POST',
        
      });

      if (res.ok) {
        setMedia(prev => prev.map(m => ({
          ...m,
          is_primary: m.id === id,
        })));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set primary photo.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Media</Text>
          {isSelecting ? (
            <TouchableOpacity onPress={cancelSelecting} style={styles.headerAction}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerAction} />
          )}
        </View>

        {/* Upload Actions */}
        {!isSelecting && (
          <View style={styles.uploadRow}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={20} color="#fff" />
                  <Text style={styles.uploadText}>Library</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={takePhoto} disabled={uploading}>
              <Ionicons name="camera-outline" size={20} color="#fff" />
              <Text style={styles.uploadText}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selection Actions */}
        {isSelecting && selectedIds.length > 0 && (
          <View style={styles.selectionRow}>
            <Text style={styles.selectionCount}>{selectedIds.length} selected</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(selectedIds)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hint */}
        {!isSelecting && media.length > 0 && (
          <Text style={styles.hint}>Long press for options</Text>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          {media.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color={colors.zinc[700]} />
              <Text style={styles.emptyTitle}>No photos yet</Text>
              <Text style={styles.emptySubtitle}>
                Upload photos to showcase your venue
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {media.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(index * 30).duration(200)}
                >
                  <TouchableOpacity
                    style={[
                      styles.imageContainer,
                      selectedIds.includes(item.id) && styles.imageSelected,
                    ]}
                    onPress={() => handleTap(item)}
                    onLongPress={() => handleLongPress(item)}
                    delayLongPress={200}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: item.url }} style={styles.image} />
                    
                    {/* Primary Badge */}
                    {item.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                      </View>
                    )}

                    {/* Selection Checkbox */}
                    {isSelecting && (
                      <View style={[
                        styles.checkbox,
                        selectedIds.includes(item.id) && styles.checkboxSelected,
                      ]}>
                        {selectedIds.includes(item.id) && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 60,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerAction: {
    width: 60,
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 16,
    color: colors.violet[400],
    fontWeight: '500',
  },
  // Upload Row
  uploadRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.85)',
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Selection Row
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 8,
  },
  selectionCount: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Hint
  hint: {
    fontSize: 12,
    color: colors.zinc[600],
    textAlign: 'center',
    marginBottom: 12,
  },
  // Scroll & Grid
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  // Image
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imageSelected: {
    opacity: 0.7,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // Primary Badge
  primaryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Checkbox
  checkbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: 'rgba(139,92,246,0.9)',
    borderColor: 'rgba(139,92,246,0.9)',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.zinc[500],
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.zinc[600],
    marginTop: 8,
    textAlign: 'center',
  },
});
