/**
 * API Configuration
 * Handles environment-based API URL selection
 */

const isDevelopment = process.env.EXPO_PUBLIC_ENV === 'development';
const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';

// API URLs
const DEVELOPMENT_API_URL = 'http://localhost:3000/api';
const PRODUCTION_API_URL = 'https://monotheism.vercel.app/api';

/**
 * Get the appropriate API URL based on environment
 * Priority:
 * 1. EXPO_PUBLIC_API_URL env variable (if set)
 * 2. EXPO_PUBLIC_ENV-based selection
 * 3. Default to development URL
 */
export const getApiUrl = (): string => {
  // If API URL is explicitly set in env, use it
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Otherwise, use environment-based selection
  if (isProduction) {
    return PRODUCTION_API_URL;
  }

  return DEVELOPMENT_API_URL;
};

// Export the API URL
export const API_URL = getApiUrl();

// Export environment checks
export const IS_DEVELOPMENT = isDevelopment;
export const IS_PRODUCTION = isProduction;

// Log current configuration (only in development)
if (__DEV__) {
  console.log('API Configuration:', {
    environment: process.env.EXPO_PUBLIC_ENV || 'not set',
    apiUrl: API_URL,
    isDevelopment,
    isProduction,
  });
}
