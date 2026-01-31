import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;

const colors = {
  background: '#0A0A0F',
  card: '#16161F',
  cardBorder: '#2A2A3A',
  accent: '#8B5CF6',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
};

const CATEGORY_CONFIG = {
  best_tonight: {
    title: "🔥 The Move Tonight",
    subtitle: "Where everyone's going",
    icon: "flame",
  },
  rising_stars: {
    title: "📈 On the Rise",
    subtitle: "Getting buzz",
    icon: "trending-up",
  },
  high_energy: {
    title: "⚡ High Voltage",
    subtitle: "Packed and electric",
    icon: "flash",
  },
  date_friendly: {
    title: "💕 Date Night Ready",
    subtitle: "Intimate vibes",
    icon: "heart",
  },
  lgbtq_friendly: {
    title: "🏳️‍🌈 Pride Energy",
    subtitle: "Inclusive spaces",
    icon: "people",
  },
  late_night: {
    title: "🌙 After Hours",
    subtitle: "Still going strong",
    icon: "moon",
  },
  hidden_gems: {
    title: "💎 If You Know, You Know",
    subtitle: "Under the radar",
    icon: "diamond",
  },
  food_trucks: {
    title: "🚚 Trending Food Trucks",
    subtitle: "Mobile eats on fire",
    icon: "fast-food",
  },
};

export default function WhatsLitScreen() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState('');

  useEffect(() => {
    fetchWhatsLit();
  }, []);

  const fetchWhatsLit = async () => {
    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 40.7128;
      let lng = -74.0060;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
        setLocation({ lat, lng });
      }

      const response = await fetch(
        `https://lumina.viberyte.com/api/explore/whats-lit?lat=${lat}&lng=${lng}&radius=10`
      );
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
        setCurrentDay(data.day);
      }
    } catch (error) {
      console.error('Error fetching what\'s lit:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderVenueCard = ({ item }: { item: any }) => {
    const photo = item.google_photos ? JSON.parse(item.google_photos)[0] : null;

    return (
      <TouchableOpacity
        style={styles.venueCard}
        activeOpacity={0.9}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/venue/${item.id}`);
        }}
      >
        {photo && (
          <Image
            source={{ uri: photo }}
            style={styles.venueImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
        
        <View style={styles.venueCardContent}>
          <Text style={styles.venueName} numberOfLines={1}>
            {item.name}
          </Text>
          
          <View style={styles.venueMetaRow}>
            {item.neighborhood && (
              <Text style={styles.venueNeighborhood}>{item.neighborhood}</Text>
            )}
            {item.rating && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#FCD34D" />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              </>
            )}
            {item.day_score && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.scoreText}>
                  {Math.round(item.day_score * 100)}% 🔥
                </Text>
              </>
            )}
          </View>

          {item.distance && (
            <Text style={styles.distanceText}>
              {item.distance.toFixed(1)} mi away
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategory = (categoryKey: string) => {
    const config = CATEGORY_CONFIG[categoryKey as keyof typeof CATEGORY_CONFIG];
    const venues = categories[categoryKey];

    if (!config || !venues || venues.length === 0) return null;

    return (
      <View key={categoryKey} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View>
            <Text style={styles.categoryTitle}>{config.title}</Text>
            <Text style={styles.categorySubtitle}>{config.subtitle}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Navigate to full category view
            }}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={venues}
          renderItem={renderVenueCard}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.venueList}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Finding what's lit tonight...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View>
          <Text style={styles.headerTitle}>What's Lit</Text>
          <Text style={styles.headerSubtitle}>
            {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)} Night
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories && Object.keys(CATEGORY_CONFIG).map(renderCategory)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categorySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  venueList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  venueCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  venueImage: {
    width: '100%',
    height: 180,
  },
  venueCardContent: {
    padding: 16,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  venueMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  venueNeighborhood: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaDot: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
