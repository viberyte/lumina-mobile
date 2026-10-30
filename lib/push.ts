// lib/push.ts — Make a Plan (mobile): Expo push token (asked only when the caller says so) + tap-to-open a plan.
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from './plans';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
export const PUSH_AVAILABLE = true; // false in the 1.3.2 OTA stub (no push entitlement in that binary)
const RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,64}\]$/;

/** Returns the stored/valid token. With ask=true, shows the iOS permission prompt if not yet decided. */
export async function getPushToken(ask: boolean): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask) ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return null;
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;
    const t = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    if (!RE.test(t)) return null;
    await AsyncStorage.setItem(TOKEN_KEY, t).catch(() => {});
    return t;
  } catch { return null; }
}

/** Mount once in the root layout: a tapped "Mia is in" notification opens that plan. */
export function usePlanNotificationTaps(open: (planId: string) => void) {
  useEffect(() => {
    const go = (r: Notifications.NotificationResponse | null) => { const id = (r?.notification?.request?.content?.data as any)?.planId; if (typeof id === 'string' && /^[a-z0-9]{4,12}$/.test(id)) open(id); };
    Notifications.getLastNotificationResponseAsync().then(go).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
