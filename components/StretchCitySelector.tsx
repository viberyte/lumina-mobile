import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../theme';

const CITIES = [
  { name: 'Near Me', state: 'Use Location', available: true, icon: 'location' },
  { name: 'Manhattan', state: 'New York', available: true },
  { name: 'Brooklyn', state: 'New York', available: true },
  { name: 'Queens', state: 'New York', available: true },
  { name: 'North Jersey', state: 'New Jersey', available: true },
  { name: 'South Jersey', state: 'New Jersey', available: true },
  { name: 'Jersey City', state: 'New Jersey', available: true },
  { name: 'Philadelphia', state: 'Pennsylvania', available: true },
];

interface StretchCitySelectorProps {
  onSelectCity: (city: string) => void;
  currentCity: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function CityRow({ 
  city, 
  index, 
  isSelected, 
  onSelect 
}: { 
  city: typeof CITIES[0]; 
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      index * 50,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (!city.available) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isSelected ? 1 : 0, { duration: 200 }),
    transform: [
      { scale: withSpring(isSelected ? 1 : 0.5, { damping: 12, stiffness: 200 }) },
    ],
  }));

  return (
    <AnimatedTouchable
      style={[styles.cityRow, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={!city.available}
    >
      <View style={styles.cityInfo}>
        {city.icon ? (
          <View style={styles.locationIconContainer}>
            <Ionicons name="navigate" size={18} color={colors.violet[400]} />
          </View>
        ) : null}
        <View>
          <Text style={[
            styles.cityName,
            isSelected && styles.cityNameSelected,
            !city.available && styles.cityNameDisabled,
          ]}>
            {city.name}
          </Text>
          {!city.icon && (
            <Text style={[
              styles.cityState,
              !city.available && styles.cityStateDisabled,
            ]}>
              {city.available ? city.state : 'Coming Soon'}
            </Text>
          )}
        </View>
      </View>
      
      <Animated.View style={[styles.checkmarkContainer, checkmarkStyle]}>
        <Ionicons name="checkmark" size={24} color={colors.violet[400]} />
      </Animated.View>
    </AnimatedTouchable>
  );
}

export default function StretchCitySelector({ onSelectCity, currentCity }: StretchCitySelectorProps) {
  const insets = useSafeAreaInsets();
  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 300 });
    contentTranslateY.value = withSpring(0, { damping: 20, stiffness: 150 });
  }, []);

  const handleSelectCity = (cityName: string) => {
    overlayOpacity.value = withTiming(0, { duration: 200 });
    contentTranslateY.value = withTiming(50, { duration: 200 });
    
    setTimeout(() => {
      onSelectCity(cityName);
    }, 150);
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, overlayStyle]}>
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      
      <View style={styles.darkOverlay} />
      
      <Animated.View style={[styles.content, contentStyle]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Where are you tonight?</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {CITIES.map((city, index) => (
            <CityRow
              key={city.name}
              city={city}
              index={index}
              isSelected={currentCity === city.name}
              onSelect={() => handleSelectCity(city.name)}
            />
          ))}
        </ScrollView>

        <View style={[styles.closeButtonContainer, { bottom: insets.bottom + 30 }]}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => handleSelectCity(currentCity)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color={colors.zinc[900]} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: 4,
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.violet[500] + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityName: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.zinc[300],
    letterSpacing: -0.3,
  },
  cityNameSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  cityNameDisabled: {
    color: colors.zinc[600],
  },
  cityState: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 2,
  },
  cityStateDisabled: {
    color: colors.zinc[700],
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
