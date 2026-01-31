// Run this in the Expo app's console or create a test button
// This sets a test user that matches your database

import AsyncStorage from '@react-native-async-storage/async-storage';

const testUser = {
  id: "1",
  email: "test@lumina.app",
  name: "Test User",
  provider: "email",
  createdAt: new Date().toISOString(),
};

AsyncStorage.setItem('@lumina_user', JSON.stringify(testUser));
console.log('Test user set!');
