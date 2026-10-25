// VBR_VIBE + VBR_PROFILE_V1: your one Viberyte account (Sign in with Apple), shared by Settings, Profile,
// What's the Vibe and Insider Notes. Signing in anywhere signs you in everywhere.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { API_BASE } from '../config';

const KEY = '@vbr_vibe_session';
export type VibeAccount = { id: string; handle: string | null; display_name: string | null; avatar?: string | null; initials?: string; email?: string | null; notes?: number }; // VBR_PROFILE_V3
type Session = { token: string; account: VibeAccount };

export const fullUrl = (u?: string | null) => (u ? (/^https?:/.test(u) ? u : `${API_BASE}${u}`) : null);

export async function getSession(): Promise<Session | null> {
  try { const s = await AsyncStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
async function saveSession(s: Session) { try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export async function clearSession() { try { await AsyncStorage.removeItem(KEY); } catch {} }

// Exchange an Apple identity token for a Viberyte session (used by the main Sign in with Apple too).
export async function linkApple(identityToken: string | null | undefined, fullName: string): Promise<Session | null> {
  if (!identityToken) return null;
  const r = await fetch(`${API_BASE}/api/vibe/auth/apple`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identityToken, fullName }) });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(d.error || 'Could not sign in.');
  const s = { token: d.token, account: d.account };
  await saveSession(s);
  refreshMe().catch(() => {});
  return s;
}

