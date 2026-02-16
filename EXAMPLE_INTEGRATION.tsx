// Example: How to integrate progress tracking into your chapter reading screen

import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ChapterContentWithProgress() {
  const { bookId, chapterId, bookName } = useLocalSearchParams();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  
  // Get active plan ID (you'll need to implement this based on your app)
  useEffect(() => {
    // Example: Load from AsyncStorage or context
    const loadActivePlan = async () => {
      // const plan = await getActiveReadingPlan();
      // setActivePlanId(plan?.id || null);
      setActivePlanId('your-plan-id'); // Replace with actual logic
    };
    loadActivePlan();
  }, []);

  const { 
    startChapter, 
    updatePosition, 
    finishChapter,
    getChapterProgress,
    stats,
    streak 
  } = useReadingProgress(activePlanId);

  const chapterKey = `${bookId}-${chapterId}`;
  const currentProgress = getChapterProgress(chapterKey);

  // Track when chapter is opened
  useEffect(() => {
    if (activePlanId) {
      startChapter({
        chapterId: chapterKey,
        bookName: bookName as string,
        bookId: bookId as string,
        chapterNumber: parseInt(chapterId as string),
        dayNumber: 1, // Calculate based on your plan structure
      });
    }
  }, [activePlanId]);

  // Handle scroll to track progress
  const handleScroll = (event: any) => {
    if (!activePlanId) return;

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    
    // Calculate scroll percentage
    const scrollHeight = contentSize.height - layoutMeasurement.height;
    const scrollPercentage = Math.min(
      100,
      Math.max(0, Math.round((contentOffset.y / scrollHeight) * 100))
    );

    // Only update if percentage changed significantly (every 5%)
    if (scrollPercentage % 5 === 0) {
      updatePosition({
        chapterId: chapterKey,
        bookName: bookName as string,
        bookId: bookId as string,
        chapterNumber: parseInt(chapterId as string),
        dayNumber: 1,
        progressPercentage: scrollPercentage,
        lastPosition: contentOffset.y,
      });
    }

    // Auto-complete when reaching 95%
    if (scrollPercentage >= 95 && !currentProgress?.completed) {
      handleCompleteChapter();
    }
  };

  const handleCompleteChapter = async () => {
    if (!activePlanId) return;

    await finishChapter({
      chapterId: chapterKey,
      bookName: bookName as string,
      bookId: bookId as string,
      chapterNumber: parseInt(chapterId as string),
      dayNumber: 1,
    });

    Alert.alert(
      'Chapter Complete! 🎉',
      `Great job! You've completed ${bookName} Chapter ${chapterId}`,
      [{ text: 'Continue', style: 'default' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      {activePlanId && (
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            📖 {currentProgress?.progressPercentage || 0}% complete
          </Text>
          <Text style={styles.streakText}>
            🔥 {streak?.currentStreak || 0} day streak
          </Text>
        </View>
      )}

      {/* Chapter Content */}
      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={1000} // Update every 1 second
      >
        <Text style={styles.title}>
          {bookName} - Chapter {chapterId}
        </Text>
        
        {/* Your chapter verses here */}
        <Text style={styles.content}>
          Chapter content goes here...
        </Text>
      </ScrollView>

      {/* Stats Footer */}
      {activePlanId && stats && (
        <View style={styles.statsFooter}>
          <Text style={styles.statsText}>
            Plan Progress: {stats.completionPercentage}% • 
            {stats.completedChapters}/{stats.totalChapters} chapters
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    padding: 20,
  },
  statsFooter: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
});
