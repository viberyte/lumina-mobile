import api from './api';

interface FlowContext {
  who?: string;
  when?: string;
  planType?: string;
  vibe?: string;
  cuisine?: string;
  afterDinner?: string;
  musicPreference?: string;
  timeOfDay?: string;
  dayOfWeek?: string;
}

interface LuminaRequest {
  city: string;
  flow: FlowContext;
  preferences?: any;
  refresh?: boolean;
}

interface LuminaResponse {
  topPicks: any[];
  afterDinner: any[];
  events: any[];
  message?: string;
}

export const luminaApi = {
  getRecommendations: async (request: LuminaRequest): Promise<LuminaResponse> => {
    const response = await api.post('/api/lumina', request);
    return response.data;
  },

  getVenueById: async (id: string | number) => {
    try {
      const response = await api.get(`/api/venues/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching venue by ID:', error);
      throw error;
    }
  },

  getVenueDetails: async (id: string | number) => {
    try {
      const response = await api.get(`/api/venues/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching venue details:', error);
      throw error;
    }
  },

  getVenues: async (city: string, options: { limit?: number; category?: string } = {}) => {
    try {
      const { limit = 10, category } = options;
      const params: any = { city, limit };
      if (category) params.category = category;
      
      const response = await api.get('/api/venues', { params });
      
      if (response.data?.venues && Array.isArray(response.data.venues)) {
        return response.data.venues;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching venues:', error);
      return [];
    }
  },

  getVenuesByCategory: async (city: string, category: string = '') => {
    try {
      const params: any = {};
      if (city) params.city = city;
      if (category) params.category = category;
      
      const response = await api.get('/api/venues', { params });
      
      if (response.data?.venues && Array.isArray(response.data.venues)) {
        return response.data.venues;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching venues:', error);
      return [];
    }
  },

  getEvents: async (city: string, options: { limit?: number; genre?: string; date?: string } = {}) => {
    try {
      const { limit = 10, genre, date } = options;
      const response = await api.get('/api/events', {
        params: { city, genre, date, limit }
      });
      
      if (response.data?.events && Array.isArray(response.data.events)) {
        return response.data.events;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  },

  getEventsByGenre: async (city: string, genre?: string, date?: string, trending?: boolean) => {
    try {
      const response = await api.get('/api/events', {
        params: { city, genre, date, trending }
      });
      
      if (response.data?.events && Array.isArray(response.data.events)) {
        return response.data.events;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  },

  searchVenues: async (city: string, query: string) => {
    try {
      const response = await api.get('/api/search/venues', {
        params: { city, query }
      });
      return Array.isArray(response.data) ? response.data : response.data?.venues || [];
    } catch (error) {
      console.error('Error searching venues:', error);
      return [];
    }
  },

  searchEvents: async (city: string, query: string) => {
    try {
      const response = await api.get('/api/search/events', {
        params: { city, query }
      });
      return Array.isArray(response.data) ? response.data : response.data?.events || [];
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  },

  getBudgetMeal: async (venueId: string | number, budget: number, partySize: number = 1, context: any = {}) => {
    try {
      const response = await api.post('/api/budget-meal', {
        venueId,
        budget,
        partySize,
        context
      });
      return response.data;
    } catch (error) {
      console.error('Error getting budget meal:', error);
      throw error;
    }
  },

  getEventById: async (id: string | number) => {
    try {
      const response = await api.get(`/api/events/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw error;
    }
  },

  chat: async (message: string, city: string, preferences?: any, conversationHistory?: any[]) => {
    try {
      const response = await api.post('/api/chat', {
        message,
        city,
        preferences,
        conversationHistory
      });
      return response.data;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  },
};

export default luminaApi;
