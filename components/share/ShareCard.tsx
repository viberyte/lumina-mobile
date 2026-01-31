import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShareCardProps {
  type: 'partner' | 'venue';
  name: string;
  subtitle: string;
  imageUrl?: string;
  stats?: {
    label: string;
    value: string;
  }[];
}

const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

export default function ShareCard({ type, name, subtitle, imageUrl, stats }: ShareCardProps) {
  const displayStats = stats?.slice(0, 2);
  const formattedSubtitle = toTitleCase(subtitle);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1A1A1A', '#000000']}
        style={styles.gradient}
      >
        {imageUrl && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
              style={styles.imageGradient}
            />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>{formattedSubtitle}</Text>

          {displayStats && displayStats.length > 0 && (
            <View style={styles.statsRow}>
              {displayStats.map((stat, index) => (
                <React.Fragment key={index}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                  {index < displayStats.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>
          )}

          <View style={styles.branding}>
            <View style={styles.brandingDot} />
            <Text style={styles.brandingText}>LUMINA</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000000' },
  gradient: { flex: 1, justifyContent: 'flex-end' },
  imageContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.6 },
  heroImage: { width: '100%', height: '100%' },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.4 },
  content: { paddingHorizontal: 32, paddingBottom: 80 },
  name: { fontSize: 48, fontWeight: '700', color: colors.white, marginBottom: 8, letterSpacing: -1 },
  subtitle: { fontSize: 18, fontWeight: '500', color: colors.zinc[400], marginBottom: 32, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 48 },
  stat: { marginRight: 24 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.white, marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '500', color: colors.zinc[500], textTransform: 'uppercase', letterSpacing: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.zinc[800], marginRight: 24 },
  branding: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.violet[500] },
  brandingText: { fontSize: 12, fontWeight: '600', color: colors.zinc[600], letterSpacing: 2 },
});
