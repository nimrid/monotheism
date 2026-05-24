import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { clusterApiUrl } from '@solana/web3.js';
import 'react-native-reanimated';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import RootLayoutNav from './_layout-nav';

export const unstable_settings = {
  anchor: '(tabs)',
};

const chain = 'solana:mainnet';
const endpoint = clusterApiUrl('mainnet-beta');
const identity = {
  name: 'Monotheism',
  uri: 'https://monotheism.app',
  icon: 'favicon.ico',
};

export default function RootLayout() {
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
