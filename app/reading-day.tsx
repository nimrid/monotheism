import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { BOOK_ID_MAP } from '@/utils/verse-search';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    Share,
    useWindowDimensions,
    ViewToken
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

// Helper to get storage key for specific day/plan
const getReadChaptersKey = (planId: string | null, dayNum: string | null) => {
  if (planId && dayNum) {
    return `@read_chapters_${planId}_day_${dayNum}`;
  }
  return '@read_chapters_general';
};

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

// Dark aesthetic gradients for Gen Z TikTok doom-scrolling vibe
const GRADIENTS = [
  ['#0F2027', '#203A43', '#2C5364'],
  ['#141E30', '#243B55'],
  ['#16222A', '#3A6073'],
  ['#000000', '#434343'],
  ['#232526', '#414345'],
  ['#0f0c29', '#302b63', '#24243e'],
  ['#1e130c', '#9a8478']
];

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
  
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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
    loadReadChapters();
  }, [chapterIds, planId]);

  const loadReadChapters = async () => {
    try {
      const storageKey = getReadChaptersKey(planId as string, dayNumber as string);
      
      // Load from AsyncStorage first (immediate)
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const readChaptersList = JSON.parse(stored);
        setReadChapters(new Set(readChaptersList));
      }

      // Then load from database if we have a plan (more accurate)
      if (planId && dayNumber) {
        const dayProgress = await getDayChapters(parseInt(dayNumber as string));
        const completedIds = dayProgress
          .filter(p => p.completed)
          .map(p => p.chapterId);
        
        if (completedIds.length > 0) {
          setReadChapters(new Set(completedIds));
          // Update AsyncStorage with database data
          await saveReadChapters(completedIds);
        }
      }
    } catch (error) {
      console.error('Error loading read chapters:', error);
    }
  };

  const saveReadChapters = async (chapters: string[]) => {
    try {
      const storageKey = getReadChaptersKey(planId as string, dayNumber as string);
      await AsyncStorage.setItem(storageKey, JSON.stringify(chapters));
    } catch (error) {
      console.error('Error saving read chapters:', error);
    }
  };

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
    const newReadChapters = new Set([...readChapters, chapterId]);
    setReadChapters(newReadChapters);
    
    // Save to AsyncStorage immediately
    await saveReadChapters(Array.from(newReadChapters));
    
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

  // -- Doom Scrolling Viewability Config --
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!planId || !selectedChapter || !chapterContent || viewableItems.length === 0) return;

    const index = viewableItems[0].index || 0;
    const total = chapterContent.verses.length;
    const progressPercentage = Math.min(100, Math.round(((index + 1) / total) * 100));

    // Update progress every 10%
    if (progressPercentage % 10 === 0) {
      updatePosition({
        chapterId: selectedChapter.id,
        bookName: selectedChapter.bookName,
        bookId: selectedChapter.bookId,
        chapterNumber: parseInt(selectedChapter.chapterId),
        dayNumber: parseInt(dayNumber as string),
        progressPercentage,
        lastPosition: index,
      });
    }

    // Auto-complete at 95%
    if (progressPercentage >= 95 && !readChapters.has(selectedChapter.id)) {
      markChapterAsRead(selectedChapter.id);
    }
  }, [planId, selectedChapter, chapterContent, readChapters]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderVerseItem = ({ item, index }: { item: { v: string; t: string }; index: number }) => {
    const verseNum = item.v || '';
    const verseText = item.t || '';
    const gradient = GRADIENTS[index % GRADIENTS.length];
    
    return (
      <View style={{ height, width }}>
        <LinearGradient
          colors={gradient}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Centered Verse Text (Doom scrolling aesthetic) */}
        <ScrollView 
          contentContainerStyle={[styles.verseScrollContent, {
            paddingTop: Math.max(insets.top, 40) + 60,
            paddingBottom: insets.bottom + 120,
          }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.quoteMark}>"</Text>
          <Text style={styles.tiktokVerseText}>{verseText}</Text>
          <Text style={[styles.quoteMark, { textAlign: 'right', marginTop: -10 }]}>"</Text>
          <Text style={styles.verseReference}>
            — {selectedChapter?.bookName} {selectedChapter?.chapterId}:{verseNum}
          </Text>
        </ScrollView>

        {/* Floating Action Buttons */}
        <View style={[styles.floatingActionContainer, { bottom: insets.bottom + 80 }]}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {
            Clipboard.setStringAsync(`"${verseText}"\n\n— ${selectedChapter?.bookName} ${selectedChapter?.chapterId}:${verseNum}`);
            Alert.alert('Copied', 'Verse copied to clipboard');
          }}>
            <View style={styles.iconCircle}>
              <IconSymbol name="doc.on.doc" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => {
            Share.share({
              message: `"${verseText}"\n\n— ${selectedChapter?.bookName} ${selectedChapter?.chapterId}:${verseNum}`
            });
          }}>
            <View style={styles.iconCircle}>
              <IconSymbol name="square.and.arrow.up" size={26} color="#fff" />
            </View>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Progress Indicator */}
        <View style={[styles.progressOverlay, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${((index + 1) / chapterContent!.verses.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Verse {index + 1} of {chapterContent!.verses.length}</Text>
          
          {/* Show mark as read explicitly on the last verse just in case */}
          {index === chapterContent!.verses.length - 1 && !readChapters.has(selectedChapter!.id) && (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => {
                markChapterAsRead(selectedChapter!.id);
                closeChapter();
              }}
            >
              <IconSymbol name="checkmark.circle" size={20} color="#fff" />
              <Text style={styles.markReadButtonText}>Mark as Read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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

        {/* Chapter Content Modal - TikTok Style */}
        <Modal
          visible={!!selectedChapter || loadingContent}
          animationType="slide"
          onRequestClose={closeChapter}
        >
          <View style={[styles.modalContainer, { backgroundColor: '#000' }]}>
            {loadingContent ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : chapterContent ? (
              <FlatList
                data={chapterContent.verses}
                renderItem={renderVerseItem}
                keyExtractor={(_, index) => index.toString()}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                bounces={false}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
              />
            ) : null}

            {/* Floating Top Header (Transparent) */}
            <View style={[styles.floatingHeader, { paddingTop: Math.max(insets.top, 20) }]}>
              <TouchableOpacity onPress={closeChapter} style={styles.backButton}>
                <IconSymbol name="xmark" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.modalTitleContainer}>
                {selectedChapter && (
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {selectedChapter.bookName} {selectedChapter.chapterId}
                  </Text>
                )}
              </View>
              <View style={{ width: 44 }} />
            </View>
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
    padding: 8,
    width: 44,
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
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // -- Doom Scrolling Styles --
  floatingHeader: {
    position: 'absolute',
    top: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.2)', // slight dark gradient effect at top
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verseScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingLeft: 24,
    paddingRight: 84, // Leave space for floating action buttons
  },
  quoteMark: {
    fontSize: 50,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Georgia',
    lineHeight: 50,
    marginBottom: -10,
  },
  tiktokVerseText: {
    fontSize: 24,
    lineHeight: 36,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  verseReference: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
    marginTop: 20,
    fontStyle: 'italic',
  },
  floatingActionContainer: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ade80',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
  },
  markReadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
