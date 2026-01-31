import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../theme';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabLayout() {
  const [isPartner, setIsPartner] = useState(false);

  const checkPartnerStatus = useCallback(async () => {
    try {
      // REAL source of truth - only partner_token grants access
      const partnerToken = await AsyncStorage.getItem('partner_token');
      const hasPartnerAccess = Boolean(partnerToken);
      
      console.log('Partner status check:', { hasPartnerToken: !!partnerToken, hasPartnerAccess });
      setIsPartner(hasPartnerAccess);
    } catch (error) {
      console.error('Error checking partner status:', error);
      setIsPartner(false);
    }
  }, []);

  useEffect(() => {
    checkPartnerStatus();
  }, [checkPartnerStatus]);

  useFocusEffect(
    useCallback(() => {
      checkPartnerStatus();
    }, [checkPartnerStatus])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.violet[500],
        tabBarInactiveTintColor: colors.zinc[500],
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          position: 'absolute',
          elevation: 0,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarBackground: () => (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.tabBarOverlay} />
          </BlurView>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'ticket' : 'ticket-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="partner"
        options={{
          title: 'Partner',
          href: isPartner ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.zinc[950] + 'E6',
    borderTopWidth: 1,
    borderTopColor: colors.zinc[800] + '50',
  },
  activeIconContainer: {
    transform: [{ scale: 1.1 }],
  },
});
