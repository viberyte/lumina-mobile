import { API_BASE } from '../config';

const TIMEOUT = 15000;

const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

interface VenueQueryOptions {
  category?: string;
  limit?: number;
}

interface EventQueryOptions {
  limit?: number;
}

const luminaApi = {
  async getVenues(market: string, options: VenueQueryOptions = {}) {
    try {
      const { category, limit = 50 } = options;
      let url = `${API_BASE}/api/venues?city=${encodeURIComponent(market)}&limit=${limit}`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        console.error('Venues API error:', response.status);
        return [];
      }
      const data = await response.json();
      return data.venues || data || [];
    } catch (error) {
      console.error('Error fetching venues:', error);
      return [];
    }
  },

  async getEvents(market: string, options: EventQueryOptions = {}) {
    try {
      const { limit = 50 } = options;
      const response = await fetchWithTimeout(
        `${API_BASE}/api/events?city=${encodeURIComponent(market)}&limit=${limit}`
      );
      if (!response.ok) {
        console.error('Events API error:', response.status);
        return [];
      }
      const data = await response.json();
      return data.events || data || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  },

  async searchVenues(query: string, market?: string) {
    try {
      let url = `${API_BASE}/api/search?q=${encodeURIComponent(query)}`;
      if (market) {
        url += `&city=${encodeURIComponent(market)}`;
      }
      const response = await fetchWithTimeout(url);
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching venues:', error);
      return [];
    }
  },

  async getVenueDetails(id: number) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/venues/${id}`);
      if (!response.ok) throw new Error('Venue not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching venue details:', error);
      throw error;
    }
  },

  async getEventDetails(id: number) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/events/${id}`);
      if (!response.ok) throw new Error('Event not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching event details:', error);
      throw error;
    }
  },

  async getBudgetMeal(venueId: number, budget: number, partySize: number, context: { who: string }) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/budget-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          venueId,
          budget,
          partySize,
          context: context.who,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: 'api_error', message: errorData.message || 'Failed to get recommendation' };
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error getting budget meal:', error);
      return { error: 'network_error', message: error.message || 'Network error' };
    }
  },
};

export default luminaApi;
