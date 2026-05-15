import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchBibleStoriesVerse } from '@/utils/verse-search';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type VerseResult = {
  verse: string;
  text: string;
  book: string;
  chapter: string;
};

type TopicResult = {
  citation: string;
  verseIds: string[];
};

const RECENT_SEARCHES_KEY = '@recent_searches';
const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

// Book ID to name mapping for RapidAPI
const BOOK_ID_MAP: { [key: string]: string } = {
  '01': 'Genesis', '02': 'Exodus', '03': 'Leviticus', '04': 'Numbers', '05': 'Deuteronomy',
  '06': 'Joshua', '07': 'Judges', '08': 'Ruth', '09': '1 Samuel', '10': '2 Samuel',
  '11': '1 Kings', '12': '2 Kings', '13': '1 Chronicles', '14': '2 Chronicles', '15': 'Ezra',
  '16': 'Nehemiah', '17': 'Esther', '18': 'Job', '19': 'Psalms', '20': 'Proverbs',
  '21': 'Ecclesiastes', '22': 'Song of Solomon', '23': 'Isaiah', '24': 'Jeremiah', '25': 'Lamentations',
  '26': 'Ezekiel', '27': 'Daniel', '28': 'Hosea', '29': 'Joel', '30': 'Amos',
  '31': 'Obadiah', '32': 'Jonah', '33': 'Micah', '34': 'Nahum', '35': 'Habakkuk',
  '36': 'Zephaniah', '37': 'Haggai', '38': 'Zechariah', '39': 'Malachi',
  '40': 'Matthew', '41': 'Mark', '42': 'Luke', '43': 'John', '44': 'Acts',
  '45': 'Romans', '46': '1 Corinthians', '47': '2 Corinthians', '48': 'Galatians', '49': 'Ephesians',
  '50': 'Philippians', '51': 'Colossians', '52': '1 Thessalonians', '53': '2 Thessalonians', '54': '1 Timothy',
  '55': '2 Timothy', '56': 'Titus', '57': 'Philemon', '58': 'Hebrews', '59': 'James',
  '60': '1 Peter', '61': '2 Peter', '62': '1 John', '63': '2 John', '64': '3 John',
  '65': 'Jude', '66': 'Revelation',
};

const popularTopics = [
  ['Love', 'Faith', 'Hope', 'Peace'],
  ['Strength', 'Wisdom', 'Forgiveness'],
  ['Healing', 'Joy', 'Grace'],
];

