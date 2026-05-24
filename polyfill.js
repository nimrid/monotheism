// Crypto polyfill — must load before @solana/web3.js or any Solana code
import { install } from 'react-native-quick-crypto';
install();
