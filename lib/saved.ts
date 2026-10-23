// lib/saved.ts — Viberyte Saved V1: one place for saved venues.
// Device list (@lumina_favorites) is the source of truth, so every heart works for every user,
// including guests and Apple/Google sign-ins. Signed-in numeric accounts also sync to /api/favorites.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getPhotoUrl } from '../utils/photoHelper';

const KEY = '@lumina_favorites';
const API = 'https://viberyte.com';

export interface SavedVenue {
  id: string;
  name: string;
  neighborhood?: string;
  city?: string;
  category?: string;
  photo?: string;
  savedAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
export function onSavedChange(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; }
const emit = () => listeners.forEach(fn => { try { fn(); } catch {} });

async function resolveUid(): Promise<number | null> {
  // Same rule the app always used (parseInt), plus fallbacks to the stored user/profile.
  const num = (x: any) => { const n = parseInt(String(x ?? '').replace(/"/g, ''), 10); return Number.isFinite(n) && n > 0 ? n : null; };
  try {
    const raw = await AsyncStorage.getItem('@lumina_user_id');
    const a = num(raw); if (a) return a;
    for (const k of ['@lumina_user', '@lumina_profile']) {
      try {
        const o = JSON.parse((await AsyncStorage.getItem(k)) || 'null');
        const b = num(o?.user_id) || num(o?.userId) || num(o?.id); if (b) return b;
      } catch {}
    }
  } catch {}
  return null;
}
const numericUserId = resolveUid;

function snapshot(v: any, savedAt?: string): SavedVenue | null {
  const id = v?.id ?? v?.venue_id ?? v?.item_id;
  if (id === undefined || id === null || !v?.name) return null;
  let photo: string | undefined;
  try { photo = getPhotoUrl(v) || undefined; } catch {}
  if (!photo && typeof v.photo === 'string') photo = v.photo;
  if (!photo && typeof v.professional_photo_url === 'string') photo = v.professional_photo_url;
  return {
    id: String(id),
    name: String(v.name),
    neighborhood: v.neighborhood || undefined,
    city: v.city || undefined,
    category: v.standardized_category || v.category || v.cuisine_primary || undefined,
    photo,
    savedAt: savedAt || v.savedAt || new Date().toISOString(),
  };
}

async function readLocal(): Promise<SavedVenue[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map((v: any) => snapshot(v, v?.savedAt)).filter(Boolean) as SavedVenue[];
  } catch { return []; }
}

async function writeLocal(list: SavedVenue[]) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  emit();
}

export async function getSavedLocal(): Promise<SavedVenue[]> { return readLocal(); }

export async function isSaved(id: string | number): Promise<boolean> {
  const list = await readLocal();
  return list.some(v => v.id === String(id));
}

export async function saveVenue(venue: any): Promise<boolean> {
  const snap = snapshot(venue);
  if (!snap) return false;
  const list = await readLocal();
  if (!list.some(v => v.id === snap.id)) { await writeLocal([snap, ...list]); nudgeGuest(list.length + 1); }
  const uid = await numericUserId();
  if (uid && /^\d+$/.test(snap.id)) {
    fetch(`${API}/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, itemType: 'venue', itemId: parseInt(snap.id, 10) }),
    }).catch(() => {});
  }
  return true;
}

export async function unsaveVenue(id: string | number): Promise<void> {
  const sid = String(id);
  const list = await readLocal();
  await writeLocal(list.filter(v => v.id !== sid));
  const uid = await numericUserId();
  if (uid && /^\d+$/.test(sid)) {
    const p = new URLSearchParams({ userId: String(uid), itemType: 'venue', itemId: sid });
    fetch(`${API}/api/favorites?${p}`, { method: 'DELETE' }).catch(() => {});
  }
}

// Full list: device saves + anything saved to the account on another device (merged once into the device list).
export async function getSaved(): Promise<SavedVenue[]> {
  const local = await readLocal();
  const uid = await numericUserId();
  if (!uid) return local;
  try {
    const res = await fetch(`${API}/api/favorites?userId=${uid}&type=venue`);
    const data = await res.json();
    const have = new Set(local.map(v => v.id));
    const extra: SavedVenue[] = [];
    for (const it of (data?.saved || [])) {
      const d = it?.details || it?.venue || {};
      const vid = it?.item_id ?? it?.itemId ?? d?.id;
      if (vid === undefined || vid === null || have.has(String(vid))) continue;
      const snap = snapshot({ ...d, id: vid, name: d?.name || it?.name }, it?.created_at || it?.saved_at);
      if (snap) { extra.push(snap); have.add(snap.id); }
    }
    if (extra.length) {
      const merged = [...local, ...extra].sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
      await writeLocal(merged);
      return merged;
    }
  } catch {}
  return local;
}

export async function savedCount(): Promise<number> { return (await readLocal()).length; }

// Drop-in replacements for the old api.saveFavorite / api.removeFavorite calls (same "result object" shape).
export async function saveFavoriteCompat(venue: any): Promise<any> {
  const ok = await saveVenue(venue);
  return ok ? { success: true } : { success: false, error: 'invalid_venue' };
}
export async function removeFavoriteCompat(id: string | number): Promise<any> {
  await unsaveVenue(id);
  return { success: true };
}

// VBR_NUDGE: one gentle prompt when a guest reaches 3 saves
async function nudgeGuest(count: number) {
  try {
    if (count !== 3) return;
    const [token, guest, seen] = await Promise.all([
      AsyncStorage.getItem('@lumina_auth_token'), AsyncStorage.getItem('@lumina_is_guest'), AsyncStorage.getItem('@vbr_save_nudge'),
    ]);
    const isGuest = !token || token === 'guest_token' || guest === 'true';
    if (!isGuest || seen) return;
    await AsyncStorage.setItem('@vbr_save_nudge', '1');
    setTimeout(() => Alert.alert('Keep your spots everywhere', 'Create a profile so your saved spots follow you to any device.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Create profile', onPress: () => router.push('/login' as any) },
    ]), 400);
  } catch {}
}
