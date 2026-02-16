import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Book = {
  n?: string;
  c?: number;
  name?: string;
  id?: string;
  info_url?: string;
  b?: string; // bookId for Old/New Testament
};

type Testament = 'old' | 'new' | 'extra';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

export default function ReadScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Testament>('old');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks(activeTab);
  }, [activeTab]);

  const fetchBooks = async (testament: Testament) => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      
      if (testament === 'old') {
        endpoint = 'https://iq-bible.p.rapidapi.com/GetBooksOT?language=english';
      } else if (testament === 'new') {
        endpoint = 'https://iq-bible.p.rapidapi.com/GetBooksNT?language=english';
      } else {
        endpoint = 'https://iq-bible.p.rapidapi.com/GetBooksExtraBiblical';
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST!,
          'x-rapidapi-key': RAPIDAPI_KEY!,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();
      setBooks(data);
    } catch (err) {
      setError('Failed to load books');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderBooks = () => {
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
        </View>
      );
    }

    if (books.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>No books available</Text>
        </View>
      );
    }

    return (
      <View style={styles.booksGrid}>
        {books.map((book, index) => {
          const bookName = book.n || book.name || 'Unknown';
          const hasChapters = book.c !== undefined;
          const isExtraBiblical = activeTab === 'extra';
          
          return (
            <TouchableOpacity 
              key={book.id || index} 
              style={[styles.bookCard, { backgroundColor: colors.card }]}
              onPress={() => {
                if (isExtraBiblical && book.id) {
                  router.push({
                    pathname: '/book-chapters',
                    params: {
                      bookId: book.id,
                      bookName: bookName,
                      isExtraBiblical: 'true',
                      testament: 'extra',
                    },
                  });
                } else {
                  // Handle Old/New Testament books
                  router.push({
                    pathname: '/book-chapters',
                    params: {
                      bookId: book.b || book.id, // Use 'b' field for Old/New Testament
                      bookName: bookName,
                      isExtraBiblical: 'false',
                      testament: activeTab, // 'old' or 'new'
                    },
                  });
                }
              }}
            >
              <View style={styles.bookInfo}>
                <Text style={[styles.bookName, { color: colors.text }]} numberOfLines={2}>
                  {bookName}
                </Text>
                {hasChapters && (
                  <Text style={[styles.bookChapters, { color: colors.tertiaryText }]}>
                    {book.c} {book.c === 1 ? 'chapter' : 'chapters'}
                  </Text>
                )}
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Read</Text>
        <TouchableOpacity style={[styles.versionButton, { backgroundColor: colors.buttonBg }]}>
          <Text style={[styles.versionText, { color: colors.text }]}>KJV</Text>
          <IconSymbol name="chevron.down" size={16} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabs}
      >
        <TouchableOpacity 
          style={[activeTab === 'old' ? styles.tabActive : styles.tab, activeTab !== 'old' && { backgroundColor: colors.buttonBg }]}
          onPress={() => setActiveTab('old')}
        >
          <Text style={[activeTab === 'old' ? styles.tabTextActive : styles.tabText, activeTab !== 'old' && { color: colors.secondaryText }]}>
            Old Testament
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[activeTab === 'new' ? styles.tabActive : styles.tab, activeTab !== 'new' && { backgroundColor: colors.buttonBg }]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[activeTab === 'new' ? styles.tabTextActive : styles.tabText, activeTab !== 'new' && { color: colors.secondaryText }]}>
            New Testament
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[activeTab === 'extra' ? styles.tabActive : styles.tab, activeTab !== 'extra' && { backgroundColor: colors.buttonBg }]}
          onPress={() => setActiveTab('extra')}
        >
          <Text style={[activeTab === 'extra' ? styles.tabTextActive : styles.tabText, activeTab !== 'extra' && { color: colors.secondaryText }]}>
            Extra-Biblical
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Books */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderBooks()}
      </ScrollView>
    </View>
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  versionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  versionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabsScrollView: {
    marginBottom: 16,
    maxHeight: 36,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
  },
  tabActive: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#ff9500',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  bookInfo: {
    flex: 1,
  },
  bookName: {
    fontSize: 15,
    fontWeight: '600',
  },
  bookChapters: {
    fontSize: 13,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});
