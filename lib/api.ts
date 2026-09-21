import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://viberyte.com';

// Get user_id from storage
async function getUserId(): Promise<number | null> {
  try {
    const userId = await AsyncStorage.getItem('@lumina_user_id');
    if (!userId) return null;
    const n = parseInt(String(userId), 10);
    return Number.isNaN(n) ? null : n;
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
  const userId = await getUserId();
  console.log('SAVE_DEBUG userId=', userId, 'venueId=', venueId);
  if (!userId) return { success: false, error: 'not_logged_in' };
  // fire-and-forget analytics
  trackBehavior(venueId, 'save', 'detail').catch(() => {});
  const res = await fetch(`${API_BASE}/api/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: parseInt(String(userId),10), itemType: 'venue', itemId: parseInt(String(venueId),10) }),
  });
  return res.json();
}

export async function removeFavorite(venueId: number) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'not_logged_in' };
  trackBehavior(venueId, 'unsave', 'detail').catch(() => {});
  const params = new URLSearchParams({
    userId: String(userId),
    itemType: 'venue',
    itemId: String(venueId),
  });
  const res = await fetch(`${API_BASE}/api/favorites?${params}`, { method: 'DELETE' });
  return res.json();
}

export async function isVenueSaved(venueId: number): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  try {
    const res = await fetch(`${API_BASE}/api/favorites?userId=${userId}&type=venue`);
    const data = await res.json();
    return (data.saved || []).some((it: any) => Number(it.item_id) === Number(venueId));
  } catch {
    return false;
  }
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
  isVenueSaved,
  getUserId,
};

export default api;
