import React, { useState } from 'react';
import { Image } from 'expo-image';
import { View, StyleSheet, TouchableOpacity, Dimensions, Modal, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

const { width, height } = Dimensions.get('window');
const IMAGE_SIZE = (width - spacing.lg * 2 - spacing.xs * 2) / 3;

interface ImageGridProps {
  photos: string[];
}

export default function ImageGrid({ photos }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <View style={styles.grid}>
        {photos.slice(0, 6).map((photo, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.gridItem}
            onPress={() => setSelectedImage(photo)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: photo }} style={styles.gridImage} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={!!selectedImage} transparent animationType="fade">
        <SafeAreaView style={styles.lightbox}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.zinc[900],
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: width,
    height: height,
  },
});
