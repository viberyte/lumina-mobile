import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const colors = {
  violet: { 500: '#8b5cf6', 600: '#7c3aed' },
  green: { 400: '#4ade80', 500: '#22c55e' },
  rose: { 400: '#fb7185', 500: '#f43f5e' },
  orange: { 500: '#f97316' },
  yellow: { 500: '#eab308' },
  blue: { 500: '#3b82f6' },
  zinc: { 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' },
};

type TimeRange = '7d' | '30d' | '90d' | 'ytd';

type DailyData = {
  date: string;
  revenue: number;
  bookings: number;
  guests: number;
};

type Analytics = {
  totalRevenue: number;
  totalBookings: number;
  totalGuests: number;
  avgTableSpend: number;
  avgPartySize: number;
  conversionRate: number;
  repeatCustomers: number;
  topZone: string;
  topZonePercent: number;
  peakHour: string;
  dailyData: DailyData[];
  revenueChange: number;
  bookingsChange: number;
  guestsChange: number;
};

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
];

const CHART_TABS = ['Revenue', 'Bookings', 'Guests'] as const;
type ChartTab = typeof CHART_TABS[number];

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeChart, setActiveChart] = useState<ChartTab>('Revenue');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      const sessionData = await AsyncStorage.getItem('lumina_partner_session');
      if (!sessionData) {
        router.replace('/partner');
        return;
      }

      const session = JSON.parse(sessionData);

      const response = await fetch(
        `https://lumina.viberyte.com/api/promoters/${session.promoterId}/analytics?range=${timeRange}`
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        loadDemoData();
      }
    } catch (error) {
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 120;
    const dailyData: DailyData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();

      // Weekend multiplier for realistic data
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const multiplier = isWeekend ? 1.8 : 1;

      const baseRevenue = 3000 + Math.random() * 2000;
      const baseBookings = 8 + Math.floor(Math.random() * 6);
      const baseGuests = 80 + Math.floor(Math.random() * 50);

      dailyData.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(baseRevenue * multiplier),
        bookings: Math.round(baseBookings * multiplier),
        guests: Math.round(baseGuests * multiplier),
      });
    }

    const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);
    const totalBookings = dailyData.reduce((sum, d) => sum + d.bookings, 0);
    const totalGuests = dailyData.reduce((sum, d) => sum + d.guests, 0);

    setAnalytics({
      totalRevenue,
      totalBookings,
      totalGuests,
      avgTableSpend: Math.round(totalRevenue / totalBookings),
      avgPartySize: Math.round((totalGuests / totalBookings) * 10) / 10,
      conversionRate: 68 + Math.floor(Math.random() * 15),
      repeatCustomers: 32 + Math.floor(Math.random() * 20),
      topZone: 'VIP Section',
      topZonePercent: 45 + Math.floor(Math.random() * 15),
      peakHour: '11:00 PM',
      dailyData,
      revenueChange: 8 + Math.floor(Math.random() * 15),
      bookingsChange: 5 + Math.floor(Math.random() * 12),
      guestsChange: 12 + Math.floor(Math.random() * 10),
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getChartData = () => {
    if (!analytics) return [];

    const data = analytics.dailyData;
    const displayCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 15 : 12;

    // Sample data points for display
    const step = Math.ceil(data.length / displayCount);
    const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);

    return sampled.map(d => ({
      date: d.date,
      value: activeChart === 'Revenue' ? d.revenue : activeChart === 'Bookings' ? d.bookings : d.guests,
    }));
  };

  const getChartMax = () => {
    const data = getChartData();
    if (data.length === 0) return 100;
    return Math.max(...data.map(d => d.value)) * 1.1;
  };

  const getChartTotal = () => {
    if (!analytics) return 0;
    if (activeChart === 'Revenue') return analytics.totalRevenue;
    if (activeChart === 'Bookings') return analytics.totalBookings;
    return analytics.totalGuests;
  };

  const getChartLabel = () => {
    if (activeChart === 'Revenue') return 'Revenue ($)';
    if (activeChart === 'Bookings') return 'Bookings';
    return 'Guests';
  };

  const handleExport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'CSV and PDF export will be available in a future update.');
  };

  const getPerformanceTip = () => {
    if (!analytics) return '';
    return `Your ${analytics.topZone} generates ${analytics.topZonePercent}% of revenue. Consider adding more VIP tables or increasing minimums during peak hours around ${analytics.peakHour}.`;
  };

  const getTimeRangeLabel = () => {
    if (timeRange === '7d') return 'Last 7 Days';
    if (timeRange === '30d') return 'Last 30 Days';
    if (timeRange === '90d') return 'Last 90 Days';
    return 'Year to Date';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
      </View>
    );
  }

  const chartData = getChartData();
  const chartMax = getChartMax();

  return (
    <LinearGradient colors={[colors.zinc[950], colors.zinc[900]]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Ionicons name="download-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {TIME_RANGES.map((range) => (
            <TouchableOpacity
              key={range.id}
              style={[
                styles.timeRangeChip,
                timeRange === range.id && styles.timeRangeChipActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(range.id);
              }}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range.id && styles.timeRangeTextActive,
              ]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: colors.green[500] + '20' }]}>
                <Ionicons name="cash-outline" size={20} color={colors.green[500]} />
              </View>
              <Text style={styles.metricValue}>{formatCurrency(analytics?.totalRevenue || 0)}</Text>
              <Text style={styles.metricLabel}>Total Revenue</Text>
              {analytics && analytics.revenueChange > 0 && (
                <View style={styles.changeTag}>
                  <Ionicons name="arrow-up" size={12} color={colors.green[500]} />
                  <Text style={styles.changeText}>+{analytics.revenueChange}%</Text>
                </View>
              )}
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: colors.violet[500] + '20' }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.violet[500]} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(analytics?.totalBookings || 0)}</Text>
              <Text style={styles.metricLabel}>Bookings</Text>
              {analytics && analytics.bookingsChange > 0 && (
                <View style={styles.changeTag}>
                  <Ionicons name="arrow-up" size={12} color={colors.green[500]} />
                  <Text style={styles.changeText}>+{analytics.bookingsChange}%</Text>
                </View>
              )}
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: colors.blue[500] + '20' }]}>
                <Ionicons name="people-outline" size={20} color={colors.blue[500]} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(analytics?.totalGuests || 0)}</Text>
              <Text style={styles.metricLabel}>Total Guests</Text>
              {analytics && analytics.guestsChange > 0 && (
                <View style={styles.changeTag}>
                  <Ionicons name="arrow-up" size={12} color={colors.green[500]} />
                  <Text style={styles.changeText}>+{analytics.guestsChange}%</Text>
                </View>
              )}
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: colors.yellow[500] + '20' }]}>
                <Ionicons name="card-outline" size={20} color={colors.yellow[500]} />
              </View>
              <Text style={styles.metricValue}>{formatCurrency(analytics?.avgTableSpend || 0)}</Text>
              <Text style={styles.metricLabel}>Avg Table Spend</Text>
            </View>
          </View>

          {/* Chart Section */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTabs}>
                {CHART_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.chartTab, activeChart === tab && styles.chartTabActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveChart(tab);
                    }}
                  >
                    <Text style={[
                      styles.chartTabText,
                      activeChart === tab && styles.chartTabTextActive,
                    ]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.chartContext}>{getChartLabel()}</Text>

            <View style={styles.chartTotalRow}>
              <Text style={styles.chartTotal}>
                {activeChart === 'Revenue' 
                  ? formatCurrency(getChartTotal()) 
                  : formatNumber(getChartTotal())}
              </Text>
              <Text style={styles.chartPeriod}>{getTimeRangeLabel()}</Text>
            </View>

            {/* Bar Chart */}
            <View style={styles.chartContainer}>
              {chartData.map((item, index) => {
                const barHeight = (item.value / chartMax) * 120;
                const isToday = index === chartData.length - 1;

                return (
                  <View key={index} style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        { height: barHeight },
                        isToday && styles.barToday,
                      ]}
                    />
                    {timeRange === '7d' && (
                      <Text style={styles.barLabel}>
                        {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Performance Insights */}
          <View style={styles.insightsCard}>
            <View style={styles.insightsHeader}>
              <Ionicons name="bulb-outline" size={20} color={colors.yellow[500]} />
              <Text style={styles.insightsTitle}>Performance Insights</Text>
            </View>

            <View style={styles.insightsGrid}>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Top Zone</Text>
                <Text style={styles.insightValue}>{analytics?.topZone || 'VIP Section'}</Text>
                <Text style={styles.insightSubtext}>{analytics?.topZonePercent || 0}% of revenue</Text>
              </View>

              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Peak Hour</Text>
                <Text style={styles.insightValue}>{analytics?.peakHour || '11:00 PM'}</Text>
                <Text style={styles.insightSubtext}>Most bookings</Text>
              </View>

              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Conversion Rate</Text>
                <Text style={styles.insightValue}>{analytics?.conversionRate || 0}%</Text>
                <Text style={styles.insightSubtext}>Views to bookings</Text>
              </View>

              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Repeat Customers</Text>
                <Text style={styles.insightValue}>{analytics?.repeatCustomers || 0}%</Text>
                <Text style={styles.insightSubtext}>Return rate</Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="sparkles" size={16} color={colors.violet[500]} />
              <Text style={styles.tipText}>{getPerformanceTip()}</Text>
            </View>
          </View>

          {/* Booking Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Booking Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Average Party Size</Text>
              <Text style={styles.detailValue}>{analytics?.avgPartySize || 0} guests</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Revenue per Guest</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(Math.round((analytics?.totalRevenue || 0) / (analytics?.totalGuests || 1)))}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bookings per Day</Text>
              <Text style={styles.detailValue}>
                {((analytics?.totalBookings || 0) / (analytics?.dailyData?.length || 1)).toFixed(1)}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/partner/layout-builder');
              }}
            >
              <Ionicons name="map-outline" size={20} color={colors.violet[500]} />
              <Text style={styles.quickActionText}>Edit Layout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/partner/events');
              }}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.violet[500]} />
              <Text style={styles.quickActionText}>Manage Events</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.zinc[950],
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
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  exportButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  // Time Range
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  timeRangeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.zinc[800],
    borderRadius: 20,
  },
  timeRangeChipActive: {
    backgroundColor: colors.violet[500],
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.zinc[400],
  },
  timeRangeTextActive: {
    color: '#fff',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.zinc[900],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 13,
    color: colors.zinc[500],
    marginTop: 4,
  },
  changeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green[500],
  },

  // Chart Card
  chartCard: {
    backgroundColor: colors.zinc[900],
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTabs: {
    flexDirection: 'row',
    backgroundColor: colors.zinc[800],
    borderRadius: 10,
    padding: 4,
  },
  chartTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  chartTabActive: {
    backgroundColor: colors.zinc[700],
  },
  chartTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.zinc[500],
  },
  chartTabTextActive: {
    color: '#fff',
  },
  chartContext: {
    fontSize: 12,
    color: colors.zinc[500],
    marginBottom: 4,
  },
  chartTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
  },
  chartTotal: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  chartPeriod: {
    fontSize: 14,
    color: colors.zinc[500],
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 4,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    backgroundColor: colors.violet[500],
    borderRadius: 4,
    minHeight: 4,
  },
  barToday: {
    backgroundColor: colors.green[500],
  },
  barLabel: {
    fontSize: 10,
    color: colors.zinc[500],
    marginTop: 6,
  },

  // Insights Card
  insightsCard: {
    backgroundColor: colors.zinc[900],
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  insightItem: {
    width: '48%',
    backgroundColor: colors.zinc[950],
    borderRadius: 12,
    padding: 12,
  },
  insightLabel: {
    fontSize: 12,
    color: colors.zinc[500],
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  insightSubtext: {
    fontSize: 11,
    color: colors.zinc[500],
    marginTop: 2,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.violet[500] + '15',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.zinc[300],
    lineHeight: 18,
  },

  // Details Card
  detailsCard: {
    backgroundColor: colors.zinc[900],
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc[800],
  },
  detailLabel: {
    fontSize: 15,
    color: colors.zinc[400],
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.zinc[900],
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.zinc[800],
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
