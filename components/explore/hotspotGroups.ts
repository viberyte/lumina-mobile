// components/explore/hotspotGroups.ts — VBR_HOTSPOTS_V2: pure logic (grouping + copy) for the hotspot layer. No React.
export type HotspotEvent = {
  id: number; title: string; venue_id: number; venue_name: string; lat: number; lng: number;
  start: string; start_label: string; image_url: string | null; ticket_url: string | null; genre: string | null;
  status: 'later' | 'soon' | 'on' | 'upcoming';
};
export type Hotspot = {
  id: string; night: string; lat: number; lng: number; radius_m: number; area: string; count: number; venues: number;
  first_start: string; last_start: string; label: string; sublabel: string; status: 'later' | 'soon' | 'on' | 'upcoming';
  events: HotspotEvent[];
};
/** One area on the map: one or more nights of hotspots that sit on top of each other. */
export type HotspotGroup = {
  key: string; lat: number; lng: number; radius: number; area: string; count: number; venues: number;
  items: Hotspot[]; tonight: string;
};

export const distM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const k = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * k) / 2) ** 2 + Math.cos(a.lat * k) * Math.cos(b.lat * k) * Math.sin(((b.lng - a.lng) * k) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
};
export const dayShort = (night: string) => new Date(night + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
export const dayLong = (night: string) => new Date(night + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
// Events arrive sorted by real start (after-midnight counted as late), so the first is the earliest.
export const startOf = (h: Hotspot) => h.events[0]?.start_label || '';

/** Merge hotspots whose glows overlap (same area, different nights) so the map shows one marker per area. */
export function groupHotspots(list: Hotspot[], tonight: string): HotspotGroup[] {
  // Same area on different nights → one label (each night keeps its own true circle; see HotspotOverlays).
  const groups: HotspotGroup[] = [];
  for (const h of [...list].sort((a, b) => b.count - a.count)) {
    const g = groups.find((x) => x.items.some((i) => {
      const d = distM(i, h);
      return d < Math.max(i.radius_m, h.radius_m) * 1.1 || (!!h.area && i.area === h.area && d < 900);
    }));
    if (g) {
      g.items.push(h); g.count += h.count;
      g.lat = g.items.reduce((s, i) => s + i.lat, 0) / g.items.length;
      g.lng = g.items.reduce((s, i) => s + i.lng, 0) / g.items.length;
      g.radius = Math.max(...g.items.map((i) => distM(g, i) + i.radius_m));
      g.venues = new Set(g.items.flatMap((i) => i.events.map((e) => e.venue_id))).size;
      if (!g.area && h.area) g.area = h.area;
    } else {
      groups.push({ key: h.id, lat: h.lat, lng: h.lng, radius: h.radius_m, area: h.area, count: h.count, venues: h.venues, items: [h], tonight });
    }
  }
  groups.forEach((g) => g.items.sort((a, b) => a.night.localeCompare(b.night)));
  return groups;
}

/** Marker copy. Line 1: "3 PARTIES · FRI". Line 2: when — never a crowd claim. */
export function markerCopy(g: HotspotGroup) {
  const nights = g.items.map((h) => (h.night === g.tonight ? 'TONIGHT' : dayShort(h.night)));
  const first = g.items[0];
  const when = first.status === 'on' ? 'PARTIES UNDERWAY' : first.status === 'soon' ? `STARTING SOON · ${startOf(first)}` : `FROM ${startOf(first)}`;
  return { line1: `${g.count} PARTIES · ${nights.join(' · ')}`, line2: g.items.length > 1 ? `${nights[0]} ${when}` : when };
}

/** Sheet copy. Energetic, honest: scheduled parties, not live crowds. */
export function sheetCopy(g: HotspotGroup) {
  const place = g.area || 'This area';
  const first = g.items[0];
  if (g.items.length > 1) {
    const days = g.items.map((h) => (h.night === g.tonight ? 'tonight' : dayLong(h.night)));
    return { title: `${place} is buzzing this weekend`, sub: `${g.count} parties across ${days.join(' and ')} · ${g.venues} venues within a short walk` };
  }
  const isTonight = first.night === g.tonight;
  const day = isTonight ? 'tonight' : `${dayLong(first.night)} night`;
  if (first.status === 'on') return { title: `${place} has parties underway`, sub: `Started at ${startOf(first)} · ${first.count} parties within a short walk` };
  if (first.status === 'soon') return { title: `${place} heats up soon`, sub: `First party at ${startOf(first)} · ${first.count} parties within a short walk` };
  return { title: `${place} is buzzing ${day}`, sub: `${first.count} parties from ${startOf(first)} · ${first.venues} venues within a short walk` };
}

