import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type GenderIdentity = 'man' | 'woman' | 'non_binary' | 'unknown';
export type RelationshipStatus = 'single' | 'dating' | 'in_relationship';
export type DatingPreference = 'women' | 'men' | 'everyone';
export type FilterMode = 'discovery' | 'search' | 'direct';

export interface UserPersona {
  gender_identity: GenderIdentity;
  relationship_status: RelationshipStatus;
  dating_preference: DatingPreference;
  persona_id: string;
  persona_version: string;
  onboarded_at: string;
}

export interface PersonalizedContent {
  categories: {
    tonight: string;
    popular: string;
    dating: string;
    lateNight: string;
    chill: string;
  };
  cta: {
    addToPlan: string;
    tonight: string;
    explore: string;
  };
  venueFraming: {
    crowdDescription: (crowd: string) => string;
    vibeDescription: (vibe: string) => string;
  };
  tagWeights: Record<string, number>;
  showLgbtq: boolean;
  isLgbtq: boolean;
  isStraightMan: boolean;
  isStraightWoman: boolean;
}

export interface FilterOptions {
  mode: FilterMode;
}

// ============================================
// HELPERS
// ============================================

const buildPersonaKey = (
  gender: GenderIdentity,
  status: RelationshipStatus,
  preference: DatingPreference
): string => {
  return `${gender}_${status}_${preference}`;
};

const normalizeTag = (tag: string): string => {
  return tag.toLowerCase().replace(/\s+/g, '-');
};

const getIntentCategory = (status: RelationshipStatus): 'seeking' | 'casual' | 'committed' => {
  switch (status) {
    case 'single': return 'seeking';
    case 'dating': return 'casual';
    case 'in_relationship': return 'committed';
    default: return 'seeking';
  }
};

// ============================================
// LGBTQ DETECTION TAGS
// ============================================

const LGBTQ_VENUE_TAGS = [
  'lgbtq',
  'lgbtq-friendly',
  'lgbtq+',
  'gay',
  'gay-bar',
  'gay-club',
  'lesbian',
  'lesbian-bar',
  'queer',
  'queer-owned',
  'drag',
  'drag-show',
  'pride',
  'gay-friendly',
];

const LGBTQ_AUDIENCE_VALUES = [
  'lgbtq',
  'gay',
  'queer',
  'lgbtq+',
];

// ============================================
// CATEGORY TITLES BY PERSONA
// ============================================

