import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { glassStyles } from '../../theme/vibeGradients';

const API_BASE = 'https://lumina.viberyte.com';

// UNIVERSAL STRUCTURE - Same for every city
const NIGHTLIFE_VIBES = [
  {
    name: 'Hip-Hop / R&B',
    slug: 'hip-hop-rnb',
    description: 'Connect with the culture',
  },
  {
    name: 'House / Techno',
    slug: 'house-techno',
    description: 'Find your late-night crew',
  },
  {
    name: 'Afrobeats / Amapiano',
    slug: 'afrobeats-amapiano',
    description: 'Discover the latest parties',
  },
  {
    name: 'Latin',
    slug: 'latin',
    description: 'See what is happening tonight',
  },
  {
    name: 'EDM / Festival',
    slug: 'edm-festival',
    description: 'Join the energy',
  },
  {
    name: 'Jazz / Live Music',
    slug: 'jazz-live',
    description: 'Explore intimate performances',
  },
  {
    name: 'Lounge / Rooftop',
    slug: 'lounge-rooftop',
    description: 'Find your vibe',
  },
];

const FOOD_VIBES = [
  {
    name: 'Date Night Dining',
    slug: 'date-night',
    description: 'Find the perfect spot',
  },
  {
    name: 'Foodie Experiences',
    slug: 'foodie-experiences',
    description: 'Discover something new',
  },
  {
    name: 'Casual & Social',
    slug: 'casual-social',
    description: 'See where people are going',
  },
  {
    name: 'Late Night Eats',
    slug: 'late-night',
    description: 'Connect after hours',
  },
  {
    name: 'Cultural Dining',
    slug: 'cultural-dining',
    description: 'Explore authentic flavors',
  },
  {
    name: 'Quick & Solo',
    slug: 'quick-solo',
    description: 'Find your go-to spots',
  },
];

const SPONTANEOUS_VIBE = {
  name: 'Spontaneous / Anything',
  slug: 'spontaneous',
  description: 'Open to whatever the night brings',
};

interface City {
  name: string;
  room_count: number;
}

