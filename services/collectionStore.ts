// VIBERYTE_PLACES_V2: hands the exact collection a user saw on Home to the Places screen.
// In-memory only; if the app restarted, Places falls back to a labeled city query.
const store = new Map<string, any[]>();
export const putCollection = (key: string, venues: any[]) => { store.set(key, (venues || []).slice(0, 100)); };
export const getCollection = (key: string): any[] | undefined => store.get(key);
