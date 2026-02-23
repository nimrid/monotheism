// IMPORTANT: This must be imported FIRST before any Solana imports
// Polyfill for crypto.getRandomValues() required by Solana libraries
import 'react-native-get-random-values';

import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { clusterApiUrl } from '@solana/web3.js';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { isDarkMode } = useTheme();

  return (
    <NavigationThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="bible-definition" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const chain = 'solana:devnet';
  const endpoint = clusterApiUrl('devnet');
  const identity = {
    name: 'Monotheism',
    uri: 'https://monotheism.com',
    icon: 'favicon.ico',
  };

  return (
    <MobileWalletProvider
      chain={chain}
      endpoint={endpoint}
      identity={identity}
    >
      <ThemeProvider>
        <UserProvider>
          <RootLayoutNav />
        </UserProvider>
      </ThemeProvider>
    </MobileWalletProvider>
  );
}
