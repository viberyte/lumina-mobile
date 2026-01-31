import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert } from 'react-native';

export const requireAuth = async (action: string = 'do this'): Promise<boolean> => {
  const userId = await AsyncStorage.getItem('@lumina_user_id');
  const isGuest = await AsyncStorage.getItem('@lumina_is_guest');
  
  // If no user or is guest, prompt to sign up
  if (!userId || isGuest === 'true') {
    Alert.alert(
      'Create a Profile',
      `Sign up to ${action} and unlock your personalized Lumina experience.`,
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Sign Up', onPress: () => router.push('/login') }
      ]
    );
    return false;
  }
  
  return true;
};
