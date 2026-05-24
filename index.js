// Polyfills MUST be loaded first, before any other imports
import './polyfill';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';
global.Buffer = Buffer;

// Now load the app
import 'expo-router/entry';
