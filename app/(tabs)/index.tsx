import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUser } from '@/contexts/UserContext';
import { API_URL } from '@/utils/api-config';
import { DayStreak, getDayStreak, updateDayStreak } from '@/utils/day-streak';
import { getPlanProgress, type ReadingPlanStreak } from '@/utils/reading-plan-manager';
import { getReadingProgress, ReadingProgress } from '@/utils/reading-progress';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type VerseOfDay = {
  bookname: string;
  chapter: string;
  verse: string;
  text: string;
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const { walletAddress } = useUser();
  const router = useRouter();
  
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingVerse, setSavingVerse] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);
  const [planStreak, setPlanStreak] = useState<ReadingPlanStreak | null>(null);
  const [dayStreak, setDayStreak] = useState<DayStreak | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [planProgress, setPlanProgress] = useState(0);

  useEffect(() => {
    fetchVerseOfDay();
    determineTimeOfDay();
    loadReadingProgress();
    loadPlanData();
    loadDayStreak();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadReadingProgress();
      loadPlanData();
      loadDayStreak();
    }, [])
  );

  const loadDayStreak = async () => {
    const streak = await getDayStreak();
    setDayStreak(streak);
    // Update streak when user opens the app
    const updatedStreak = await updateDayStreak();
    setDayStreak(updatedStreak);
  };

  const loadReadingProgress = async () => {
    const progress = await getReadingProgress();
    setReadingProgress(progress);
  };

  const loadPlanData = async () => {
    const data = await getPlanProgress();
    setPlanStreak(data.streak);
    setHasActivePlan(data.plan !== null && data.plan.status === 'active');
    setPlanProgress(data.progressPercentage);
  };

  const determineTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setTimeOfDay('morning');
    } else if (hour >= 12 && hour < 17) {
      setTimeOfDay('afternoon');
    } else if (hour >= 17 && hour < 21) {
      setTimeOfDay('evening');
    } else {
      setTimeOfDay('night');
    }
  };

  const fetchVerseOfDay = async () => {
    try {
      const response = await fetch('https://labs.bible.org/api/?passage=votd&type=json');
      const data = await response.json();
      if (data && data.length > 0) {
        setVerseOfDay(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch verse of the day:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradientColors = (): [string, string] => {
    switch (timeOfDay) {
      case 'morning':
        return ['#FF9A56', '#FF6B95']; // Sunrise colors
      case 'afternoon':
        return ['#4A90E2', '#63B3ED']; // Bright blue sky
      case 'evening':
        return ['#667EEA', '#764BA2']; // Purple sunset
      case 'night':
        return ['#0a1929', '#0d2438']; // Dark night
      default:
        return ['#0a1929', '#0d2438'];
    }
  };

  const getGreeting = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'Good morning';
      case 'afternoon':
        return 'Good afternoon';
      case 'evening':
        return 'Good evening';
      case 'night':
        return 'Good night';
      default:
        return 'Good morning';
    }
  };

  const getIcon = () => {
    switch (timeOfDay) {
      case 'morning':
        return '🌅';
      case 'afternoon':
        return '☀️';
      case 'evening':
        return '🌆';
      case 'night':
        return '🌕';
      default:
        return '🌕';
    }
  };

  const handleSaveVerseOfDay = async () => {
    if (!walletAddress) {
      Alert.alert(
        'Wallet Required',
        'Please connect your wallet to save verses.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    if (!verseOfDay) return;

    setSavingVerse(true);
    try {
      const response = await fetch(`${API_URL}/users/${walletAddress}/saved-verses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookName: verseOfDay.bookname,
          bookId: '1', // Default to Genesis, adjust as needed
          chapterNumber: parseInt(verseOfDay.chapter),
          verseNumber: parseInt(verseOfDay.verse),
          verseText: verseOfDay.text,
        }),
      });

      if (response.status === 409) {
        Alert.alert('Already Saved', 'This verse is already in your saved collection.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save verse');
      }

      Alert.alert('Saved!', 'Verse of the day saved successfully.');
    } catch (error) {
      console.error('Error saving verse:', error);
      Alert.alert('Error', 'Failed to save verse. Please try again.');
    } finally {
      setSavingVerse(false);
    }
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/monotheism_logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.greeting, { color: colors.secondaryText }]}>{getGreeting()}</Text>
            <Text style={[styles.title, { color: colors.text }]}>Monotheism</Text>
          </View>
        </View>
      </View>

      {/* Verse Card */}
      <View style={styles.verseCard}>
        <LinearGradient
          colors={getGradientColors()}
          style={styles.verseGradient}
        >
          {/* Icon */}
          <View style={styles.moonContainer}>
            <Text style={styles.moon}>{getIcon()}</Text>
          </View>

          {/* Verse Text */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : verseOfDay ? (
            <>
              <Text style={styles.verseText}>
                {verseOfDay.text}
              </Text>
              
              {/* Reference */}
              <Text style={styles.reference}>
                — {verseOfDay.bookname} {verseOfDay.chapter}:{verseOfDay.verse}
              </Text>
            </>
          ) : (
            <Text style={styles.verseText}>
              "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.button}
              onPress={handleSaveVerseOfDay}
              disabled={savingVerse}
            >
              {savingVerse ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <IconSymbol name="heart" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button}>
              <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
              <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton}>
              <IconSymbol name="bookmark" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Today's Reading Card - Only show if user has active plan */}
      {hasActivePlan && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Reading</Text>
          
          <TouchableOpacity 
            style={[styles.todayReadingCard, { backgroundColor: colors.card }]}
            onPress={async () => {
              const data = await getPlanProgress();
              if (data.todayProgress && data.todayProgress.chapters.length > 0) {
                // Navigate to first chapter of today's reading
                const firstChapter = data.todayProgress.chapters[0];
                const [bookId, chapterId] = firstChapter.split('-');
                router.push({
                  pathname: '/reading-day',
                  params: {
                    dayNumber: data.todayProgress.dayNumber,
                    date: new Date(data.todayProgress.date).toLocaleDateString(),
                    chapterIds: data.todayProgress.chapters.join(','),
                  },
                });
              }
            }}
          >
            <View style={[styles.todayReadingIcon, { backgroundColor: colors.primary }]}>
              <IconSymbol name="book.fill" size={28} color="#fff" />
            </View>
            
            <View style={styles.todayReadingInfo}>
              <Text style={[styles.todayReadingTitle, { color: colors.text }]}>
                Continue Today's Reading
              </Text>
              <Text style={[styles.todayReadingSubtitle, { color: colors.secondaryText }]}>
                {planProgress}% complete • Tap to continue
              </Text>
            </View>
            
            <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
          </TouchableOpacity>
        </View>
      )}

      {/* Continue Reading Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Reading</Text>
        
        {readingProgress ? (
          <TouchableOpacity 
            style={[styles.readingCard, { backgroundColor: colors.card }]}
            onPress={() => {
              router.push({
                pathname: '/chapter-content',
                params: {
                  bookId: readingProgress.bookId,
                  bookName: readingProgress.bookName,
                  chapterId: readingProgress.chapterId,
                  testament: readingProgress.testament,
                },
              });
            }}
          >
            <View style={styles.bookIcon}>
              <IconSymbol name="book.fill" size={28} color="#fff" />
            </View>
            
            <View style={styles.readingInfo}>
              <Text style={[styles.readingTitle, { color: colors.text }]}>
                {readingProgress.bookName} • Chapter {readingProgress.chapterId}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${readingProgress.progress}%` }]} />
              </View>
            </View>
            
            <View style={styles.readingMeta}>
              <Text style={[styles.progressText, { color: colors.tertiaryText }]}>{readingProgress.progress}%</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.readingCard, { backgroundColor: colors.card }]}
            onPress={() => router.push('/(tabs)/read')}
          >
            <View style={styles.bookIcon}>
              <IconSymbol name="book.fill" size={28} color="#fff" />
            </View>
            
            <View style={styles.readingInfo}>
              <Text style={[styles.readingTitle, { color: colors.text }]}>Start Reading</Text>
              <Text style={[styles.readingSubtitle, { color: colors.tertiaryText }]}>Choose a book to begin</Text>
            </View>
            
            <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Streak Card */}
      <View style={[styles.streakCardExpanded, { backgroundColor: colors.card }]}>
        <View style={styles.streakHeader}>
          <View style={styles.streakLeft}>
            <View style={styles.fireIconContainer}>
              <Text style={styles.fireEmoji}>🔥</Text>
            </View>
            <View>
              <Text style={[styles.streakNumber, { color: colors.text }]}>
                {dayStreak?.currentStreak || 0}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.secondaryText }]}>Day Streak</Text>
            </View>
          </View>
          
          <View style={styles.streakRight}>
            <IconSymbol name="trophy" size={18} color={colors.tertiaryText} />
            <Text style={[styles.bestStreak, { color: colors.tertiaryText }]}>
              Best: {dayStreak?.longestStreak || 0}
            </Text>
          </View>
        </View>

        {/* Progress Bar for Reading Plan */}
        {hasActivePlan && (
          <View style={styles.planProgressContainer}>
            <View style={styles.planProgressHeader}>
              <Text style={[styles.planProgressLabel, { color: colors.secondaryText }]}>
                Reading Plan Progress
              </Text>
              <Text style={[styles.planProgressPercent, { color: colors.primary }]}>
                {planProgress}%
              </Text>
            </View>
            <View style={[styles.planProgressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.planProgressFill, 
                  { width: `${planProgress}%`, backgroundColor: colors.primary }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Total Days Read */}
        <View style={[styles.totalDaysCard, { backgroundColor: colors.background }]}>
          <IconSymbol name="calendar" size={20} color={colors.tertiaryText} />
          <Text style={[styles.totalDaysText, { color: colors.secondaryText }]}>
            Total days active
          </Text>
          <Text style={[styles.totalDaysNumber, { color: colors.primary }]}>
            {dayStreak?.totalDaysActive || 0}
          </Text>
        </View>

        {/* Reading Plan CTA */}
        <TouchableOpacity 
          style={[styles.readingPlanCTA, { backgroundColor: colors.card }]}
          onPress={() => router.push(hasActivePlan ? '/reading-plan' : '/reading-plan-setup')}
        >
          <View style={[styles.readingPlanIcon, { backgroundColor: colors.background }]}>
            <IconSymbol name="book.fill" size={20} color={colors.primary} />
          </View>
          <View style={styles.readingPlanContent}>
            <Text style={[styles.readingPlanTitle, { color: colors.text }]}>
              {hasActivePlan ? 'View Reading Plan' : 'Start a Reading Plan'}
            </Text>
            <Text style={[styles.readingPlanSubtitle, { color: colors.secondaryText }]}>
              {hasActivePlan ? 'Continue your daily reading' : 'Complete the Bible in your timeframe'}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
        </TouchableOpacity>
      </View>

      {/* Quick Access Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
        
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity 
            style={[styles.quickAccessCard, { backgroundColor: colors.card }]}
            onPress={() => router.push({
              pathname: '/book-chapters',
              params: {
                bookId: '19',
                bookName: 'Psalms',
                isExtraBiblical: 'false',
                testament: 'old',
              },
            })}
          >
            <Text style={[styles.quickAccessTitle, { color: colors.text }]}>Psalms</Text>
            <Text style={[styles.quickAccessSubtitle, { color: colors.tertiaryText }]}>150 chapters</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickAccessCard, { backgroundColor: colors.card }]}
            onPress={() => router.push({
              pathname: '/book-chapters',
              params: {
                bookId: '20',
                bookName: 'Proverbs',
                isExtraBiblical: 'false',
                testament: 'old',
              },
            })}
          >
            <Text style={[styles.quickAccessTitle, { color: colors.text }]}>Proverbs</Text>
            <Text style={[styles.quickAccessSubtitle, { color: colors.tertiaryText }]}>31 chapters</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickAccessCard, { backgroundColor: colors.card }]}
            onPress={() => router.push({
              pathname: '/book-chapters',
              params: {
                bookId: '40',
                bookName: 'Matthew',
                isExtraBiblical: 'false',
                testament: 'new',
              },
            })}
          >
            <Text style={[styles.quickAccessTitle, { color: colors.text }]}>Matthew</Text>
            <Text style={[styles.quickAccessSubtitle, { color: colors.tertiaryText }]}>28 chapters</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickAccessCard, { backgroundColor: colors.card }]}
            onPress={() => router.push({
              pathname: '/book-chapters',
              params: {
                bookId: '43',
                bookName: 'John',
                isExtraBiblical: 'false',
                testament: 'new',
              },
            })}
          >
            <Text style={[styles.quickAccessTitle, { color: colors.text }]}>John</Text>
            <Text style={[styles.quickAccessSubtitle, { color: colors.tertiaryText }]}>21 chapters</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.parablesCard, { backgroundColor: colors.card }]}
          onPress={() => router.push('/parables')}
        >
          <Text style={styles.parablesIcon}>✨</Text>
          <View style={styles.parablesContent}>
            <Text style={[styles.parablesTitle, { color: colors.text }]}>Parables of Jesus</Text>
            <Text style={[styles.parablesSubtitle, { color: colors.secondaryText }]}>Stories that teach spiritual truths</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.storiesCard, { backgroundColor: colors.card }]}
          onPress={() => router.push('/bible-stories')}
        >
          <Text style={styles.storiesIcon}>📖</Text>
          <View style={styles.storiesContent}>
            <Text style={[styles.storiesTitle, { color: colors.text }]}>Bible Stories</Text>
            <Text style={[styles.storiesSubtitle, { color: colors.secondaryText }]}>370+ popular stories from Scripture</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Study & Sermons Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Study & Sermons</Text>
        
        <TouchableOpacity 
          style={[styles.sermonCard, { backgroundColor: colors.card }]}
          onPress={() => router.push('/bible-definition')}
        >
          <View style={[styles.sermonIcon, { backgroundColor: colors.background }]}>
            <IconSymbol name="book.closed.fill" size={24} color={colors.secondaryText} />
          </View>
          <View style={styles.sermonContent}>
            <Text style={[styles.sermonTitle, { color: colors.text }]}>Bible Dictionary</Text>
            <Text style={[styles.sermonSubtitle, { color: colors.tertiaryText }]}>Look up biblical terms & definitions</Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sermonCard, { backgroundColor: colors.card, marginTop: 12 }]}
          onPress={() => router.push('/hermeneutics')}
        >
          <View style={[styles.sermonIcon, { backgroundColor: colors.background }]}>
            <IconSymbol name="video.fill" size={24} color={colors.secondaryText} />
          </View>
          <View style={styles.sermonContent}>
            <Text style={[styles.sermonTitle, { color: colors.text }]}>Hermeneutics</Text>
            <Text style={[styles.sermonSubtitle, { color: colors.tertiaryText }]}>Watch sermon & study videos</Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  greeting: {
    fontSize: 13,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  verseCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  verseGradient: {
    padding: 30,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  moonContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  moon: {
    fontSize: 40,
  },
  verseText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#fff',
    marginBottom: 20,
    fontWeight: '400',
  },
  reference: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 30,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  todayReadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
    elevation: 3,
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 20,
  },
  todayReadingIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayReadingInfo: {
    flex: 1,
    gap: 4,
  },
  todayReadingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  todayReadingSubtitle: {
    fontSize: 14,
  },
  readingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 20,
  },
  bookIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#ff9500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingInfo: {
    flex: 1,
    gap: 8,
  },
  readingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  readingSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9500',
  },
  readingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#999',
  },
  streakCardExpanded: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 30,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fireIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff3e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireEmoji: {
    fontSize: 24,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  streakLabel: {
    fontSize: 14,
    color: '#666',
  },
  streakRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bestStreak: {
    fontSize: 14,
    color: '#999',
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  planProgressContainer: {
    marginBottom: 20,
  },
  planProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planProgressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  planProgressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  planProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  planProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  dayCircleInactive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
  },
  dayCircleActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff9500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff9500',
  },
  totalDaysCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  totalDaysText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
  },
  totalDaysNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff9500',
  },
  readingPlanCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  readingPlanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingPlanContent: {
    flex: 1,
  },
  readingPlanTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  readingPlanSubtitle: {
    fontSize: 13,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  quickAccessCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quickAccessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  quickAccessSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  parablesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  parablesIcon: {
    fontSize: 24,
  },
  parablesContent: {
    flex: 1,
  },
  parablesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  parablesSubtitle: {
    fontSize: 13,
  },
  storiesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
    marginTop: 12,
  },
  storiesIcon: {
    fontSize: 24,
  },
  storiesContent: {
    flex: 1,
  },
  storiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  storiesSubtitle: {
    fontSize: 13,
  },
  sermonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sermonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sermonContent: {
    flex: 1,
  },
  sermonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  sermonSubtitle: {
    fontSize: 13,
    color: '#999',
  },
});
