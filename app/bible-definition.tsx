import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Only import on native Android with development build
let transact: any = null;
if (Platform.OS === 'android' && Constants.appOwnership !== 'expo') {
  try {
    transact = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js').transact;
  } catch (e) {
    console.log('Solana Mobile Wallet Adapter not available');
  }
}

const RECIPIENT_WALLET = 'GaJrqsUVQ5k5dmX8iacT9F4fHJrp9v11qXPzwWcAHkED';
const SEARCH_COST_LAMPORTS = 10000; // 0.00001 SOL (devnet)

type DefinitionResult = {
  word: string;
  definition: string;
};

export default function BibleDefinitionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { walletAddress } = useUser();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DefinitionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const handlePayAndSearch = async () => {
    if (!query.trim()) return;

    // Check if wallet is connected
    if (!walletAddress) {
      Alert.alert(
        'Wallet Required',
        'Please connect your wallet to search Bible definitions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    // Check if wallet adapter is available
    if (!transact) {
      Alert.alert(
        'Not Available',
        'Solana Mobile Wallet Adapter requires a development build. Please run: npx expo run:android'
      );
      return;
    }

    setPaying(true);
    setError(null);

    try {
      await transact(async (wallet: any) => {
        // Get connection to devnet
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

        // Authorize wallet
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: {
            name: 'Monotheism',
            uri: 'https://monotheism.com',
            icon: 'favicon.ico',
          },
        });

        // Get latest blockhash
        const {
          context: { slot: minContextSlot },
          value: { blockhash, lastValidBlockHeight },
        } = await connection.getLatestBlockhashAndContext();

        // Create transaction
        const transaction = new Transaction({
          feePayer: new PublicKey(authResult.accounts[0].address),
          blockhash,
          lastValidBlockHeight,
        }).add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(authResult.accounts[0].address),
            toPubkey: new PublicKey(RECIPIENT_WALLET),
            lamports: SEARCH_COST_LAMPORTS,
          })
        );

        // Sign and send transaction
        const signedTransactions = await wallet.signTransactions({
          transactions: [transaction],
        });

        const signature = await connection.sendRawTransaction(signedTransactions[0].serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        console.log('Payment transaction sent:', signature);

        // Wait for confirmation
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        console.log('Payment confirmed, proceeding with search');

        // Payment successful, now search
        await searchDefinition();
      });
    } catch (error: any) {
      console.error('Payment failed:', error);
      setError('Payment failed. Please try again.');
      Alert.alert('Payment Failed', error.message || 'Unable to process payment');
    } finally {
      setPaying(false);
    }
  };

  const searchDefinition = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `https://iq-bible.p.rapidapi.com/GetDefinitionBiblical?query=${encodeURIComponent(query)}&dictionaryId=smiths`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'iq-bible.p.rapidapi.com',
            'x-rapidapi-key': 'e1e92c1793mshab429576f3ae3a2p1733cbjsn3659884804ea',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch definition');
      }

      const data = await response.json();
      
      if (data.word && data.definition) {
        setResult(data);
        
        // Add to search history
        setSearchHistory(prev => {
          const newHistory = [query, ...prev.filter(item => item !== query)].slice(0, 5);
          return newHistory;
        });

        // Animate result appearance
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      } else {
        setError('No definition found for this term');
      }
    } catch (err) {
      setError('Unable to fetch definition. Please try again.');
      console.error('Definition fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySearch = (term: string) => {
    setQuery(term);
    fadeAnim.setValue(0);
  };

  const suggestedTerms = ['Solomon', 'David', 'Jerusalem', 'Covenant', 'Messiah', 'Apostle'];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bible Dictionary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {/* Search Card */}
        <View style={[styles.searchCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.searchCardTitle}>📖 Discover Biblical Terms</Text>
          <Text style={styles.searchCardSubtitle}>
            Search for biblical words, names, and places to understand their meaning and context
          </Text>

          <View style={styles.searchInputContainer}>
            <IconSymbol name="magnifyingglass" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter a biblical term..."
              placeholderTextColor="#999"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handlePayAndSearch}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Payment Info */}
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentInfoText}>
              💰 0.00001 SOL per search (Devnet)
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.searchButton, (loading || paying) && styles.searchButtonDisabled]}
            onPress={handlePayAndSearch}
            disabled={loading || paying || !query.trim()}
          >
            {loading || paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol name={paying ? 'creditcard' : 'magnifyingglass'} size={18} color="#fff" />
                <Text style={styles.searchButtonText}>
                  {paying ? 'Processing Payment...' : 'Pay & Search'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Search History */}
        {searchHistory.length > 0 && !result && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
            <View style={styles.chipContainer}>
              {searchHistory.map((term, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.chip, { backgroundColor: colors.card }]}
                  onPress={() => handleHistorySearch(term)}
                >
                  <IconSymbol name="clock" size={14} color={colors.secondaryText} />
                  <Text style={[styles.chipText, { color: colors.text }]}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Suggested Terms */}
        {!result && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested Terms</Text>
            <View style={styles.chipContainer}>
              {suggestedTerms.map((term, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestedChip, { backgroundColor: colors.card }]}
                  onPress={() => handleHistorySearch(term)}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{term}</Text>
                  <IconSymbol name="arrow.right" size={14} color={colors.secondaryText} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: colors.card }]}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        {/* Result Card */}
        {result && (
          <Animated.View style={[styles.resultContainer, { opacity: fadeAnim }]}>
            <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
              {/* Word Header */}
              <View style={styles.wordHeader}>
                <View style={[styles.wordBadge, { backgroundColor: colors.background }]}>
                  <Text style={styles.wordBadgeText}>📚</Text>
                </View>
                <View style={styles.wordInfo}>
                  <Text style={[styles.wordTitle, { color: colors.text }]}>{result.word}</Text>
                  <Text style={[styles.wordSubtitle, { color: colors.secondaryText }]}>
                    Smith's Bible Dictionary
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Definition Content */}
              <View style={styles.definitionContent}>
                <View style={styles.definitionHeader}>
                  <IconSymbol name="book.fill" size={18} color={colors.primary} />
                  <Text style={[styles.definitionLabel, { color: colors.primary }]}>Definition</Text>
                </View>
                <Text style={[styles.definitionText, { color: colors.text }]}>
                  {result.definition}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.background }]}
                  onPress={() => {
                    // Share functionality
                  }}
                >
                  <IconSymbol name="square.and.arrow.up" size={18} color={colors.secondaryText} />
                  <Text style={[styles.actionButtonText, { color: colors.secondaryText }]}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.background }]}
                  onPress={() => {
                    // Save functionality
                  }}
                >
                  <IconSymbol name="bookmark" size={18} color={colors.secondaryText} />
                  <Text style={[styles.actionButtonText, { color: colors.secondaryText }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Again Button */}
            <TouchableOpacity
              style={[styles.searchAgainButton, { backgroundColor: colors.card }]}
              onPress={() => {
                setResult(null);
                setQuery('');
                fadeAnim.setValue(0);
              }}
            >
              <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
              <Text style={[styles.searchAgainText, { color: colors.primary }]}>Search Another Term</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Info Card */}
        {!result && (
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <Text style={styles.infoIcon}>💡</Text>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>About This Dictionary</Text>
              <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                Smith's Bible Dictionary provides detailed definitions of biblical terms, names, places, and concepts to enhance your understanding of Scripture.
              </Text>
              <Text style={[styles.infoText, { color: colors.secondaryText, marginTop: 8 }]}>
                Each search costs 0.00001 SOL on Devnet. Connect your wallet to get started.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  searchCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  searchCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  searchCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
    lineHeight: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  paymentInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  paymentInfoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  resultContainer: {
    marginBottom: 24,
  },
  resultCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  wordBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordBadgeText: {
    fontSize: 28,
  },
  wordInfo: {
    flex: 1,
  },
  wordTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  wordSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  definitionContent: {
    marginBottom: 20,
  },
  definitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  definitionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  definitionText: {
    fontSize: 16,
    lineHeight: 26,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  searchAgainText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
