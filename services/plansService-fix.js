const fs = require('fs');
const path = '/Users/mrwest/Desktop/lumina-mobile/services/plansService.ts';

let content = fs.readFileSync(path, 'utf8');

// Find and replace the addEventToPlan function
const oldFunction = `export async function addEventToPlan(
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
      venue_name: event.title,
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

  if (error) throw error;
  return data;
}`;

const newFunction = `export async function addEventToPlan(
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
      item_type: 'event',  // Mark as event type
    })
    .select()
    .single();

  if (error) {
    console.error('[addEventToPlan] Insert error:', error);
    throw error;
  }
  return data;
}`;

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  fs.writeFileSync(path, content);
  console.log('✅ Fixed addEventToPlan with null safety!');
} else {
  console.log('⚠️ Could not find exact function match. Let me try a different approach...');
  
  // Try regex replacement
  const regex = /export async function addEventToPlan\([^)]+\):[^{]+\{[\s\S]*?if \(error\) throw error;\s*return data;\s*\}/;
  
  if (regex.test(content)) {
    content = content.replace(regex, newFunction);
    fs.writeFileSync(path, content);
    console.log('✅ Fixed addEventToPlan with regex match!');
  } else {
    console.log('❌ Could not match function. Please check manually.');
  }
}
