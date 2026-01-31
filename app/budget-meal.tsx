import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const API_BASE = 'https://lumina.viberyte.com';

type MealItem = {
  item: string;
  price: number;
  reason: string;
};

type Recommendation = {
  recommended_meal: MealItem[];
  total: number;
  within_budget: boolean;
  narrative: string;
  pro_tip: string;
  emoji: string;
};

export default function BudgetMealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const venueId = params.venue_id as string;
  const venueName = params.venue_name as string || 'this venue';

  const [budget, setBudget] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState('');

  const quickBudgets = [25, 50, 75, 100];
  const partySizes = [1, 2, 3, 4, 5, 6, 7, 8];

  const perPerson = budget ? Math.floor(parseInt(budget, 10) / partySize) : 0;

  const getContextLabel = (size: number) => {
    if (size === 1) return 'Solo Dining';
    if (size === 2) return 'Date Night';
    if (size <= 4) return 'Small Group';
    return 'Large Group';
  };

  const getPartyIcon = (size: number): string => {
    if (size <= 2) return 'person';
    if (size <= 4) return 'people';
    return 'people-circle';
  };

  const handleSearch = async (amount: number) => {
    if (amount < 10) {
      setError('Please enter a budget of at least $10');
      return;
    }

    if (!venueId) {
      setError('No venue selected. Please go back and try again.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    setRecommendation(null);

    try {
      const response = await fetch(`${API_BASE}/api/budget-meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venueId,
          budget: amount,
          partySize: partySize,
        }),
      });

      const data = await response.json();

      if (data.error === 'no_menu') {
        setError(`Menu not available yet for this venue. We're working on adding it!`);
      } else if (data.recommendation) {
        setRecommendation(data.recommendation);
      } else if (data.error) {
        setError(data.error);
      } else {
        setError('No suggestions found for this budget');
      }
    } catch (err) {
      console.error('Budget meal error:', err);
      setError('Unable to get suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBudget = (amount: number) => {
    setBudget(amount.toString());
    handleSearch(amount);
  };

  const handleCustomSearch = () => {
    const amount = parseInt(budget, 10);
    if (isNaN(amount)) {
      setError('Please enter a valid number');
      return;
    }
    handleSearch(amount);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a1a0f', '#080d08']}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Fixed Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="chevron-back" size={26} color="#a1a1aa" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="sparkles" size={20} color="#4ade80" />
            <View>
              <Text style={styles.headerTitle}>Lumina Picks</Text>
              <Text style={styles.headerSubtitle}>Within Your Budget</Text>
            </View>
          </View>
          <View style={{ width: 48 }} />
        </View>

        {/* Venue Name */}
        <View style={styles.venueInfo}>
          <Text style={styles.venueName}>{decodeURIComponent(venueName)}</Text>
        </View>

        {/* Party Size Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How many people?</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.partySizeScroll}
          >
            {partySizes.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.partySizeBtn,
                  partySize === size && styles.partySizeBtnActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPartySize(size);
                }}
              >
                <Ionicons 
                  name={getPartyIcon(size) as any}
                  size={14} 
                  color={partySize === size ? '#4ade80' : '#71717a'} 
                />
                <Text
                  style={[
                    styles.partySizeText,
                    partySize === size && styles.partySizeTextActive,
                  ]}
                >
                  {size}{size === 8 ? '+' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.contextLabel}>{getContextLabel(partySize)}</Text>
        </View>

        {/* Budget Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Total budget</Text>
          
          {/* Quick Budget Buttons */}
          <View style={styles.quickBudgets}>
            {quickBudgets.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickBudgetBtn,
                  budget === amount.toString() && styles.quickBudgetBtnActive,
                ]}
                onPress={() => handleQuickBudget(amount)}
              >
                <Text
                  style={[
                    styles.quickBudgetText,
                    budget === amount.toString() && styles.quickBudgetTextActive,
                  ]}
                >
                  ${amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Budget Input */}
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                placeholder="Custom amount"
                placeholderTextColor="#52525b"
                keyboardType="number-pad"
                returnKeyType="search"
                onSubmitEditing={handleCustomSearch}
              />
            </View>
            <TouchableOpacity
              style={[styles.searchBtn, !budget && styles.searchBtnDisabled]}
              onPress={handleCustomSearch}
              disabled={!budget}
            >
              <Text style={styles.searchBtnText}>Find Picks</Text>
            </TouchableOpacity>
          </View>

          {/* Per Person Indicator */}
          {budget && parseInt(budget, 10) > 0 && (
            <View style={styles.perPersonBadge}>
              <Ionicons name="person-outline" size={14} color="#4ade80" />
              <Text style={styles.perPersonText}>
                ~${perPerson} per person
              </Text>
            </View>
          )}
        </View>

        {/* Results Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#fb7185" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Loading */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4ade80" />
              <Text style={styles.loadingText}>
                Finding picks for your {getContextLabel(partySize)}…
              </Text>
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && !recommendation && (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color="#27272a" />
              <Text style={styles.emptyText}>
                Tell Lumina your party size and budget to unlock curated picks
              </Text>
            </View>
          )}

          {/* Results */}
          {recommendation && (
            <View style={styles.results}>
              {/* Narrative */}
              <View style={styles.narrativeCard}>
                <Text style={styles.narrativeEmoji}>{recommendation.emoji}</Text>
                <Text style={styles.narrativeText}>{recommendation.narrative}</Text>
              </View>

              {/* Meal Items */}
              <Text style={styles.resultsTitle}>Recommended Order</Text>
              {recommendation.recommended_meal.map((meal, index) => (
                <View key={index} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealName}>{meal.item}</Text>
                    <Text style={styles.mealPrice}>${meal.price}</Text>
                  </View>
                  <Text style={styles.mealReason}>{meal.reason}</Text>
                </View>
              ))}

              {/* Total */}
              <View style={styles.totalCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Estimated Total</Text>
                  <Text style={styles.totalAmount}>${recommendation.total}</Text>
                </View>
                <View style={styles.budgetStatus}>
                  <Ionicons 
                    name={recommendation.within_budget ? "checkmark-circle" : "alert-circle"} 
                    size={16} 
                    color={recommendation.within_budget ? "#4ade80" : "#fb7185"} 
                  />
                  <Text style={[
                    styles.budgetStatusText,
                    { color: recommendation.within_budget ? "#4ade80" : "#fb7185" }
                  ]}>
                    {recommendation.within_budget ? "Within your budget!" : "Slightly over budget"}
                  </Text>
                </View>
              </View>

              {/* Pro Tip */}
              {recommendation.pro_tip && (
                <View style={styles.proTipCard}>
                  <Ionicons name="bulb" size={18} color="#eab308" />
                  <Text style={styles.proTipText}>{recommendation.pro_tip}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4ade80',
    marginTop: 1,
  },
  venueInfo: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  venueName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
    marginBottom: 12,
  },
  partySizeScroll: {
    gap: 8,
  },
  partySizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  partySizeBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
  },
  partySizeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  partySizeTextActive: {
    color: '#4ade80',
  },
  contextLabel: {
    fontSize: 13,
    color: '#4ade80',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  quickBudgets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  quickBudgetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  quickBudgetBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
  },
  quickBudgetText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  quickBudgetTextActive: {
    color: '#4ade80',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#71717a',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#fff',
    paddingVertical: 14,
  },
  searchBtn: {
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnDisabled: {
    backgroundColor: '#3f3f46',
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  perPersonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
  },
  perPersonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4ade80',
  },
  scrollView: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#fb7185',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 15,
    color: '#71717a',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#52525b',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  results: {
    marginTop: 4,
  },
  narrativeCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  narrativeEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  narrativeText: {
    fontSize: 15,
    color: '#d4d4d8',
    lineHeight: 24,
    textAlign: 'center',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 12,
  },
  mealCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginRight: 12,
  },
  mealPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4ade80',
  },
  mealReason: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  totalCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4ade80',
  },
  budgetStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  proTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  proTipText: {
    flex: 1,
    fontSize: 13,
    color: '#fde047',
    lineHeight: 20,
  },
});
