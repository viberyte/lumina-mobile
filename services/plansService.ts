import { supabase } from './supabase';
import AuthService from './auth';

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
  venue_price_range: string | null;
  sort_order: number;
  notes: string | null;
  arrival_time: string | null;
  origin: 'user' | 'ai';
  created_at: string;
}

function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getUserId(): Promise<string> {
  const user = await AuthService.getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function getPlans(): Promise<Plan[]> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }

  const plansWithDetails = await Promise.all((data || []).map(async (plan) => {
    const { data: items } = await supabase
      .from('plan_items')
      .select('venue_photo')
      .eq('plan_id', plan.id)
      .order('sort_order', { ascending: true });

    return {
      ...plan,
      item_count: items?.length || 0,
      venue_photos: items?.filter(i => i.venue_photo).slice(0, 4).map(i => i.venue_photo) || [],
    };
  }));

  return plansWithDetails;
}

export async function getPlan(planId: string): Promise<Plan & { items: PlanItem[] }> {
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  const { data: items, error: itemsError } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true });

  if (itemsError) throw itemsError;

  return { 
    ...plan, 
    items: items || [],
    item_count: items?.length || 0,
  };
}

export async function createPlan(input: {
  name: string;
  emoji?: string;
  date?: string;
  planning_for?: string;
}): Promise<Plan> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      name: input.name,
      emoji: input.emoji || '✨',
      date: input.date || null,
      planning_for: input.planning_for || 'myself',
      is_tonight: false,
      is_public: false,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, item_count: 0, venue_photos: [] };
}

export async function updatePlan(planId: string, updates: Partial<Plan>): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlan(planId: string): Promise<void> {
  await supabase.from('plan_items').delete().eq('plan_id', planId);
  const { error } = await supabase.from('plans').delete().eq('id', planId);
  if (error) throw error;
}

export async function addVenueToPlan(
  planId: string,
  venue: {
    id: number;
    name: string;
    photo?: string;
    category?: string;
    neighborhood?: string;
    rating?: number;
    price_range?: string;
  },
  origin: 'user' | 'ai' = 'user'
): Promise<PlanItem> {
  const userId = await getUserId();

  const { data: existing } = await supabase
    .from('plan_items')
    .select('sort_order')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      plan_id: planId,
      user_id: userId,
      venue_id: venue.id,
      venue_name: venue.name,
      venue_photo: venue.photo || venue.heroImage || venue.image_url || null,
      venue_category: venue.category || null,
      venue_neighborhood: venue.neighborhood || null,
      venue_rating: venue.rating || null,
      venue_price_range: venue.price_range || null,
      sort_order: nextOrder,
      origin,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addEventToPlan(
  planId: string,
  event: {
    id: number;
    title: string;
    image?: string;
    genre?: string;
    venue_name?: string;
    date?: string;
  },
  origin: 'user' | 'ai' = 'user'
): Promise<PlanItem> {
  const userId = await getUserId();

  // Ensure we have a valid name - use title, fallback to venue_name, then generic
  const itemName = event.title || event.venue_name || 'Untitled Event';
  
  console.log('[addEventToPlan] Adding event:', { 
    id: event.id, 
    title: event.title, 
    venue_name: event.venue_name,
    resolvedName: itemName 
  });

  const { data: existing } = await supabase
    .from('plan_items')
    .select('sort_order')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      plan_id: planId,
      user_id: userId,
      venue_id: event.id,
      venue_name: itemName,  // Now guaranteed non-null
      venue_photo: event.image || null,
      venue_category: event.genre || 'Event',
      venue_neighborhood: event.venue_name || null,
      venue_rating: null,
      venue_price_range: null,
      sort_order: nextOrder,
      origin,

    })
    .select()
    .single();

  if (error) {
    console.error('[addEventToPlan] Insert error:', error);
    throw error;
  }
  return data;
}

export async function removeVenueFromPlan(itemId: string): Promise<void> {
  const { error } = await supabase.from('plan_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function reorderPlanItems(planId: string, itemIds: string[]): Promise<void> {
  for (let i = 0; i < itemIds.length; i++) {
    await supabase.from('plan_items').update({ sort_order: i }).eq('id', itemIds[i]);
  }
}

export async function sharePlan(planId: string): Promise<string> {
  const { data: plan } = await supabase
    .from('plans')
    .select('share_code')
    .eq('id', planId)
    .single();

  let shareCode = plan?.share_code;

  if (!shareCode) {
    shareCode = generateShareCode();
    await supabase
      .from('plans')
      .update({ share_code: shareCode, is_public: true, updated_at: new Date().toISOString() })
      .eq('id', planId);
  } else {
    await supabase.from('plans').update({ is_public: true }).eq('id', planId);
  }

  return `https://lumina.viberyte.com/plan/${shareCode}`;
}

export async function getOrCreateTonightPlan(): Promise<Plan> {
  const userId = await getUserId();

  const { data: existing } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_tonight', true)
    .is('archived_at', null)
    .single();

  if (existing) return existing;

  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      name: 'Tonight',
      emoji: '🌙',
      date: today,
      is_tonight: true,
      planning_for: 'myself',
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, item_count: 0, venue_photos: [] };
}

export async function addVenueToTonight(venue: {
  id: number;
  name: string;
  photo?: string;
  category?: string;
  neighborhood?: string;
  rating?: number;
  price_range?: string;
}): Promise<PlanItem> {
  const tonightPlan = await getOrCreateTonightPlan();
  return addVenueToPlan(tonightPlan.id, venue, 'user');
}

export async function addEventToTonight(event: {
  id: number;
  title: string;
  image?: string;
  genre?: string;
  venue_name?: string;
  date?: string;
}): Promise<PlanItem> {
  const tonightPlan = await getOrCreateTonightPlan();
  return addEventToPlan(tonightPlan.id, event, 'user');
}
