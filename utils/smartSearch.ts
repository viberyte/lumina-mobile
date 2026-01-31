// Smart Search Engine for Lumina v2
// Multi-keyword AND logic, city filtering, relevance ranking

interface SearchResult {
  venues: any[];
  events: any[];
  matchedKeywords: string[];
}

interface ScoredVenue {
  venue: any;
  score: number;
  matchedKeywords: string[];
}

// Expanded keyword mapping to venue attributes
const searchDictionary = {
  // Vibe Tags
  'hookah': { field: 'vibe_tags', value: 'hookah', type: 'vibe', weight: 10 },
  'rooftop': { field: 'vibe_tags', value: 'rooftop', type: 'vibe', weight: 10 },
  'brunch': { field: 'vibe_tags', value: 'brunch', type: 'vibe', weight: 10 },
  'upscale': { field: 'vibe_tags', value: 'upscale', type: 'vibe', weight: 8 },
  'casual': { field: 'vibe_tags', value: 'casual', type: 'vibe', weight: 6 },
  'romantic': { field: 'vibe_tags', value: 'romantic', type: 'vibe', weight: 9 },
  'trendy': { field: 'vibe_tags', value: 'trendy', type: 'vibe', weight: 7 },
  'speakeasy': { field: 'vibe_tags', value: 'speakeasy', type: 'vibe', weight: 10 },
  'chill': { field: 'vibe_tags', value: 'chill', type: 'vibe', weight: 6 },
  'cozy': { field: 'vibe_tags', value: 'cozy', type: 'vibe', weight: 7 },
  'aesthetic': { field: 'vibe_tags', value: 'aesthetic', type: 'vibe', weight: 8 },
  'late night': { field: 'vibe_tags', value: 'late-night', type: 'vibe', weight: 8 },
  'happy hour': { field: 'vibe_tags', value: 'happy-hour', type: 'vibe', weight: 8 },
  'bottle service': { field: 'vibe_tags', value: 'bottle-service', type: 'vibe', weight: 9 },
  'quiet': { field: 'vibe_tags', value: 'quiet', type: 'vibe', weight: 7 },
  'live music': { field: 'vibe_tags', value: 'live-music', type: 'vibe', weight: 9 },
  'private room': { field: 'vibe_tags', value: 'private-room', type: 'vibe', weight: 9 },
  'open late': { field: 'vibe_tags', value: 'late-night', type: 'vibe', weight: 7 },
  'vip': { field: 'vibe_tags', value: 'vip', type: 'vibe', weight: 9 },
  'birthday': { field: 'vibe_tags', value: 'celebratory', type: 'vibe', weight: 8 },
  'anniversary': { field: 'vibe_tags', value: 'romantic', type: 'vibe', weight: 9 },
  'cheap': { field: 'vibe_tags', value: 'affordable', type: 'vibe', weight: 6 },
  'affordable': { field: 'vibe_tags', value: 'affordable', type: 'vibe', weight: 6 },
  'fast service': { field: 'vibe_tags', value: 'fast-casual', type: 'vibe', weight: 6 },
  'waterfront': { field: 'vibe_tags', value: 'waterfront', type: 'vibe', weight: 8 },
  'outdoor': { field: 'vibe_tags', value: 'outdoor', type: 'vibe', weight: 7 },
  'family style': { field: 'vibe_tags', value: 'family-style', type: 'vibe', weight: 7 },
  'date night': { field: 'vibe_tags', value: 'romantic', type: 'vibe', weight: 9 },
  'authentic': { field: 'vibe_tags', value: 'authentic', type: 'vibe', weight: 7 },
  
  // Music Genres
  'afrobeats': { field: 'music_genres', value: 'Afrobeats', type: 'music', weight: 10 },
  'afrobeat': { field: 'music_genres', value: 'Afrobeats', type: 'music', weight: 10 },
  'hip hop': { field: 'music_genres', value: 'Hip-Hop', type: 'music', weight: 10 },
  'hip-hop': { field: 'music_genres', value: 'Hip-Hop', type: 'music', weight: 10 },
  'reggaeton': { field: 'music_genres', value: 'Reggaeton', type: 'music', weight: 10 },
  'r&b': { field: 'music_genres', value: 'R&B', type: 'music', weight: 10 },
  'rnb': { field: 'music_genres', value: 'R&B', type: 'music', weight: 10 },
  'edm': { field: 'music_genres', value: 'EDM', type: 'music', weight: 10 },
  'house': { field: 'music_genres', value: 'House', type: 'music', weight: 10 },
  'jazz': { field: 'music_genres', value: 'Jazz', type: 'music', weight: 10 },
  'reggae': { field: 'music_genres', value: 'Reggae', type: 'music', weight: 10 },
  'dancehall': { field: 'music_genres', value: 'Dancehall', type: 'music', weight: 10 },
  'amapiano': { field: 'music_genres', value: 'Amapiano', type: 'music', weight: 10 },
  'soul': { field: 'music_genres', value: 'Soul', type: 'music', weight: 10 },
  'funk': { field: 'music_genres', value: 'Funk', type: 'music', weight: 10 },
  
  // Cuisine Types
  'italian': { field: 'cuisine_primary', value: 'italian', type: 'cuisine', weight: 10 },
  'soul food': { field: 'cuisine', value: 'soul food', type: 'cuisine', weight: 10 },
  'japanese': { field: 'cuisine_primary', value: 'japanese', type: 'cuisine', weight: 10 },
  'sushi': { field: 'cuisine', value: 'sushi', type: 'cuisine', weight: 10 },
  'caribbean': { field: 'cuisine', value: 'caribbean', type: 'cuisine', weight: 10 },
  'mediterranean': { field: 'cuisine_primary', value: 'mediterranean', type: 'cuisine', weight: 10 },
  'mexican': { field: 'cuisine', value: 'mexican', type: 'cuisine', weight: 10 },
  'latin': { field: 'cuisine', value: 'latin', type: 'cuisine', weight: 10 },
  'steakhouse': { field: 'cuisine', value: 'steakhouse', type: 'cuisine', weight: 10 },
  'seafood': { field: 'cuisine', value: 'seafood', type: 'cuisine', weight: 10 },
  'american': { field: 'cuisine_primary', value: 'american', type: 'cuisine', weight: 8 },
  'chinese': { field: 'cuisine', value: 'chinese', type: 'cuisine', weight: 10 },
  'thai': { field: 'cuisine', value: 'thai', type: 'cuisine', weight: 10 },
  'indian': { field: 'cuisine', value: 'indian', type: 'cuisine', weight: 10 },
  'greek': { field: 'cuisine', value: 'greek', type: 'cuisine', weight: 10 },
  'french': { field: 'cuisine', value: 'french', type: 'cuisine', weight: 10 },
  
  // Event Types
  'day party': { field: 'genre', value: 'day-party', type: 'event', weight: 10 },
  'brunch party': { field: 'genre', value: 'brunch', type: 'event', weight: 10 },
  'rooftop party': { field: 'genre', value: 'rooftop', type: 'event', weight: 10 },
  
  // Categories
  'dining': { field: 'category', value: 'dining', type: 'category', weight: 8 },
  'nightlife': { field: 'category', value: 'nightlife', type: 'category', weight: 8 },
  'restaurant': { field: 'category', value: 'dining', type: 'category', weight: 8 },
  'club': { field: 'category', value: 'nightlife', type: 'category', weight: 8 },
  'lounge': { field: 'category', value: 'nightlife', type: 'category', weight: 8 },
};