const categoryTitles: Record<string, Partial<PersonalizedContent['categories']>> = {
  'man_single_women': {
    tonight: 'Where to Meet People',
    popular: 'High-Energy Spots',
    dating: 'Good First Date Spots',
    lateNight: 'Late Night Moves',
    chill: 'Conversation-Friendly',
  },
  'man_single_men': {
    tonight: 'Tonight\'s Scene',
    popular: 'Community Favorites',
    dating: 'Great First Date Spots',
    lateNight: 'Late & Lively',
    chill: 'Relaxed Vibes',
  },
  'man_single_everyone': {
    tonight: 'Tonight\'s Best',
    popular: 'Hottest Spots',
    dating: 'Date-Worthy',
    lateNight: 'After Hours',
    chill: 'Low-Key Gems',
  },
  'woman_single_men': {
    tonight: 'Tonight\'s Picks',
    popular: 'Where Everyone\'s Going',
    dating: 'Great Date Spots',
    lateNight: 'Safe Late-Night Vibes',
    chill: 'Cozy & Cute',
  },
  'woman_single_women': {
    tonight: 'Tonight\'s Scene',
    popular: 'Community Favorites',
    dating: 'Perfect Date Spots',
    lateNight: 'Queer Late Night',
    chill: 'Relaxed & Inclusive',
  },
  'woman_single_everyone': {
    tonight: 'Tonight\'s Picks',
    popular: 'Trending Now',
    dating: 'Date Night Ready',
    lateNight: 'Late Night Energy',
    chill: 'Chill Spots',
  },
  'man_dating_women': {
    tonight: 'Tonight\'s Moves',
    popular: 'Popular Right Now',
    dating: 'Impress Your Date',
    lateNight: 'Keep the Night Going',
    chill: 'Easy First Dates',
  },
  'man_dating_men': {
    tonight: 'Tonight\'s Scene',
    popular: 'Popular Spots',
    dating: 'Great Date Ideas',
    lateNight: 'Late Night Vibes',
    chill: 'Relaxed Dates',
  },
  'man_dating_everyone': {
    tonight: 'Tonight\'s Best',
    popular: 'Trending Spots',
    dating: 'Date Night Ideas',
    lateNight: 'After Hours',
    chill: 'Chill Date Spots',
  },
  'woman_dating_men': {
    tonight: 'Tonight\'s Best',
    popular: 'Trending Spots',
    dating: 'Perfect Date Venues',
    lateNight: 'Late Night Options',
    chill: 'Relaxed Date Ideas',
  },
  'woman_dating_women': {
    tonight: 'Tonight\'s Scene',
    popular: 'Community Picks',
    dating: 'Perfect Date Spots',
    lateNight: 'Late & Inclusive',
    chill: 'Cozy Date Ideas',
  },
  'woman_dating_everyone': {
    tonight: 'Tonight\'s Picks',
    popular: 'What\'s Hot',
    dating: 'Date Night Ready',
    lateNight: 'Late Night Energy',
    chill: 'Easy-Going Spots',
  },
  'man_in_relationship_women': {
    tonight: 'Date Night Ideas',
    popular: 'Couple Favorites',
    dating: 'Romantic Spots',
    lateNight: 'Late Night Together',
    chill: 'Cozy Date Spots',
  },
  'man_in_relationship_men': {
    tonight: 'Date Night Ideas',
    popular: 'Couple Favorites',
    dating: 'Romantic Spots',
    lateNight: 'Late Night Together',
    chill: 'Cozy Date Spots',
  },
  'man_in_relationship_everyone': {
    tonight: 'Date Night Ideas',
    popular: 'Couple Favorites',
    dating: 'Romantic Spots',
    lateNight: 'Late Night Together',
    chill: 'Cozy Date Spots',
  },
  'woman_in_relationship_men': {
    tonight: 'Date Night Ideas',
    popular: 'Couple Favorites',
    dating: 'Romantic Spots',
    lateNight: 'Late Night Together',
    chill: 'Cozy Date Spots',
  },
  'woman_in_relationship_women': {
    tonight: 'Date Night Ideas',
    popular: 'Couple Favorites',
    dating: 'Romantic Spots',
    lateNight: 'Late Night Together',
    chill: 'Cozy Date Spots',
  },
  'woman_in_relationship_everyone': {
    tonight: 'Date Night Ideas',
    popular: 'Couple Favorites',
    dating: 'Romantic Spots',
    lateNight: 'Late Night Together',
    chill: 'Cozy Date Spots',
  },
  'non_binary_single_everyone': {
    tonight: 'Tonight\'s Scene',
    popular: 'Inclusive Favorites',
    dating: 'Great Date Spots',
    lateNight: 'Late Night Energy',
    chill: 'Chill & Welcoming',
  },
  'non_binary_single_women': {
    tonight: 'Tonight\'s Scene',
    popular: 'Community Favorites',
    dating: 'Great Date Spots',
    lateNight: 'Queer Late Night',
    chill: 'Relaxed & Inclusive',
  },
  'non_binary_single_men': {
    tonight: 'Tonight\'s Scene',
    popular: 'Community Favorites',
    dating: 'Great Date Spots',
    lateNight: 'Late & Lively',
    chill: 'Relaxed Vibes',
  },
  'non_binary_dating_everyone': {
    tonight: 'Tonight\'s Best',
    popular: 'Inclusive Favorites',
    dating: 'Date Night Ideas',
    lateNight: 'Late Night Energy',
    chill: 'Easy-Going Spots',
  },
  'non_binary_in_relationship_everyone': {
    tonight: 'Date Night Ideas',
    popular: 'Couple Favorites',
    dating: 'Romantic Spots',
    lateNight: 'Late Night Together',
    chill: 'Cozy Date Spots',
  },
  'unknown_single_everyone': {
    tonight: 'Tonight\'s Picks',
    popular: 'Litt Events',
    dating: 'Date Ideas',
    lateNight: 'Late Night',
    chill: 'Chill Vibes',
  },
};

// ============================================
// TAG WEIGHTS
// ============================================

