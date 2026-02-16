import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { BOOK_ID_MAP } from '@/utils/verse-search';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

type ChapterReading = {
  id: string;
  bookId: string;
  bookName: string;
  chapterId: string;
  read: boolean;
};

type ChapterContent = {
  verses: Array<{ v: string; t: string }>;
};

export default function ReadingDayScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { dayNumber, date, chapterIds, planId } = params;

  const [chapters, setChapters] = useState<ChapterReading[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterReading | null>(null);
  const [chapterContent, setChapterContent] = useState<ChapterContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
  const [scrollPosition, setScrollPosition] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  // Use progress tracking hook
  const { 
    startChapter, 
    updatePosition, 
    finishChapter,
    isChapterCompleted,
    getDayChapters,
    refresh
  } = useReadingProgress(planId as string || null);

  useEffect(() => {
    parseChapters();
    loadDayProgress();
  }, [chapterIds, planId]);

  const loadDayProgress = async () => {
    if (!planId || !dayNumber) return;
    
    const dayProgress = await getDayChapters(parseInt(dayNumber as string));
    const completedIds = new Set(
      dayProgress.filter(p => p.completed).map(p => p.chapterId)
    );
    setReadChapters(completedIds);
  };

  useEffect(() => {
    parseChapters();
  }, [chapterIds]);

  const parseChapters = () => {
    if (!chapterIds) return;

    const ids = typeof chapterIds === 'string' ? chapterIds.split(',') : chapterIds;
    const parsed = ids.map((id: string) => {
      const bookId = id.substring(0, 2);
      const chapterId = id.substring(2);
      const bookName = BOOK_ID_MAP[bookId] || 'Unknown';

      return {
        id,
        bookId,
        bookName,
        chapterId: parseInt(chapterId).toString(),
        read: false,
      };
    });

    setChapters(parsed);
  };

  const fetchChapterContent = async (chapter: ChapterReading) => {
    setLoadingContent(true);
    setSelectedChapter(chapter);
    setChapterContent(null);
    setScrollPosition(0);

    try {
      const response = await fetch(
        `https://iq-bible.p.rapidapi.com/GetChapter?bookId=${chapter.bookId}&chapterId=${chapter.chapterId}&versionId=kjv`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST!,
            'x-rapidapi-key': RAPIDAPI_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chapter');
      }

      const data = await response.json();
      setChapterContent({ verses: data });

      // Track chapter start in database
      if (planId) {
        await startChapter({
          chapterId: chapter.id,
          bookName: chapter.bookName,
          bookId: chapter.bookId,
          chapterNumber: parseInt(chapter.chapterId),
          dayNumber: parseInt(dayNumber as string),
        });
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
      Alert.alert('Error', 'Failed to load chapter content');
      setSelectedChapter(null);
    } finally {
      setLoadingContent(false);
    }
  };

  const markChapterAsRead = async (chapterId: string) => {
    setReadChapters((prev) => new Set([...prev, chapterId]));
    
    // Mark as complete in database
    if (planId && selectedChapter) {
      await finishChapter({
        chapterId: selectedChapter.id,
        bookName: selectedChapter.bookName,
        bookId: selectedChapter.bookId,
        chapterNumber: parseInt(selectedChapter.chapterId),
        dayNumber: parseInt(dayNumber as string),
      });
      
      await refresh();
    }
  };

  const handleScroll = (event: any) => {
    if (!planId || !selectedChapter) return;

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setScrollPosition(contentOffset.y);
    setContentHeight(contentSize.height);

    // Calculate progress percentage
    const scrollHeight = contentSize.height - layoutMeasurement.height;
    const progressPercentage = Math.min(
      100,
      Math.max(0, Math.round((contentOffset.y / scrollHeight) * 100))
    );

    // Update progress every 10%
    if (progressPercentage % 10 === 0) {
      updatePosition({
        chapterId: selectedChapter.id,
        bookName: selectedChapter.bookName,
        bookId: selectedChapter.bookId,
        chapterNumber: parseInt(selectedChapter.chapterId),
        dayNumber: parseInt(dayNumber as string),
        progressPercentage,
        lastPosition: contentOffset.y,
      });
    }

    // Auto-complete at 95%
    if (progressPercentage >= 95 && !readChapters.has(selectedChapter.id)) {
      markChapterAsRead(selectedChapter.id);
    }
  };

  const closeChapter = () => {
    if (selectedChapter && !readChapters.has(selectedChapter.id)) {
      markChapterAsRead(selectedChapter.id);
    }
    setSelectedChapter(null);
    setChapterContent(null);
  };

  const getReadPercentage = () => {
    if (chapters.length === 0) return 0;
    return Math.round((readChapters.size / chapters.length) * 100);
  };

  const groupChaptersByBook = () => {
    const grouped: { [bookName: string]: ChapterReading[] } = {};
    chapters.forEach((chapter) => {
      if (!grouped[chapter.bookName]) {
        grouped[chapter.bookName] = [];
      }
      grouped[chapter.bookName].push(chapter);
    });
    return grouped;
  };

  const allChaptersRead = readChapters.size === chapters.length && chapters.length > 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Day {dayNumber}</Text>
            <Text style={[styles.subtitle, { color: colors.tertiaryText }]}>{date}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Progress Card */}
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.text }]}>Reading Progress</Text>
              <Text style={[styles.progressPercentage, { color: colors.primary }]}>{getReadPercentage()}%</Text>
            </View>

            <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBar, { width: `${getReadPercentage()}%`, backgroundColor: colors.primary }]} />
            </View>

            <Text style={[styles.progressText, { color: colors.secondaryText }]}>
              {readChapters.size} of {chapters.length} chapters read
            </Text>

            {allChaptersRead && (
              <View style={[styles.completeBadge, { borderTopColor: colors.border }]}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#4ade80" />
                <Text style={styles.completeBadgeText}>Day Complete!</Text>
              </View>
            )}
          </View>

          {/* Chapters by Book */}
          {Object.entries(groupChaptersByBook()).map(([bookName, bookChapters]) => (
            <View key={bookName} style={styles.bookSection}>
              <Text style={[styles.bookTitle, { color: colors.text }]}>{bookName}</Text>
              <View style={styles.chaptersGrid}>
                {bookChapters.map((chapter) => {
                  const isRead = readChapters.has(chapter.id);
                  return (
                    <TouchableOpacity
                      key={chapter.id}
                      style={[styles.chapterCard, { backgroundColor: isRead ? '#4ade80' : colors.card }]}
                      onPress={() => fetchChapterContent(chapter)}
                    >
                      {isRead && (
                        <View style={styles.checkmark}>
                          <IconSymbol name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                      <Text style={[styles.chapterNumber, { color: isRead ? '#fff' : colors.text }]}>
                        {chapter.chapterId}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Chapter Content Modal */}
        <Modal
          visible={!!selectedChapter || loadingContent}
          animationType="slide"
          onRequestClose={closeChapter}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={closeChapter} style={styles.closeButton}>
                <IconSymbol name="xmark.circle.fill" size={32} color={colors.tertiaryText} />
              </TouchableOpacity>
              {selectedChapter && (
                <View style={styles.modalTitleContainer}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedChapter.bookName} {selectedChapter.chapterId}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.tertiaryText }]}>KJV</Text>
                </View>
              )}
            </View>

            {/* Modal Content */}
            {loadingContent ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : chapterContent ? (
              <ScrollView 
                style={styles.modalScroll} 
                contentContainerStyle={styles.modalContent}
                onScroll={handleScroll}
                scrollEventThrottle={1000}
              >
                {chapterContent.verses.map((verse, index) => (
                  <View key={index} style={styles.verseRow}>
                    <Text style={[styles.verseNumber, { color: colors.primary }]}>{verse.v}</Text>
                    <Text style={[styles.verseText, { color: colors.text }]}>{verse.t}</Text>
                  </View>
                ))}

                {/* Mark as Read Button */}
                {selectedChapter && !readChapters.has(selectedChapter.id) && (
                  <TouchableOpacity
                    style={styles.markReadButton}
                    onPress={() => {
                      markChapterAsRead(selectedChapter.id);
                      closeChapter();
                    }}
                  >
                    <IconSymbol name="checkmark.circle" size={20} color="#fff" />
                    <Text style={styles.markReadButtonText}>Mark as Read</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            ) : null}
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  progressCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
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
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  completeBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4ade80',
  },
  bookSection: {
    marginBottom: 24,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chapterCard: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    position: 'relative',
  },
  chapterCardRead: {
    backgroundColor: '#4ade80',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  chapterNumberRead: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  modalTitleContainer: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 32,
    paddingTop: 2,
  },
  verseText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ade80',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  markReadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
