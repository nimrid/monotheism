import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { API_URL } from '@/utils/api-config';
import { markChapterAsRead } from '@/utils/reading-plan-manager';
import { saveReadingProgress } from '@/utils/reading-progress';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, ViewToken } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

type Verse = {
  book?: string;
  chapter?: string;
  verse: string;
  text: string;
  b?: string;
  c?: string;
  v?: string;
  t?: string;
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

export default function ChapterContentScreen() {
  const { colors } = useTheme();
  const { walletAddress } = useUser();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { bookId, bookName, chapterId, testament } = params;
  
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingVerse, setSavingVerse] = useState<{ [key: number]: boolean }>({});
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

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

  const handleSaveVerse = async (index: number) => {
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

    const verse = verses[index];
    const verseNumber = verse.verse || verse.v || '';
    const verseText = verse.text || verse.t || '';

    setSavingVerse(prev => ({ ...prev, [index]: true }));
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
    } catch (error) {
      console.error('Error saving verse:', error);
      Alert.alert('Error', 'Failed to save verse. Please try again.');
    } finally {
      setSavingVerse(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleShare = async (verse: Verse) => {
    const verseNum = verse.verse || verse.v || '';
    const verseText = verse.text || verse.t || '';
    await Share.share({
      message: `"${verseText}"\n\n— ${bookName} ${chapterId}:${verseNum}`
    });
  };

  const handleCopy = async (verse: Verse) => {
    const verseNum = verse.verse || verse.v || '';
    const verseText = verse.text || verse.t || '';
    await Clipboard.setStringAsync(`"${verseText}"\n\n— ${bookName} ${chapterId}:${verseNum}`);
    Alert.alert('Copied', 'Verse copied to clipboard');
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && verses.length > 0) {
      const index = viewableItems[0].index || 0;
      const progress = Math.round(((index + 1) / verses.length) * 100);
      setScrollProgress(progress);
    }
  }, [verses]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderVerseItem = ({ item, index }: { item: Verse; index: number }) => {
    const verseNum = item.verse || item.v || '';
    const verseText = item.text || item.t || '';
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
            — {bookName} {chapterId}:{verseNum}
          </Text>
        </ScrollView>

        {/* Floating Action Buttons (TikTok style right edge) */}
        <View style={[styles.floatingActionContainer, { bottom: insets.bottom + 80 }]}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleSaveVerse(index)}>
            <View style={styles.iconCircle}>
              {savingVerse[index] ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol name="heart.fill" size={26} color="#fff" />
              )}
            </View>
            <Text style={styles.actionText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleCopy(item)}>
            <View style={styles.iconCircle}>
              <IconSymbol name="doc.on.doc" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
            <View style={styles.iconCircle}>
              <IconSymbol name="square.and.arrow.up" size={26} color="#fff" />
            </View>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Progress Indicator */}
        <View style={[styles.progressOverlay, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${((index + 1) / verses.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Verse {index + 1} of {verses.length}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: '#ff3b30' }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchChapterContent()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : verses.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No verses available</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={verses}
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
        )}

        {/* Floating Top Header (Transparent) */}
        <View style={[styles.floatingHeader, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {bookName} {chapterId}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  backButton: {
    padding: 8,
    width: 44,
  },
  headerTitleContainer: {
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
  progressText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 15,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#fff',
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
