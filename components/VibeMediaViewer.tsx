import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import * as Linking from 'expo-linking';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VibeMediaViewerProps {
  visible: boolean;
  items: any[];
  initialIndex: number;
  onClose: () => void;
}

export default function VibeMediaViewer({ 
  visible, 
  items, 
  initialIndex, 
  onClose 
}: VibeMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<{ [key: number]: Video | null }>({});

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      flatListRef.current?.scrollToIndex({
        index: initialIndex,
        animated: false,
      });
    }
  }, [visible, initialIndex]);

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentIndex(newIndex);
      
      Object.keys(videoRefs.current).forEach((key) => {
        const index = parseInt(key);
        if (index !== newIndex && videoRefs.current[index]) {
          videoRefs.current[index]?.pauseAsync();
        }
      });
    }
  }).current;

  const handleMediaPress = async (item: any) => {
    if (item.type === 'tiktok' || item.type === 'instagram') {
      setLoading(true);
      try {
        if (await InAppBrowser.isAvailable()) {
          await InAppBrowser.open(item.url, {
            dismissButtonStyle: 'done',
            preferredBarTintColor: '#18181b',
            preferredControlTintColor: '#8b5cf6',
            readerMode: false,
            animated: true,
            modalPresentationStyle: 'fullScreen',
            showTitle: true,
            toolbarColor: '#18181b',
            secondaryToolbarColor: '#18181b',
            enableUrlBarHiding: true,
            enableDefaultShare: true,
            forceCloseOnRedirection: false,
          });
        } else {
          Linking.openURL(item.url);
        }
      } catch (error) {
        console.error('Error opening browser:', error);
        Alert.alert('Error', 'Unable to open content');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isVideo = item.isVideo;
    const isPlayableVideo = isVideo && item.type !== 'tiktok';

    return (
      <View style={styles.slide}>
        {isPlayableVideo ? (
          <Video
            ref={(ref) => {
              videoRefs.current[index] = ref;
            }}
            source={{ uri: item.url }}
            style={styles.media}
            useNativeControls
            isMuted={false}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={index === currentIndex}
            isLooping
          />
        ) : (
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => handleMediaPress(item)}
            activeOpacity={item.type === 'tiktok' || item.type === 'instagram' ? 0.8 : 1}
          >
            <Image
              source={{ uri: item.thumbnailUrl || item.url }}
              style={styles.media}
              resizeMode="contain"
            />
            {(item.type === 'tiktok' || item.type === 'instagram') && (
              <View style={styles.playOverlay}>
                <View style={styles.playButton}>
                  <Ionicons 
                    name={item.type === 'instagram' ? 'logo-instagram' : 'musical-notes'} 
                    size={32} 
                    color={colors.white} 
                  />
                </View>
                <Text style={styles.playHint}>Tap to view</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.overlay}>
          <View style={styles.engagementContainer}>
            {!!item.plays && (
              <View style={styles.statItem}>
                <Ionicons name="play" size={18} color={colors.white} />
                <Text style={styles.statText}>{formatCount(item.plays)}</Text>
              </View>
            )}
            {!!item.likes && (
              <View style={styles.statItem}>
                <Ionicons name="heart" size={18} color={colors.white} />
                <Text style={styles.statText}>{formatCount(item.likes)}</Text>
              </View>
            )}
            {!!item.comments && (
              <View style={styles.statItem}>
                <Ionicons name="chatbubble" size={18} color={colors.white} />
                <Text style={styles.statText}>{formatCount(item.comments)}</Text>
              </View>
            )}
          </View>

          {item.caption && (
            <View style={styles.captionContainer}>
              <Text style={styles.caption} numberOfLines={3}>
                {item.caption}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.sourceBadge,
          item.type === 'google' && styles.sourceBadgeGoogle,
          item.type === 'instagram' && styles.sourceBadgeInstagram,
          item.type === 'tiktok' && styles.sourceBadgeTikTok
        ]}>
          <Ionicons 
            name={
              item.type === 'google' ? 'camera' :
              item.type === 'instagram' ? 'logo-instagram' :
              'musical-notes'
            } 
            size={14} 
            color={colors.white} 
          />
          <Text style={styles.sourceBadgeText}>
            {item.type === 'google' ? 'Pro' : item.type === 'instagram' ? 'IG' : 'TT'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <View style={styles.closeButtonInner}>
            <Ionicons name="close" size={28} color={colors.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {items.length}
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.violet[500]} />
            <Text style={styles.loadingText}>Opening...</Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.98)',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  playHint: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  engagementContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  captionContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.md,
    borderRadius: 12,
  },
  caption: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  sourceBadge: {
    position: 'absolute',
    top: 120,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sourceBadgeGoogle: { 
    backgroundColor: 'rgba(59, 130, 246, 0.9)' 
  },
  sourceBadgeInstagram: { 
    backgroundColor: 'rgba(168, 85, 247, 0.9)' 
  },
  sourceBadgeTikTok: { 
    backgroundColor: 'rgba(0, 0, 0, 0.9)' 
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
});
