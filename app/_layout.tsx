import { clusterApiUrl } from '@solana/web3.js';
import 'react-native-reanimated';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import RootLayoutNav from './_layout-nav';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Lazy load MobileWalletProvider to prevent crashes if native module is not available
let MobileWalletProviderComponent: any = ({ children }: any) => children;
try {
  const walletModule = require('@wallet-ui/react-native-web3js');
  MobileWalletProviderComponent = walletModule.MobileWalletProvider;
} catch (e) {
  console.warn('SolanaMobileWalletAdapter not available:', e);
}

export default function RootLayout() {
  const chain = 'solana:mainnet';
  const endpoint = clusterApiUrl('mainnet-beta');
  const identity = {
    name: 'Monotheism',
    uri: 'https://monotheism.com',
    icon: 'favicon.ico',
  };

  return (
    <MobileWalletProviderComponent
      chain={chain}
      endpoint={endpoint}
      identity={identity}
    >
      <ThemeProvider>
        <UserProvider>
          <RootLayoutNav />
        </UserProvider>
      </ThemeProvider>
    </MobileWalletProviderComponent>
  );
}