const safeIncludes = (str: any, search: string): boolean => {
  return (str || '').toLowerCase().includes(search.toLowerCase());
};

const safeArrayIncludes = (arr: any[], value: string): boolean => {
  if (!Array.isArray(arr)) return false;
  return arr.some((v: string) => 
    (v || '').toLowerCase().includes(value.toLowerCase())
  );
};

function venueMatchesKeyword(venue: any, keyword: string): boolean {
  const searchConfig = searchDictionary[keyword as keyof typeof searchDictionary];
  if (!searchConfig) return false;
  
  const fieldValue = venue[searchConfig.field];
  
  if (Array.isArray(fieldValue)) {
    return safeArrayIncludes(fieldValue, searchConfig.value);
  } else if (fieldValue) {
    return safeIncludes(fieldValue, searchConfig.value);
  }
  
  return false;
}

function scoreVenue(venue: any, matchedKeywords: string[]): number {
  let score = 0;
  
  matchedKeywords.forEach(keyword => {
    const config = searchDictionary[keyword as keyof typeof searchDictionary];
    if (config) {
      score += config.weight;
    }
  });
  
  const rating = venue.rating || 0;
  score += rating * 2;
  
  if (venue.trending || venue.viberyte_score >= 8) {
    score += 5;
  }
  
  if (Array.isArray(venue.vibe_tags)) {
    score += venue.vibe_tags.length * 0.5;
  }
  
  return score;
}

