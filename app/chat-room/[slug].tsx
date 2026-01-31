import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../../theme';
import { glassStyles } from '../../theme/vibeGradients';

const API_BASE = 'https://lumina.viberyte.com';

interface Message {
  id: number;
  room_slug: string;
  user_id: number | null;
  partner_id: number | null;
  content: string;
  message_type: 'text' | 'official_flyer' | 'official_event' | 'official_text' | 'community_video' | 'community_photo' | 'community_text';
  created_at: string;
  username?: string;
  partner_name?: string;
}

interface Room {
  id: number;
  name: string;
  slug: string;
  description: string;
  city: string;
  borough: string | null;
  context?: string;
}

const ROOM_CONTEXTS: { [key: string]: string } = {
  'hip-hop-rnb': 'Bottle-service energy · Late-night crowd',
  'house-techno': 'Music-first · Underground vibe',
  'afrobeats-amapiano': 'Dance-forward nights · High energy',
  'latin': 'Rhythm & culture · Social atmosphere',
  'edm-festival': 'Peak energy · Festival vibes',
  'jazz-live': 'Intimate performances · Laid-back scene',
  'lounge-rooftop': 'Elevated drinks · Skyline views',
  'date-night': 'Romantic settings · Conversation-friendly',
  'foodie-experiences': 'Chef-driven · Memorable meals',
  'casual-social': 'Group-friendly · Relaxed dining',
  'late-night': 'After-hours fuel · Open late',
  'cultural-dining': 'Authentic flavors · Community spots',
  'quick-solo': 'Fast & quality · Solo-friendly',
  'spontaneous': 'Open to anything · See what happens',
};

const getMessageIcon = (messageType: string): string => {
  if (messageType === 'official_flyer') return 'image';
  if (messageType === 'official_event') return 'calendar';
  return 'sparkles';
};

interface MessageComponentProps {
  message: Message;
  prevMsg: Message | null;
  index: number;
  onLongPress: (message: Message) => void;
  onPartnerPress: (partnerId: number) => void;
  shouldShowTimeDivider: (currentMsg: Message, prevMsg: Message | null) => boolean;
  isSameSenderGroup: (currentMsg: Message, prevMsg: Message | null) => boolean;
}

