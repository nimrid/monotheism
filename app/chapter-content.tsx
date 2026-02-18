import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { API_URL } from '@/utils/api-config';
import { markChapterAsRead } from '@/utils/reading-plan-manager';
import { saveReadingProgress } from '@/utils/reading-progress';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

type Verse = {
  book?: string;
  chapter?: string;
  verse: string;
  text: string;
  // Extra Biblical fields
  b?: string;
  c?: string;
  v?: string;
  t?: string;
};

export default function ChapterContentScreen() {
  const { colors } = useTheme();
  const { walletAddress } = useUser();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { bookId, bookName, chapterId, testament } = params;
  
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [savingVerse, setSavingVerse] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    fetchChapterContent();
  }, [bookId, bookName, chapterId, testament]);

  useEffect(() => {
    // Save reading progress when user scrolls or leaves
    if (scrollProgress > 0 && bookId && bookName && chapterId) {
      const progress = {
        bookId: String(bookId),
        bookName: String(bookName),
        chapterId: String(chapterId),
        testament: String(testament) as 'old' | 'new' | 'extra',
        progress: scrollProgress,
        lastRead: new Date().toISOString(),
      };
      saveReadingProgress(progress);
      
      // Mark chapter as read in reading plan (only if user has read at least 80%)
      if (scrollProgress >= 80) {
        const chapterIdStr = `${bookId}-${chapterId}`;
        markChapterAsRead(chapterIdStr);
      }
    }
  }, [scrollProgress]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPercentage = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
    const progress = Math.min(Math.max(scrollPercentage, 0), 100);
    setScrollProgress(Math.round(progress));
  };

  const fetchChapterContent = async () => {
    setLoading(true);
    setError(null);

    try {
      if (testament === 'old' || testament === 'new') {
        const bookNameStr = String(bookName);
        const hasNumberPrefix = /^\d/.test(bookNameStr); // Check if book name starts with a number
        
        if (hasNumberPrefix) {
          // Use RapidAPI for numbered books (1 Samuel, 2 Kings, etc.)
          const response = await fetch(
            `https://iq-bible.p.rapidapi.com/GetChapter?bookId=${bookId}&chapterId=${chapterId}&versionId=kjv`,
            {
              method: 'GET',
              headers: {
                'x-rapidapi-host': RAPIDAPI_HOST!,
                'x-rapidapi-key': RAPIDAPI_KEY!,
              },
            }
          );

          if (!response.ok) {
            throw new Error('Failed to fetch chapter content');
          }

          const data = await response.json();
          // Transform RapidAPI response to match CDN format
          const transformedVerses = data.map((verse: any) => ({
            book: bookNameStr,
            chapter: verse.c,
            verse: verse.v,
            text: verse.t,
          }));
          setVerses(transformedVerses);
        } else {
          // Use CDN for non-numbered books (Genesis, Exodus, John, etc.)
          const bookNameLower = bookNameStr.toLowerCase().replace(/\s+/g, '-');
          const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api@master/bibles/en-asv/books/${bookNameLower}/chapters/${chapterId}.json`;
          
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error('Failed to fetch chapter content');
          }

          const result = await response.json();
          setVerses(result.data || []);
        }
      } else {
        // Fetch from RapidAPI for Extra Biblical
        const paddedBookId = String(bookId).padStart(2, '0');
        const paddedChapterId = String(chapterId).padStart(2, '0');

        const response = await fetch(
          `https://iq-bible.p.rapidapi.com/GetChapterExtraBiblical?bookId=${paddedBookId}&chapterId=${paddedChapterId}`,
          {
            method: 'GET',
            headers: {
              'x-rapidapi-host': RAPIDAPI_HOST!,
              'x-rapidapi-key': RAPIDAPI_KEY!,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch chapter content');
        }

        const data = await response.json();
        setVerses(data);
      }
    } catch (err) {
      setError('Failed to load chapter');
      console.error('Error fetching chapter:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVerse = async (verseIndex: number) => {
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

    const verse = verses[verseIndex];
    const verseNumber = verse.verse || verse.v || '';
    const verseText = verse.text || verse.t || '';

    setSavingVerse(true);
    try {
      const response = await fetch(`${API_URL}/users/${walletAddress}/saved-verses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookName: String(bookName),
          bookId: String(bookId),
          chapterNumber: parseInt(String(chapterId)),
          verseNumber: parseInt(verseNumber),
          verseText: verseText,
        }),
      });

      if (response.status === 409) {
        Alert.alert('Already Saved', 'This verse is already in your saved collection.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save verse');
      }

      Alert.alert('Saved!', 'Verse saved successfully.');
      setSelectedVerse(null);
    } catch (error) {
      console.error('Error saving verse:', error);
      Alert.alert('Error', 'Failed to save verse. Please try again.');
    } finally {
      setSavingVerse(false);
    }
  };

  const renderContent = () => {
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
          <Text style={[styles.errorText, { color: '#ff3b30' }]}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchChapterContent()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (verses.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>No verses available</Text>
        </View>
      );
    }

    return (
      <View style={styles.versesContainer}>
        {verses.map((verse, index) => {
          const verseNumber = verse.verse || verse.v || '';
          const verseText = verse.text || verse.t || '';
          const isSelected = selectedVerse === index;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.verseRow,
                isSelected && { backgroundColor: colors.background, padding: 12, borderRadius: 8, marginHorizontal: -12 }
              ]}
              onPress={() => setSelectedVerse(isSelected ? null : index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.verseNumber, { color: colors.primary }]}>{verseNumber}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verseText, { color: colors.text }]}>{verseText}</Text>
                {isSelected && (
                  <View style={styles.verseActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleSaveVerse(index)}
                      disabled={savingVerse}
                    >
                      {savingVerse ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <IconSymbol name="bookmark" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Save</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.card }]}
                      onPress={() => {
                        // Share functionality
                      }}
                    >
                      <IconSymbol name="square.and.arrow.up" size={16} color={colors.text} />
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>Share</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
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
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {bookName} {chapterId}
            </Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <IconSymbol name="ellipsis" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {renderContent()}
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
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  versesContainer: {
    gap: 16,
  },
  verseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 28,
    paddingTop: 2,
  },
  verseText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
  },
  verseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  errorText: {
    fontSize: 15,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ff9500',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
