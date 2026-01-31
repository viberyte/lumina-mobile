export const vibeGradients = {
  'high-energy': {
    colors: ['#7F00FF', '#E100FF'],
    effect: 'glossy glass, neon shine',
    mood: 'energetic',
  },
  'afrobeats': {
    colors: ['#FF6B35', '#F7931E'],
    effect: 'warm glow, rhythmic pulse',
    mood: 'vibrant + cultural',
  },
  'hip-hop': {
    colors: ['#1A1A2E', '#16213E', '#0F3460'],
    effect: 'deep matte, urban edge',
    mood: 'confident + bold',
  },
  'edm': {
    colors: ['#00F5FF', '#7B2FFF'],
    effect: 'electric glow, pulsing',
    mood: 'euphoric',
  },
  'rooftop': {
    colors: ['#FF6B9D', '#C06C84'],
    effect: 'sunset gradient, airy',
    mood: 'elevated + breezy',
  },
  'upscale-lounge': {
    colors: ['#2C003E', '#512B58', '#3D1F3D'],
    effect: 'velvet matte, luxe',
    mood: 'sophisticated',
  },
  'chill': {
    colors: ['#4A5568', '#2D3748'],
    effect: 'soft matte, calm',
    mood: 'relaxed + intimate',
  },
  'upscale-dining': {
    colors: ['#8B5CF6', '#D4AF37'],
    effect: 'matte glass, warm glow',
    mood: 'intimate + luxurious',
  },
  'italian': {
    colors: ['#C1272D', '#006847', '#F4F5F0'],
    effect: 'warm rustic, authentic',
    mood: 'traditional + cozy',
  },
  'sushi': {
    colors: ['#1A1A1A', '#E8E8E8', '#B91C1C'],
    effect: 'minimalist matte, zen',
    mood: 'precise + elegant',
  },
  'brunch': {
    colors: ['#FDBA74', '#FDE68A'],
    effect: 'soft frosted matte',
    mood: 'bright + comfortable',
  },
  'steakhouse': {
    colors: ['#7C2D12', '#1C1917'],
    effect: 'deep matte, rich',
    mood: 'masculine + powerful',
  },
  'rainy-indoor': {
    colors: ['#4B5563', '#1F2937'],
    effect: 'deep matte glass',
    mood: 'cozy + intimate',
  },
  'sunny-outdoor': {
    colors: ['#FCD34D', '#F59E0B'],
    effect: 'bright gradient, airy',
    mood: 'energetic + warm',
  },
  'late-night': {
    colors: ['#1E1B4B', '#312E81'],
    effect: 'deep purple glow',
    mood: 'mysterious + alive',
  },
  'weekend-energy': {
    colors: ['#EC4899', '#8B5CF6'],
    effect: 'vibrant gradient, pulsing',
    mood: 'celebratory',
  },
};

export const getVibeGradient = (
  vibeTags?: string[] | null,
  musicGenres?: string[] | null,
  category?: string | null,
  weather?: { precipitation: number; temperature: number } | null,
  timeContext?: { hour: number; day: number } | null
) => {
  const tags = vibeTags || [];
  const genres = musicGenres || [];
  const cat = category || '';

  if (weather && weather.precipitation > 0) {
    return vibeGradients['rainy-indoor'];
  }
  
  if (weather && weather.temperature > 75 && timeContext && timeContext.hour >= 11 && timeContext.hour < 20) {
    return vibeGradients['sunny-outdoor'];
  }
  
  if (timeContext) {
    const { hour, day } = timeContext;
    if (hour >= 22 || hour < 4) {
      return vibeGradients['late-night'];
    }
    if ((day === 5 || day === 6) && hour >= 20) {
      return vibeGradients['weekend-energy'];
    }
  }
  
  if (tags.includes('high-energy')) return vibeGradients['high-energy'];
  if (tags.includes('rooftop')) return vibeGradients['rooftop'];
  if (tags.includes('upscale') || tags.includes('upscale-lounge')) return vibeGradients['upscale-lounge'];
  if (tags.includes('chill') || tags.includes('cozy')) return vibeGradients['chill'];
  
  if (genres.includes('afrobeats')) return vibeGradients['afrobeats'];
  if (genres.includes('hip-hop')) return vibeGradients['hip-hop'];
  if (genres.includes('edm') || genres.includes('house')) return vibeGradients['edm'];
  
  if (cat === 'dining') {
    if (tags.includes('upscale')) return vibeGradients['upscale-dining'];
    if (tags.includes('brunch')) return vibeGradients['brunch'];
    if (genres.includes('italian')) return vibeGradients['italian'];
  }
  
  return vibeGradients['upscale-lounge'];
};

export default { vibeGradients, getVibeGradient };

export const glassStyles = {
  matte: {
    backgroundColor: 'rgba(18, 18, 22, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(38, 38, 43, 0.8)',
  },
  glossy: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  frosted: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
};
