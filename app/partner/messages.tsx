import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const API_BASE = 'https://lumina.viberyte.com';

// Centralized auth helper - use this everywhere
async function getPartnerToken(): Promise<string | null> {
  try {
    const session = await AsyncStorage.getItem('lumina_partner_session');
    if (!session) return null;
    return JSON.parse(session).token;
  } catch {
    return null;
  }
}

type Conversation = {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  instagram_handle?: string;
  instagram_verified?: boolean;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  booking_id?: number;
  event_name?: string;
};

type Message = {
  id: number;
  sender_type: 'partner' | 'user';
  content: string;
  created_at: string;
  read_at?: string;
};

export default function PartnerMessages() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const token = await getPartnerToken();
      if (!token) {
        router.replace('/partner');
        return;
      }

      const res = await fetch(API_BASE + '/api/partner/messages', {
        headers: { Authorization: 'Bearer ' + token },
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    setLoadingMessages(true);
    try {
      const token = await getPartnerToken();
      if (!token) return;

      const res = await fetch(API_BASE + '/api/partner/messages/' + conversationId, {
        headers: { Authorization: 'Bearer ' + token },
      });

      if (res.ok) {
        const data = await res.json();
        // Reverse for inverted FlatList (newest at bottom)
        setMessages((data.messages || []).reverse());
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markConversationRead = async (conversationId: number) => {
    try {
      const token = await getPartnerToken();
      if (!token) return;

      await fetch(API_BASE + '/api/partner/messages/' + conversationId + '/read', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  const openConversation = (conversation: Conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    if (conversation.unread_count > 0) {
      markConversationRead(conversation.id);
    }
  };

  const closeConversation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedConversation(null);
    setMessages([]);
    fetchConversations();
  };

  const openInstagramProfile = (handle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('https://instagram.com/' + handle).catch(() => {
      Alert.alert('Error', 'Could not open Instagram');
    });
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    
    const tempMessage: Message = {
      id: Date.now(),
      sender_type: 'partner',
      content: messageText.trim(),
      created_at: new Date().toISOString(),
    };
    
    // Add to beginning for inverted list
    setMessages(prev => [tempMessage, ...prev]);
    const sentText = messageText.trim();
    setMessageText('');

    try {
      const token = await getPartnerToken();
      if (!token) return;

      const res = await fetch(API_BASE + '/api/partner/messages/' + selectedConversation.id, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ content: sentText }),
      });

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        setMessageText(sentText);
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setMessageText(sentText);
      Alert.alert('Error', 'Connection failed');
    } finally {
      setSending(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <TouchableOpacity 
        style={[styles.conversationRow, item.unread_count > 0 && styles.unreadRow]}
        onPress={() => openConversation(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.user_avatar ? (
            <Image source={{ uri: item.user_avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.user_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unread_count > 9 ? '9+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, item.unread_count > 0 && styles.unreadText]}>
                {item.user_name}
              </Text>
              {item.instagram_verified && (
                <Ionicons name="checkmark-circle" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.timeText}>{formatTime(item.last_message_at)}</Text>
          </View>
          
          {item.instagram_handle && (
            <Text style={styles.instagramHandle}>@{item.instagram_handle}</Text>
          )}
          
          <Text style={[styles.lastMessage, item.unread_count > 0 && styles.unreadText]} numberOfLines={1}>
            {item.last_message}
          </Text>
          
          {item.event_name && (
            <View style={styles.eventTag}>
              <Ionicons name="calendar-outline" size={12} color="#8b5cf6" />
              <Text style={styles.eventTagText}>{item.event_name}</Text>
            </View>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#3f3f46" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isPartner = item.sender_type === 'partner';
    return (
      <View style={[styles.messageBubble, isPartner ? styles.partnerBubble : styles.userBubble]}>
        <Text style={[styles.messageText, isPartner && styles.partnerMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isPartner && styles.partnerMessageTime]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  // Message Thread View
  if (selectedConversation) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.threadHeader}>
            <TouchableOpacity onPress={closeConversation} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.threadHeaderInfo}>
              <Text style={styles.threadHeaderName}>{selectedConversation.user_name}</Text>
              {selectedConversation.instagram_handle && (
                <Text style={styles.threadHeaderHandle}>@{selectedConversation.instagram_handle}</Text>
              )}
            </View>
            
            {selectedConversation.instagram_handle && (
              <TouchableOpacity onPress={() => openInstagramProfile(selectedConversation.instagram_handle!)}>
                <Ionicons name="logo-instagram" size={24} color="#E1306C" />
              </TouchableOpacity>
            )}
          </View>

          <KeyboardAvoidingView 
            style={styles.messagesContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {loadingMessages ? (
              <View style={styles.center}>
                <ActivityIndicator color="#8b5cf6" />
              </View>
            ) : (
              <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.messagesList}
                inverted
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <Ionicons name="chatbubble-outline" size={48} color="#3f3f46" />
                    <Text style={styles.emptyMessagesText}>No messages yet</Text>
                    <Text style={styles.emptyMessagesHint}>Send the first message!</Text>
                  </View>
                }
              />
            )}

            <SafeAreaView edges={['bottom']} style={styles.inputBarSafe}>
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.messageInput}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Type a message..."
                  placeholderTextColor="#52525b"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
                  onPress={sendMessage}
                  disabled={!messageText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Conversations List View
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={{ width: 24 }} />
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#3f3f46" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              When customers reach out about bookings or events, their messages will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#8b5cf6"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  unreadRow: { borderColor: '#8b5cf6', backgroundColor: '#1a1a2e' },

  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  conversationContent: { flex: 1 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  unreadText: { fontWeight: '700' },
  timeText: { fontSize: 12, color: '#52525b' },
  instagramHandle: { fontSize: 13, color: '#71717a', marginBottom: 4 },
  lastMessage: { fontSize: 14, color: '#71717a', marginBottom: 6 },
  eventTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  eventTagText: { fontSize: 12, color: '#8b5cf6', fontWeight: '500' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#71717a', textAlign: 'center', lineHeight: 22 },

  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
    gap: 16,
  },
  threadHeaderInfo: { flex: 1 },
  threadHeaderName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  threadHeaderHandle: { fontSize: 14, color: '#71717a' },

  messagesContainer: { flex: 1 },
  messagesList: { padding: 16, flexGrow: 1 },
  
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#27272a',
    borderBottomLeftRadius: 6,
  },
  partnerBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#8b5cf6',
    borderBottomRightRadius: 6,
  },
  messageText: { fontSize: 16, color: '#fff', lineHeight: 22 },
  partnerMessageText: { color: '#fff' },
  messageTime: { fontSize: 11, color: '#71717a', marginTop: 4, alignSelf: 'flex-end' },
  partnerMessageTime: { color: 'rgba(255,255,255,0.7)' },

  emptyMessages: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyMessagesText: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 16 },
  emptyMessagesHint: { fontSize: 14, color: '#71717a', marginTop: 4 },

  inputBarSafe: { backgroundColor: '#000' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f1f23',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#3f3f46' },
});
