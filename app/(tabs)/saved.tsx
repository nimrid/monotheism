import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { API_URL } from '@/utils/api-config';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SavedVerse = {
  id: string;
  bookName: string;
  bookId: string;
  chapterNumber: number;
  verseNumber: number;
  verseText: string;
  notes: string | null;
  createdAt: string;
};

export default function SavedScreen() {
  const { colors } = useTheme();
  const { walletAddress } = useUser();
  const router = useRouter();
  const [verses, setVerses] = useState<SavedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (walletAddress) {
        fetchSavedVerses();
      } else {
        setLoading(false);
      }
    }, [walletAddress])
  );

  const fetchSavedVerses = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/${walletAddress}/saved-verses`);
      
      if (response.ok) {
        const data = await response.json();
        setVerses(data);
      } else {
        console.error('Failed to fetch saved verses');
      }
    } catch (error) {
      console.error('Error fetching saved verses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVerse = async (verseId: string) => {
    if (!walletAddress) return;

    Alert.alert(
      'Delete Verse',
      'Are you sure you want to remove this verse from your saved collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(verseId);
            try {
              const response = await fetch(
                `${API_URL}/users/${walletAddress}/saved-verses/${verseId}`,
                { method: 'DELETE' }
              );

              if (response.ok) {
                setVerses(verses.filter(v => v.id !== verseId));
              } else {
                Alert.alert('Error', 'Failed to delete verse');
              }
            } catch (error) {
              console.error('Error deleting verse:', error);
              Alert.alert('Error', 'Failed to delete verse');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleVersePress = (verse: SavedVerse) => {
    router.push({
      pathname: '/chapter-content',
      params: {
        bookId: verse.bookId,
        bookName: verse.bookName,
        chapterId: verse.chapterNumber,
        testament: parseInt(verse.bookId) <= 39 ? 'old' : 'new',
      },
    });
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Saved</Text>
        {verses.length > 0 && (
          <Text style={[styles.count, { color: colors.secondaryText }]}>
            {verses.length} {verses.length === 1 ? 'verse' : 'verses'}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !walletAddress ? (
        <View style={styles.emptyState}>
          <View style={[styles.iconContainer, { backgroundColor: colors.buttonBg }]}>
            <IconSymbol name="person" size={48} color={colors.tertiaryText} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Connect Your Wallet</Text>
          <Text style={[styles.emptyDescription, { color: colors.tertiaryText }]}>
            Connect your wallet to save and sync your favorite verses
          </Text>
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.connectButtonText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      ) : verses.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.iconContainer, { backgroundColor: colors.buttonBg }]}>
            <IconSymbol name="bookmark" size={48} color={colors.tertiaryText} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved verses yet</Text>
          <Text style={[styles.emptyDescription, { color: colors.tertiaryText }]}>
            Tap on any verse while reading to save it to your collection
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {verses.map((verse) => (
            <TouchableOpacity
              key={verse.id}
              style={[styles.verseCard, { backgroundColor: colors.card }]}
              onPress={() => handleVersePress(verse)}
              activeOpacity={0.7}
            >
              <View style={styles.verseHeader}>
                <Text style={[styles.verseReference, { color: colors.primary }]}>
                  {verse.bookName} {verse.chapterNumber}:{verse.verseNumber}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteVerse(verse.id)}
                  disabled={deleting === verse.id}
                  style={styles.deleteButton}
                >
                  {deleting === verse.id ? (
                    <ActivityIndicator size="small" color={colors.tertiaryText} />
                  ) : (
                    <IconSymbol name="trash" size={18} color={colors.tertiaryText} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={[styles.verseText, { color: colors.text }]} numberOfLines={3}>
                {verse.verseText}
              </Text>
              <Text style={[styles.verseDate, { color: colors.tertiaryText }]}>
                Saved {new Date(verse.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  count: {
    fontSize: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  verseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  verseDate: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  connectButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
