import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ovlnxzbkvbgcnguqvxhk.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bG54emJrdmJnY25ndXF2eGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTAzNzQsImV4cCI6MjA4MzU4NjM3NH0.lJVpPf-quU6_8F0wpa3goIppmcQgSb3Yc95w0d8F9TM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
