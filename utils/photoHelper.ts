import { API_BASE } from '../config';

// ============================================
// TYPES
// ============================================

export type MediaSource = 'google' | 'instagram' | 'tiktok' | 'gallery' | 'certified';

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  source: MediaSource;
  // TikTok specific
  tiktok_id?: string;
  play_count?: number;
  like_count?: number;
}

// ============================================
// HELPERS
// ============================================

// Normalize mixed formats (string URLs + objects)
const normalizeMedia = (item: any): { type: 'image' | 'video'; url: string; thumbnail?: string } => {
  if (typeof item === 'string') {
    return { type: 'image', url: item };
  }
  return {
    type: item?.type === 'video' ? 'video' : 'image',
    url: item?.url || '',
    thumbnail: item?.thumbnail,
  };
};

// Check if URL is valid (not Google Maps API, not expired CDN)
const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string' || url.length === 0) return false;
  if (url.includes('maps.googleapis.com')) return false;
  // Skip Instagram CDN URLs (they expire) - only use local paths
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) return false;
  return true;
};

// Check if URL is a local path (preferred)
const isLocalPath = (url: string): boolean => {
  return url && (url.startsWith('/') || url.includes('lumina.viberyte.com'));
};

// Resolve relative paths to full URLs
const resolveUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`;
  }
  return url;
};

// ============================================
// MAIN FUNCTIONS
// ============================================

export const getPhotoUrl = (venue: any): string | null => {
  if (!venue) return null;

  // PRIORITY 1: google_photos (our downloaded lumina URLs - BEST SOURCE)
  if (venue.google_photos) {
    try {
      const photos = typeof venue.google_photos === 'string'
        ? JSON.parse(venue.google_photos)
        : venue.google_photos;

      if (Array.isArray(photos) && photos.length > 0) {
        const normalized = normalizeMedia(photos[0]);
        if (isLocalPath(normalized.url)) {
          return resolveUrl(normalized.url);
        }
      }
    } catch (e) {}
  }

  // PRIORITY 2: instagram_media (from venue_instagram_media table - local paths)
  if (venue.instagram_media && Array.isArray(venue.instagram_media) && venue.instagram_media.length > 0) {
    const firstImage = venue.instagram_media.find((m: any) => m.type !== 'video' && isLocalPath(m.url));
    if (firstImage) {
      return resolveUrl(firstImage.url);
    }
    // If only videos, use the first video thumbnail or URL
    const firstVideo = venue.instagram_media.find((m: any) => m.type === 'video');
    if (firstVideo && isLocalPath(firstVideo.url)) {
      return resolveUrl(firstVideo.thumbnail || firstVideo.url);
    }
  }

  // PRIORITY 3: TikTok cover (if no other photos)
  if (venue.tiktok_videos && Array.isArray(venue.tiktok_videos) && venue.tiktok_videos.length > 0) {
    const firstTiktok = venue.tiktok_videos[0];
    if (firstTiktok.thumbnail && isLocalPath(firstTiktok.thumbnail)) {
      return resolveUrl(firstTiktok.thumbnail);
    }
  }

  // PRIORITY 4: photo_url (direct URL if set)
  if (venue.photo_url && isLocalPath(venue.photo_url)) {
    return resolveUrl(venue.photo_url);
  }

  // PRIORITY 5: image_url (single direct URL)
  if (venue.image_url && isLocalPath(venue.image_url)) {
    return resolveUrl(venue.image_url);
  }

  // PRIORITY 6: gallery_photos
  if (venue.gallery_photos) {
    try {
      const photos = typeof venue.gallery_photos === 'string'
        ? JSON.parse(venue.gallery_photos)
        : venue.gallery_photos;
      
      if (Array.isArray(photos) && photos.length > 0) {
        const normalized = normalizeMedia(photos[0]);
        if (isLocalPath(normalized.url)) {
          return resolveUrl(normalized.url);
        }
      }
    } catch (e) {}
  }

  return null;
};

// Get all photos for a venue (images only, no videos)
export const getAllPhotos = (venue: any): string[] => {
  if (!venue) return [];
  const photos: string[] = [];
  const seen = new Set<string>();

  const addPhoto = (url: string) => {
    if (!isLocalPath(url)) return; // Only add local paths
    const resolved = resolveUrl(url);
    if (!seen.has(resolved)) {
      seen.add(resolved);
      photos.push(resolved);
    }
  };

  // Add google_photos first (our best source)
  if (venue.google_photos) {
    try {
      const parsed = typeof venue.google_photos === 'string'
        ? JSON.parse(venue.google_photos)
        : venue.google_photos;
      if (Array.isArray(parsed)) {
        parsed.map(normalizeMedia).forEach(p => {
          if (p.type === 'image') addPhoto(p.url);
        });
      }
    } catch (e) {}
  }

  // Add instagram_media IMAGES (from venue_instagram_media table)
  if (venue.instagram_media && Array.isArray(venue.instagram_media)) {
    venue.instagram_media.forEach((item: any) => {
      if (item.type !== 'video' && item.url) {
        addPhoto(item.url);
      }
    });
  }

  // Add gallery_photos
  if (venue.gallery_photos) {
    try {
      const parsed = typeof venue.gallery_photos === 'string'
        ? JSON.parse(venue.gallery_photos)
        : venue.gallery_photos;
      if (Array.isArray(parsed)) {
        parsed.map(normalizeMedia).forEach(p => {
          if (p.type === 'image') addPhoto(p.url);
        });
      }
    } catch (e) {}
  }

  return photos;
};

// Get all media (photos + videos) with source tagging for persona logic
export const getAllMedia = (venue: any): MediaItem[] => {
  if (!venue) return [];
  const media: MediaItem[] = [];
  const seen = new Set<string>();

  const addMedia = (item: { type: 'image' | 'video'; url: string; thumbnail?: string }, source: MediaSource, index: number, extra?: any) => {
    if (!isLocalPath(item.url)) return; // Only add local paths
    const resolved = resolveUrl(item.url);
    if (!seen.has(resolved)) {
      seen.add(resolved);
      media.push({
        id: `${source}-${item.type}-${index}`,
        type: item.type,
        url: resolved,
        thumbnail: item.thumbnail && isLocalPath(item.thumbnail) ? resolveUrl(item.thumbnail) : undefined,
        source,
        ...extra,
      });
    }
  };

  let googleIndex = 0;
  let instagramIndex = 0;
  let tiktokIndex = 0;
  let galleryIndex = 0;

  // Add google_photos (highest priority - our certified source)
  if (venue.google_photos) {
    try {
      const parsed = typeof venue.google_photos === 'string'
        ? JSON.parse(venue.google_photos)
        : venue.google_photos;
      if (Array.isArray(parsed)) {
        parsed.map(normalizeMedia).forEach(p => {
          addMedia(p, 'google', googleIndex++);
        });
      }
    } catch (e) {}
  }

  // Add instagram_media (from venue_instagram_media table - images AND videos)
  if (venue.instagram_media && Array.isArray(venue.instagram_media)) {
    venue.instagram_media.forEach((item: any) => {
      addMedia({
        type: item.type === 'video' ? 'video' : 'image',
        url: item.url,
        thumbnail: item.thumbnail,
      }, 'instagram', instagramIndex++);
    });
  }

  // Add TikTok videos
  if (venue.tiktok_videos && Array.isArray(venue.tiktok_videos)) {
    venue.tiktok_videos.forEach((item: any) => {
      addMedia({
        type: 'video',
        url: item.url,
        thumbnail: item.thumbnail,
      }, 'tiktok', tiktokIndex++, {
        tiktok_id: item.tiktok_id,
        play_count: item.play_count,
        like_count: item.like_count,
      });
    });
  }

  // Add gallery_photos
  if (venue.gallery_photos) {
    try {
      const parsed = typeof venue.gallery_photos === 'string'
        ? JSON.parse(venue.gallery_photos)
        : venue.gallery_photos;
      if (Array.isArray(parsed)) {
        parsed.map(normalizeMedia).forEach(p => {
          addMedia(p, 'gallery', galleryIndex++);
        });
      }
    } catch (e) {}
  }

  return media;
};

// Get all videos (Instagram + TikTok)
export const getAllVideos = (venue: any): MediaItem[] => {
  const allMedia = getAllMedia(venue);
  return allMedia.filter(m => m.type === 'video');
};

// Get TikTok videos only
export const getTikTokVideos = (venue: any): MediaItem[] => {
  const allMedia = getAllMedia(venue);
  return allMedia.filter(m => m.source === 'tiktok');
};

// Get first video URL if available (Instagram or TikTok)
export const getVideoUrl = (venue: any): string | null => {
  if (!venue) return null;

  // Check instagram_media for videos (local paths)
  if (venue.instagram_media && Array.isArray(venue.instagram_media)) {
    const video = venue.instagram_media.find((m: any) => m.type === 'video' && isLocalPath(m.url));
    if (video) {
      return resolveUrl(video.url);
    }
  }

  // Check TikTok videos
  if (venue.tiktok_videos && Array.isArray(venue.tiktok_videos)) {
    const video = venue.tiktok_videos.find((m: any) => isLocalPath(m.url));
    if (video) {
      return resolveUrl(video.url);
    }
  }

  return null;
};

// Parse vibe tags safely
export const parseVibeTags = (tags: any): string[] => {
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
};