export default function RoomsScreen() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cities, setCities] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [nightlifeExpanded, setNightlifeExpanded] = useState(false);
  const [foodExpanded, setFoodExpanded] = useState(false);
  const [nycExpanded, setNycExpanded] = useState(true);
  const [otherCitiesExpanded, setOtherCitiesExpanded] = useState(true);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/chat/rooms`);
      const data = await response.json();
      setCities(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setLoading(false);
    }
  };

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setNightlifeExpanded(false);
    setFoodExpanded(false);
    setSearchQuery('');
  };

  const handleVibePress = (vibeSlug: string) => {
    const fullSlug = `${selectedCity?.toLowerCase().replace(/ /g, '-')}-${vibeSlug}`;
    router.push(`/chat-room/${fullSlug}`);
  };

  const topNightlife = NIGHTLIFE_VIBES.slice(0, 3);
  const topFood = FOOD_VIBES.slice(0, 3);

  // Filter cities based on search
  const filteredNycBoroughs = cities?.nyc_boroughs?.filter((borough: City) =>
    borough.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredCities = cities?.cities?.filter((city: City) =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading && !cities) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.violet[500]} />
          <Text style={styles.loadingText}>Loading cities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // City Picker View
  if (!selectedCity) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Chat Rooms</Text>
            <Text style={styles.subtitle}>Choose your city</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, glassStyles.liquid]}>
              <Ionicons name="search" size={20} color={colors.zinc[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                placeholderTextColor={colors.zinc[500]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.zinc[400]} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* NYC Boroughs */}
            {filteredNycBoroughs.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setNycExpanded(!nycExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>New York City</Text>
                  <View style={styles.sectionRight}>
                    <Text style={styles.sectionCount}>{filteredNycBoroughs.length}</Text>
                    <Ionicons
                      name={nycExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.zinc[400]}
                    />
                  </View>
                </TouchableOpacity>

                {nycExpanded && filteredNycBoroughs.map((borough: City) => (
                  <TouchableOpacity
                    key={borough.name}
                    style={styles.cityCard}
                    onPress={() => handleCitySelect(borough.name)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.card, glassStyles.liquid]}>
                      <View style={styles.cardContent}>
                        <Text style={styles.cityName}>{borough.name}</Text>
                        <Text style={styles.roomCount}>{borough.room_count} vibes</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color={colors.violet[400]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Other Cities */}
            {filteredCities.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setOtherCitiesExpanded(!otherCitiesExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>Other Cities</Text>
                  <View style={styles.sectionRight}>
                    <Text style={styles.sectionCount}>{filteredCities.length}</Text>
                    <Ionicons
                      name={otherCitiesExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.zinc[400]}
                    />
                  </View>
                </TouchableOpacity>

                {otherCitiesExpanded && filteredCities.map((city: City) => (
                  <TouchableOpacity
                    key={city.name}
                    style={styles.cityCard}
                    onPress={() => handleCitySelect(city.name)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.card, glassStyles.liquid]}>
                      <View style={styles.cardContent}>
                        <Text style={styles.cityName}>{city.name}</Text>
                        <Text style={styles.roomCount}>{city.room_count} vibes</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color={colors.violet[400]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* No Results */}
            {searchQuery.length > 0 && filteredNycBoroughs.length === 0 && filteredCities.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color={colors.zinc[600]} />
                <Text style={styles.noResultsText}>No cities found</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Vibes View - Universal Structure
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedCity(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{selectedCity}</Text>
            <Text style={styles.subtitle}>Choose your vibe</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Nightlife Vibes */}
          <View style={styles.vibeSection}>
            <Text style={styles.vibeSectionTitle}>NIGHTLIFE VIBES</Text>
            
            {(nightlifeExpanded ? NIGHTLIFE_VIBES : topNightlife).map((vibe) => (
              <TouchableOpacity
                key={vibe.slug}
                style={styles.vibeCard}
                onPress={() => handleVibePress(vibe.slug)}
                activeOpacity={0.8}
              >
                <View style={[styles.card, glassStyles.liquid]}>
                  <View style={styles.vibeInfo}>
                    <Text style={styles.vibeName}>{vibe.name}</Text>
                    <Text style={styles.vibeDescription}>{vibe.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.violet[400]} />
                </View>
              </TouchableOpacity>
            ))}

            {NIGHTLIFE_VIBES.length > 3 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setNightlifeExpanded(!nightlifeExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.expandText}>
                  {nightlifeExpanded ? 'Show Less' : 'See All Nightlife Vibes'}{' '}
                  <Ionicons name={nightlifeExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Food Vibes */}
          <View style={styles.vibeSection}>
            <Text style={styles.vibeSectionTitle}>FOOD VIBES</Text>
            
            {(foodExpanded ? FOOD_VIBES : topFood).map((vibe) => (
              <TouchableOpacity
                key={vibe.slug}
                style={styles.vibeCard}
                onPress={() => handleVibePress(vibe.slug)}
                activeOpacity={0.8}
              >
                <View style={[styles.card, glassStyles.liquid]}>
                  <View style={styles.vibeInfo}>
                    <Text style={styles.vibeName}>{vibe.name}</Text>
                    <Text style={styles.vibeDescription}>{vibe.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.violet[400]} />
                </View>
              </TouchableOpacity>
            ))}

            {FOOD_VIBES.length > 3 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setFoodExpanded(!foodExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.expandText}>
                  {foodExpanded ? 'Show Less' : 'See All Food Vibes'}{' '}
                  <Ionicons name={foodExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Spontaneous Vibe */}
          <View style={styles.vibeSection}>
            <TouchableOpacity
              style={styles.vibeCard}
              onPress={() => handleVibePress(SPONTANEOUS_VIBE.slug)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.violet[600] + '40', colors.violet[700] + '20']}
                style={[styles.card, styles.flexVibeCard]}
              >
                <View style={styles.vibeInfo}>
                  <Text style={styles.vibeName}>{SPONTANEOUS_VIBE.name}</Text>
                  <Text style={styles.vibeDescription}>{SPONTANEOUS_VIBE.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  gradient: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerText: {
    flex: 1,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.white,
    paddingVertical: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionCount: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.zinc[500],
  },
  cityCard: {
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
  },
  cardContent: {
    flex: 1,
  },
  cityName: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  roomCount: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  noResultsText: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.zinc[400],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  noResultsSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[500],
  },
  vibeSection: {
    marginBottom: spacing.xl,
  },
  vibeSectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.zinc[500],
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  vibeCard: {
    marginBottom: spacing.md,
  },
  flexVibeCard: {
    borderWidth: 1,
    borderColor: colors.violet[500] + '40',
  },
  vibeInfo: {
    flex: 1,
  },
  vibeName: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  vibeDescription: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
  },
  expandButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  expandText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.violet[400],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
  },
});
