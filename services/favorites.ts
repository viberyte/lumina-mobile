import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@lumina_favorites';

export interface FavoriteVenue {
  id: string;
  name: string;
  neighborhood?: string;
  cuisine_primary?: string;
  professional_photo_url?: string;
  savedAt: string;
}

class FavoritesService {
  async getFavorites(): Promise<FavoriteVenue[]> {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }

  async addFavorite(venue: any): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const newFavorite: FavoriteVenue = {
        id: venue.id,
        name: venue.name,
        neighborhood: venue.neighborhood,
        cuisine_primary: venue.cuisine_primary,
        professional_photo_url: venue.professional_photo_url || venue.professional_photos,
        savedAt: new Date().toISOString(),
      };
      
      const updated = [newFavorite, ...favorites];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  }

  async removeFavorite(venueId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updated = favorites.filter(v => v.id !== venueId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }

  async isFavorite(venueId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(v => v.id === venueId);
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }
}

export default new FavoritesService();
