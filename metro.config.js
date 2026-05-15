const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking and minification
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: true, // Remove console.log in production
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
    mangle: {
      keep_fnames: false,
    },
    output: {
      comments: false,
    },
  },
};

// Add support for Solana and crypto modules
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    crypto: require.resolve('react-native-quick-crypto'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
  },
};

module.exports = config;