const MessageComponent: React.FC<MessageComponentProps> = ({
  message,
  prevMsg,
  index,
  onLongPress,
  onPartnerPress,
  shouldShowTimeDivider,
  isSameSenderGroup,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const isOfficial = message.message_type.startsWith('official_');
  const displayName = message.partner_name || message.username || 'Anonymous';
  const showTimeDivider = shouldShowTimeDivider(message, prevMsg);
  const isGrouped = isSameSenderGroup(message, prevMsg);
  const messageIcon = isOfficial ? getMessageIcon(message.message_type) : null;

  const renderTimeDivider = (timestamp: string) => (
    <View style={styles.timeDivider}>
      <View style={styles.timeDividerLine} />
      <View style={styles.timeDividerTextContainer}>
        <Text style={styles.timeDividerText}>
          {new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
      <View style={styles.timeDividerLine} />
    </View>
  );

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {showTimeDivider && renderTimeDivider(message.created_at)}
      
      <Pressable
        onLongPress={() => onLongPress(message)}
        style={[
          styles.messageContainer,
          isGrouped && styles.messageGrouped,
        ]}
      >
        <View style={[
          styles.messageBubble,
          isOfficial && styles.officialBubble,
        ]}>
          {isOfficial && <View style={styles.officialAccent} />}
          
          {!isGrouped && (
            <View style={styles.messageHeader}>
              <View style={styles.senderRow}>
                {isOfficial && messageIcon && (
                  <Ionicons 
                    name={messageIcon as any} 
                    size={14} 
                    color={colors.violet[400]} 
                    style={styles.messageIcon}
                  />
                )}
                {isOfficial && message.partner_id ? (
                  <TouchableOpacity onPress={() => onPartnerPress(message.partner_id!)}>
                    <Text style={[styles.messageSender, styles.partnerNameTappable]}>
                      {displayName}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.messageSender}>
                    {displayName}
                  </Text>
                )}
              </View>
              {isOfficial && <Text style={styles.officialBadge}>OFFICIAL</Text>}
            </View>
          )}
          
          <Text style={styles.messageText}>{message.content}</Text>
          
          {!isGrouped && (
            <Text style={styles.messageTime}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default function ChatRoomScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    fetchRoomAndMessages();
    
    pollingInterval.current = setInterval(() => {
      fetchMessages(true);
    }, 3000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [slug]);

  const fetchMessages = async (silent = false) => {
    try {
      const messagesResponse = await fetch(`${API_BASE}/api/chat/messages?room_slug=${slug}`);
      const messagesData = await messagesResponse.json();
      
      if (messagesData.messages) {
        const newMessages = messagesData.messages;
        
        if (!silent && newMessages.length > messages.length && !isAtBottom) {
          setUnreadCount(prev => prev + (newMessages.length - messages.length));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchRoomAndMessages = async () => {
    try {
      setLoading(true);
      
      const messagesResponse = await fetch(`${API_BASE}/api/chat/messages?room_slug=${slug}`);
      const messagesData = await messagesResponse.json();
      
      setMessages(messagesData.messages || []);
      
      const slugParts = (slug as string).split('-');
      const vibeSlug = slugParts.length > 1 ? slugParts.slice(1).join('-') : slug as string;
      const context = ROOM_CONTEXTS[vibeSlug] || 'Discover what is happening';
      
      setRoom({
        id: 0,
        name: formatRoomName(slug as string),
        slug: slug as string,
        description: '',
        city: '',
        borough: null,
        context,
      });
      
      setLoading(false);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching room data:', error);
      setLoading(false);
    }
  };

  const formatRoomName = (slug: string): string => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
      setUnreadCount(0);
      setShowScrollToBottom(false);
      setIsAtBottom(true);
    }, 100);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;
    
    setIsAtBottom(isBottom);
    setShowScrollToBottom(!isBottom && messages.length > 0);
    
    if (isBottom) {
      setUnreadCount(0);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchMessages();
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Animated.sequence([
      Animated.spring(sendButtonScale, {
        toValue: 0.8,
        useNativeDriver: true,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setSending(true);
      
      const response = await fetch(`${API_BASE}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_slug: slug,
          content: messageText,
          message_type: 'community_text',
          user_id: 1,
        }),
      });

      if (response.ok) {
        setMessageText('');
        fetchMessages();
        scrollToBottom();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errorData = await response.json();
        console.error('Send message error:', errorData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Network error. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  const handleInputFocus = () => {
    setKeyboardVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(inputFocusAnim, {
      toValue: 1,
      useNativeDriver: false,
    }).start();
  };

  const handleInputBlur = () => {
    setKeyboardVisible(false);
    Animated.spring(inputFocusAnim, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const handleMessageLongPress = (message: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handlePartnerPress = (partnerId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/partner/${partnerId}`);
  };

  const shouldShowTimeDivider = (currentMsg: Message, prevMsg: Message | null): boolean => {
    if (!prevMsg) return true;
    
    const currentTime = new Date(currentMsg.created_at).getTime();
    const prevTime = new Date(prevMsg.created_at).getTime();
    const timeDiff = currentTime - prevTime;
    
    return timeDiff > 60 * 60 * 1000;
  };

  const isSameSenderGroup = (currentMsg: Message, prevMsg: Message | null): boolean => {
    if (!prevMsg) return false;
    
    const isSameSender = 
      currentMsg.user_id === prevMsg.user_id && 
      currentMsg.partner_id === prevMsg.partner_id;
    
    if (!isSameSender) return false;
    
    const currentTime = new Date(currentMsg.created_at).getTime();
    const prevTime = new Date(prevMsg.created_at).getTime();
    const timeDiff = currentTime - prevTime;
    
    return timeDiff < 5 * 60 * 1000;
  };

  const inputBorderColor = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(167, 139, 250, 0.2)', 'rgba(167, 139, 250, 0.6)'],
  });

  const inputOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const charCount = messageText.length;
  const showCharCount = charCount > 400;
  const charCountColor = charCount > 480 ? colors.red[400] : colors.zinc[500];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.violet[500]} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.roomName}>{room?.name}</Text>
            <Text style={styles.roomContext}>{room?.context}</Text>
          </View>
        </View>

        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { 
              useNativeDriver: true,
              listener: handleScroll,
            }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.violet[400]}
            />
          }
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.zinc[600]} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Be the first to start the conversation</Text>
            </View>
          ) : (
            messages.map((msg, idx) => (
              <MessageComponent
                key={msg.id}
                message={msg}
                prevMsg={idx > 0 ? messages[idx - 1] : null}
                index={idx}
                onLongPress={handleMessageLongPress}
                onPartnerPress={handlePartnerPress}
                shouldShowTimeDivider={shouldShowTimeDivider}
                isSameSenderGroup={isSameSenderGroup}
              />
            ))
          )}
        </Animated.ScrollView>

        {showScrollToBottom && (
          <TouchableOpacity
            style={styles.scrollToBottomButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              scrollToBottom();
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.scrollToBottomInner, glassStyles.liquid]}>
              <Ionicons name="arrow-down" size={20} color={colors.white} />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={90}
        >
          <Animated.View style={[
            styles.inputWrapper,
            { opacity: keyboardVisible ? 1 : inputOpacity }
          ]}>
            <Animated.View style={[
              styles.inputContainer, 
              glassStyles.liquid,
              { borderColor: inputBorderColor }
            ]}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={colors.zinc[500]}
                value={messageText}
                onChangeText={setMessageText}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                multiline
                maxLength={500}
              />
              {showCharCount && (
                <Text style={[styles.charCount, { color: charCountColor }]}>
                  {charCount}/500
                </Text>
              )}
              <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                  style={[
                    styles.sendButton,
                    (!messageText.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="send" size={20} color={colors.white} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  roomName: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  roomContext: {
    fontSize: typography.sizes.sm,
    color: colors.violet[400],
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.zinc[400],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[500],
  },
  timeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  timeDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeDividerTextContainer: {
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  timeDividerText: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[500],
    fontWeight: '600',
    paddingVertical: 4,
  },
  messageContainer: {
    marginBottom: spacing.md,
  },
  messageGrouped: {
    marginTop: -8,
    marginBottom: 4,
  },
  messageBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: '88%',
    alignSelf: 'flex-start',
    position: 'relative',
  },
  officialBubble: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
    maxWidth: '92%',
    borderRadius: 12,
  },
  officialAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.violet[500],
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginLeft: 3,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messageIcon: {
    marginRight: 6,
  },
  messageSender: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.white,
  },
  partnerNameTappable: {
    color: colors.violet[400],
    textDecorationLine: 'underline',
  },
  officialBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.violet[400],
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  messageText: {
    fontSize: typography.sizes.md,
    color: colors.zinc[200],
    lineHeight: 20,
    marginBottom: spacing.xs,
    marginLeft: 3,
  },
  messageTime: {
    fontSize: typography.sizes.xs,
    color: colors.zinc[500],
    marginLeft: 3,
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    zIndex: 1000,
  },
  scrollToBottomInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.violet[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  inputWrapper: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 2,
    position: 'relative',
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.white,
    maxHeight: 100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  charCount: {
    position: 'absolute',
    top: 8,
    right: 60,
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.violet[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.zinc[700],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.zinc[400],
  },
});
