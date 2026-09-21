import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://viberyte.com';

// Guard for paid (NightLink) pages. Redirects free users to settings.
// `perm` is the permission key required, e.g. 'has_menu' or 'has_booking_inquiries'.
export function useRequirePaid(perm: string) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = await AsyncStorage.getItem('lumina_partner_session');
        if (!session) { router.replace('/partner'); return; }
        const { token } = JSON.parse(session);
        const res = await fetch(`${API_BASE}/api/partner/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { router.replace('/partner'); return; }
        const data = await res.json();
        if (!data.permissions?.[perm]) {
          // Free user — bounce to settings (Plan/upgrade lives there).
          router.replace('/partner/settings');
          return;
        }
      } catch {
        router.replace('/partner/settings');
        return;
      } finally {
        setChecking(false);
      }
    })();
  }, [perm]);

  return checking;
}
