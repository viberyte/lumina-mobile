import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../theme';
import ChatBubble from '../components/ChatBubble';
import ButtonGroup from '../components/ButtonGroup';
import LoadingDots from '../components/LoadingDots';
import VenueCarousel from '../components/VenueCarousel';
import EventCarousel from '../components/EventCarousel';
import luminaApi from '../services/lumina';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  showButtons?: boolean;
  buttonType?: string;
}

interface FlowContext {
  who?: string;
  when?: string;
  planType?: string;
  vibe?: string;
  cuisine?: string;
  afterDinner?: string;
  musicPreference?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm Lumina, your nightlife concierge. Who's joining you tonight?",
      showButtons: true,
      buttonType: 'who',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [flow, setFlow] = useState<FlowContext>({});
  const [topPicks, setTopPicks] = useState<any[]>([]);
  const [afterDinnerVenues, setAfterDinnerVenues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [showItineraryButton, setShowItineraryButton] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const whoOptions = ['Just me', 'Date', 'Friends', 'Group'];
  const whenOptions = ['Tonight', 'Tomorrow', 'This Weekend'];
  const planTypeOptions = ['Just dinner', 'Dinner + drinks', 'Full night out'];
  const vibeOptions = ['Dinner', 'Nightlife', 'Lounge', 'Something Unique'];
  const cuisineOptions = ['Italian', 'Japanese', 'Soul Food', 'Caribbean', 'Mexican', 'Surprise Me'];
  const afterDinnerOptions = ['Keep it light', 'Go to a lounge', 'Find a club', 'Check out events', 'Call it a night'];
  const musicOptions = ['Hip-Hop', 'R&B', 'Afrobeats', 'Reggaeton', 'EDM / House', 'Open Format', "Doesn't Matter"];

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const generateRecommendations = async (finalFlow: FlowContext) => {
    setLoading(true);
    
    try {
      const response = await luminaApi.getRecommendations({
        city: 'Manhattan',
        flow: finalFlow,
      });

      setTopPicks(response.topPicks || []);
      setAfterDinnerVenues(response.afterDinner || []);
      setEvents(response.events || []);
      setShowItineraryButton(true);


      const eventCount = response.events?.length || 0;
      const venueCount = response.topPicks?.length || 0;
      
      let message = `Perfect! I've found ${venueCount} spots for you.`;
      if (eventCount > 0) {
        message += ` Plus ${eventCount} events happening tonight! 🎉`;
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: message,
        }
      ]);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, something went wrong. Let me try that again!",
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewItinerary = () => {
    const allVenues = [...topPicks.slice(0, 1), ...afterDinnerVenues.slice(0, 2)];
    router.push({
      pathname: '/itinerary',
      params: {
        venues: JSON.stringify(allVenues),
        flow: JSON.stringify(flow),
        city: 'Manhattan',
      },
    });
  };

  const handleFlowSelection = (option: string, step: string) => {
    setMessages(prev => [...prev, { role: 'user', content: option }]);
    const newFlow = { ...flow, [step]: option };
    setFlow(newFlow);

    let nextQuestion = '';
    let nextButtonType = '';

    if (step === 'who') {
      nextQuestion = 'When are you planning this?';
      nextButtonType = 'when';
    } else if (step === 'when') {
      nextQuestion = 'What kind of night are you thinking?';
      nextButtonType = 'planType';
    } else if (step === 'planType') {
      nextQuestion = "What's the vibe?";
      nextButtonType = 'vibe';
    } else if (step === 'vibe') {
      if (option === 'Dinner') {
        nextQuestion = 'What kind of food?';
        nextButtonType = 'cuisine';
      } else {
        nextQuestion = "Perfect! I'm building your recommendations...";
        setMessages(prev => [...prev, { role: 'assistant', content: nextQuestion }]);
        generateRecommendations(newFlow);
        return;
      }
    } else if (step === 'cuisine') {
      nextQuestion = 'What do you want to do after dinner?';
      nextButtonType = 'afterDinner';
    } else if (step === 'afterDinner') {
      if (option === 'Call it a night') {
        nextQuestion = "Perfect! I'm building your recommendations...";
        setMessages(prev => [...prev, { role: 'assistant', content: nextQuestion }]);
        generateRecommendations(newFlow);
        return;
      } else {
        nextQuestion = 'What music do you prefer?';
        nextButtonType = 'musicPreference';
      }
    } else if (step === 'musicPreference') {
      nextQuestion = `Got it! I've saved ${option} to your profile. 🎵`;
      setMessages(prev => [...prev, { role: 'assistant', content: nextQuestion }]);
      setTimeout(() => {
        generateRecommendations(newFlow);
      }, 500);
      return;
    }

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: nextQuestion,
          showButtons: true,
          buttonType: nextButtonType,
        }
      ]);
    }, 300);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm still learning! Try using the buttons above for the best experience." 
      }]);
    }, 500);
  };

  const getButtonOptions = (buttonType: string) => {
    switch (buttonType) {
      case 'who': return whoOptions;
      case 'when': return whenOptions;
      case 'planType': return planTypeOptions;
      case 'vibe': return vibeOptions;
      case 'cuisine': return cuisineOptions;
      case 'afterDinner': return afterDinnerOptions;
      case 'musicPreference': return musicOptions;
      default: return [];
    }
  };

  const getButtonColumns = (buttonType: string): 1 | 2 => {
    return buttonType === 'who' ? 2 : 1;
  };

  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Lumina</Text>
            <Text style={styles.headerSubtitle}>Manhattan</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View style={styles.profileButton}>
              <Text style={styles.profileEmoji}>✨</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, idx) => (
            <View key={idx}>
              <ChatBubble role={msg.role} content={msg.content} />
              {msg.showButtons && msg.buttonType && (
                <ButtonGroup
                  options={getButtonOptions(msg.buttonType)}
                  onSelect={(option) => handleFlowSelection(option, msg.buttonType!)}
                  columns={getButtonColumns(msg.buttonType)}
                />
              )}
            </View>
          ))}

          {loading && <LoadingDots />}

          {topPicks.length > 0 && (
            <VenueCarousel title="🔥 Top Picks For Your Night" venues={topPicks} />
          )}

          {afterDinnerVenues.length > 0 && (
            <VenueCarousel
              title={
                flow.afterDinner === 'Go to a lounge' ? '🍸 Lounge Vibes' :
                flow.afterDinner === 'Find a club' ? '🎉 Club Scene' :
                '✨ Keep It Light'
              }
              venues={afterDinnerVenues}
            />
          )}

          {events.length > 0 && (
            <EventCarousel title="🎊 Events Happening Tonight" events={events} />
          )}

          {showItineraryButton && (
            <View style={styles.itineraryButtonContainer}>
              <TouchableOpacity style={styles.itineraryButton} onPress={handleViewItinerary}>
                <LinearGradient
                  colors={['#9333EA', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.itineraryGradient}
                >
                  <Ionicons name="calendar" size={24} color={colors.white} />
                  <Text style={styles.itineraryButtonText}>View My Night</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask Lumina anything..."
            placeholderTextColor={colors.zinc[600]}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Ionicons name="arrow-up" size={24} color={input.trim() ? colors.black : colors.zinc[600]} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc[900],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.light, color: colors.white },
  headerSubtitle: { fontSize: typography.sizes.xs, fontWeight: typography.weights.light, color: colors.zinc[600] },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.violet[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmoji: { fontSize: 20 },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  itineraryButtonContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xl },
  itineraryButton: { borderRadius: 30, overflow: 'hidden', shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  itineraryGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md + 4 },
  itineraryButtonText: { fontSize: typography.sizes.lg, fontWeight: '600', color: colors.white },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.zinc[900], gap: spacing.sm },
  input: { flex: 1, backgroundColor: colors.zinc[900], borderWidth: 1, borderColor: colors.zinc[800], borderRadius: 24, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, color: colors.white, fontSize: typography.sizes.sm, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: colors.zinc[800], opacity: 0.4 },
});
