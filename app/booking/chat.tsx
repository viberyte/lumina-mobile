import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://lumina.viberyte.com';
const POLL_INTERVAL = 8000;

interface Message {
  id: number;
  sender_type: 'customer' | 'partner' | 'system';
  sender_name: string;
  sender_instagram: string | null;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface BookingInfo {
  id: number;
  confirmation_code: string;
  venue_name: string;
  partner_name: string | null;
  booking_date: string;
}

export default function BookingChatScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [hasInstagram, setHasInstagram] = useState<boolean | null>(null);
  const [instagramHandle, setInstagramHandle] = useState('');
  const [linkingInstagram, setLinkingInstagram] = useState(false);

  const loadMessages = useCallback(async (showRefresh = false) => {
    if (!userId || !bookingId) return;
    if (showRefresh) setRefreshing(true);

    try {
      const response = await fetch(
        `${API_URL}/api/messages/conversation?booking_id=${bookingId}&user_id=${userId}`
      );
      const data = await response.json();

      if (data.error) {
        console.error('Load messages error:', data.error);
        return;
      }

      setBooking(data.booking);
      if (data.messages?.length !== messages.length) {
        setMessages(data.messages || []);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [userId, bookingId, messages.length]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@lumina_user');
        if (!storedUser) {
          Alert.alert('Error', 'Please log in to use chat', [
            { text: 'OK', onPress: () => router.back() }
          ]);
          return;
        }

        const user = JSON.parse(storedUser);
        const uid = parseInt(user.id) || 1;
        setUserId(uid);

        const igResponse = await fetch(`${API_URL}/api/users/instagram?user_id=${uid}`);
        const igData = await igResponse.json();
        setHasInstagram(igData.has_instagram);

        const response = await fetch(
          `${API_URL}/api/messages/conversation?booking_id=${bookingId}&user_id=${uid}`
        );
        const data = await response.json();

        if (data.error) {
          console.log('Conversation error:', data.error);
        } else {
          setBooking(data.booking);
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Initialize chat error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [bookingId]);

  useEffect(() => {
    if (!userId || !bookingId || hasInstagram === false) return;

    const interval = setInterval(() => {
      loadMessages(false);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [userId, bookingId, hasInstagram, loadMessages]);

  const linkInstagram = async () => {
    if (!instagramHandle.trim()) {
      Alert.alert('Error', 'Please enter your Instagram handle');
      return;
    }

    setLinkingInstagram(true);
    try {
      const response = await fetch(`${API_URL}/api/users/instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          instagram_handle: instagramHandle.trim(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      setHasInstagram(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to link Instagram');
    } finally {
      setLinkingInstagram(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || !booking) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: parseInt(bookingId as string),
          sender_type: 'customer',
          sender_id: userId,
          message: messageText,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setNewMessage(messageText);
        if (data.code === 'INSTAGRAM_REQUIRED') {
          setHasInstagram(false);
        } else {
          Alert.alert('Error', data.error);
        }
        return;
      }

      setMessages((prev) => [...prev, data.message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setNewMessage(messageText);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_type === 'customer';
    const isSystem = item.sender_type === 'system';
    const showDate = index === 0 || formatDate(item.created_at) !== formatDate(messages[index - 1].created_at);

    return (
      <View>
        {showDate ? (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        ) : null}
        {isSystem ? (
          <View style={styles.systemMessage}>
            <Text style={styles.systemText}>{item.message}</Text>
          </View>
        ) : (
          <View style={[styles.messageRow, isMe ? styles.messageRowMe : null]}>
            <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
              {!isMe ? <Text style={styles.senderName}>{item.sender_name || 'Promoter'}</Text> : null}
              <Text style={[styles.messageText, isMe ? styles.messageTextMe : null]}>{item.message}</Text>
              <Text style={[styles.timeText, isMe ? styles.timeTextMe : null]}>
                {formatTime(item.created_at)}
                {isMe && item.read_at ? ' ✓✓' : ''}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{booking?.venue_name || 'Chat'}</Text>
          <Text style={styles.headerSubtitle}>{booking?.confirmation_code}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {hasInstagram === false ? (
        <View style={styles.instagramPrompt}>
          <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#888" />
          </TouchableOpacity>
          
          <View style={styles.instagramIcon}>
            <Ionicons name="logo-instagram" size={40} color="#E1306C" />
          </View>
          <Text style={styles.instagramTitle}>Link Your Instagram</Text>
          <Text style={styles.instagramSubtitle}>
            Connect your Instagram to message venues and promoters. This helps them verify you're a real person.
          </Text>
          <View style={styles.instagramInputRow}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={styles.instagramInput}
              placeholder="your_handle"
              placeholderTextColor="#666"
              value={instagramHandle}
              onChangeText={setInstagramHandle}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.linkButton} onPress={linkInstagram} disabled={linkingInstagram}>
            {linkingInstagram ? <ActivityIndicator color="#fff" /> : <Text style={styles.linkButtonText}>Link Instagram</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backToBookingButton} onPress={() => router.back()}>
            <Text style={styles.backToBookingText}>Back to Booking</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.chatContainer} 
          keyboardVerticalOffset={0}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color="#444" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Send a message to {booking?.partner_name || 'the promoter'} about your reservation
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadMessages(true)}
                  tintColor="#8B5CF6"
                />
              }
            />
          )}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) ? styles.sendButtonDisabled : null]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  headerSubtitle: { color: '#8B5CF6', fontSize: 12, marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatContainer: { flex: 1 },
  messagesList: { padding: 16, paddingBottom: 8 },
  dateSeparator: { alignItems: 'center', marginVertical: 16 },
  dateText: { color: '#666', fontSize: 12, backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  messageRow: { flexDirection: 'row', marginBottom: 8 },
  messageRowMe: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: '#8B5CF6', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#222', borderBottomLeftRadius: 4 },
  senderName: { color: '#8B5CF6', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  messageText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  messageTextMe: { color: '#fff' },
  timeText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4, textAlign: 'right' },
  timeTextMe: { color: 'rgba(255,255,255,0.7)' },
  systemMessage: { alignItems: 'center', marginVertical: 8 },
  systemText: { color: '#666', fontSize: 13, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#222', backgroundColor: '#000' },
  input: { flex: 1, backgroundColor: '#111', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 16, maxHeight: 100, marginRight: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#333' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  instagramPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  skipButton: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  instagramIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  instagramTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  instagramSubtitle: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  instagramInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, width: '100%' },
  atSymbol: { color: '#666', fontSize: 18, marginRight: 4 },
  instagramInput: { flex: 1, color: '#fff', fontSize: 18, paddingVertical: 14 },
  linkButton: { backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  linkButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backToBookingButton: { marginTop: 20, paddingVertical: 12 },
  backToBookingText: { color: '#888', fontSize: 15 },
});
