import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  user_id: number;
  gender: string | null;
  age_range: string | null;
  voice_key: string;
  music_preferences: string[];
  allowed_scenes: string[];
}

interface UseUserReturn {
  userId: number | null;
  profile: UserProfile | null;
  voiceKey: string;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [userId, setUserId] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [voiceKey, setVoiceKey] = useState<string>('neutral');
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const [storedUserId, storedProfile, storedVoice] = await Promise.all([
        AsyncStorage.getItem('@lumina_user_id'),
        AsyncStorage.getItem('@lumina_profile'),
        AsyncStorage.getItem('@lumina_voice_key'),
      ]);

      if (storedUserId) {
        setUserId(Number(storedUserId));
      }

      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        setProfile(parsed);
        if (parsed.voice_key) {
          setVoiceKey(parsed.voice_key);
        }
      }

      if (storedVoice) {
        setVoiceKey(storedVoice);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    await loadUser();
  }, [loadUser]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return {
    userId,
    profile,
    voiceKey,
    isLoading,
    refreshProfile,
  };
}

export default useUser;
