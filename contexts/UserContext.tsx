import { API_URL } from '@/utils/api-config';
import { fetchAndSyncSubscription } from '@/utils/subscription';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const WALLET_KEY = '@wallet_address';

type User = {
  id: string;
  walletAddress: string;
  createdAt: string;
  lastActive: string;
};

type UserContextType = {
  user: User | null;
  walletAddress: string | null;
  loading: boolean;
  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const savedAddress = await AsyncStorage.getItem(WALLET_KEY);
      if (savedAddress) {
        setWalletAddress(savedAddress);
        // Run in parallel — don't block wallet load on either request
        await Promise.all([
          fetchUserData(savedAddress),
          syncSubscriptionForWallet(savedAddress),
        ]);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (address: string) => {
    try {
      const response = await fetch(`${API_URL}/users/${address}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  /**
   * Silently fetches the subscription status for a wallet from the backend
   * and syncs it to AsyncStorage. This ensures:
   *  - Users who already paid are never asked to pay again
   *  - Premium status is restored correctly after reinstall / device change
   */
  const syncSubscriptionForWallet = async (address: string) => {
    try {
      const status = await fetchAndSyncSubscription(address);
      if (status.isPremium) {
        console.log(
          `[UserContext] Premium subscription restored for ${address}`
        );
      }
    } catch (error) {
      // Non-fatal — user will get prompted on next premium access attempt
      console.warn('[UserContext] Subscription sync failed (non-fatal):', error);
    }
  };

  const connectWallet = async (address: string) => {
    // Always persist locally first — this is the source of truth for wallet state
    await AsyncStorage.setItem(WALLET_KEY, address);
    setWalletAddress(address);

    // Attempt to sync with the backend + subscription (non-fatal if offline)
    try {
      const [response] = await Promise.all([
        fetch(`${API_URL}/users/connect-wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address }),
        }),
        syncSubscriptionForWallet(address),
      ]);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        console.warn('UserContext: Backend wallet sync failed (non-fatal):', response.status);
      }
    } catch (error) {
      // Network unavailable or backend down — wallet is already saved locally, so this is fine
      console.warn('UserContext: Backend unreachable, wallet saved locally only:', error instanceof Error ? error.message : error);
    }
  };

  const disconnectWallet = async () => {
    try {
      await AsyncStorage.removeItem(WALLET_KEY);
      setWalletAddress(null);
      setUser(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (walletAddress) {
      await Promise.all([
        fetchUserData(walletAddress),
        syncSubscriptionForWallet(walletAddress),
      ]);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        walletAddress,
        loading,
        connectWallet,
        disconnectWallet,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
