import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import StretchCitySelector from '../../components/StretchCitySelector';
import { extractCityFromQuery, stripCityFromQuery } from '../../utils/searchParser';
import SmartSearchBar from '../../components/explore/SmartSearchBar';
import DiningTab from '../../components/explore/DiningTab';
import NightlifeTab from '../../components/explore/NightlifeTab';
import EventsTab from '../../components/explore/EventsTab';
import EventsFilter from '../../components/explore/EventsFilter';

type Tab = 'Nightlife' | 'Dining' | 'Events';

const CITIES = ['Near Me', 'Manhattan', 'Brooklyn', 'Queens', 'North Jersey', 'South Jersey', 'Jersey City', 'Philadelphia', 'Washington DC', 'Baltimore', 'Newark'];

const EVENT_KEYWORDS = /(concert|festival|tour|show|performance)/;
const NIGHTLIFE_KEYWORDS = /(afrobeat|hip-hop|dj|club|party|lounge|rooftop|bar|nightlife|dance)/;
const DINING_KEYWORDS = /(sushi|dinner|lunch|restaurant|food|cuisine|brunch|late.?night.?eats|diner)/;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [activeTab, setActiveTab] = useState<Tab>('Nightlife');
  const [searchQuery, setSearchQuery] = useState('');
  const [overrideCity, setOverrideCity] = useState<string | null>(null);
  const [userCity, setUserCity] = useState('Near Me');
  const [showCityModal, setShowCityModal] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const reloadOpacity = React.useRef(new Animated.Value(0)).current;
  const bannerAnim = React.useRef(new Animated.Value(0)).current;
  const headerGlow = React.useRef(new Animated.Value(0)).current;
  const [filtersByTab, setFiltersByTab] = useState({
    Nightlife: {},
    Dining: {},
    Events: {},
  });

  const tabs: Tab[] = ['Nightlife', 'Dining', 'Events'];

  useEffect(() => {
    loadUserCity();
  }, []);


  // Pulsing glow effect for header
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(headerGlow, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  useEffect(() => {
    if (params.q) {
      const query = Array.isArray(params.q) ? params.q[0] : params.q;
      const detectedCity = extractCityFromQuery(query);
      const cleanQuery = stripCityFromQuery(query);
      
      setSearchQuery(cleanQuery);
      setOverrideCity(detectedCity);
      
      const lowerQuery = query.toLowerCase();
      if (EVENT_KEYWORDS.test(lowerQuery)) {
        setActiveTab('Events');
      } else if (DINING_KEYWORDS.test(lowerQuery)) {
        setActiveTab('Dining');
      } else if (NIGHTLIFE_KEYWORDS.test(lowerQuery)) {
        setActiveTab('Nightlife');
      }
    }
  }, [params.q]);

  const loadUserCity = async () => {
    try {
      const city = await AsyncStorage.getItem('@lumina_selected_city');
      if (city) {
        setUserCity(city);
      }
    } catch (error) {
      console.error('Error loading city:', error);
    }
  };

  const selectCity = async (newCity: string) => {
    setShowCityModal(false);
    
    if (newCity === userCity) return;
    
    // Start reload effect - fade to black
    setIsReloading(true);
    Animated.timing(reloadOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await AsyncStorage.setItem('@lumina_selected_city', newCity);
        setUserCity(newCity);
        setOverrideCity(null);
      } catch (error) {
        console.error('Error saving city:', error);
      }
      
      // Fade back in
      setTimeout(() => {
        Animated.timing(reloadOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setIsReloading(false);
        });
      }, 100);
    });
  };












  // Animate override banner
  React.useEffect(() => {
    Animated.timing(bannerAnim, {
      toValue: overrideCity ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [overrideCity]);
  const clearOverride = () => {
    setOverrideCity(null);
    setSearchQuery('');
  };

  const updateFilters = (tab: Tab, filters: any) => {
    setFiltersByTab(prev => ({ ...prev, [tab]: filters }));
  };

  const effectiveCity = overrideCity || userCity;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Animated.Text 
              style={[
                styles.headerTitleGlow,
                {
                  opacity: headerGlow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
                },
              ]}
            >
              Explore
            </Animated.Text>
            <Text style={styles.headerTitle}>Explore</Text>
          </View>
          <TouchableOpacity 
            style={styles.cityButton}
            onPress={() => setShowCityModal(true)}
          >
            <Ionicons name="location" size={16} color={colors.violet[400]} />
            <Text style={styles.cityButtonText}>{effectiveCity}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.zinc[400]} />
          </TouchableOpacity>
        </View>
        <SmartSearchBar initialQuery={searchQuery} />
      </View>

      {overrideCity && (
        <Animated.View 
          style={[
            styles.overrideBanner,
            {
              opacity: bannerAnim,
              transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.violet[400]} />
          <Text style={styles.overrideText}>Searching in {overrideCity}</Text>
          <TouchableOpacity onPress={clearOverride} style={styles.clearOverride} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.zinc[300]} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'Nightlife' && (
          <>
            <NightlifeTab filters={{ ...filtersByTab.Nightlife, searchQuery, city: effectiveCity }} />
          </>
        )}
        {activeTab === 'Dining' && (
          <>
            <DiningTab filters={{ ...filtersByTab.Dining, searchQuery, city: effectiveCity }} />
          </>
        )}
        {activeTab === 'Events' && (
          <>
            <EventsFilter onFilterChange={(f) => updateFilters('Events', f)} />
            <EventsTab filters={{ ...filtersByTab.Events, searchQuery, city: effectiveCity }} />
          </>
        )}
      </ScrollView>


      {/* City Selector Modal */}
      <Modal
        visible={showCityModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCityModal(false)}
      >
        <StretchCitySelector
          currentCity={userCity}
          onSelectCity={selectCity}
        />
      </Modal>

      {/* Context Reload Overlay */}
      {isReloading && (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: '#000',
            opacity: reloadOpacity,
            zIndex: 999,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{ width: 40, height: 3, backgroundColor: colors.violet[500], borderRadius: 2 }} />
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.black 
  },
  header: { 
    paddingHorizontal: spacing.lg, 
    paddingBottom: spacing.md, 
    backgroundColor: colors.black, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.zinc[800] 
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.md 
  },
  headerTitleContainer: {
    position: 'relative',
  },
  headerTitleGlow: {
    position: 'absolute',
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.violet[400],
    textShadowColor: colors.violet[500],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  headerTitle: { 
    fontSize: typography.sizes.xxl, 
    fontWeight: '700', 
    color: colors.white 
  },
  cityButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.xs, 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.xs, 
    backgroundColor: colors.zinc[900], 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: colors.zinc[800] 
  },
  cityButtonText: { 
    fontSize: typography.sizes.sm, 
    color: colors.white, 
    fontWeight: '600' 
  },
  overrideBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.xs, 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.sm, 
    backgroundColor: colors.violet[500] + '20', 
    borderBottomWidth: 1, 
    borderBottomColor: colors.violet[500] + '40' 
  },
  overrideText: { 
    flex: 1, 
    fontSize: typography.sizes.sm, 
    color: colors.violet[300] 
  },
  clearOverride: { 
    padding: spacing.xs 
  },
  tabBar: { 
    flexDirection: 'row', 
    paddingHorizontal: spacing.lg, 
    paddingBottom: spacing.md, 
    paddingTop: spacing.sm, 
    gap: spacing.sm, 
    backgroundColor: colors.black, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.zinc[900], 
  },
  tab: { 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.sm, 
    borderRadius: 999, 
    backgroundColor: colors.zinc[900], 
    borderWidth: 1, 
    borderColor: colors.zinc[800], 
  },
  activeTab: { 
    backgroundColor: colors.violet[500] + '22', 
    borderColor: colors.violet[500], 
  },
  tabText: { 
    fontSize: typography.sizes.md, 
    color: colors.zinc[400], 
    fontWeight: '600', 
  },
  activeTabText: { 
    color: colors.white, 
  },
  content: { 
    flex: 1 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    width: '80%', 
    backgroundColor: colors.zinc[900], 
    borderRadius: 16, 
    padding: spacing.lg, 
    borderWidth: 1, 
    borderColor: colors.zinc[800] 
  },
  modalTitle: { 
    fontSize: typography.sizes.lg, 
    fontWeight: '700', 
    color: colors.white, 
    marginBottom: spacing.md 
  },
  cityOption: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: spacing.md, 
    paddingHorizontal: spacing.md, 
    borderRadius: 12, 
    marginBottom: spacing.xs 
  },
  cityOptionActive: { 
    backgroundColor: colors.violet[500] + '20' 
  },
  cityOptionText: { 
    fontSize: typography.sizes.md, 
    color: colors.zinc[300], 
    fontWeight: '500' 
  },
  cityOptionTextActive: { 
    color: colors.violet[400], 
    fontWeight: '600' 
  },
});
