import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Always show splash on fresh app open
    setShowSplash(true);
    setIsReady(true);
  }, []);

  if (!isReady) return null;
  
  // Always go to splash first
  return <Redirect href="/splash" />;
}
