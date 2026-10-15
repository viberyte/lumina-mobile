import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lumina_taste_signals';

interface TasteSignal {
  category: string;
  score: number;
  lastSeen: number;
}

interface TasteData {
  signals: Record<string, TasteSignal>;
  updatedAt: number;
}

const WEIGHTS = {
  detailView: 1,
  save: 3,
  directionTap: 2,
  booking: 5,
};

class TasteTracker {
  private data: TasteData | null = null;
  private loadPromise: Promise<void> | null = null;

  private async ensureLoaded(): Promise<TasteData> {
    if (this.data) return this.data;
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          this.data = raw ? JSON.parse(raw) : { signals: {}, updatedAt: Date.now() };
        } catch {
          this.data = { signals: {}, updatedAt: Date.now() };
        }
      })();
    }
    await this.loadPromise;
    return this.data as TasteData;
  }

  private async addSignal(category: string, weight: number) {
    if (!category) return;
    const cat = category.toLowerCase().trim();
    if (!cat) return;
    const data = await this.ensureLoaded();
    const existing = data.signals[cat] || { category: cat, score: 0, lastSeen: 0 };
    existing.score += weight;
    existing.lastSeen = Date.now();
    data.signals[cat] = existing;
    data.updatedAt = Date.now();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  async recordDetailView(venueId: number | string, category: string) {
    await this.addSignal(category, WEIGHTS.detailView);
  }

  async recordSave(venueId: number | string, category: string) {
    await this.addSignal(category, WEIGHTS.save);
  }

  async recordDirectionTap(venueId: number | string, category: string) {
    await this.addSignal(category, WEIGHTS.directionTap);
  }

  async recordBooking(venueId: number | string, category: string) {
    await this.addSignal(category, WEIGHTS.booking);
  }

  async getTopCategories(limit: number = 5): Promise<TasteSignal[]> {
    const data = await this.ensureLoaded();
    return Object.values(data.signals)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getScoreFor(category: string): Promise<number> {
    const data = await this.ensureLoaded();
    const cat = category.toLowerCase().trim();
    return data.signals[cat]?.score || 0;
  }

  async hasData(): Promise<boolean> {
    const data = await this.ensureLoaded();
    return Object.keys(data.signals).length > 0;
  }

  async scoreVenue(venue: any): Promise<number> {
    const data = await this.ensureLoaded();
    const cat = (venue.standardized_category || venue.category || '').toLowerCase().trim();
    if (!cat) return 0;
    return data.signals[cat]?.score || 0;
  }

  async reset() {
    this.data = { signals: {}, updatedAt: Date.now() };
    this.loadPromise = null;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}

const tasteTracker = new TasteTracker();
export default tasteTracker;
