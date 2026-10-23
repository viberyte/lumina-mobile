// services/favorites.ts — kept for existing callers; now backed by lib/saved (Saved V1).
import { getSavedLocal, isSaved, saveVenue, unsaveVenue, SavedVenue } from '../lib/saved';

export interface FavoriteVenue {
  id: string;
  name: string;
  neighborhood?: string;
  cuisine_primary?: string;
  professional_photo_url?: string;
  savedAt: string;
}

const toFav = (v: SavedVenue): FavoriteVenue => ({
  id: v.id, name: v.name, neighborhood: v.neighborhood,
  cuisine_primary: v.category, professional_photo_url: v.photo, savedAt: v.savedAt,
});

class FavoritesService {
  async getFavorites(): Promise<FavoriteVenue[]> { return (await getSavedLocal()).map(toFav); }
  async addFavorite(venue: any): Promise<void> { await saveVenue(venue); }
  async removeFavorite(venueId: string | number): Promise<void> { await unsaveVenue(venueId); }
  async isFavorite(venueId: string | number): Promise<boolean> { return isSaved(venueId); }
}

export default new FavoritesService();
