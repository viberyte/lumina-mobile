import React from 'react';
import { Image } from 'expo-image';
import { View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

interface EventCardProps {
  event: any;
}

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/event/${event.id}`);
  };

  // Timezone-safe date parser
  const parseEventDate = (dateString: string): Date => {
    if (!dateString) return new Date();
    if (dateString.includes("T")) return new Date(dateString);
    const parts = dateString.split("-").map(p => parseInt(p));
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    return new Date(dateString);
  };

  const formatDate = (dateString: string) => {
    const date = parseEventDate(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return { month, day };
  };

  const { month, day } = formatDate(event.date);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <Image source={{ uri: event.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819' }} style={styles.image} />
      
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient} />

      <View style={styles.dateBadge}>
        <Text style={styles.dateMonth}>{month}</Text>
        <Text style={styles.dateDay}>{day}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        
        <View style={styles.details}>
          {event.venue_name && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={14} color={colors.gray[400]} />
              <Text style={styles.detailText} numberOfLines={1}>{event.venue_name}</Text>
            </View>
          )}
          
          {event.genre && (
            <View style={styles.detailRow}>
              <Ionicons name="musical-notes" size={14} color={colors.violet[400]} />
              <Text style={styles.genreText} numberOfLines={1}>{event.genre}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: 280, height: 320, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.gray[800], marginRight: 12 },
  image: { width: '100%', height: '100%', position: 'absolute' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  datebadge: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.violet[600], borderRadius: 12, padding: 8, alignItems: 'center', minWidth: 50 },
  dateMonth: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },
  dateDay: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 2 },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  details: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: colors.gray[400], flex: 1 },
  genreText: { fontSize: 13, color: colors.violet[300], fontWeight: '600', flex: 1 },
});
