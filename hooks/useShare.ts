import { useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';

export const useShare = () => {
  const shareCardRef = useRef<any>(null);

  const shareToStories = async () => {
    try {
      if (!shareCardRef.current) {
        Alert.alert('Error', 'Share card not ready');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Capture the share card as image
      const uri = await captureRef(shareCardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Unable to share on this device');
        return;
      }

      // Share the image
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share to Instagram Stories',
        UTI: 'public.png',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share failed', 'Unable to share at this time');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return { shareCardRef, shareToStories };
};
