import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const colors = {
  violet: { 500: '#8b5cf6', 600: '#7c3aed' },
  green: { 400: '#4ade80', 500: '#22c55e' },
  rose: { 400: '#fb7185', 500: '#f43f5e' },
  orange: { 500: '#f97316' },
  yellow: { 500: '#eab308' },
  blue: { 500: '#3b82f6' },
  zinc: { 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' },
};

type Table = {
  id: string;
  name: string;
  capacity: number;
  minimumSpend: number;
  isLocked?: boolean;
  isBooked?: boolean;
  x: number; // 0-100 percentage position
  y: number; // 0-100 percentage position
};

type Zone = {
  id: string;
  name: string;
  type: 'vip' | 'standard' | 'mainfloor' | 'patio' | 'private';
  tables: Table[];
  minimumSpend: number;
  color: string;
};

type ZoneMapOverlayProps = {
  venueImage: string;
  zones: Zone[];
  onTableSelect: (table: Table, zone: Zone) => void;
  selectedTableId?: string;
  showPricing?: boolean;
};

const screenWidth = Dimensions.get('window').width;
const MAP_ASPECT_RATIO = 4 / 3;

export default function ZoneMapOverlay({
  venueImage,
  zones,
  onTableSelect,
  selectedTableId,
  showPricing = true,
}: ZoneMapOverlayProps) {
  const [activeZoneFilter, setActiveZoneFilter] = useState<string | null>(null);
  const [legendVisible, setLegendVisible] = useState(false);

  const mapWidth = screenWidth - 32;
  const mapHeight = mapWidth / MAP_ASPECT_RATIO;

  const getTableStatus = (table: Table): 'available' | 'held' | 'booked' => {
    if (table.isBooked) return 'booked';
    if (table.isLocked) return 'held';
    return 'available';
  };

  const getStatusColor = (status: 'available' | 'held' | 'booked') => {
    switch (status) {
      case 'available':
        return colors.green[500];
      case 'held':
        return colors.orange[500];
      case 'booked':
        return colors.rose[500];
    }
  };

  const filteredZones = activeZoneFilter
    ? zones.filter(z => z.id === activeZoneFilter)
    : zones;

  const allTables = filteredZones.flatMap(zone =>
    zone.tables.map(table => ({ ...table, zone }))
  );

  const availableCount = allTables.filter(t => !t.isBooked && !t.isLocked).length;
  const totalCapacity = allTables.reduce((sum, t) => sum + t.capacity, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const selectedTable = allTables.find(t => t.id === selectedTableId);

  return (
    <View style={styles.container}>
      {/* Zone Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !activeZoneFilter && styles.filterChipActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveZoneFilter(null);
          }}
        >
          <Text style={[styles.filterChipText, !activeZoneFilter && styles.filterChipTextActive]}>
            All Zones
          </Text>
        </TouchableOpacity>

        {zones.map((zone) => {
          const zoneAvailable = zone.tables.filter(t => !t.isBooked && !t.isLocked).length;
          return (
            <TouchableOpacity
              key={zone.id}
              style={[
                styles.filterChip,
                activeZoneFilter === zone.id && styles.filterChipActive,
                activeZoneFilter === zone.id && { borderColor: zone.color },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveZoneFilter(activeZoneFilter === zone.id ? null : zone.id);
              }}
            >
              <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
              <Text style={[
                styles.filterChipText,
                activeZoneFilter === zone.id && styles.filterChipTextActive,
              ]}>
                {zone.name}
              </Text>
              <Text style={styles.filterChipCount}>{zoneAvailable}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Availability Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Ionicons name="grid-outline" size={16} color={colors.green[500]} />
          <Text style={styles.summaryText}>
            <Text style={styles.summaryValue}>{availableCount}</Text> Tables Available
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="people-outline" size={16} color={colors.blue[500]} />
          <Text style={styles.summaryText}>
            <Text style={styles.summaryValue}>{totalCapacity}</Text> Guests Capacity
          </Text>
        </View>
      </View>

      {/* Map Container */}
      <View style={[styles.mapContainer, { width: mapWidth, height: mapHeight }]}>
        {/* Venue Background Image */}
        <Image
          source={{ uri: venueImage }}
          style={styles.venueImage}
          resizeMode="cover"
        />

        {/* Dark Overlay */}
        <View style={styles.darkOverlay} />

        {/* Table Markers */}
        {allTables.map((table) => {
          const status = getTableStatus(table);
          const statusColor = getStatusColor(status);
          const isSelected = table.id === selectedTableId;
          const isDisabled = status === 'booked';

          return (
            <TouchableOpacity
              key={table.id}
              style={[
                styles.tableMarker,
                {
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  backgroundColor: statusColor,
                  borderColor: isSelected ? '#fff' : statusColor,
                  borderWidth: isSelected ? 3 : 2,
                  opacity: isDisabled ? 0.4 : 1,
                },
              ]}
              onPress={() => {
                if (!isDisabled) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onTableSelect(table, table.zone);
                } else {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                }
              }}
              disabled={isDisabled}
            >
              <Text style={styles.tableMarkerText}>{table.capacity}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Legend Button */}
        <TouchableOpacity
          style={styles.legendButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setLegendVisible(true);
          }}
        >
          <Ionicons name="information-circle-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Selected Table Card */}
      {selectedTable && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedCardHeader}>
            <View>
              <Text style={styles.selectedTableName}>{selectedTable.name}</Text>
              <View style={styles.selectedZoneRow}>
                <View style={[styles.zoneDot, { backgroundColor: selectedTable.zone.color }]} />
                <Text style={styles.selectedZoneName}>{selectedTable.zone.name}</Text>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(getTableStatus(selectedTable)) + '20' },
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(getTableStatus(selectedTable)) },
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(getTableStatus(selectedTable)) },
              ]}>
                {getTableStatus(selectedTable) === 'available' ? 'Available' :
                 getTableStatus(selectedTable) === 'held' ? 'On Hold' : 'Booked'}
              </Text>
            </View>
          </View>

          <View style={styles.selectedCardDetails}>
            <View style={styles.selectedDetail}>
              <Ionicons name="people-outline" size={16} color={colors.zinc[500]} />
              <Text style={styles.selectedDetailText}>Up to {selectedTable.capacity} guests</Text>
            </View>
            {showPricing && (
              <View style={styles.selectedDetail}>
                <Ionicons name="card-outline" size={16} color={colors.zinc[500]} />
                <Text style={styles.selectedDetailText}>
                  {formatCurrency(selectedTable.minimumSpend)} minimum
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Legend Modal */}
      <Modal
        visible={legendVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLegendVisible(false)}
      >
        <View style={styles.legendOverlay}>
          <TouchableOpacity
            style={styles.legendBackdrop}
            onPress={() => setLegendVisible(false)}
          />
          <View style={styles.legendContent}>
            <View style={styles.legendHeader}>
              <Text style={styles.legendTitle}>Map Legend</Text>
              <TouchableOpacity onPress={() => setLegendVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.legendSection}>
              <Text style={styles.legendSectionTitle}>Table Status</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.green[500] }]} />
                <Text style={styles.legendItemText}>Available - Ready to book</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.orange[500] }]} />
                <Text style={styles.legendItemText}>On Hold - Temporarily reserved</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.rose[500] }]} />
                <Text style={styles.legendItemText}>Booked - Not available</Text>
              </View>
            </View>

            <View style={styles.legendSection}>
              <Text style={styles.legendSectionTitle}>Venue Zones</Text>
              {zones.map((zone) => (
                <View key={zone.id} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: zone.color }]} />
                  <Text style={styles.legendItemText}>
                    {zone.name} ({zone.tables.length} tables)
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.legendSection}>
              <Text style={styles.legendSectionTitle}>How to Book</Text>
              <View style={styles.howToStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>Tap a green table marker to select</Text>
              </View>
              <View style={styles.howToStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>Review table details and capacity</Text>
              </View>
              <View style={styles.howToStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>Confirm your reservation</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Filter Chips
  filterScroll: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.zinc[900],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.zinc[800],
    gap: 6,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.zinc[800],
    borderWidth: 2,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.zinc[400],
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterChipCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green[500],
    backgroundColor: colors.green[500] + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 13,
    color: colors.zinc[500],
  },
  summaryValue: {
    fontWeight: '700',
    color: '#fff',
  },

  // Map Container
  mapContainer: {
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.zinc[900],
  },
  venueImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Table Markers
  tableMarker: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tableMarkerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Legend Button
  legendButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Selected Card
  selectedCard: {
    backgroundColor: colors.zinc[900],
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  selectedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  selectedTableName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  selectedZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedZoneName: {
    fontSize: 14,
    color: colors.zinc[400],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCardDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  selectedDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedDetailText: {
    fontSize: 14,
    color: colors.zinc[400],
  },

  // Legend Modal
  legendOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  legendContent: {
    backgroundColor: colors.zinc[900],
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 360,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  legendSection: {
    marginBottom: 20,
  },
  legendSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.zinc[500],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendItemText: {
    fontSize: 15,
    color: colors.zinc[300],
  },
  howToStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.violet[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    fontSize: 15,
    color: colors.zinc[300],
    flex: 1,
  },
});
