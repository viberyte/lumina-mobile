// Helper to validate media URLs and types
export const isValidVideoUrl = (url: string): boolean => {
  // Check if URL ends with video extension
  const videoExtensions = ['.mp4', '.mov', '.m4v', '.webm'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.endsWith(ext));
};

// For now, treat all Instagram media as images since videos may be mislabeled
export const getMediaType = (item: any): 'IMAGE' | 'VIDEO' => {
  // Instagram videos from our scraper may be mislabeled
  // Only trust VIDEO type if we can verify it's actually a video
  // For now, default to IMAGE to avoid black screens
  
  // TODO: Fix on server side by checking actual file types
  return 'IMAGE';
};

export const getMediaUrl = (item: any, baseUrl: string = 'https://lumina.viberyte.com'): string => {
  if (!item.media_url) return '';
  
  if (item.media_url.startsWith('http')) {
    return item.media_url;
  }
  
  return `${baseUrl}${item.media_url}`;
};
