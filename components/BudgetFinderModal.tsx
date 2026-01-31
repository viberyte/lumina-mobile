import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';
import { glassStyles } from '../theme/vibeGradients';
import luminaApi from '../services/luminaApi';

interface BudgetFinderModalProps {
  visible: boolean;
  onClose: () => void;
  venueId: number;
  venueName: string;
}

export default function BudgetFinderModal({ visible, onClose, venueId, venueName }: BudgetFinderModalProps) {
  const [budget, setBudget] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [context, setContext] = useState('Solo');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [error, setError] = useState('');

  const contextOptions = ['Solo', 'Date night', 'With friends', 'Business', 'Group outing'];

  const handleFindMeal = async () => {
    if (!budget || parseFloat(budget) <= 0) {
      setError('Please enter a valid budget');
      return;
    }

    setLoading(true);
    setError('');
    setRecommendation(null);

    try {
      const result = await luminaApi.getBudgetMeal(
        venueId,
        parseFloat(budget),
        parseInt(partySize),
        { who: context }
      );

      if (result.error === 'no_menu') {
        setError(result.message || 'Menu not available for this venue');
      } else if (result.recommendation) {
        setRecommendation(result.recommendation);
      } else {
        setError('Unable to generate recommendation');
      }
    } catch (err: any) {
      console.error('Budget finder error:', err);
      setError(err.message || 'Failed to generate recommendation');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setBudget('');
    setPartySize('1');
    setContext('Solo');
    setRecommendation(null);
    setError('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Budget for me</Text>
            <TouchableOpacity onPress={() => { resetModal(); onClose(); }}>
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.venueName}>{venueName}</Text>
          <Text style={styles.subtitle}>Get AI-powered meal recommendations within your budget</Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {!recommendation && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Budget per person ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={budget}
                    onChangeText={setBudget}
                    placeholder="e.g., 50"
                    placeholderTextColor={colors.zinc[500]}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Party size</Text>
                  <TextInput
                    style={styles.input}
                    value={partySize}
                    onChangeText={setPartySize}
                    placeholder="1"
                    placeholderTextColor={colors.zinc[500]}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Occasion</Text>
                  <View style={styles.contextButtons}>
                    {contextOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.contextButton, context === option && styles.contextButtonActive]}
                        onPress={() => setContext(option)}
                      >
                        <Text style={[styles.contextText, context === option && styles.contextTextActive]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={20} color={colors.red[400]} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.findButton}
                  onPress={handleFindMeal}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[colors.violet[600], colors.violet[700]]}
                    style={styles.findButtonGradient}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator color={colors.white} />
                        <Text style={styles.findButtonText}>Finding perfect meal...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="restaurant" size={20} color={colors.white} />
                        <Text style={styles.findButtonText}>Find Perfect Meal</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {recommendation && (
              <View style={styles.recommendation}>
                <Text style={styles.recTitle}>{recommendation.emoji} Recommended Meal</Text>

                {recommendation.recommended_meal?.map((item: any, index: number) => (
                  <View key={index} style={[styles.mealItem, glassStyles.matte]}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealName}>{item.item}</Text>
                      <Text style={styles.mealPrice}>${item.price}</Text>
                    </View>
                    <Text style={styles.mealReason}>{item.reason}</Text>
                  </View>
                ))}

                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>${recommendation.total}</Text>
                </View>

                {recommendation.within_budget ? (
                  <View style={styles.successBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.green[400]} />
                    <Text style={styles.successText}>Within budget!</Text>
                  </View>
                ) : (
                  <View style={styles.warningBadge}>
                    <Ionicons name="alert-circle" size={16} color={colors.orange[400]} />
                    <Text style={styles.warningText}>Slightly over budget</Text>
                  </View>
                )}

                {recommendation.pro_tip && (
                  <View style={[styles.tipBox, glassStyles.liquid]}>
                    <Ionicons name="bulb" size={20} color={colors.yellow[400]} />
                    <Text style={styles.tipText}>{recommendation.pro_tip}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.resetButton} onPress={resetModal}>
                  <Text style={styles.resetButtonText}>Try Another Budget</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.zinc[900],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    minHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.white,
  },
  venueName: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.violet[400],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
    marginBottom: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.zinc[800],
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.lg,
    color: colors.white,
    borderWidth: 2,
    borderColor: colors.zinc[700],
  },
  contextButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contextButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.zinc[800],
    borderWidth: 2,
    borderColor: colors.zinc[700],
  },
  contextButtonActive: {
    backgroundColor: colors.violet[600],
    borderColor: colors.violet[500],
  },
  contextText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  contextTextActive: {
    color: colors.white,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red[900] + '30',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.red[400],
  },
  findButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  findButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  findButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.white,
  },
  recommendation: {
    paddingTop: spacing.md,
  },
  recTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.lg,
  },
  mealItem: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mealName: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
  },
  mealPrice: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.green[400],
  },
  mealReason: {
    fontSize: typography.sizes.sm,
    color: colors.zinc[400],
    fontStyle: 'italic',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.zinc[800],
    marginTop: spacing.md,
  },
  totalLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.white,
  },
  totalAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.violet[400],
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.green[900] + '30',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginTop: spacing.md,
  },
  successText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.green[400],
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.orange[900] + '30',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginTop: spacing.md,
  },
  warningText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.orange[400],
  },
  tipBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  tipText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.white,
    lineHeight: 20,
  },
  resetButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.violet[400],
  },
});
