import React, { useState } from 'react';
import { partnerFetch } from '../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme';

const { width } = Dimensions.get('window');
const API_BASE = 'https://lumina.viberyte.com';

type PostType = 'now' | 'recap';
type ContentType = 'photo' | 'video';

export default function PartnerLive() {
  const router = useRouter();
  const [postType, setPostType] = useState<PostType>('now');
  const [contentType, setContentType] = useState<ContentType>('photo');
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [canPost, setCanPost] = useState(true);

  const selectMedia = (asset: ImagePicker.ImagePickerAsset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMedia(asset);
    // Temporal friction: prevent immediate post
    setCanPost(false);
    setTimeout(() => setCanPost(true), 400);
  };

  const pickMedia = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: contentType === 'video' 
        ? ImagePicker.MediaTypeOptions.Videos 
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets.length > 0) {
      selectMedia(result.assets[0]);
    }
  };

  const captureMedia = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: contentType === 'video' 
        ? ImagePicker.MediaTypeOptions.Videos 
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets.length > 0) {
      selectMedia(result.assets[0]);
    }
  };

  const clearMedia = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMedia(null);
  };

  const handlePost = async () => {
    if (!selectedMedia) {
      Alert.alert('No Content', 'Please select a photo or video to post.');
      return;
    }

    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedMedia.uri,
        type: selectedMedia.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: `content_${Date.now()}.${selectedMedia.type === 'video' ? 'mp4' : 'jpg'}`,
      } as any);
      formData.append('post_type', postType);
      formData.append('content_type', contentType);
      formData.append('caption', caption);

      const res = await partnerFetch(`/api/partner/content/post`, {
        method: 'POST',
        
        body: formData,
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Posted!',
          postType === 'now' ? 'Your live content is visible now.' : 'Your recap has been added.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        throw new Error('Post failed');
      }
    } catch (error) {
      Alert.alert('Post Failed', 'Could not post content. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Content</Text>
          <TouchableOpacity 
            onPress={handlePost} 
            style={[styles.postButton, (!selectedMedia || !canPost) && styles.postButtonDisabled]}
            disabled={!selectedMedia || posting || !canPost}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.postText, (!selectedMedia || !canPost) && styles.postTextDisabled]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Type Selector */}
          <View style={styles.postTypeContainer}>
            <TouchableOpacity
              style={[styles.postTypeOption, postType === 'now' && styles.postTypeActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPostType('now');
              }}
            >
              <View style={[styles.postTypeIcon, postType === 'now' && styles.postTypeIconActive]}>
                <Ionicons name="radio" size={20} color={postType === 'now' ? '#fff' : colors.zinc[500]} />
              </View>
              <View style={styles.postTypeText}>
                <Text style={[styles.postTypeTitle, postType === 'now' && styles.postTypeTitleActive]}>
                  Live Now
                </Text>
                <Text style={styles.postTypeSubtitle}>Show what's happening tonight</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.postTypeOption, postType === 'recap' && styles.postTypeActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPostType('recap');
              }}
            >
              <View style={[styles.postTypeIcon, postType === 'recap' && styles.postTypeIconActive]}>
                <Ionicons name="film" size={20} color={postType === 'recap' ? '#fff' : colors.zinc[500]} />
              </View>
              <View style={styles.postTypeText}>
                <Text style={[styles.postTypeTitle, postType === 'recap' && styles.postTypeTitleActive]}>
                  Past Party
                </Text>
                <Text style={styles.postTypeSubtitle}>Share highlights from past events</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Content Type Toggle */}
          <View style={styles.contentTypeRow}>
            <TouchableOpacity
              style={[styles.contentTypeOption, contentType === 'photo' && styles.contentTypeActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setContentType('photo');
                setSelectedMedia(null);
              }}
            >
              <Ionicons 
                name="image-outline" 
                size={18} 
                color={contentType === 'photo' ? '#fff' : colors.zinc[500]} 
              />
              <Text style={[styles.contentTypeText, contentType === 'photo' && styles.contentTypeTextActive]}>
                Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contentTypeOption, contentType === 'video' && styles.contentTypeActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setContentType('video');
                setSelectedMedia(null);
              }}
            >
              <Ionicons 
                name="videocam-outline" 
                size={18} 
                color={contentType === 'video' ? '#fff' : colors.zinc[500]} 
              />
              <Text style={[styles.contentTypeText, contentType === 'video' && styles.contentTypeTextActive]}>
                Video
              </Text>
            </TouchableOpacity>
          </View>

          {/* Media Preview / Picker */}
          {selectedMedia ? (
            <View style={styles.previewContainer}>
              <Image 
                source={{ uri: selectedMedia.uri }} 
                style={styles.preview}
              />
              <TouchableOpacity style={styles.clearButton} onPress={clearMedia}>
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
              {selectedMedia.type === 'video' && (
                <View style={styles.videoBadge}>
                  <Ionicons name="play" size={12} color="#fff" />
                  <Text style={styles.videoDuration}>
                    {Math.round((selectedMedia.duration || 0) / 1000)}s
                  </Text>
                </View>
              )}
              {postType === 'now' && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <TouchableOpacity style={styles.pickerButton} onPress={captureMedia}>
                <View style={styles.pickerIconContainer}>
                  <Ionicons name="camera" size={28} color={colors.zinc[400]} />
                </View>
                <Text style={styles.pickerText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerButton} onPress={pickMedia}>
                <View style={styles.pickerIconContainer}>
                  <Ionicons name="folder-open" size={28} color={colors.zinc[400]} />
                </View>
                <Text style={styles.pickerText}>Library</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Caption */}
          <View style={styles.captionContainer}>
            <Text style={styles.captionLabel}>CAPTION</Text>
            <TextInput
              style={styles.captionInput}
              placeholder={postType === 'now' ? "What's happening tonight?" : "Describe this moment..."}
              placeholderTextColor={colors.zinc[600]}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={280}
            />
            <Text style={styles.captionCount}>{caption.length}/280</Text>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>
              {postType === 'now' ? 'Live content tips' : 'Recap tips'}
            </Text>
            {postType === 'now' ? (
              <>
                <View style={styles.tip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.zinc[600]} />
                  <Text style={styles.tipText}>Show the crowd and energy</Text>
                </View>
                <View style={styles.tip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.zinc[600]} />
                  <Text style={styles.tipText}>Capture DJ sets and performances</Text>
                </View>
                <View style={styles.tip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.zinc[600]} />
                  <Text style={styles.tipText}>Post during peak hours for visibility</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.tip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.zinc[600]} />
                  <Text style={styles.tipText}>Best moments from the night</Text>
                </View>
                <View style={styles.tip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.zinc[600]} />
                  <Text style={styles.tipText}>High-quality clips perform better</Text>
                </View>
                <View style={styles.tip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.zinc[600]} />
                  <Text style={styles.tipText}>Show what guests can expect</Text>
                </View>
              </>
            )}
          </View>

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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.75)',
  },
  postButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  postText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  postTextDisabled: {
    color: colors.zinc[600],
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  // Post Type Selector
  postTypeContainer: {
    gap: 10,
    marginBottom: 20,
  },
  postTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  postTypeActive: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  postTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  postTypeIconActive: {
    backgroundColor: 'rgba(139,92,246,0.75)',
  },
  postTypeText: {
    flex: 1,
  },
  postTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  postTypeTitleActive: {
    color: '#fff',
  },
  postTypeSubtitle: {
    fontSize: 13,
    color: colors.zinc[600],
    marginTop: 2,
  },
  // Content Type Toggle
  contentTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  contentTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  contentTypeActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  contentTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.zinc[500],
  },
  contentTypeTextActive: {
    color: '#fff',
  },
  // Preview - with subtle scale for "locked-in" feel
  previewContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 400,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    alignSelf: 'center',
    transform: [{ scale: 0.99 }],
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.9)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Picker
  pickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  pickerButton: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 140,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pickerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.zinc[500],
  },
  // Caption
  captionContainer: {
    marginBottom: 24,
  },
  captionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.zinc[500],
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  captionCount: {
    fontSize: 12,
    color: colors.zinc[600],
    textAlign: 'right',
    marginTop: 6,
  },
  // Tips
  tipsContainer: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.zinc[400],
    marginBottom: 12,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: colors.zinc[500],
  },
});