const tagWeightsByIntent: Record<string, Record<string, number>> = {
  'seeking': {
    'singles-scene': 3,
    'good-for-groups': 2,
    'high-energy': 2,
    'social': 2,
    'conversation-friendly': 1,
    'lively': 1,
    'romantic': -1,
    'intimate': -1,
    'family-friendly': -2,
  },
  'casual': {
    'date-night': 3,
    'impressive': 2,
    'conversation-friendly': 2,
    'trendy': 2,
    'romantic': 1,
    'upscale': 1,
    'high-energy': 0,
    'loud': -1,
  },
  'committed': {
    'romantic': 3,
    'date-night': 3,
    'intimate': 2,
    'conversation-friendly': 2,
    'cozy': 2,
    'special-occasion': 2,
    'singles-scene': -2,
    'pickup-spot': -3,
    'loud': -1,
  },
};

const lgbtqTagWeights: Record<string, number> = {
  'lgbtq-friendly': 3,
  'queer-owned': 3,
  'inclusive': 2,
  'drag': 2,
  'pride': 2,
  'gay-bar': 2,
  'lesbian-bar': 2,
};

// ============================================
// PERSONA SERVICE CLASS
// ============================================

class PersonaService {
  private persona: UserPersona | null = null;
  private loaded = false;
  private cachedContent: PersonalizedContent | null = null;

  async loadPersona(): Promise<UserPersona | null> {
    if (this.loaded && this.persona) return this.persona;
    
    try {
      const saved = await AsyncStorage.getItem('@lumina_persona');
      if (saved) {
        this.persona = JSON.parse(saved);
        this.loaded = true;
        // Cache content on load
        this.cachedContent = this.getPersonalizedContent(this.persona);
        return this.persona;
      }
    } catch (error) {
      console.log('Could not load persona');
    }
    return null;
  }

  /**
   * Get cached persona (sync) - use after initial load
   */
  getCachedPersona(): UserPersona | null {
    return this.persona;
  }

  /**
   * Get cached content (sync) - use after initial load
   */
  getCachedContent(): PersonalizedContent | null {
    return this.cachedContent;
  }

  async hasCompletedOnboarding(): Promise<boolean> {
    const persona = await this.loadPersona();
    return persona !== null;
  }

  async getPersona(): Promise<UserPersona | null> {
    return this.loadPersona();
  }

  async updatePersona(updates: Partial<UserPersona>): Promise<void> {
    const current = await this.loadPersona();
    if (current) {
      const updated = { ...current, ...updates };
      updated.persona_id = buildPersonaKey(
        updated.gender_identity,
        updated.relationship_status,
        updated.dating_preference
      );
      await AsyncStorage.setItem('@lumina_persona', JSON.stringify(updated));
      this.persona = updated;
      this.cachedContent = this.getPersonalizedContent(updated);
    }
  }

  async clearPersona(): Promise<void> {
    await AsyncStorage.removeItem('@lumina_persona');
    await AsyncStorage.removeItem('@lumina_onboarding_progress');
    await AsyncStorage.removeItem('@lumina_onboarding_analytics');
    this.persona = null;
    this.loaded = false;
    this.cachedContent = null;
  }

  /**
   * Determine if user should see LGBTQ venues
   */
  isLgbtqUser(persona: UserPersona | null): boolean {
    if (!persona) return true;
    
    const { gender_identity, dating_preference } = persona;
    
    return (
      (gender_identity === 'man' && dating_preference === 'men') ||
      (gender_identity === 'woman' && dating_preference === 'women') ||
      gender_identity === 'non_binary' ||
      dating_preference === 'everyone'
    );
  }

  /**
   * Determine if user is straight man
   */
  isStraightMan(persona: UserPersona | null): boolean {
    if (!persona) return false;
    return persona.gender_identity === 'man' && persona.dating_preference === 'women';
  }

  /**
   * Determine if user is straight woman
   */
  isStraightWoman(persona: UserPersona | null): boolean {
    if (!persona) return false;
    return persona.gender_identity === 'woman' && persona.dating_preference === 'men';
  }

