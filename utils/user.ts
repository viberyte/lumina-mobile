import * as Application from 'expo-application';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'lumina_user_id';

export async function getUserId(): Promise<string> {
  try {
    // Check if we have a stored user ID
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    
    if (!userId) {
      // Generate a unique ID based on device
      if (Platform.OS === 'ios') {
        userId = await Application.getIosIdForVendorAsync() || `ios-${Date.now()}`;
      } else {
        userId = Application.androidId || `android-${Date.now()}`;
      }
      
      // Store it
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return `guest-${Date.now()}`;
  }
}