export default function SearchScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<VerseResult | null>(null);
  const [topicResults, setTopicResults] = useState<TopicResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<'verse' | 'topic'>('verse');
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (data) {
        setRecentSearches(JSON.parse(data));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  const removeRecentSearch = async (query: string) => {
    try {
      const updated = recentSearches.filter(s => s !== query);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('Failed to remove recent search:', error);
    }
  };

  const parseVerseReference = (query: string): { book: string; chapter: string; verse: string } | null => {
    // Match patterns like "John 3:16", "1 John 3:16", "2 Corinthians 4:16", "Psalm 23:1"
    // Also match verse ranges like "Romans 8:24-25" or "1 Peter 5:8-10"
    const match = query.match(/^(\d?\s?[a-zA-Z\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/i);
    if (!match) return null;

    let book = match[1].trim().toLowerCase();
    const chapter = match[2];
    const startVerse = match[3];
    const endVerse = match[4] || match[3]; // If no end verse, use start verse

    // Handle numbered books: "1 peter" -> "1-peter", "2 corinthians" -> "2-corinthians"
    book = book.replace(/^(\d+)\s+/, '$1-').replace(/\s+/g, '-');

    // Return the verse range as a single string for compatibility
    const verse = endVerse !== startVerse ? `${startVerse}-${endVerse}` : startVerse;

    return { book, chapter, verse };
  };

  const searchVerse = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setLoading(true);
    setError(null);
    setSearchResult(null);
    setTopicResults([]);

    const parsed = parseVerseReference(trimmedQuery);
    if (!parsed) {
      setError('Invalid format. Use format like "John 3:16", "1 Peter 5:8", or "Romans 8:24-25"');
      setLoading(false);
      return;
    }

    try {
      // Check if it's a verse range
      const isRange = parsed.verse.includes('-');
      
      if (isRange) {
        // Use fetchBibleStoriesVerse for ranges
        const verseResult = await fetchBibleStoriesVerse(trimmedQuery, RAPIDAPI_KEY!, RAPIDAPI_HOST!);
        
        if (verseResult) {
          // Convert VerseRangeResult to VerseResult format for display
          setSearchResult({
            verse: verseResult.verses,
            text: verseResult.text,
            book: verseResult.book,
            chapter: verseResult.startChapter,
          });
          await saveRecentSearch(trimmedQuery);
          setLoading(false);
          return;
        } else {
          throw new Error('Verse range not found');
        }
      }

      // Single verse search (existing logic)
      const hasNumberPrefix = /^\d/.test(parsed.book);
      
      if (hasNumberPrefix) {
        // For numbered books, find the book ID and use RapidAPI
        const bookId = Object.keys(BOOK_ID_MAP).find(
          id => BOOK_ID_MAP[id].toLowerCase().replace(/\s+/g, '-') === parsed.book
        );
        
        if (!bookId) {
          throw new Error('Book not found');
        }

        // Construct verseId: bookId + chapter (2 digits) + verse (3 digits)
        const verseId = `${bookId}${parsed.chapter.padStart(3, '0')}${parsed.verse.padStart(3, '0')}`;
        
        const response = await fetch(
          `https://iq-bible.p.rapidapi.com/GetVerse?verseId=${verseId}&versionId=kjv`,
          {
            method: 'GET',
            headers: {
              'x-rapidapi-host': RAPIDAPI_HOST!,
              'x-rapidapi-key': RAPIDAPI_KEY!,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Verse not found');
        }

        const data = await response.json();
        if (!data || data.length === 0) {
          throw new Error('Verse not found');
        }

        const verseData = data[0];
        setSearchResult({
          verse: verseData.v,
          text: verseData.t,
          book: parsed.book,
          chapter: verseData.c,
        });
        await saveRecentSearch(trimmedQuery);
      } else {
        // Fetch the entire chapter and extract the specific verse - use @master to avoid size limits
        const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api@master/bibles/en-asv/books/${parsed.book}/chapters/${parsed.chapter}.json`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Verse not found');
        }

        const chapterData = await response.json();
        const verses = chapterData.data || [];
        const verseData = verses.find((v: any) => v.verse === parsed.verse);

        if (!verseData) {
          throw new Error('Verse not found in chapter');
        }

        setSearchResult({
          verse: verseData.verse,
          text: verseData.text,
          book: parsed.book,
          chapter: parsed.chapter,
        });
        await saveRecentSearch(trimmedQuery);
      }
    } catch (err) {
      setError('Verse not found. Please check the reference and try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchTopic = async (topic: string) => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return;

    setLoading(true);
    setError(null);
    setSearchResult(null);
    setTopicResults([]);
    setSearchMode('topic');

    try {
      const response = await fetch(
        `https://iq-bible.p.rapidapi.com/GetTopic?topic=${encodeURIComponent(trimmedTopic.toLowerCase())}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST!,
            'x-rapidapi-key': RAPIDAPI_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Topic not found');
      }

      const data = await response.json();
      setTopicResults(data);
      await saveRecentSearch(trimmedTopic);
    } catch (err) {
      setError('No verses found for this topic. Try another topic.');
      console.error('Topic search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    searchVerse(searchQuery);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    searchVerse(query);
  };

  const copyToClipboard = async () => {
    if (!searchResult) return;
    
    const bookName = searchResult.book.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const text = `"${searchResult.text}"\n\n— ${bookName} ${searchResult.chapter}:${searchResult.verse} (ASV)`;
    
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Verse copied to clipboard');
  };

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic);
    searchTopic(topic);
    setShowAllTopics(false);
  };

  const fetchAllTopics = async () => {
    if (allTopics.length > 0) {
      setShowAllTopics(true);
      return;
    }

    setLoadingTopics(true);
    try {
      const response = await fetch(
        'https://iq-bible.p.rapidapi.com/GetTopics',
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST!,
            'x-rapidapi-key': RAPIDAPI_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }

      const data = await response.json();
      setAllTopics(data);
      setShowAllTopics(true);
    } catch (err) {
      console.error('Failed to fetch all topics:', err);
      Alert.alert('Error', 'Failed to load topics. Please try again.');
    } finally {
      setLoadingTopics(false);
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.buttonBg }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.tertiaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search verses (e.g., John 3:16, Romans 8:24-25)"
            placeholderTextColor={colors.tertiaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="words"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResult(null);
              setTopicResults([]);
              setError(null);
            }}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.tertiaryText} />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Search Result */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
            <IconSymbol name="exclamationmark.triangle" size={32} color="#ff3b30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {searchResult && (
          <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultReference, { color: colors.primary }]}>
                {searchResult.book.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} {searchResult.chapter}:{searchResult.verse}
              </Text>
              <Text style={[styles.resultVersion, { color: colors.tertiaryText, backgroundColor: colors.background }]}>ASV</Text>
            </View>
            <Text style={[styles.resultText, { color: colors.text }]}>{searchResult.text}</Text>
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.actionButton}>
                <IconSymbol name="heart" size={18} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <IconSymbol name="square.and.arrow.up" size={18} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
                <IconSymbol name="doc.on.doc" size={18} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {topicResults.length > 0 && (
          <View style={styles.topicResultsContainer}>
            <View style={styles.topicResultsHeader}>
              <Text style={styles.topicResultsTitle}>
                Verses about "{searchQuery}"
              </Text>
              <Text style={styles.topicResultsCount}>
                {topicResults.length} {topicResults.length === 1 ? 'verse' : 'verses'}
              </Text>
            </View>
            
            <View style={styles.citationsGrid}>
              {topicResults.map((result, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.citationCard}
                  onPress={async () => {
                    // Check if this is a numbered book by looking at the first verseId
                    const firstVerseId = result.verseIds[0];
                    const bookId = firstVerseId.substring(0, 2);
                    const bookName = BOOK_ID_MAP[bookId];
                    
                    if (bookName && /^\d/.test(bookName)) {
                      // Numbered book - fetch using RapidAPI
                      setLoading(true);
                      setError(null);
                      setSearchResult(null);
                      setTopicResults([]);
                      
                      try {
                        const response = await fetch(
                          `https://iq-bible.p.rapidapi.com/GetVerse?verseId=${firstVerseId}&versionId=kjv`,
                          {
                            method: 'GET',
                            headers: {
                              'x-rapidapi-host': RAPIDAPI_HOST!,
                              'x-rapidapi-key': RAPIDAPI_KEY!,
                            },
                          }
                        );

                        if (!response.ok) {
                          throw new Error('Verse not found');
                        }

                        const data = await response.json();
                        if (data && data.length > 0) {
                          const verseData = data[0];
                          setSearchResult({
                            verse: verseData.v,
                            text: verseData.t,
                            book: bookName.toLowerCase().replace(/\s+/g, '-'),
                            chapter: verseData.c,
                          });
                        }
                      } catch (err) {
                        setError('Failed to load verse');
                      } finally {
                        setLoading(false);
                      }
                    } else {
                      // Non-numbered book - use regular search
                      setSearchQuery(result.citation);
                      searchVerse(result.citation);
                    }
                  }}
                >
                  <View style={styles.citationIconContainer}>
                    <IconSymbol name="book.fill" size={20} color="#ff9500" />
                  </View>
                  <Text style={styles.citationText} numberOfLines={2}>
                    {result.citation}
                  </Text>
                  <View style={styles.citationArrow}>
                    <IconSymbol name="chevron.right" size={16} color="#999" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recent Section */}
        {!loading && !searchResult && !topicResults.length && recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="clock" size={18} color={colors.tertiaryText} />
              <Text style={[styles.sectionTitle, { color: colors.tertiaryText }]}>RECENT</Text>
            </View>

            {recentSearches.map((search, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.recentItem, { backgroundColor: colors.card }]}
                onPress={() => handleRecentSearchClick(search)}
              >
                <Text style={[styles.recentText, { color: colors.text }]}>{search}</Text>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeRecentSearch(search);
                  }}
                >
                  <IconSymbol name="xmark" size={16} color={colors.tertiaryText} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Popular Topics Section */}
        {!loading && !searchResult && !topicResults.length && !showAllTopics && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={18} color={colors.tertiaryText} />
              <Text style={[styles.sectionTitle, { color: colors.tertiaryText }]}>POPULAR TOPICS</Text>
            </View>

            <View style={styles.topicsContainer}>
              {popularTopics.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.topicRow}>
                  {row.map((topic, topicIndex) => (
                    <TouchableOpacity 
                      key={topicIndex} 
                      style={[styles.topicChip, { backgroundColor: colors.buttonBg }]}
                      onPress={() => handleTopicClick(topic)}
                    >
                      <Text style={[styles.topicText, { color: colors.text }]}>{topic}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* All Topics Button */}
            <TouchableOpacity 
              style={styles.allTopicsButton}
              onPress={fetchAllTopics}
              disabled={loadingTopics}
            >
              {loadingTopics ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <IconSymbol name="list.bullet" size={20} color="#fff" />
                  <Text style={styles.allTopicsButtonText}>View All Topics</Text>
                  <IconSymbol name="chevron.right" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* All Topics Grid */}
        {showAllTopics && !loading && (
          <View style={styles.section}>
            <View style={styles.allTopicsHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setShowAllTopics(false)}
              >
                <IconSymbol name="chevron.left" size={20} color="#ff9500" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.allTopicsTitle}>All Topics ({allTopics.length})</Text>
            </View>

            <View style={styles.allTopicsGrid}>
              {allTopics.map((topic, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.allTopicCard}
                  onPress={() => handleTopicClick(topic)}
                >
                  <Text style={styles.allTopicText}>
                    {topic.charAt(0).toUpperCase() + topic.slice(1)}
                  </Text>
                  <IconSymbol name="chevron.right" size={14} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchButton: {
    backgroundColor: '#ff9500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  errorText: {
    fontSize: 15,
    color: '#ff3b30',
    textAlign: 'center',
    marginTop: 12,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultReference: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff9500',
  },
  resultVersion: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 17,
    lineHeight: 28,
    color: '#000',
    marginBottom: 20,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff3e6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff9500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  recentText: {
    fontSize: 16,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  topicsContainer: {
    gap: 12,
  },
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  topicChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  topicText: {
    fontSize: 15,
    fontWeight: '500',
  },
  topicResultsContainer: {
    marginBottom: 24,
  },
  topicResultsHeader: {
    marginBottom: 20,
  },
  topicResultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  topicResultsCount: {
    fontSize: 15,
    color: '#999',
  },
  citationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  citationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  citationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff3e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  citationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  citationArrow: {
    opacity: 0.5,
  },
  allTopicsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9500',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
    elevation: 3,
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  allTopicsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  allTopicsHeader: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff9500',
  },
  allTopicsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  allTopicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  allTopicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  allTopicText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
});