// If someone signs in from a note, they're signed in to the app too (Settings stops asking).
async function mirrorAppLogin(cred: AppleAuthentication.AppleAuthenticationCredential) {
  try {
    const token = await AsyncStorage.getItem('@lumina_auth_token');
    const guest = await AsyncStorage.getItem('@lumina_is_guest');
    if (token && token !== 'guest_token' && guest !== 'true') return; // already signed in
    let name = cred.fullName?.givenName || '';
    if (name) await AsyncStorage.setItem(`@apple_name_${cred.user}`, name);
    else name = (await AsyncStorage.getItem(`@apple_name_${cred.user}`)) || 'Friend';
    const user = { id: `apple_${cred.user}`, email: cred.email || `${cred.user}@privaterelay.appleid.com`, name, provider: 'apple', role: 'member', createdAt: new Date().toISOString(),
      profileData: { fullName: [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ') || name } };
    const prev = JSON.parse((await AsyncStorage.getItem('@lumina_profile')) || '{}');
    await AsyncStorage.multiSet([
      ['@lumina_user', JSON.stringify(user)], ['@lumina_auth_token', cred.identityToken || `apple_${Date.now()}`], ['@lumina_user_id', user.id],
      ['@lumina_is_guest', 'false'], ['@lumina_user_role', 'member'],
      ['@lumina_profile', JSON.stringify({ ...prev, id: user.id, name: user.name, email: user.email, provider: 'apple', role: prev.role || 'member' })],
    ]);
  } catch {}
}

// Returns a session, asking for Sign in with Apple only the first time.
export async function ensureSession(): Promise<Session | null> {
  const have = await getSession();
  if (have) {
    const r = await fetch(`${API_BASE}/api/vibe/me`, { headers: { Authorization: `Bearer ${have.token}` } }).catch(() => null);
    if (r && r.ok) { const d = await r.json(); const s = { token: have.token, account: d.account }; await saveSession(s); return s; }
    if (r && r.status !== 401) return have; // offline or server hiccup: keep going
  }
  const ok = await AppleAuthentication.isAvailableAsync().catch(() => false);
  if (!ok) throw new Error('Sign in with Apple isn’t available on this device.');
  const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
  const fullName = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
  const s = await linkApple(cred.identityToken, fullName);
  await mirrorAppLogin(cred);
  return s;
}

// VBR_ADOPT_SESSION: already have a Viberyte account (e.g. signed in from a note) but the app says "Sign In"?
// Sign the app in with that same account. Returns true if it changed anything.
export async function adoptSessionAsLogin(): Promise<boolean> {
  try {
    const s = await getSession(); if (!s) return false;
    const token = await AsyncStorage.getItem('@lumina_auth_token');
    const guest = await AsyncStorage.getItem('@lumina_is_guest');
    if (token && token !== 'guest_token' && guest !== 'true') return false;
    const a = s.account;
    const name = a.display_name || 'Viberyte Member';
    const user = { id: `vbr_${a.id}`, email: '', name, provider: 'apple', role: 'member', createdAt: new Date().toISOString() };
    const prev = JSON.parse((await AsyncStorage.getItem('@lumina_profile')) || '{}');
    await AsyncStorage.multiSet([
      ['@lumina_user', JSON.stringify(user)], ['@lumina_auth_token', s.token], ['@lumina_user_id', user.id],
      ['@lumina_is_guest', 'false'], ['@lumina_user_role', 'member'],
      ['@lumina_profile', JSON.stringify({ ...prev, id: user.id, name, provider: 'apple', role: prev.role || 'member' })],
    ]);
    return true;
  } catch { return false; }
}

export async function refreshMe(): Promise<VibeAccount | null> {
  const s = await getSession(); if (!s) return null;
  const r = await fetch(`${API_BASE}/api/vibe/me`, { headers: { Authorization: `Bearer ${s.token}` } }).catch(() => null);
  if (!r) return s.account;
  if (r.status === 401) { await clearSession(); return null; }
  const d = await r.json().catch(() => ({}));
  if (d.ok) { await saveSession({ ...s, account: d.account }); return d.account; }
  return s.account;
}

async function patchMe(token: string, body: object) {
  const r = await fetch(`${API_BASE}/api/vibe/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(d.error || 'Could not save that.');
  const s = await getSession(); if (s) await saveSession({ ...s, account: d.account });
  return d.account as VibeAccount;
}
export const setHandle = (token: string, handle: string) => patchMe(token, { handle });
export async function setDisplayName(token: string, display_name: string) {
  const a = await patchMe(token, { display_name });
  try { const p = JSON.parse((await AsyncStorage.getItem('@lumina_profile')) || '{}'); await AsyncStorage.setItem('@lumina_profile', JSON.stringify({ ...p, name: a.display_name })); } catch {}
  return a;
}
export async function uploadAvatar(token: string, base64: string) {
  const r = await fetch(`${API_BASE}/api/vibe/me/avatar`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ image: base64 }) });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(d.error || 'Couldn’t upload that photo.');
  const s = await getSession(); if (s) await saveSession({ ...s, account: d.account });
  return d.account as VibeAccount;
}
export async function removeAvatar(token: string) {
  const r = await fetch(`${API_BASE}/api/vibe/me/avatar`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error('Couldn’t remove it.');
  const s = await getSession(); if (s) await saveSession({ ...s, account: d.account });
  return d.account as VibeAccount;
}

export async function loadVibe(venueId: number | string) {
  const s = await getSession();
  const r = await fetch(`${API_BASE}/api/venues/${venueId}/vibe`, { headers: s ? { Authorization: `Bearer ${s.token}` } : {} });
  const d = await r.json();
  return d?.ok ? d : null;
}

export async function postVibe(token: string, venueId: number | string, body: any) {
  const r = await fetch(`${API_BASE}/api/venues/${venueId}/vibe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(d.error === 'handle' ? 'Pick a name to post publicly.' : d.error || 'Could not share your vibe.');
}

export async function deleteVibe(token: string, venueId: number | string) {
  const r = await fetch(`${API_BASE}/api/venues/${venueId}/vibe`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error('Could not remove your take.');
}

// VBR_VIBE_V3: post a take and get the payoff ("You're the 4th person this week…").
export async function shareVibe(token: string, venueId: number | string, body: any) {
  const r = await fetch(`${API_BASE}/api/venues/${venueId}/vibe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(d.error === 'handle' ? 'Choose a name to post publicly.' : d.error || 'Couldn’t share your vibe.');
  return d as { ok: true; echo: { key: string; emoji: string; label: string; n: number } | null };
}
