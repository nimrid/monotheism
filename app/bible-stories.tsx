import { IconSymbol } from '@/components/ui/icon-symbol';
import PremiumPaywallModal from '@/components/PremiumPaywallModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { API_URL } from '@/utils/api-config';
import { hasPremiumAccess } from '@/utils/subscription';
import { fetchBibleStoriesVerse, VerseRangeResult } from '@/utils/verse-search';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

type Story = {
  id: string;
  verse_id: string;
  story: string;
  verses_1: string;
  verses_2: string;
  verses_3: string;
  verses_4: string;
};

export default function BibleStoriesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { walletAddress } = useUser();
  
  const [stories, setStories] = useState<Story[]>([]);
  const [filteredStories, setFilteredStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerse, setSelectedVerse] = useState<VerseRangeResult | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(false);
  const [savingVerse, setSavingVerse] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    fetchStories();
    checkPremiumStatus();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStories(stories);
    } else {
      const filtered = stories.filter(story =>
        story.story.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStories(filtered);
    }
  }, [searchQuery, stories]);

  const checkPremiumStatus = async () => {
    try {
      const premium = await hasPremiumAccess();
      setIsPremium(premium);
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setCheckingPremium(false);
    }
  };

  const fetchStories = async () => {
    setLoading(true);
    setError(null);

    // Check premium status first
    const hasPremium = await hasPremiumAccess();
    if (!hasPremium) {
      setLoading(false);
      setShowPremiumModal(true);
      return;
    }

    try {
      const response = await fetch(
        'https://iq-bible.p.rapidapi.com/GetStories?language=english',
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST!,
            'x-rapidapi-key': RAPIDAPI_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }

      const data = await response.json();
      setStories(data);
      setFilteredStories(data);
    } catch (err) {
      setError('Failed to load Bible stories');
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStoryIcon = (story: string) => {
    if (story.includes('Creation') || story.includes('Creates')) return '🌍';
    if (story.includes('Noah') || story.includes('Ark') || story.includes('Flood')) return '🌊';
    if (story.includes('Moses') || story.includes('Red Sea')) return '🌊';
    if (story.includes('David') || story.includes('Goliath')) return '⚔️';
    if (story.includes('Jesus') || story.includes('Christ')) return '✝️';
    if (story.includes('Birth') || story.includes('Born')) return '⭐';
    if (story.includes('Resurrection') || story.includes('Risen')) return '🌅';
    if (story.includes('Crucifixion') || story.includes('Cross')) return '✝️';
    if (story.includes('Miracle') || story.includes('Heals')) return '✨';
    if (story.includes('Angel')) return '👼';
    if (story.includes('King') || story.includes('Queen')) return '👑';
    if (story.includes('Prophet')) return '📜';
    if (story.includes('Temple')) return '🏛️';
    if (story.includes('Prayer')) return '🙏';
    return '📖';
  };

  const handleVerseClick = async (reference: string) => {
    console.log('Verse clicked:', reference);
    setLoadingVerse(true);
    try {
      const verse = await fetchBibleStoriesVerse(reference, RAPIDAPI_KEY!, RAPIDAPI_HOST!);
      console.log('Verse result:', verse);
      if (verse) {
        setSelectedVerse(verse);
      } else {
        Alert.alert('Error', `Failed to load verse: ${reference}`);
      }
    } catch (err) {
      console.error('Error loading verse:', err);
      Alert.alert('Error', 'Failed to load verse');
    } finally {
      setLoadingVerse(false);
    }
  };

  const copyToClipboard = async () => {
    if (!selectedVerse) return;
    
    const bookName = selectedVerse.book.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const text = `"${selectedVerse.text}"\n\n— ${bookName} ${selectedVerse.startChapter}:${selectedVerse.verses}`;
    
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Verse copied to clipboard');
  };

  const saveVerse = async () => {
    if (!selectedVerse || !walletAddress) {
      Alert.alert('Error', 'Please connect your wallet to save verses');
      return;
    }

    setSavingVerse(true);
    try {
      const bookName = selectedVerse.book.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const response = await fetch(`${API_URL}/users/${walletAddress}/saved-verses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookName: bookName,
          chapterNumber: parseInt(selectedVerse.startChapter),
          verseNumber: parseInt(selectedVerse.verses.split('-')[0]),
          verseText: selectedVerse.text,
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
      setSavingVerse(false);
    }
  };

  const shareVerse = async () => {
    if (!selectedVerse) return;

    try {
      const bookName = selectedVerse.book.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const message = `"${selectedVerse.text}"\n\n— ${bookName} ${selectedVerse.startChapter}:${selectedVerse.verses}`;
      
      await Share.share({
        message: message,
        title: `${bookName} ${selectedVerse.startChapter}:${selectedVerse.verses}`,
      });
    } catch (error) {
      console.error('Error sharing verse:', error);
      Alert.alert('Error', 'Failed to share verse');
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
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchStories()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredStories.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
            {searchQuery ? 'No stories found' : 'No stories available'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.storiesList}>
        {filteredStories.map((story, index) => {
          const verses = [story.verses_1, story.verses_2, story.verses_3, story.verses_4]
            .filter(v => v && v.trim() !== '');
          
          return (
            <TouchableOpacity 
              key={story.id} 
              style={[styles.storyCard, { backgroundColor: colors.card }]}
              onPress={() => {
                console.log('Navigate to:', story.verses_1);
              }}
            >
              <View style={[styles.storyIconContainer, { backgroundColor: colors.buttonBg }]}>
                <Text style={styles.storyEmoji}>{getStoryIcon(story.story)}</Text>
              </View>
              
              <View style={styles.storyContent}>
                <Text style={[styles.storyTitle, { color: colors.text }]}>{story.story}</Text>
                <View style={styles.versesContainer}>
                  {verses.slice(0, 2).map((verse, vIndex) => (
                    <TouchableOpacity 
                      key={vIndex} 
                      style={[styles.verseTag, { backgroundColor: colors.buttonBg }]}
                      onPress={() => handleVerseClick(verse)}
                    >
                      <Text style={[styles.verseText, { color: colors.secondaryText }]}>{verse}</Text>
                    </TouchableOpacity>
                  ))}
                  {verses.length > 2 && (
                    <View style={[styles.verseTag, { backgroundColor: colors.buttonBg }]}>
                      <Text style={[styles.verseText, { color: colors.secondaryText }]}>+{verses.length - 2}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Bible Stories</Text>
            <Text style={[styles.subtitle, { color: colors.tertiaryText }]}>{stories.length} popular stories</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.buttonBg }]}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.tertiaryText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search stories..."
              placeholderTextColor={colors.tertiaryText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.tertiaryText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>

        {/* Verse Modal */}
        <Modal
          visible={!!selectedVerse || loadingVerse}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedVerse(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              {loadingVerse ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : selectedVerse ? (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalReference, { color: colors.primary }]}>
                      {selectedVerse && `${selectedVerse.book.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ${selectedVerse.startChapter}:${selectedVerse.verses}`}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedVerse(null)}>
                      <IconSymbol name="xmark.circle.fill" size={28} color={colors.tertiaryText} />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalScroll}>
                    <Text style={[styles.modalText, { color: colors.text }]}>{selectedVerse.text}</Text>
                  </ScrollView>
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: colors.buttonBg }]}
                      onPress={saveVerse}
                      disabled={savingVerse}
                    >
                      <IconSymbol name="heart" size={18} color={colors.primary} />
                      <Text style={[styles.modalButtonText, { color: colors.primary }]}>
                        {savingVerse ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: colors.buttonBg }]}
                      onPress={shareVerse}
                    >
                      <IconSymbol name="square.and.arrow.up" size={18} color={colors.primary} />
                      <Text style={[styles.modalButtonText, { color: colors.primary }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: colors.buttonBg }]} 
                      onPress={copyToClipboard}
                    >
                      <IconSymbol name="doc.on.doc" size={18} color={colors.primary} />
                      <Text style={[styles.modalButtonText, { color: colors.primary }]}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </Modal>

        {/* Premium Paywall Modal (shared component with real SKR payment) */}
        <PremiumPaywallModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onSuccess={() => {
            setIsPremium(true);
            fetchStories();
          }}
        />
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
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  storiesList: {
    gap: 12,
  },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  storyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyEmoji: {
    fontSize: 24,
  },
  storyContent: {
    flex: 1,
    gap: 8,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  versesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  verseTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verseText: {
    fontSize: 12,
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
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalReference: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  modalScroll: {
    flex: 1,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 17,
    lineHeight: 28,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

