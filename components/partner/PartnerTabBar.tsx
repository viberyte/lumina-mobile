import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://viberyte.com';

type TabKey = 'dashboard' | 'bookings' | 'menu' | 'events' | 'settings';

const ALL_TABS: { key: TabKey; label: string; icon: any; href: string; perm?: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', href: '/partner/dashboard' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-outline', href: '/partner/bookings', perm: 'has_booking_inquiries' },
  { key: 'menu', label: 'Menu', icon: 'restaurant-outline', href: '/partner/menu', perm: 'has_menu' },
  { key: 'events', label: 'Events', icon: 'sparkles-outline', href: '/partner/events' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', href: '/partner/settings' },
];

export default function PartnerTabBar({ active }: { active: TabKey }) {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await AsyncStorage.getItem('lumina_partner_session');
        if (!session) return;
        const { token } = JSON.parse(session);
        const res = await fetch(`${API_BASE}/api/partner/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions || {});
        }
      } catch {}
    })();
  }, []);

  // Until permissions load, show only the always-free tabs to avoid a flash of locked tabs.
  const visibleTabs = ALL_TABS.filter(t => {
    if (!t.perm) return true;
    if (permissions === null) return false;
    return !!permissions[t.perm];
  });

  return (
    <View style={styles.bottomNav}>
      {visibleTabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            onPress={() => { if (!isActive) router.push(tab.href as any); }}
          >
            <Ionicons name={tab.icon} size={22} color={isActive ? '#fff' : '#52525b'} />
            <Text style={[styles.navText, isActive && styles.navTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 28, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 10, color: '#52525b' },
  navTextActive: { color: '#fff' },
});
