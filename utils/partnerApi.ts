import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://lumina.viberyte.com';

export async function partnerFetch(endpoint: string, options: RequestInit = {}) {
  // Get token from partner session
  const sessionData = await AsyncStorage.getItem('lumina_partner_session');
  let token = null;
  
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      token = session.token;
    } catch (e) {
      console.error('Failed to parse partner session:', e);
    }
  }

  // Build headers with auth token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
}

export async function getPartnerSession() {
  const sessionData = await AsyncStorage.getItem('lumina_partner_session');
  if (!sessionData) return null;
  
  try {
    return JSON.parse(sessionData);
  } catch (e) {
    return null;
  }
}

export async function clearPartnerSession() {
  await AsyncStorage.removeItem('lumina_partner_session');
}
