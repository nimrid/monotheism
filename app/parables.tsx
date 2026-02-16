import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchVerse, VerseResult } from '@/utils/verse-search';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;

type Parables = {
  [key: string]: string[];
};

export default function ParablesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const [parables, setParables] = useState<Parables>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<VerseResult | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(false);

  useEffect(() => {
    fetchParables();
  }, []);

  const fetchParables = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://iq-bible.p.rapidapi.com/GetParables?language=english',
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST!,
            'x-rapidapi-key': RAPIDAPI_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch parables');
      }

      const data = await response.json();
      setParables(data);
    } catch (err) {
      setError('Failed to load parables');
      console.error('Error fetching parables:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReferenceClick = async (reference: string) => {
    setLoadingVerse(true);
    try {
      const verse = await fetchVerse(reference, RAPIDAPI_KEY!, RAPIDAPI_HOST!);
      if (verse) {
        setSelectedVerse(verse);
      } else {
        Alert.alert('Error', 'Failed to load verse');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load verse');
    } finally {
      setLoadingVerse(false);
    }
  };

  const copyToClipboard = async () => {
    if (!selectedVerse) return;
    
    const bookName = selectedVerse.book.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const text = `"${selectedVerse.text}"\n\n— ${bookName} ${selectedVerse.chapter}:${selectedVerse.verse}`;
    
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Verse copied to clipboard');
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
            onPress={() => fetchParables()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const parableEntries = Object.entries(parables);

    if (parableEntries.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>No parables available</Text>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {/* Header Info */}
        <View style={[styles.headerInfo, { backgroundColor: colors.card }]}>
          <Text style={[styles.headerInfoText, { color: colors.secondaryText }]}>
            Discover {parableEntries.length} parables of Jesus - stories that teach profound spiritual truths through everyday examples.
          </Text>
        </View>

        {/* Parables List */}
        <View style={styles.parablesList}>
          {parableEntries.map(([title, references], index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.parableCard, { backgroundColor: colors.card }]}
              onPress={() => {
                // Navigate to first reference
                console.log('Navigate to:', references[0]);
              }}
            >
              <View style={[styles.parableIcon, { backgroundColor: colors.buttonBg }]}>
                <Text style={styles.parableEmoji}>✨</Text>
              </View>
              
              <View style={styles.parableContent}>
                <Text style={[styles.parableTitle, { color: colors.text }]}>{title}</Text>
                <View style={styles.referencesContainer}>
                  {references.slice(0, 3).map((ref, refIndex) => (
                    <TouchableOpacity 
                      key={refIndex} 
                      style={[styles.referenceTag, { backgroundColor: colors.buttonBg }]}
                      onPress={() => handleReferenceClick(ref)}
                    >
                      <Text style={[styles.referenceText, { color: colors.secondaryText }]}>{ref}</Text>
                    </TouchableOpacity>
                  ))}
                  {references.length > 3 && (
                    <View style={[styles.referenceTag, { backgroundColor: colors.buttonBg }]}>
                      <Text style={[styles.referenceText, { color: colors.secondaryText }]}>+{references.length - 3}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
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
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Parables of Jesus</Text>
            <Text style={[styles.subtitle, { color: colors.tertiaryText }]}>Stories that teach spiritual truths</Text>
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
                      {selectedVerse.book.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} {selectedVerse.chapter}:{selectedVerse.verse}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedVerse(null)}>
                      <IconSymbol name="xmark.circle.fill" size={28} color={colors.tertiaryText} />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalScroll}>
                    <Text style={[styles.modalText, { color: colors.text }]}>{selectedVerse.text}</Text>
                  </ScrollView>
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.buttonBg }]}>
                      <IconSymbol name="heart" size={18} color={colors.primary} />
                      <Text style={[styles.modalButtonText, { color: colors.primary }]}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.buttonBg }]}>
                      <IconSymbol name="square.and.arrow.up" size={18} color={colors.primary} />
                      <Text style={[styles.modalButtonText, { color: colors.primary }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.buttonBg }]} onPress={copyToClipboard}>
                      <IconSymbol name="doc.on.doc" size={18} color={colors.primary} />
                      <Text style={[styles.modalButtonText, { color: colors.primary }]}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
  },
  headerInfo: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  headerInfoText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  parablesList: {
    gap: 12,
  },
  parableCard: {
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
  parableIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parableEmoji: {
    fontSize: 24,
  },
  parableContent: {
    flex: 1,
    gap: 8,
  },
  parableTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  referencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  referenceTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  referenceText: {
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
