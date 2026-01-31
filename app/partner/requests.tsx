import React, { useState, useEffect } from 'react';
import { partnerFetch } from '../../utils/partnerApi';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme';

const API_BASE = 'https://lumina.viberyte.com';

type Request = {
  id: number;
  floor_item_id: number;
  user_name: string;
  user_phone: string;
  party_size: number;
  status: 'pending' | 'approved' | 'confirmed' | 'declined' | 'cancelled';
  claimed_at: string;
  notes?: string;
  instagram_handle?: string;
  instagram_followers?: number;
  instagram_verified?: boolean;
  profile_picture?: string;
  item_name?: string;
  item_type?: string;
  item_price?: number;
  venue_name?: string;
};

export default function PartnerRequests() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await partnerFetch(`/api/partner/requests`, {
        
      });

      if (res.status === 401) {
        router.replace('/partner');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const handleAction = async (requestId: number, action: 'approve' | 'decline') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const actionText = action === 'approve' ? 'approve' : 'decline';
    
    Alert.alert(
      `${action === 'approve' ? 'Approve' : 'Decline'} Request`,
      `Are you sure you want to ${actionText} this request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Decline',
          style: action === 'decline' ? 'destructive' : 'default',
          onPress: () => processAction(requestId, action),
        },
      ]
    );
  };

  const processAction = async (requestId: number, action: 'approve' | 'decline') => {
    setProcessingId(requestId);
    
    try {
      const res = await partnerFetch(`/api/partner/requests/${requestId}/${action}`, {
        method: 'POST',
        
      });

      if (res.ok) {
        Haptics.notificationAsync(
          action === 'approve' 
            ? Haptics.NotificationFeedbackType.Success 
            : Haptics.NotificationFeedbackType.Warning
        );
        
        setRequests(prev => 
          prev.map(r => 
            r.id === requestId 
              ? { ...r, status: action === 'approve' ? 'approved' : 'declined' } 
              : r
          )
        );
      } else {
        Alert.alert('Error', 'Failed to process request. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFollowers = (count?: number) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'approved') return r.status === 'approved' || r.status === 'confirmed';
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Requests</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              Pending
            </Text>
            {pendingCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
            onPress={() => setFilter('approved')}
          >
            <Text style={[styles.filterText, filter === 'approved' && styles.filterTextActive]}>
              Approved
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="mail-open-outline" size={48} color={colors.zinc[700]} />
              <Text style={styles.emptyTitle}>No requests</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'pending' 
                  ? 'New booking requests will appear here'
                  : 'No requests match this filter'
                }
              </Text>
            </View>
          ) : (
            filteredRequests.map((request, index) => (
              <Animated.View
                key={request.id}
                entering={FadeInDown.delay(index * 50).duration(300)}
              >
                <View style={styles.requestCard}>
                  {/* Profile Section */}
                  <View style={styles.profileSection}>
                    {request.profile_picture ? (
                      <Image 
                        source={{ uri: request.profile_picture }} 
                        style={styles.profileImage} 
                      />
                    ) : (
                      <View style={styles.profilePlaceholder}>
                        <Ionicons name="person" size={24} color={colors.zinc[600]} />
                      </View>
                    )}
                    
                    <View style={styles.profileInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.userName}>{request.user_name}</Text>
                        {request.instagram_verified && (
                          <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                        )}
                      </View>
                      
                      {request.instagram_handle && (
                        <View style={styles.instagramRow}>
                          <Ionicons name="logo-instagram" size={14} color={colors.zinc[500]} />
                          <Text style={styles.instagramHandle}>@{request.instagram_handle}</Text>
                          {request.instagram_followers && (
                            <Text style={styles.followerCount}>
                              · {formatFollowers(request.instagram_followers)} followers
                            </Text>
                          )}
                        </View>
                      )}
                    </View>

                    <Text style={styles.timeAgo}>{formatTime(request.claimed_at)}</Text>
                  </View>

                  {/* Request Details */}
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="people-outline" size={16} color={colors.zinc[500]} />
                        <Text style={styles.detailText}>{request.party_size} guests</Text>
                      </View>
                      {request.item_name && (
                        <View style={styles.detailItem}>
                          <Ionicons name="wine-outline" size={16} color={colors.zinc[500]} />
                          <Text style={styles.detailText}>{request.item_name}</Text>
                        </View>
                      )}
                      {request.item_price && (
                        <View style={styles.detailItem}>
                          <Text style={styles.priceText}>${request.item_price}</Text>
                        </View>
                      )}
                    </View>

                    {request.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesText}>"{request.notes}"</Text>
                      </View>
                    )}
                  </View>

                  {/* Status or Actions */}
                  {request.status === 'pending' ? (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.declineButton}
                        onPress={() => handleAction(request.id, 'decline')}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <ActivityIndicator size="small" color={colors.zinc[400]} />
                        ) : (
                          <Text style={styles.declineText}>Decline</Text>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleAction(request.id, 'approve')}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.approveText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.statusRow}>
                      <View style={[
                        styles.statusBadge,
                        request.status === 'approved' && styles.statusApproved,
                        request.status === 'confirmed' && styles.statusConfirmed,
                        request.status === 'declined' && styles.statusDeclined,
                        request.status === 'cancelled' && styles.statusCancelled,
                      ]}>
                        <Text style={[
                          styles.statusText,
                          request.status === 'approved' && styles.statusTextApproved,
                          request.status === 'confirmed' && styles.statusTextConfirmed,
                          request.status === 'declined' && styles.statusTextDeclined,
                          request.status === 'cancelled' && styles.statusTextCancelled,
                        ]}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Animated.View>
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  // Filter
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.zinc[500],
  },
  filterTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: 'rgba(139,92,246,0.9)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  // Scroll
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.zinc[500],
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.zinc[600],
    marginTop: 8,
    textAlign: 'center',
  },
  // Request Card - NO BORDER, spacing does the work
  requestCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  // Profile Section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profilePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  instagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  instagramHandle: {
    fontSize: 13,
    color: colors.zinc[500],
  },
  followerCount: {
    fontSize: 13,
    color: colors.zinc[600],
  },
  // Time - de-emphasized, disappears unless you look
  timeAgo: {
    fontSize: 12,
    color: colors.zinc[700],
  },
  // Details Section
  detailsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: colors.zinc[400],
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Notes - rounder, more system-like
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
  },
  notesText: {
    fontSize: 14,
    color: colors.zinc[400],
    fontStyle: 'italic',
  },
  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  // Decline - micro affordance with subtle border
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  // Approve - softened, not peak brand color
  approveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Status - SF pill control spacing
  statusRow: {
    marginTop: 18,
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  statusApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  statusConfirmed: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  statusDeclined: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(113, 113, 122, 0.12)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextApproved: {
    color: '#22C55E',
  },
  statusTextConfirmed: {
    color: '#3B82F6',
  },
  statusTextDeclined: {
    color: '#EF4444',
  },
  statusTextCancelled: {
    color: colors.zinc[500],
  },
});
