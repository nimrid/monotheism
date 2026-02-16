import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import {
    getReadingPlanPreferences,
    getReadingPlanProgress,
    ReadingPlanData,
    ReadingPlanDay,
    saveReadingPlanProgress,
} from '@/utils/reading-plan';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

export default function ReadingPlanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState<ReadingPlanData | null>(null);
  const [dailyPlan, setDailyPlan] = useState<ReadingPlanDay[]>([]);
  const [progress, setProgress] = useState<{ [dayNumber: number]: boolean }>({});
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // Use progress tracking hook
  const { 
    stats, 
    streak, 
    getDayChapters,
    loading: progressLoading 
  } = useReadingProgress(activePlanId);

  useEffect(() => {
    loadActivePlanId();
    loadReadingPlan();
  }, []);

  const loadActivePlanId = async () => {
    try {
      const planId = await AsyncStorage.getItem('@active_plan_id');
      setActivePlanId(planId);
    } catch (error) {
      console.error('Error loading active plan ID:', error);
    }
  };

  useEffect(() => {
    loadReadingPlan();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Reload progress when screen comes into focus
      const reloadProgress = async () => {
        const savedProgress = await getReadingPlanProgress();
        setProgress(savedProgress);
        
        // Also check for day completion from database
        if (activePlanId) {
          dailyPlan.forEach(async (day) => {
            const dayProgress = await getDayChapters(day.day);
            const allCompleted = dayProgress.length > 0 && 
              dayProgress.every(chapter => chapter.completed);
            if (allCompleted && !progress[day.day]) {
              setProgress(prev => ({ ...prev, [day.day]: true }));
            }
          });
        }
      };
      reloadProgress();
    }, [activePlanId, dailyPlan])
  );

  const loadReadingPlan = async () => {
    setLoading(true);
    try {
      const prefs = await getReadingPlanPreferences();
      if (!prefs) {
        router.replace('/reading-plan-setup');
        return;
      }

      const savedProgress = await getReadingPlanProgress();
      setProgress(savedProgress);

      // Fetch reading plan from API
      const response = await fetch(
        `https://iq-bible.p.rapidapi.com/GetBibleReadingPlan?days=${prefs.days}&requestedStartDate=${prefs.startDate}&requestedAge=${prefs.age}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST!,
            'x-rapidapi-key': RAPIDAPI_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reading plan');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        setPlanData(data[0]);
        setDailyPlan(data.slice(1));
      }
    } catch (error) {
      console.error('Error loading reading plan:', error);
      Alert.alert('Error', 'Failed to load reading plan');
    } finally {
      setLoading(false);
    }
  };

  const toggleDayCompletion = async (dayNumber: number) => {
    const newProgress = { ...progress, [dayNumber]: !progress[dayNumber] };
    setProgress(newProgress);
    await saveReadingPlanProgress(newProgress);
  };

  const getCompletedDays = () => {
    return Object.values(progress).filter(Boolean).length;
  };

  const getProgressPercentage = () => {
    if (!planData) return 0;
    const total = parseInt(planData.daysRequested);
    return Math.round((getCompletedDays() / total) * 100);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!planData) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>My Reading Plan</Text>
          <TouchableOpacity onPress={() => router.push('/reading-plan-setup')}>
            <IconSymbol name="gearshape" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Progress Card */}
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.text }]}>Your Progress</Text>
              <Text style={[styles.progressPercentage, { color: colors.primary }]}>
                {stats?.completionPercentage || getProgressPercentage()}%
              </Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { width: `${stats?.completionPercentage || getProgressPercentage()}%` }
              ]} />
            </View>
            
            <View style={styles.progressStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {stats?.completedChapters || getCompletedDays()}
                </Text>
                <Text style={styles.statLabel}>
                  {stats ? 'Chapters' : 'Days'} Done
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {stats?.totalChapters || planData.daysRequested}
                </Text>
                <Text style={styles.statLabel}>
                  Total {stats ? 'Chapters' : 'Days'}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {streak?.currentStreak || 0}
                </Text>
                <Text style={styles.statLabel}>Day Streak 🔥</Text>
              </View>
            </View>

            {/* Streak Info */}
            {streak && streak.currentStreak > 0 && (
              <View style={[styles.streakCard, { backgroundColor: colors.background }]}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View style={styles.streakInfo}>
                  <Text style={[styles.streakText, { color: colors.text }]}>
                    {streak.currentStreak} day reading streak!
                  </Text>
                  <Text style={[styles.streakSubtext, { color: colors.secondaryText }]}>
                    Best: {streak.bestStreak} days
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Reading Time Info */}
          {planData.readingTime && (
            <View style={styles.infoCard}>
              <IconSymbol name="clock" size={24} color="#ff9500" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Daily Reading Time</Text>
                <Text style={styles.infoText}>
                  ~{Math.round(planData.readingTime.silentReading.averagePerDayInMinutes)} minutes per day
                </Text>
              </View>
            </View>
          )}

          {/* Daily Plan */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Reading Schedule</Text>
            
            <View style={styles.daysList}>
              {dailyPlan.map((day) => {
                const isCompleted = progress[day.day];
                const isToday = day.date === new Date().toISOString().split('T')[0];
                
                return (
                  <TouchableOpacity
                    key={day.day}
                    style={[
                      styles.dayCard,
                      isCompleted && styles.dayCardCompleted,
                      isToday && styles.dayCardToday,
                    ]}
                    onPress={() => {
                      router.push({
                        pathname: '/reading-day',
                        params: {
                          dayNumber: day.day,
                          date: new Date(day.date).toLocaleDateString(),
                          chapterIds: day.bookAndChapterIds.join(','),
                          planId: activePlanId || '',
                        },
                      });
                    }}
                  >
                    <View style={styles.dayHeader}>
                      <View style={styles.dayInfo}>
                        <Text style={[styles.dayNumber, isCompleted && styles.dayNumberCompleted]}>
                          Day {day.day}
                        </Text>
                        <Text style={styles.dayDate}>{new Date(day.date).toLocaleDateString()}</Text>
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleDayCompletion(day.day);
                        }}
                      >
                        {isCompleted && <IconSymbol name="checkmark" size={16} color="#fff" />}
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.dayChapters}>
                      {day.bookAndChapterIds.length} chapters to read
                    </Text>
                    
                    {isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Today</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  progressCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff9500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ff9500',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  daysList: {
    gap: 12,
  },
  dayCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dayCardCompleted: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: '#ff9500',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayInfo: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  dayNumberCompleted: {
    color: '#4ade80',
  },
  dayDate: {
    fontSize: 13,
    color: '#999',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
  },
  dayChapters: {
    fontSize: 14,
    color: '#666',
  },
  todayBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff9500',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  streakEmoji: {
    fontSize: 32,
  },
  streakInfo: {
    flex: 1,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  streakSubtext: {
    fontSize: 13,
  },
});
