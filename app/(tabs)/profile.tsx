import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { DayStreak, getDayStreak } from '@/utils/day-streak';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { PublicKey } from '@solana/web3.js';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Only import on native Android with development build
let transact: any = null;
if (Platform.OS === 'android' && Constants.appOwnership !== 'expo') {
  try {
    transact = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js').transact;
  } catch (e) {
    console.log('Solana Mobile Wallet Adapter not available');
  }
}

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const router = useRouter();
  const { user, walletAddress, connectWallet: saveWallet, disconnectWallet: removeWallet } = useUser();
  const [connecting, setConnecting] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [dayStreak, setDayStreak] = useState<DayStreak | null>(null);

  // Use progress tracking hook
  const { stats, streak, loading } = useReadingProgress(activePlanId);

  useEffect(() => {
    loadActivePlanId();
    loadDayStreak();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadActivePlanId();
      loadDayStreak();
    }, [])
  );

  const loadDayStreak = async () => {
    const streak = await getDayStreak();
    setDayStreak(streak);
  };

  const loadActivePlanId = async () => {
    try {
      const planId = await AsyncStorage.getItem('@active_plan_id');
      setActivePlanId(planId);
    } catch (error) {
      console.error('Error loading active plan ID:', error);
    }
  };

  const handleConnectWallet = async () => {
    if (!transact) {
      Alert.alert(
        'Not Available',
        'Solana Mobile Wallet Adapter requires a development build. Please run: npx expo run:android'
      );
      return;
    }

    setConnecting(true);
    try {
      await transact(async (wallet) => {
        const authResult = await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: {
            name: 'Monotheism',
            uri: 'https://monotheism.com',
            icon: 'favicon.ico',
          },
        });

        // Get the address - convert to base58 string
        let addressString: string;
        const rawAddress = authResult.accounts[0].address;
        
        try {
          // If it's a Uint8Array, convert to PublicKey then to base58
          if (rawAddress instanceof Uint8Array) {
            const publicKey = new PublicKey(rawAddress);
            addressString = publicKey.toBase58();
          } 
          // If it's already a PublicKey object
          else if (rawAddress && typeof rawAddress === 'object' && 'toBase58' in rawAddress) {
            addressString = rawAddress.toBase58();
          }
          // If it's already a string
          else if (typeof rawAddress === 'string') {
            addressString = rawAddress;
          }
          // Fallback: try to create PublicKey from whatever we have
          else {
            const publicKey = new PublicKey(rawAddress);
            addressString = publicKey.toBase58();
          }
        } catch (conversionError) {
          console.error('Address conversion error:', conversionError);
          throw new Error('Failed to convert wallet address to readable format');
        }
        
        console.log('Connected wallet address:', addressString);
        
        // Save wallet using context (saves to both AsyncStorage and database)
        await saveWallet(addressString);
        
        Alert.alert(
          'Success', 
          `Wallet connected!\n\n${addressString.slice(0, 8)}...${addressString.slice(-8)}`
        );
      });
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      Alert.alert('Connection Failed', error.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectWallet = async () => {
    if (transact) {
      try {
        await transact(async (wallet) => {
          await wallet.deauthorize({
            auth_token: '', // The auth token from authorize
          });
        });
      } catch (error) {
        console.error('Deauthorize error:', error);
      }
    }

    await removeWallet();
    Alert.alert('Disconnected', 'Wallet disconnected successfully');
  };

  const formatAddress = (address: string) => {
    if (!address || address.length < 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const copyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert('Copied!', 'Wallet address copied to clipboard');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity style={[styles.themeButton, { backgroundColor: colors.buttonBg }]} onPress={toggleTheme}>
          <IconSymbol name={isDarkMode ? 'sun.max' : 'moon'} size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Connect Wallet Card */}
      <View style={[styles.walletCard, { backgroundColor: colors.card }]}>
        <View style={styles.walletIconContainer}>
          <IconSymbol 
            name={walletAddress ? 'checkmark.circle.fill' : 'creditcard'} 
            size={32} 
            color={walletAddress ? '#4CAF50' : colors.primary} 
          />
        </View>
        <Text style={[styles.walletTitle, { color: colors.text }]}>
          {walletAddress ? 'Wallet Connected' : 'Connect Wallet'}
        </Text>
        {walletAddress ? (
          <>
            <View style={styles.addressContainer}>
              <Text style={[styles.walletAddress, { color: colors.secondaryText }]}>{formatAddress(walletAddress)}</Text>
              <TouchableOpacity 
                style={[styles.copyButton, { backgroundColor: colors.buttonBg }]}
                onPress={copyAddress}
              >
                <IconSymbol name="doc.on.doc" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.disconnectButton, { backgroundColor: colors.buttonBg, borderColor: colors.border }]}
              onPress={handleDisconnectWallet}
            >
              <Text style={[styles.disconnectButtonText, { color: colors.secondaryText }]}>Disconnect Wallet</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.walletDescription, { color: colors.tertiaryText }]}>
              Connect your Solana wallet to sync your data
            </Text>
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={handleConnectWallet}
              disabled={connecting}
            >
              <Text style={styles.connectButtonText}>
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {dayStreak?.currentStreak || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.tertiaryText }]}>Day Streak</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>📚</Text>
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {loading ? '...' : stats?.completedChapters || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.tertiaryText }]}>Chapters Read</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {dayStreak?.longestStreak || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.tertiaryText }]}>Best Streak</Text>
        </View>
      </View>

      {/* Reading Progress Card */}
      {activePlanId && stats && (
        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>Reading Plan Progress</Text>
            <Text style={[styles.progressPercentage, { color: colors.primary }]}>
              {stats.completionPercentage}%
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${stats.completionPercentage}%`, backgroundColor: colors.primary }
              ]} 
            />
          </View>
          <View style={styles.progressStats}>
            <Text style={[styles.progressStat, { color: colors.secondaryText }]}>
              {stats.completedDays}/{stats.totalDays} days
            </Text>
            <Text style={[styles.progressStat, { color: colors.secondaryText }]}>
              {stats.completedChapters}/{stats.totalChapters} chapters
            </Text>
          </View>
        </View>
      )}

      {/* Menu Items */}
      <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <IconSymbol name="bell" size={22} color={colors.secondaryText} />
            <Text style={[styles.menuText, { color: colors.text }]}>Notifications</Text>
          </View>
          <View style={styles.menuRight}>
            <Text style={[styles.menuStatus, { color: colors.tertiaryText }]}>On</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
          </View>
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/reading-settings')}
        >
          <View style={styles.menuLeft}>
            <IconSymbol name="gearshape" size={22} color={colors.secondaryText} />
            <Text style={[styles.menuText, { color: colors.text }]}>Reading Settings</Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <IconSymbol name="questionmark.circle" size={22} color={colors.secondaryText} />
            <Text style={[styles.menuText, { color: colors.text }]}>Help & Support</Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
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
    color: '#000',
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  walletIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  walletDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    backgroundColor: '#ff9500',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disconnectButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
  },
  disconnectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  menuContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuText: {
    fontSize: 16,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuStatus: {
    fontSize: 15,
  },
  menuDivider: {
    height: 1,
    marginLeft: 58,
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    fontSize: 14,
  },
});
