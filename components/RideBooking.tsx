import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';

interface Props {
  venue: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  onClose?: () => void;
}

export default function RideBooking({ venue, onClose }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<'uber' | 'lyft' | null>(null);

  const openUber = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const destLat = venue.latitude || 0;
    const destLng = venue.longitude || 0;
    const destName = encodeURIComponent(venue.name);
    const destAddress = encodeURIComponent(venue.address);

    const uberUrl = Platform.select({
      ios: `uber://?action=setPickup&pickup=my_location&dropoff[latitude]=${destLat}&dropoff[longitude]=${destLng}&dropoff[nickname]=${destName}&dropoff[formatted_address]=${destAddress}`,
      android: `uber://?action=setPickup&pickup=my_location&dropoff[latitude]=${destLat}&dropoff[longitude]=${destLng}&dropoff[nickname]=${destName}`,
    });

    const webUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${destLat}&dropoff[longitude]=${destLng}&dropoff[nickname]=${destName}`;

    Linking.canOpenURL(uberUrl!).then((supported) => {
      Linking.openURL(supported ? uberUrl! : webUrl);
    });
  };

  const openLyft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const destLat = venue.latitude || 0;
    const destLng = venue.longitude || 0;

    const lyftUrl = `lyft://ridetype?id=lyft&destination[latitude]=${destLat}&destination[longitude]=${destLng}`;
    const webUrl = `https://www.lyft.com/ride?destination[latitude]=${destLat}&destination[longitude]=${destLng}`;

    Linking.canOpenURL(lyftUrl).then((supported) => {
      Linking.openURL(supported ? lyftUrl : webUrl);
    });
  };

  const openMaps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const destLat = venue.latitude || 0;
    const destLng = venue.longitude || 0;

    const url = Platform.select({
      ios: `maps://?daddr=${destLat},${destLng}`,
      android: `google.navigation:q=${destLat},${destLng}`,
    });

    Linking.openURL(url!);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Get There</Text>
          <Text style={styles.headerSubtitle}>{venue.name}</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.zinc[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Destination */}
      <View style={styles.destinationCard}>
        <View style={styles.destinationIcon}>
          <Ionicons name="location" size={20} color={colors.violet[400]} />
        </View>
        <View style={styles.destinationInfo}>
          <Text style={styles.destinationName} numberOfLines={1}>{venue.name}</Text>
          <Text style={styles.destinationAddress} numberOfLines={1}>{venue.address}</Text>
        </View>
      </View>

      {/* Ride Options */}
      <View style={styles.rideOptions}>
        {/* Uber */}
        <TouchableOpacity
          style={[styles.rideCard, selectedProvider === 'uber' && styles.rideCardSelected]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedProvider('uber');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.providerLogo, { backgroundColor: '#000' }]}>
            <Text style={styles.logoText}>Uber</Text>
          </View>
          <View style={styles.rideInfo}>
            <Text style={styles.rideName}>Uber</Text>
            <Text style={styles.rideDesc}>Request a ride</Text>
          </View>
          <Ionicons 
            name={selectedProvider === 'uber' ? 'checkmark-circle' : 'chevron-forward'} 
            size={22} 
            color={selectedProvider === 'uber' ? colors.violet[400] : colors.zinc[600]} 
          />
        </TouchableOpacity>

        {/* Lyft */}
        <TouchableOpacity
          style={[styles.rideCard, selectedProvider === 'lyft' && styles.rideCardSelected]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedProvider('lyft');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.providerLogo, { backgroundColor: '#FF00BF' }]}>
            <Text style={styles.logoText}>Lyft</Text>
          </View>
          <View style={styles.rideInfo}>
            <Text style={styles.rideName}>Lyft</Text>
            <Text style={styles.rideDesc}>Request a ride</Text>
          </View>
          <Ionicons 
            name={selectedProvider === 'lyft' ? 'checkmark-circle' : 'chevron-forward'} 
            size={22} 
            color={selectedProvider === 'lyft' ? colors.violet[400] : colors.zinc[600]} 
          />
        </TouchableOpacity>
      </View>

      {/* Action Button */}
      {selectedProvider ? (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={selectedProvider === 'uber' ? openUber : openLyft}
          activeOpacity={0.8}
        >
          <Text style={styles.bookButtonText}>
            Open {selectedProvider === 'uber' ? 'Uber' : 'Lyft'}
          </Text>
          <Ionicons name="open-outline" size={18} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.selectPrompt}>
          <Text style={styles.selectPromptText}>Select a ride option</Text>
        </View>
      )}

      {/* Maps Alternative */}
      <TouchableOpacity style={styles.mapsButton} onPress={openMaps}>
        <Ionicons name="navigate-outline" size={18} color={colors.violet[400]} />
        <Text style={styles.mapsButtonText}>Get Directions in Maps</Text>
      </TouchableOpacity>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        You'll complete booking in the provider's app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.zinc[900],
    borderRadius: 20,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.zinc[500],
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.zinc[800],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  destinationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.violet[500] + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  destinationAddress: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 2,
  },
  rideOptions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  rideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.zinc[800],
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rideCardSelected: {
    borderColor: colors.violet[500],
    backgroundColor: colors.violet[500] + '10',
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  rideInfo: {
    flex: 1,
  },
  rideName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  rideDesc: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 2,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.violet[500],
    borderRadius: 14,
    paddingVertical: 16,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  selectPrompt: {
    alignItems: 'center',
    backgroundColor: colors.zinc[800],
    borderRadius: 14,
    paddingVertical: 16,
  },
  selectPromptText: {
    fontSize: 14,
    color: colors.zinc[500],
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: spacing.xs,
  },
  mapsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.violet[400],
  },
  disclaimer: {
    fontSize: 11,
    color: colors.zinc[600],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
