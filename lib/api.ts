import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://lumina.viberyte.com';

// Get user_id from storage
async function getUserId(): Promise<number | null> {
  try {
    const userId = await AsyncStorage.getItem('@lumina_user_id');
    return userId ? Number(userId) : null;
  } catch {
    return null;
  }
}

// Generic fetch with user context
async function fetchWithUser<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const userId = await getUserId();
  let url = `${API_BASE}${endpoint}`;
  
  // Add user_id to query params for GET requests
  if (userId && (!options.method || options.method === 'GET')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}user_id=${userId}`;
  }
  
  // Auto-inject user_id into POST body
  if (userId && options.method === 'POST' && options.body) {
    try {
      const body = JSON.parse(options.body as string);
      if (!body.user_id) {
        options.body = JSON.stringify({ user_id: userId, ...body });
      }
    } catch {}
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

// ============ VENUE APIs ============

export async function getVenue(venueId: number | string) {
  return fetchWithUser(`/api/venues/${venueId}`);
}

export async function getExplore(city?: string) {
  const params = city ? `?city=${encodeURIComponent(city)}` : '';
  return fetchWithUser(`/api/explore${params}`);
}

export async function searchVenues(query: string, city?: string) {
  const params = new URLSearchParams({ q: query });
  if (city) params.append('city', city);
  return fetchWithUser(`/api/search?${params}`);
}

// ============ BEHAVIOR TRACKING ============
// Context can be specific like 'explore_lounges' or general like 'detail'

export async function trackBehavior(
  venueId: number,
  action: 'view' | 'save' | 'unsave' | 'share' | 'directions' | 'call' | 'skip' | 'book',
  context?: string
) {
  const userId = await getUserId();
  if (!userId) return null;
  
  try {
    return fetchWithUser('/api/behavior', {
      method: 'POST',
      body: JSON.stringify({ venue_id: venueId, action, context }),
    });
  } catch (error) {
    console.error('Failed to track behavior:', error);
    return null;
  }
}

// ============ USER APIs ============

export async function getProfile() {
  const userId = await getUserId();
  if (!userId) return null;
  return fetchWithUser('/api/onboarding');
}

export async function updateProfile(updates: Record<string, any>) {
  return fetchWithUser('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

// ============ FAVORITES ============

export async function saveFavorite(venueId: number) {
  await trackBehavior(venueId, 'save', 'detail');
}

export async function removeFavorite(venueId: number) {
  await trackBehavior(venueId, 'unsave', 'detail');
}

// ============ EXPORTS ============

export const api = {
  getVenue,
  getExplore,
  searchVenues,
  trackBehavior,
  getProfile,
  updateProfile,
  saveFavorite,
  removeFavorite,
  getUserId,
};

export default api;
