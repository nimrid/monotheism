import { API_URL } from '@/utils/api-config';
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
        await fetchUserData(savedAddress);
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

  const connectWallet = async (address: string) => {
    try {
      // Save to local storage
      await AsyncStorage.setItem(WALLET_KEY, address);
      setWalletAddress(address);

      // Save to database
      const response = await fetch(`${API_URL}/users/connect-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        console.log('Wallet connected and saved to database');
      } else {
        console.error('Failed to save wallet to database');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
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
      await fetchUserData(walletAddress);
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
