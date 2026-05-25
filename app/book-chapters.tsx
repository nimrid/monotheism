import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

// Bible book chapter counts
const BIBLE_CHAPTERS: { [key: string]: number } = {
  // Old Testament
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  'Ezra': 10, 'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150,
  'Proverbs': 31, 'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66,
  'Jeremiah': 52, 'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12,
  'Hosea': 14, 'Joel': 3, 'Amos': 9, 'Obadiah': 1, 'Jonah': 4,
  'Micah': 7, 'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3, 'Haggai': 2,
  'Zechariah': 14, 'Malachi': 4,
  // New Testament
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28,
  'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6,
  'Ephesians': 6, 'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5,
  '2 Thessalonians': 3, '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3,
  'Philemon': 1, 'Hebrews': 13, 'James': 5, '1 Peter': 5, '2 Peter': 3,
  '1 John': 5, '2 John': 1, '3 John': 1, 'Jude': 1, 'Revelation': 22,
};

export default function BookChaptersScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { bookId, bookName, isExtraBiblical, testament } = params;
  
  const [chapterCount, setChapterCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExtraBiblical === 'true' && bookId) {
      fetchChapterCount();
    } else if (bookName) {
      // For Old/New Testament, use the static chapter count
      const count = BIBLE_CHAPTERS[bookName as string] || 0;
      setChapterCount(count);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [bookId, bookName, isExtraBiblical]);

  const fetchChapterCount = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://iq-bible.p.rapidapi.com/GetChapterCountExtraBiblical?bookId=${bookId}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST!,
            'x-rapidapi-key': RAPIDAPI_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chapter count');
      }

      const data = await response.json();
      
      let count = 0;
      if (typeof data === 'number') {
        count = data;
      } else if (data.chapterCount !== undefined) {
        count = data.chapterCount;
      } else if (data.count !== undefined) {
        count = data.count;
      } else if (data.chapters !== undefined) {
        count = data.chapters;
      } else if (Array.isArray(data)) {
        count = data.length;
      }
      
      setChapterCount(count);
    } catch (err) {
      setError('Failed to load chapters');
      console.error('Error fetching chapters:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderChapters = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchChapterCount()}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (chapterCount === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>No chapters available</Text>
        </View>
      );
    }

    const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

    return (
      <View style={styles.chaptersContainer}>
        {/* Modern Chapter Count Widget */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.background }]}>
              <Text style={styles.infoIcon}>📚</Text>
            </View>
            <View>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {chapterCount} {chapterCount === 1 ? 'Chapter' : 'Chapters'}
              </Text>
              <Text style={[styles.infoSubtitle, { color: colors.tertiaryText }]}>
                Select a chapter to begin
              </Text>
            </View>
          </View>
        </View>

        {/* Continuous Fluid Grid */}
        <View style={styles.chaptersGrid}>
          {chapters.map((chapter) => (
            <TouchableOpacity
              key={chapter}
              style={[styles.chapterButton, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: '/chapter-content',
                  params: {
                    bookId: bookId,
                    bookName: bookName,
                    chapterId: chapter,
                    testament: testament,
                  },
                });
              }}
            >
              <View style={styles.chapterInner}>
                <Text style={[styles.chapterNumber, { color: colors.text }]}>{chapter}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{bookName}</Text>
          </View>
          {bookId && isExtraBiblical !== 'true' && (
            <TouchableOpacity 
              style={[styles.insightsButton, { backgroundColor: colors.card }]}
              onPress={() => {
                router.push({
                  pathname: '/book-info',
                  params: {
                    bookId: bookId,
                    bookName: bookName,
                  },
                });
              }}
            >
              <IconSymbol name="lightbulb.fill" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Chapters */}
        <ScrollView 
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderChapters()}
        </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  insightsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  chaptersContainer: {
    gap: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 28,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  chapterButton: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  chapterInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#ff9500',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