export function smartSearch(
  query: string,
  venues: any[],
  events: any[],
  selectedCity: string = 'Manhattan'
): SearchResult {
  const lowercaseQuery = query.toLowerCase().trim();
  
  if (!lowercaseQuery) {
    return { venues: [], events: [], matchedKeywords: [] };
  }
  
  const cityFilteredVenues = venues.filter(venue => {
    const city = (venue.city || '').toLowerCase();
    const neighborhood = (venue.neighborhood || '').toLowerCase();
    const lowerCity = selectedCity.toLowerCase();
    
    return city.includes(lowerCity) || neighborhood.includes(lowerCity);
  });
  
  const keywords = Object.keys(searchDictionary);
  const matchedKeys = keywords.filter(keyword => 
    lowercaseQuery.includes(keyword)
  );
  
  if (matchedKeys.length > 0) {
    const scoredVenues: ScoredVenue[] = cityFilteredVenues
      .map(venue => {
        const venueMatchedKeys = matchedKeys.filter(keyword => 
          venueMatchesKeyword(venue, keyword)
        );
        
        if (venueMatchedKeys.length === matchedKeys.length) {
          return {
            venue,
            score: scoreVenue(venue, venueMatchedKeys),
            matchedKeywords: venueMatchedKeys,
          };
        }
        
        return null;
      })
      .filter((item): item is ScoredVenue => item !== null);
    
    scoredVenues.sort((a, b) => b.score - a.score);
    
    const filteredEvents = events.filter(event => {
      return matchedKeys.every(keyword => {
        const searchConfig = searchDictionary[keyword as keyof typeof searchDictionary];
        if (searchConfig.type === 'event') {
          const genre = (event.genre || event.music_genre || '').toLowerCase();
          return genre.includes(searchConfig.value.toLowerCase());
        }
        return true;
      });
    });
    
    return {
      venues: scoredVenues.map(sv => sv.venue),
      events: filteredEvents,
      matchedKeywords: matchedKeys,
    };
  } else {
    const fuzzyVenues = cityFilteredVenues.filter(venue => {
      const name = (venue.name || '').toLowerCase();
      const cuisine = (venue.cuisine || '').toLowerCase();
      const cuisinePrimary = (venue.cuisine_primary || '').toLowerCase();
      const bio = (venue.bio || '').toLowerCase();
      const neighborhood = (venue.neighborhood || '').toLowerCase();
      
      return (
        name.includes(lowercaseQuery) ||
        cuisine.includes(lowercaseQuery) ||
        cuisinePrimary.includes(lowercaseQuery) ||
        bio.includes(lowercaseQuery) ||
        neighborhood.includes(lowercaseQuery)
      );
    });
    
    fuzzyVenues.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    const fuzzyEvents = events.filter(event => {
      const name = (event.name || '').toLowerCase();
      const venue = (event.venue_name || '').toLowerCase();
      
      return name.includes(lowercaseQuery) || venue.includes(lowercaseQuery);
    });
    
    return {
      venues: fuzzyVenues,
      events: fuzzyEvents,
      matchedKeywords: [],
    };
  }
}

export function getSuggestedKeywords(query: string): string[] {
  const lowercaseQuery = query.toLowerCase().trim();
  const keywords = Object.keys(searchDictionary);
  
  return keywords
    .filter(keyword => keyword.startsWith(lowercaseQuery))
    .slice(0, 5);
}
