import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

type BookInfo = any; // Full response from API

export default function BookInfoScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { bookId, bookName } = params;
  
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookId) {
      fetchBookInfo();
    }
  }, [bookId]);

  const fetchBookInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const paddedBookId = String(bookId).padStart(2, '0');
      const response = await fetch(
        `https://iq-bible.p.rapidapi.com/GetBookInfo?bookId=${paddedBookId}&language=english`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST!,
            'x-rapidapi-key': RAPIDAPI_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch book info');
      }

      const data = await response.json();
      setBookInfo(data);
    } catch (err) {
      setError('Failed to load book information');
      console.error('Error fetching book info:', err);
    } finally {
      setLoading(false);
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

    if (error || !bookInfo) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: '#ff3b30' }]}>{error || 'No information available'}</Text>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#ff9500', '#ff7b00']}
          style={styles.heroSection}
        >
          <IconSymbol name="book.fill" size={48} color="#fff" />
          <Text style={styles.heroTitle}>{bookName}</Text>
          <Text style={styles.heroSubtitle}>{bookInfo.genre}</Text>
          {bookInfo.word_origin && (
            <Text style={styles.heroOrigin}>{bookInfo.word_origin}</Text>
          )}
        </LinearGradient>

        {/* Quick Facts */}
        <View style={styles.quickFacts}>
          <View style={[styles.factCard, { backgroundColor: colors.card }]}>
            <IconSymbol name="person.fill" size={20} color={colors.primary} />
            <View style={styles.factContent}>
              <Text style={[styles.factLabel, { color: colors.tertiaryText }]}>Author</Text>
              <Text style={[styles.factValue, { color: colors.text }]}>{bookInfo.author}</Text>
            </View>
          </View>
          
          <View style={[styles.factCard, { backgroundColor: colors.card }]}>
            <IconSymbol name="calendar" size={20} color={colors.primary} />
            <View style={styles.factContent}>
              <Text style={[styles.factLabel, { color: colors.tertiaryText }]}>Date</Text>
              <Text style={[styles.factValue, { color: colors.text }]}>{bookInfo.date}</Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        {bookInfo.summary && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="text.alignleft" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.summary}</Text>
          </View>
        )}

        {/* Introduction */}
        {bookInfo.introduction && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="book" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Introduction</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.introduction}</Text>
          </View>
        )}

        {/* Purpose */}
        {bookInfo.purpose && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="target" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Purpose</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.purpose}</Text>
          </View>
        )}

        {/* Themes */}
        {bookInfo.themes && bookInfo.themes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="sparkles" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Themes</Text>
            </View>
            <View style={styles.tagsContainer}>
              {bookInfo.themes.map((theme: string, index: number) => (
                <View key={index} style={[styles.tag, { backgroundColor: colors.buttonBg }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{theme}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Theological Section Header */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.tertiaryText }]}>THEOLOGY & DOCTRINE</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Theological Introduction */}
        {bookInfo.theological_introduction && (
          <View style={[styles.theologicalCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="cross.fill" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Theological Overview</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.theological_introduction}</Text>
          </View>
        )}

        {/* Divine Attributes */}
        {bookInfo.theological_divine_attributes && bookInfo.theological_divine_attributes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="star.fill" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Divine Attributes</Text>
            </View>
            <View style={styles.tagsContainer}>
              {bookInfo.theological_divine_attributes.map((attr: string, index: number) => (
                <View key={index} style={[styles.tagPurple, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.tagPurpleText}>{attr}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Covenantal Themes */}
        {bookInfo.theological_covenantal_themes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="hand.raised.fill" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Covenantal Themes</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.theological_covenantal_themes}</Text>
          </View>
        )}

        {/* Christological Foreshadowing */}
        {bookInfo.theological_christological_foreshadowing && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="cross.circle.fill" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Christ in This Book</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.theological_christological_foreshadowing}</Text>
          </View>
        )}

        {/* Redemptive Plan */}
        {bookInfo.theological_redemptive_plan && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="heart.fill" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Redemptive Plan</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.theological_redemptive_plan}</Text>
          </View>
        )}

        {/* Theology of Sin */}
        {bookInfo.theological_theology_of_sin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Theology of Sin</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.theological_theology_of_sin}</Text>
          </View>
        )}

        {/* Faith and Obedience */}
        {bookInfo.theological_faith_and_obedience && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="hands.sparkles.fill" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Faith & Obedience</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.theological_faith_and_obedience}</Text>
          </View>
        )}

        {/* Divine Providence */}
        {bookInfo.theological_divine_providence && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="eye.fill" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Divine Providence</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.theological_divine_providence}</Text>
          </View>
        )}

        {/* Symbolism */}
        {bookInfo.theological_symbolism && bookInfo.theological_symbolism.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="wand.and.stars" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Symbolism</Text>
            </View>
            <View style={styles.symbolList}>
              {bookInfo.theological_symbolism.map((symbol: string, index: number) => (
                <View key={index} style={styles.symbolItem}>
                  <View style={styles.symbolDot} />
                  <Text style={[styles.bodyText, { color: colors.text }]}>{symbol}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Context Section Header */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.tertiaryText }]}>HISTORICAL CONTEXT</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Historical Context */}
        {bookInfo.historical_context && (
          <View style={[styles.contextCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="building.columns.fill" size={20} color="#10b981" />
              <Text style={styles.sectionTitleGreen}>Historical Setting</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.historical_context}</Text>
          </View>
        )}

        {/* Geographical Setting */}
        {bookInfo.geographical_setting && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="map.fill" size={20} color="#10b981" />
              <Text style={styles.sectionTitleGreen}>Geography</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.geographical_setting}</Text>
          </View>
        )}

        {/* Cultural Practices */}
        {bookInfo.cultural_practices && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.3.fill" size={20} color="#10b981" />
              <Text style={styles.sectionTitleGreen}>Cultural Practices</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.cultural_practices}</Text>
          </View>
        )}

        {/* Audience */}
        {bookInfo.audience && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.2.fill" size={20} color="#10b981" />
              <Text style={styles.sectionTitleGreen}>Original Audience</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.audience}</Text>
          </View>
        )}

        {/* Major Characters */}
        {bookInfo.major_characters && bookInfo.major_characters.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.2.fill" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Major Characters</Text>
            </View>
            <View style={styles.charactersList}>
              {bookInfo.major_characters.map((character: string, index: number) => (
                <View key={index} style={styles.characterItem}>
                  <View style={[styles.characterDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.characterText, { color: colors.text }]}>{character}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Literary Style */}
        {bookInfo.literary_style && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="pencil" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Literary Style</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.literary_style}</Text>
          </View>
        )}

        {/* Structure */}
        {bookInfo.structure && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="list.bullet" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Structure</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.structure}</Text>
          </View>
        )}

        {/* Key Verses */}
        {bookInfo.key_verses && bookInfo.key_verses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="quote.bubble.fill" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Verses</Text>
            </View>
            {bookInfo.key_verses.map((verse: any, index: number) => (
              <TouchableOpacity key={index} style={[styles.verseCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.verseReference, { color: colors.text }]}>{verse.reference}</Text>
                <IconSymbol name="chevron.right" size={16} color={colors.tertiaryText} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Practical Application */}
        {bookInfo.practical_application && (
          <View style={[styles.applicationCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="lightbulb.fill" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitleAmber}>Practical Application</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.practical_application}</Text>
          </View>
        )}

        {/* Connection to Other Books */}
        {bookInfo.connection_to_other_books && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="link" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Biblical Connections</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.connection_to_other_books}</Text>
          </View>
        )}

        {/* Canonical Significance */}
        {bookInfo.canonical_significance && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="books.vertical.fill" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Canonical Significance</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.canonical_significance}</Text>
          </View>
        )}

        {/* Historical Impact */}
        {bookInfo.historical_impact && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="globe" size={20} color="#10b981" />
              <Text style={styles.sectionTitleGreen}>Historical Impact</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.historical_impact}</Text>
          </View>
        )}

        {/* Ethical Teachings */}
        {bookInfo.ethical_teachings && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="scale.3d" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitlePurple}>Ethical Teachings</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.text }]}>{bookInfo.ethical_teachings}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.background }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Book Insights</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    gap: 20,
  },
  heroSection: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroOrigin: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  quickFacts: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  factCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  factContent: {
    flex: 1,
  },
  factLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  factValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 20,
  },
  theologicalCard: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 16,
  },
  contextCard: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 16,
  },
  applicationCard: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitlePurple: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  sectionTitleGreen: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  sectionTitleAmber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagPurple: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagPurpleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8b5cf6',
  },
  charactersList: {
    gap: 12,
  },
  characterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  characterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  characterText: {
    fontSize: 15,
  },
  symbolList: {
    gap: 12,
  },
  symbolItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  symbolDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
    marginTop: 8,
  },
  verseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  verseReference: {
    fontSize: 15,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  errorText: {
    fontSize: 15,
    color: '#ff3b30',
  },
});
