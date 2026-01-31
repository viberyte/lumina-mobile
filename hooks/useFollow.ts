import { useState, useEffect, useCallback } from 'react';
import { requireAuth } from '../utils/authGate';
import { getUserId } from '../utils/user';

const API_BASE = 'https://lumina.viberyte.com';

type FollowType = 'venue' | 'promoter';

export function useFollow(followType: FollowType, followId: number | string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    if (userId && followId) {
      checkFollowStatus();
    }
  }, [userId, followId]);

  const initUser = async () => {
    const id = await getUserId();
    setUserId(id);
  };

  const checkFollowStatus = async () => {
    if (!userId || !followId) return;
    
    try {
      const res = await fetch(
        `${API_BASE}/api/follows/check?user_id=${userId}&follow_type=${followType}&follow_id=${followId}`
      );
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.is_following);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = useCallback(async () => {
    const isAuthed = await requireAuth('follow this');
    if (!isAuthed) return;
    if (!userId || !followId) return;

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing); // Optimistic update

    try {
      if (wasFollowing) {
        // Unfollow
        await fetch(
          `${API_BASE}/api/follows?user_id=${userId}&follow_type=${followType}&follow_id=${followId}`,
          { method: 'DELETE' }
        );
      } else {
        // Follow
        await fetch(`${API_BASE}/api/follows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            follow_type: followType,
            follow_id: followId,
          }),
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      setIsFollowing(wasFollowing); // Revert on error
    }
  }, [userId, followId, followType, isFollowing]);

  return {
    isFollowing,
    loading,
    toggleFollow,
  };
}

// Hook to get all follows for home feed
export function useUserFollows() {
  const [follows, setFollows] = useState<{
    venues: any[];
    promoters: any[];
  }>({ venues: [], promoters: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollows();
  }, []);

  const fetchFollows = async () => {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_BASE}/api/follows?user_id=${userId}`);
      const data = await res.json();
      
      if (data.success) {
        setFollows({
          venues: data.venues || [],
          promoters: data.promoters || [],
        });
      }
    } catch (error) {
      console.error('Error fetching follows:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setLoading(true);
    fetchFollows();
  };

  return {
    follows,
    loading,
    refresh,
  };
}
