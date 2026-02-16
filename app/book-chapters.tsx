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

    // Group chapters by tens for better visual organization
    const groupedChapters: number[][] = [];
    for (let i = 0; i < chapters.length; i += 10) {
      groupedChapters.push(chapters.slice(i, i + 10));
    }

    return (
      <View style={styles.chaptersContainer}>
        {/* Chapter count info */}
        <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
          <View style={styles.infoLeft}>
            <Text style={styles.infoIcon}>📚</Text>
            <View>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {chapterCount} {chapterCount === 1 ? 'Chapter' : 'Chapters'}
              </Text>
              <Text style={[styles.infoSubtitle, { color: colors.tertiaryText }]}>
                Tap any chapter to start reading
              </Text>
            </View>
          </View>
        </View>

        {/* Grouped chapters */}
        {groupedChapters.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.chapterGroup}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.groupBadgeText}>
                  {group[0]}-{group[group.length - 1]}
                </Text>
              </View>
            </View>
            <View style={styles.chaptersGrid}>
              {group.map((chapter) => (
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
                  <View style={[styles.chapterInner, { borderColor: colors.border }]}>
                    <Text style={[styles.chapterNumber, { color: colors.text }]}>{chapter}</Text>
                    <View style={[styles.chapterDot, { backgroundColor: colors.primary }]} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{bookName}</Text>
            <Text style={[styles.subtitle, { color: colors.tertiaryText }]}>Select a chapter</Text>
          </View>
          {bookId && isExtraBiblical !== 'true' && (
            <TouchableOpacity 
              style={styles.insightsButton}
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
          style={[styles.scrollView, { backgroundColor: colors.card }]}
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
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  insightsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff3e6',
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 20,
    borderRadius: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoIcon: {
    fontSize: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 13,
  },
  chapterGroup: {
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  groupBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chapterButton: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chapterInner: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chapterNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  chapterDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
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
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
