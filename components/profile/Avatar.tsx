// VBR_PROFILE_V1: profile photo, or initials when there isn't one. Monochrome, iOS-style.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { fullUrl } from '../../services/vibe';

export default function Avatar({ uri, initials, size = 40 }: { uri?: string | null; initials?: string | null; size?: number }) {
  const u = fullUrl(uri);
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[st.wrap, box]}>
      {u ? <Image source={{ uri: u }} style={box} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        : <Text style={[st.text, { fontSize: Math.round(size * 0.38) }]} allowFontScaling={false}>{(initials || 'V').slice(0, 2)}</Text>}
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,240,233,0.14)' },
  text: { color: '#F3F0E9', fontWeight: '600', letterSpacing: 0.5 },
});
