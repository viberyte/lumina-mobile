import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';
import luminaApi from '../services/lumina';

interface BudgetMealModalProps {
  visible: boolean;
  onClose: () => void;
  venueId: string | number;
  venueName: string;
}

export default function BudgetMealModal({ visible, onClose, venueId, venueName }: BudgetMealModalProps) {
  const [budget, setBudget] = useState(50);
  const [partySize, setPartySize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetRecommendation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await luminaApi.getBudgetMeal(venueId, budget, partySize);
      setRecommendation(result.recommendation);
    } catch (err: any) {
      if (err.response?.data?.error === 'no_menu') {
        setError(err.response.data.message);
      } else {
        setError('Failed to get recommendation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRecommendation(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={styles.blurOverlay} />
        
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Budget Meal Finder 💰</Text>
                <Text style={styles.subtitle}>{venueName}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={colors.white} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!recommendation ? (
                <>
                  {/* Budget Slider */}
                  <View style={styles.section}>
                    <Text style={styles.label}>Your Budget</Text>
                    <Text style={styles.budgetValue}>${budget}</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={10}
                      maximumValue={200}
                      step={5}
                      value={budget}
                      onValueChange={setBudget}
                      minimumTrackTintColor={colors.violet[500]}
                      maximumTrackTintColor={colors.glass.medium}
                      thumbTintColor={colors.violet[500]}
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderLabel}>$10</Text>
                      <Text style={styles.sliderLabel}>$200</Text>
                    </View>
                  </View>

                  {/* Party Size */}
                  <View style={styles.section}>
                    <Text style={styles.label}>Party Size</Text>
                    <View style={styles.partySizeButtons}>
                      {[1, 2, 3, 4, 5, 6].map((size) => (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.partySizeButton,
                            partySize === size && styles.partySizeButtonActive
                          ]}
                          onPress={() => {
                            setPartySize(size);
                          }}
                        >
                          <Text style={[
                            styles.partySizeText,
                            partySize === size && styles.partySizeTextActive
                          ]}>
                            {size}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Error Message */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  {/* Get Recommendation Button */}
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleGetRecommendation}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.submitButtonText}>Get Recommendations</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Recommendation Results */}
                  <View style={styles.resultsContainer}>
                    <Text style={styles.resultsEmoji}>{recommendation.emoji}</Text>
                    <Text style={styles.resultsTitle}>Perfect Meal for ${budget}</Text>
                    
                    {/* Recommended Meal */}
                    <View style={styles.mealSection}>
                      <Text style={styles.mealSectionTitle}>Recommended</Text>
                      {recommendation.recommended_meal?.map((dish: any, idx: number) => (
                        <View key={idx} style={styles.dishCard}>
                          <View style={styles.dishHeader}>
                            <Text style={styles.dishName}>{dish.item}</Text>
                            <Text style={styles.dishPrice}>${dish.price}</Text>
                          </View>
                          {dish.reason && (
                            <Text style={styles.dishReason}>{dish.reason}</Text>
                          )}
                        </View>
                      ))}
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>${recommendation.total}</Text>
                      </View>
                      {recommendation.within_budget && (
                        <View style={styles.withinBudgetBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={styles.withinBudgetText}>Within Budget!</Text>
                        </View>
                      )}
                    </View>

                    {/* Alternative Meal */}
                    {recommendation.alternative_meal && (
                      <View style={styles.mealSection}>
                        <Text style={styles.mealSectionTitle}>Alternative Option</Text>
                        {recommendation.alternative_meal.map((dish: any, idx: number) => (
                          <View key={idx} style={styles.dishCard}>
                            <View style={styles.dishHeader}>
                              <Text style={styles.dishName}>{dish.item}</Text>
                              <Text style={styles.dishPrice}>${dish.price}</Text>
                            </View>
                          </View>
                        ))}
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Total</Text>
                          <Text style={styles.totalValue}>${recommendation.alternative_total}</Text>
                        </View>
                      </View>
                    )}

                    {/* Pro Tip */}
                    {recommendation.pro_tip && (
                      <View style={styles.proTipCard}>
                        <Ionicons name="bulb" size={20} color={colors.violet[400]} />
                        <Text style={styles.proTipText}>{recommendation.pro_tip}</Text>
                      </View>
                    )}

                    {/* Try Again Button */}
                    <TouchableOpacity
                      style={styles.tryAgainButton}
                      onPress={() => {
                        setRecommendation(null);
                        setError(null);
                      }}
                    >
                      <Text style={styles.tryAgainText}>Try Different Budget</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
  },
  closeButton: {
    padding: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.md,
  },
  budgetValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.violet[400],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderLabel: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[500],
  },
  partySizeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  partySizeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.glass.medium,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partySizeButtonActive: {
    backgroundColor: colors.violet[600],
    borderColor: colors.violet[400],
  },
  partySizeText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  partySizeTextActive: {
    color: colors.white,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: '#EF4444',
  },
  submitButton: {
    backgroundColor: colors.violet[600],
    padding: spacing.lg,
    borderRadius: 30,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.white,
  },
  resultsContainer: {
    alignItems: 'center',
  },
  resultsEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  resultsTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xl,
  },
  mealSection: {
    width: '100%',
    backgroundColor: colors.glass.light,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  mealSectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.violet[400],
    marginBottom: spacing.md,
  },
  dishCard: {
    marginBottom: spacing.md,
  },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dishName: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.white,
  },
  dishPrice: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.violet[300],
  },
  dishReason: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
    fontStyle: 'italic',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.white,
  },
  totalValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.violet[400],
  },
  withinBudgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  withinBudgetText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: '#10B981',
  },
  proTipCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.glass.light,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.violet[600] + '40',
    marginBottom: spacing.lg,
  },
  proTipText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.white,
    lineHeight: 20,
  },
  tryAgainButton: {
    paddingVertical: spacing.md,
  },
  tryAgainText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.violet[400],
    textAlign: 'center',
  },
});
