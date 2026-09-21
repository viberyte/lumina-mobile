import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://viberyte.com';

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  date: string | null;
  is_tonight: boolean;
  is_public: boolean;
  share_code: string | null;
  planning_for: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  item_count?: number;
  venue_photos?: string[];
}

export interface PlanItem {
  id: string;
  plan_id: string;
  user_id: string;
  venue_id: number;
  venue_name: string;
  venue_photo: string | null;
  venue_category: string | null;
  venue_neighborhood: string | null;
  venue_rating: number | null;
  notes: string | null;
  position: number;
  created_at: string;
}

async function getUserId(): Promise<string> {
  const id = await AsyncStorage.getItem('@lumina_user_id');
  if (!id) throw new Error('Not authenticated');
  return id;
}

async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem('@lumina_auth_token');
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function getPlans(): Promise<Plan[]> {
  try {
    const userId = await getUserId();
    const data = await apiFetch(`/api/plans?user_id=${userId}`);
    return data.plans || [];
  } catch (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }
}

export async function createPlan(input: { name: string; emoji?: string; date?: string | null }): Promise<Plan> {
  const userId = await getUserId();
  const data = await apiFetch('/api/plans', {
    method: 'POST',
    body: JSON.stringify({ ...input, user_id: userId }),
  });
  return data.plan || data;
}

export async function updatePlan(planId: string, updates: Partial<Plan>): Promise<Plan> {
  const data = await apiFetch(`/api/plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data.plan;
}

export async function deletePlan(planId: string): Promise<void> {
  await apiFetch(`/api/plans/${planId}`, { method: 'DELETE' });
}

export async function getPlanItems(planId: string): Promise<PlanItem[]> {
  const data = await apiFetch(`/api/plans/${planId}`);
  return data.plan?.items || [];
}

export async function getPlan(planId: string): Promise<Plan & { items: PlanItem[] }> {
  const data = await apiFetch(`/api/plans/${planId}`);
  return data.plan;
}

export async function removeVenueFromPlan(planId: string, itemId: string): Promise<void> {
  await apiFetch(`/api/plans/${planId}/items/${itemId}`, { method: 'DELETE' });
}

export async function sharePlan(planId: string): Promise<{ share_url: string }> {
  return { share_url: `https://viberyte.com/plan/${planId}` };
}

export async function addVenueToPlan(planId: string, venue: any): Promise<PlanItem> {
  const userId = await getUserId();
  const data = await apiFetch(`/api/plans/${planId}/items`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      venue_id: venue.id,
      venue_name: venue.name,
      venue_photo: venue.professional_photo_url || venue.image_url || null,
      venue_category: venue.category || null,
      venue_neighborhood: venue.neighborhood || null,
    }),
  });
  return data.item;
}
