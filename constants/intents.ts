// VIBERYTE_PLACES_V2: shared intent pills, copy and display helpers (Home + Places).
export type LocStatus = 'pending' | 'granted' | 'denied' | 'unavailable';
export type IntentDef = { label: string; icon?: string; queries: Record<string, string>[]; requiresLocation?: boolean };

// Each pill maps to verified /api/venues queries; multiple queries are merged and de-duplicated.
export const INTENT_MAP: Record<string, IntentDef> = {
  nearMe: { label: 'Near Me', icon: 'navigate-outline', queries: [{}], requiresLocation: true },
  dateNight: { label: 'Date Night', queries: [{ filter: 'date-night' }] },
  dinner: { label: 'Dinner', queries: [{ category: 'restaurant' }] },
  drinks: { label: 'Drinks', queries: [{ category: 'bar' }, { category: 'lounge' }] },
  nightlife: { label: 'Nightlife', queries: [{ category: 'club' }, { category: 'live_music' }] },
  brunch: { label: 'Brunch', queries: [{ filter: 'brunch' }] },
  surprise: { label: 'Surprise Me', icon: 'shuffle-outline', queries: [{}] },
};

// Near Me first; daypart orders the rest. Order only, nothing hidden by time.
export const intentOrder = (h: number): string[] => {
  if (h >= 5 && h < 14) return ['nearMe', 'brunch', 'dinner', 'drinks', 'dateNight', 'nightlife', 'surprise'];
  if (h >= 14 && h < 18) return ['nearMe', 'dinner', 'drinks', 'dateNight', 'brunch', 'nightlife', 'surprise'];
  return ['nearMe', 'dinner', 'drinks', 'nightlife', 'dateNight', 'surprise', 'brunch'];
};

// Expressive headers. "dressy" is used only when the results actually carry dress-up signals.
const INTENT_COPY: Record<string, { headline: string; dressy?: string }> = {
  nearMe: { headline: 'Around you' },
  dateNight: { headline: 'Make tonight a date', dressy: 'Somewhere worth dressing up for' },
  dinner: { headline: 'A dinner worth going out for', dressy: 'Somewhere worth dressing up for' },
  drinks: { headline: "Where tonight's first round should be" },
  nightlife: { headline: 'Where the night actually happens' },
  brunch: { headline: 'Brunch worth getting up for' },
  surprise: { headline: 'Somewhere new to try' },
};
const DRESSY = new Set(['Upscale', 'Elegant', 'Luxurious', 'Sophisticated']);
export const intentHeadline = (key: string | null, list: any[]): string => {
  const c = key ? INTENT_COPY[key] : undefined;
  if (c === undefined) return 'Results';
  if (c.dressy) {
    const n = list.filter((v: any) => (v?.highlights || []).some((h: string) => DRESSY.has(h))).length;
    if (n >= 3) return c.dressy;
  }
  return c.headline;
};

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
export const homeDayCopy = (d: Date) => {
  const h = d.getHours();
  const day = DAYS[d.getDay()];
  if (h >= 5 && h < 11) return { eyebrow: `${day} MORNING`, headline: 'Start the day right.', subline: 'Brunch, coffee, or somewhere new to wander.' };
  if (h >= 11 && h < 17) return { eyebrow: `${day} AFTERNOON`, headline: 'Plan something worth leaving for.', subline: 'A long lunch, early drinks, or a plan for tonight.' };
  if (h >= 17 && h < 22) return { eyebrow: `${day} EVENING`, headline: 'Your night starts here.', subline: 'A great dinner, a cocktail spot, or something unexpected?' };
  return { eyebrow: `${day} NIGHT`, headline: "The night's still going.", subline: 'Late kitchens, live music, and dance floors.' };
};

// Reason it fits: confirmed attribute labels from the server (include=highlights). Empty when none.
export const reasonLine = (v: any, n: number = 2): string => ((v?.highlights || []) as string[]).slice(0, n).join(' · ');

export const fmtNum = (d: number) => (d < 10 ? d.toFixed(1) : String(Math.round(d)));
export const fmtDistance = (d: number) => `${fmtNum(d)} mi`;
export const distanceRange = (list: any[]): string | undefined => {
  const ds = list.map((v: any) => v?.distance_mi).filter((d: any) => typeof d === 'number') as number[];
  if (ds.length === 0) return undefined;
  const lo = Math.min(...ds);
  const hi = Math.max(...ds);
  return lo === hi ? `Closest first · ${fmtDistance(lo)}` : `Closest first · ${fmtNum(lo)}–${fmtDistance(hi)}`;
};
export const venueMeta = (v: any): string => {
  const cat = String(v?.standardized_category || v?.category || '').replace(/^\w/, (c: string) => c.toUpperCase());
  return [v?.neighborhood, cat, typeof v?.distance_mi === 'number' ? fmtDistance(v.distance_mi) : null]
    .filter(Boolean)
    .join(' · ');
};
// Review-weighted rating: a 5.0 with 3 reviews should not outrank a 4.6 with 900
export const qualityScore = (v: any) => {
  const r = Number(v?.google_rating) || 0;
  const n = Number(v?.google_review_count) || 0;
  return (r * n + 4.2 * 50) / (n + 50);
};
