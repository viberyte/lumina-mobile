// VBR_NOTES_V1: Insider Notes API. Uses the same Sign in with Apple session as "What's the Vibe?".
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';
import { getSession } from './vibe';

export type Note = { id: number; kind: string; label: string; text: string; by: string; author: string; when: string; useful: number; usefulByMe: boolean; mine: boolean; avatar?: string | null; initials?: string | null }; // VBR_PROFILE_V1
export type Question = { kind: string; label: string; q: string; chips: string[] };
export type NotesData = { venue: { id: number; name: string; group: string }; questions: Question[]; notes: Note[]; total: number; me: { handle: string | null; avatar?: string | null; initials?: string } | null };
export type Preview = { outcome: 'post' | 'fixable' | 'private' | 'blocked'; kind: string; label: string; text: string; notice: string; draft?: string; message?: string };

async function call(path: string, init: RequestInit = {}, token?: string) {
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(d.error === 'handle' ? 'Choose a name to post publicly.' : d.error || 'Something went wrong. Please try again.');
  return d;
}

export async function loadNotes(venueId: number | string): Promise<NotesData | null> {
  const s = await getSession();
  try { return await call(`/api/venues/${venueId}/notes`, {}, s?.token); } catch { return null; }
}
export const previewNote = (token: string, venueId: number | string, text: string, q?: Question | null): Promise<Preview> =>
  call(`/api/venues/${venueId}/notes/preview`, { method: 'POST', body: JSON.stringify({ text, kind: q?.kind, question: q?.q }) }, token);
export const postNote = (token: string, venueId: number | string, draft: string, pub: boolean) =>
  call(`/api/venues/${venueId}/notes`, { method: 'POST', body: JSON.stringify({ draft, public: pub }) }, token);
export const sendFeedback = (token: string, venueId: number | string, text: string) =>
  call(`/api/venues/${venueId}/feedback`, { method: 'POST', body: JSON.stringify({ text }) }, token);
export const toggleUseful = (token: string, id: number): Promise<{ useful: number; on: boolean }> =>
  call(`/api/notes/${id}/useful`, { method: 'POST', body: '{}' }, token);
export const reportNote = (token: string, id: number, reason: string) =>
  call(`/api/notes/${id}/report`, { method: 'POST', body: JSON.stringify({ reason }) }, token);
export const deleteNote = (token: string, id: number) => call(`/api/notes/${id}`, { method: 'DELETE' }, token);
// VBR_PROFILE_V3: your own notes + switch a note between your @name and "A Viberyte guest".
export type MyNote = { id: number; venueId: number; venue: string; photo: string | null; area: string | null; kind: string; label: string; text: string; public: boolean; review: boolean; useful: number; when: string };
export const myNotes = (token: string): Promise<{ notes: MyNote[]; helped: number }> => call('/api/vibe/me/notes', {}, token);
export const setNotePublic = (token: string, id: number, pub: boolean) => call(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ public: pub }) }, token);

// "Hide notes from this person" — kept on this device.
const HIDE = '@vbr_hidden_authors';
export async function hiddenAuthors(): Promise<string[]> { try { return JSON.parse((await AsyncStorage.getItem(HIDE)) || '[]'); } catch { return []; } }
export async function hideAuthor(a: string) { const l = await hiddenAuthors(); if (!l.includes(a)) l.push(a); try { await AsyncStorage.setItem(HIDE, JSON.stringify(l)); } catch {} }
