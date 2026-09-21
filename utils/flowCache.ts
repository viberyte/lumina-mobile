// Simple in-memory cache for flow data
// Persists within app session — no async needed
const cache: Record<string, any> = {};

export function cacheFlow(slug: string, flow: any) {
  cache[slug] = flow;
}

export function getCachedFlow(slug: string): any | null {
  return cache[slug] || null;
}