  /**
   * Check if a venue is LGBTQ-primary (should be filtered for straight users in discovery)
   */
  isLgbtqPrimaryVenue(venue: any): boolean {
    // Check audience_primary field (first-class field)
    if (venue.audience_primary) {
      const audience = venue.audience_primary.toLowerCase();
      if (LGBTQ_AUDIENCE_VALUES.some(v => audience.includes(v))) {
        return true;
      }
    }

    // Fallback heuristics
    const category = (venue.category || '').toLowerCase();
    if (category.includes('gay') || category.includes('lgbtq') || category.includes('queer')) {
      return true;
    }

    const name = (venue.name || '').toLowerCase();
    if (name.includes('gay bar') || name.includes('gay club') || name.includes('lgbtq')) {
      return true;
    }

    const vibeTags = this.parseVibeTags(venue.vibe_tags);
    const hasLgbtqTag = vibeTags.some(tag => {
      const normalized = tag.toLowerCase();
      return LGBTQ_VENUE_TAGS.some(lgbtqTag => normalized.includes(lgbtqTag));
    });
    
    if (hasLgbtqTag) {
      // "lgbtq-friendly" is mixed, not primary
      const isFriendlyOnly = vibeTags.every(tag => {
        const normalized = tag.toLowerCase();
        if (!LGBTQ_VENUE_TAGS.some(lt => normalized.includes(lt))) return true;
        return normalized.includes('friendly') || normalized.includes('inclusive');
      });
      
      return !isFriendlyOnly;
    }

    return false;
  }

  /**
   * Parse vibe_tags from various formats
   */
  parseVibeTags(tags: any): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  getPersonalizedContent(persona: UserPersona | null): PersonalizedContent {
    const defaults: PersonalizedContent = {
      categories: {
        tonight: 'Tonight\'s Picks',
        popular: 'Litt Events',
        dating: 'Date Ideas',
        lateNight: 'Late Night',
        chill: 'Chill Vibes',
      },
      cta: {
        addToPlan: 'Add to Plan',
        tonight: 'Tonight',
        explore: 'Explore',
      },
      venueFraming: {
        crowdDescription: (crowd) => crowd,
        vibeDescription: (vibe) => vibe,
      },
      tagWeights: {},
      showLgbtq: true,
      isLgbtq: false,
      isStraightMan: false,
      isStraightWoman: false,
    };

    if (!persona) return defaults;

    const { gender_identity, relationship_status, dating_preference } = persona;
    
    const personaKey = buildPersonaKey(gender_identity, relationship_status, dating_preference);
    const categories = categoryTitles[personaKey] || categoryTitles['unknown_single_everyone'];
    
    const intent = getIntentCategory(relationship_status);
    let tagWeights: Record<string, number> = { ...tagWeightsByIntent[intent] };
    
    const isLgbtq = this.isLgbtqUser(persona);
    const isStraightMan = this.isStraightMan(persona);
    const isStraightWoman = this.isStraightWoman(persona);
    
    if (isLgbtq) {
      for (const [tag, weight] of Object.entries(lgbtqTagWeights)) {
        tagWeights[tag] = (tagWeights[tag] || 0) + weight;
      }
    }
    
    const cta = {
      addToPlan: intent === 'committed' ? 'Add to Date' : 'Add to Plan',
      tonight: intent === 'committed' ? 'Date Night' : 'Tonight',
      explore: 'Explore',
    };
    
    const venueFraming = {
      crowdDescription: (crowd: string) => {
        if (intent === 'committed') {
          return crowd.replace(/singles/gi, 'couples').replace(/hookup/gi, 'romantic');
        }
        return crowd;
      },
      vibeDescription: (vibe: string) => {
        if (gender_identity === 'woman' && relationship_status === 'single') {
          const lowercaseVibe = vibe.toLowerCase();
          if (lowercaseVibe.includes('chill') || lowercaseVibe.includes('cozy')) {
            return vibe + ' • Safe vibes';
          }
        }
        return vibe;
      },
    };

    return {
      categories: { ...defaults.categories, ...categories },
      cta,
      venueFraming,
      tagWeights,
      showLgbtq: isLgbtq || dating_preference === 'everyone',
      isLgbtq,
      isStraightMan,
      isStraightWoman,
    };
  }

