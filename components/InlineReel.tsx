import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';

interface InlineReelProps {
  reelUrl: string | null;
  photoUrl: string | null;
  style?: any;
  // When false, NO video player is created — only the photo renders.
  // Parent flips this true when the card is actually on screen.
  // Defaults true so existing call sites (hero, etc.) are unaffected.
  shouldPlay?: boolean;
}

export default function InlineReel({ reelUrl, photoUrl, style, shouldPlay = true }: InlineReelProps) {
  // No reel, or gated off → photo only (zero video players created)
  if (!reelUrl || !shouldPlay) {
    if (!photoUrl) return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1a2e' }, style]} />;
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[StyleSheet.absoluteFill, style]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />
    );
  }

  return <ReelView reelUrl={reelUrl} photoUrl={photoUrl} style={style} />;
}

function ReelView({ reelUrl, photoUrl, style }: { reelUrl: string; photoUrl: string | null; style?: any }) {
  const player = useVideoPlayer(reelUrl, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      {photoUrl && (
        <Image
          source={{ uri: photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}
