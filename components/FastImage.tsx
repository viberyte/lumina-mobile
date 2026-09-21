import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, Animated } from 'react-native';

const imageCache = new Map<string, boolean>();

interface FastImageProps {
  uri: string;
  style: any;
  borderRadius?: number;
}

export default function FastImage({ uri, style, borderRadius = 0 }: FastImageProps) {
  const [loaded, setLoaded] = useState(imageCache.has(uri));
  const opacity = useState(new Animated.Value(imageCache.has(uri) ? 1 : 0))[0];

  const handleLoad = () => {
    imageCache.set(uri, true);
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[style, { borderRadius, overflow: 'hidden' }]}>
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(255,255,255,0.06)',
              },
            ]}
          />
        </View>
      )}
      <Animated.Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { opacity }]}
        onLoad={handleLoad}
        resizeMode="cover"
      />
    </View>
  );
}

// Preload images for a list of venues
export function preloadImages(urls: string[]) {
  urls.forEach(url => {
    if (!imageCache.has(url)) {
      Image.prefetch(url).then(() => imageCache.set(url, true)).catch(() => {});
    }
  });
}
