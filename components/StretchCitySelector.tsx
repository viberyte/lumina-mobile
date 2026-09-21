import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const CITIES = [
  { name: 'Near Me', state: 'Use current location', venueCount: null, available: true, isLocation: true },
  { name: 'Manhattan', state: 'New York', venueCount: '1,265 venues', available: true },
  { name: 'Brooklyn', state: 'New York', venueCount: '365 venues', available: true },
  { name: 'Queens', state: 'New York', venueCount: '200 venues', available: true },
  { name: 'North Jersey', state: 'New Jersey', venueCount: '457 venues', available: true },
  { name: 'South Jersey', state: 'New Jersey', venueCount: '28 venues', available: true },
  { name: 'Jersey City', state: 'New Jersey', venueCount: null, available: true },
  { name: 'Honolulu', state: 'Hawaii', venueCount: '100 venues', available: true },
];

interface StretchCitySelectorProps {
  onSelectCity: (city: string) => void;
  currentCity: string;
  visible?: boolean;
  onClose?: () => void;
}

export default function StretchCitySelector({ onSelectCity, currentCity, visible = true, onClose }: StretchCitySelectorProps) {
  const insets = useSafeAreaInsets();

  const handleSelect = (cityName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectCity(cityName);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Where are you going out?</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* City list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {CITIES.map((city, i) => {
            const isSelected = currentCity === city.name;
            return (
              <TouchableOpacity
                key={city.name}
                style={[styles.cityRow, i < CITIES.length - 1 && styles.cityRowBorder]}
                onPress={() => handleSelect(city.name)}
                activeOpacity={0.6}
              >
                <View style={styles.cityLeft}>
                  {city.isLocation && (
                    <Ionicons name="location" size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 12 }} />
                  )}
                  <View>
                    <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                      {city.name}
                    </Text>
                    <Text style={styles.cityMeta}>
                      {city.venueCount || city.state}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  cityRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  cityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cityName: {
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  cityNameSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  cityMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
});