  /**
   * Sort venues based on persona preferences
   */
  sortVenuesByPersona<T extends { vibe_tags?: string[] | string; contextual_tags?: any }>(
    venues: T[],
    persona: UserPersona | null
  ): T[] {
    if (!persona || venues.length === 0) return venues;
    
    const content = this.getPersonalizedContent(persona);
    const { tagWeights } = content;
    const intent = getIntentCategory(persona.relationship_status);
    
    return [...venues].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      const tagsA = this.parseVibeTags(a.vibe_tags);
      const tagsB = this.parseVibeTags(b.vibe_tags);
      
      for (const tag of tagsA) {
        const normalized = normalizeTag(tag);
        scoreA += tagWeights[normalized] || 0;
      }
      
      for (const tag of tagsB) {
        const normalized = normalizeTag(tag);
        scoreB += tagWeights[normalized] || 0;
      }
      
      if (a.contextual_tags) {
        if (a.contextual_tags.date_spot && intent !== 'seeking') scoreA += 2;
        if (a.contextual_tags.group_friendly && intent === 'seeking') scoreA += 1;
        if (a.contextual_tags.conversation_friendly && intent === 'casual') scoreA += 1;
      }
      
      if (b.contextual_tags) {
        if (b.contextual_tags.date_spot && intent !== 'seeking') scoreB += 2;
        if (b.contextual_tags.group_friendly && intent === 'seeking') scoreB += 1;
        if (b.contextual_tags.conversation_friendly && intent === 'casual') scoreB += 1;
      }
      
      return scoreB - scoreA;
    });
  }

  /**
   * CRITICAL: Filter venues based on persona eligibility
   * 
   * @param venues - Array of venues to filter
   * @param persona - User persona (null = show everything)
   * @param options - Filter options (mode: 'discovery' | 'search' | 'direct')
   * 
   * MODES:
   * - 'discovery': Filter out LGBTQ-primary for straight users (default)
   * - 'search': NO filtering - user explicitly searched for it
   * - 'direct': NO filtering - user has a direct link
   */
  filterVenuesByPersona<T extends Record<string, any>>(
    venues: T[],
    persona: UserPersona | null,
    options: FilterOptions = { mode: 'discovery' }
  ): T[] {
    // Search & direct links bypass all filtering
    if (options.mode === 'search' || options.mode === 'direct') {
      return venues;
    }

    // No persona = show everything (not onboarded yet)
    if (!persona) return venues;
    
    const isLgbtq = this.isLgbtqUser(persona);
    
    // LGBTQ users see everything in discovery
    if (isLgbtq) return venues;
    
    // Straight users in discovery: filter out LGBTQ-primary venues
    return venues.filter(venue => !this.isLgbtqPrimaryVenue(venue));
  }

  /**
   * Combined: Filter + Sort for discovery feeds
   * Use this in NightlifeTab, DiningTab, Home, etc.
   */
  processVenuesForDiscovery<T extends Record<string, any>>(
    venues: T[],
    persona: UserPersona | null
  ): T[] {
    // Step 1: Eligibility filter (discovery mode)
    const eligible = this.filterVenuesByPersona(venues, persona, { mode: 'discovery' });
    
    // Step 2: Persona-aware sorting
    const sorted = this.sortVenuesByPersona(eligible, persona);
    
    return sorted;
  }

  /**
   * For search results - sort but don't filter
   */
  processVenuesForSearch<T extends Record<string, any>>(
    venues: T[],
    persona: UserPersona | null
  ): T[] {
    // No filtering in search - user asked for it
    const noFilter = this.filterVenuesByPersona(venues, persona, { mode: 'search' });
    
    // Still sort by persona preference
    return this.sortVenuesByPersona(noFilter, persona);
  }
}

export const personaService = new PersonaService();
export default personaService;

// Music genre weights
export const musicGenreWeights: Record<string, string[]> = {
  hiphop: ['hip-hop', 'hip hop', 'rap', 'trap', 'drill'],
  latin: ['latin', 'reggaeton', 'salsa', 'bachata', 'merengue', 'latino'],
  afrobeats: ['afrobeats', 'afro', 'amapiano', 'afropop', 'dancehall'],
  edm: ['edm', 'electronic', 'dance', 'dubstep', 'drum and bass', 'dnb'],
  rnb: ['r&b', 'rnb', 'soul', 'neo-soul', 'r & b'],
  house: ['house', 'techno', 'deep house', 'tech house', 'disco'],
  pop: ['pop', 'top 40', 'mainstream', 'hits', 'chart'],
  live: ['live', 'jazz', 'live music', 'acoustic', 'band', 'blues'],
};

export const sortEventsByMusicPreference = (events: any[], musicPrefs: string[]): any[] => {
  if (!musicPrefs || musicPrefs.length === 0) return events;
  
  return [...events].sort((a, b) => {
    const genreA = (a.genre || '').toLowerCase();
    const genreB = (b.genre || '').toLowerCase();
    
    let scoreA = 0;
    let scoreB = 0;
    
    for (const pref of musicPrefs) {
      const keywords = musicGenreWeights[pref] || [];
      for (const keyword of keywords) {
        if (genreA.includes(keyword)) scoreA += 3;
        if (genreB.includes(keyword)) scoreB += 3;
      }
    }
    
    return scoreB - scoreA;
  });
};
