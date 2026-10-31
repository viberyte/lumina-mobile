// lib/plans.ts — Make a Plan (mobile): storage keys, types, API helpers. Same server as the web (viberyte.com/api/go).
import AsyncStorage from '@react-native-async-storage/async-storage';
export const API = 'https://viberyte.com';
export const KEY = '@vbr_going_v1', NAME_KEY = '@vbr_name', PLANS = '@vbr_plans_v1', SEEN = '@vbr_plans_seen_v1', TOKEN_KEY = '@vbr_push_token', INKEY = '@vbr_in_v1';
export type Item = { slug: string; name: string; sub?: string | null; href: string; image?: string | null; at: number };
export type MyPlan = { id: string; headline: string; at: number; owner_key?: string; from_name?: string | null; role?: 'in' };
export type Stop = { slug: string; name: string; sub: string | null; href: string; image: string | null; time: string | null };
export type In = { name: string; at: string; status: 'in' | 'out' };
export type PlanData = { id: string; headline: string; from_name: string | null; who: string; when_label: string; note: string | null; stops: Stop[]; first_image: string | null; ins: In[]; line: string; url: string; owner?: boolean };
export const readJ = async <T,>(k: string, d: T): Promise<T> => { try { const v = JSON.parse((await AsyncStorage.getItem(k)) || ''); return (v ?? d) as T; } catch { return d; } };
export const writeJ = (k: string, v: any) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
export const ownerKeyFor = async (id: string) => (await readJ<MyPlan[]>(PLANS, [])).find((p) => p.id === id)?.owner_key || '';
export async function fetchPlan(id: string): Promise<{ status: number; data: any }> {
  const k = await ownerKeyFor(id);
  try { const r = await fetch(`${API}/api/go/${id}`, { headers: k ? { 'x-owner-key': k } : {} }); return { status: r.status, data: await r.json().catch(() => ({})) }; } catch { return { status: 0, data: {} }; }
}
export const inLine = (ins: In[], me: string) => {
  const n = ins.filter((i) => i.status === 'in').map((i) => (me && i.name.toLowerCase() === me.toLowerCase() ? 'you' : i.name));
  if (!n.length) return ''; if (n.length === 1) return n[0] === 'you' ? 'You’re in.' : `${n[0]} is in.`;
  const last = n.pop()!; const out = `${n.join(', ')} and ${last} are in.`; return out.charAt(0).toUpperCase() + out.slice(1);
};
