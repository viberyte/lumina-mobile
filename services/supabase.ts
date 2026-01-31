import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://ovlnxzbkvbgcnguqvxhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bG54emJrdmJnY25ndXF2eGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTAzNzQsImV4cCI6MjA4MzU4NjM3NH0.lJVpPf-quU6_8F0wpa3goIppmcQgSb3Yc95w0d8F9TM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
