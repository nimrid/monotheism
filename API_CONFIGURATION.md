# API Configuration Guide

## Overview
The app now uses environment-based API URL configuration to automatically switch between local development and production endpoints.

## Configuration

### Environment Variables

#### `.env` (Local Development)
```env
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

#### Production Builds (EAS)
```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_API_URL=https://monotheism.vercel.app/api
```

## API URLs

| Environment | URL |
|------------|-----|
| Development | `http://localhost:3000/api` |
| Production | `https://monotheism.vercel.app/api` |

## How It Works

### Centralized Configuration
All API URLs are managed through `utils/api-config.ts`:

```typescript
import { API_URL } from '@/utils/api-config';

// Use API_URL throughout your app
fetch(`${API_URL}/users/connect-wallet`, { ... });
```

### Priority Order
The API URL is determined in this order:
1. **Explicit `EXPO_PUBLIC_API_URL`** - If set, always use this
2. **Environment-based** - Use `EXPO_PUBLIC_ENV` to select URL
3. **Default** - Falls back to development URL

### Build Profiles

#### Development Build
```bash
eas build --platform android --profile development
```
- Uses: `http://localhost:3000/api`
- For: Local testing with development client

#### Preview Build (APK)
```bash
eas build --platform android --profile preview
```
- Uses: `https://monotheism.vercel.app/api`
- For: Testing production API with APK

#### Production Build (AAB)
```bash
eas build --platform android --profile production
```
- Uses: `https://monotheism.vercel.app/api`
- For: Play Store release

## Files Updated

All files now import from centralized config:

### Frontend Files
- ✅ `app/(tabs)/index.tsx`
- ✅ `app/(tabs)/saved.tsx`
- ✅ `app/chapter-content.tsx`
- ✅ `contexts/UserContext.tsx`
- ✅ `utils/database.ts`
- ✅ `utils/progress-tracker.ts`

### Configuration Files
- ✅ `utils/api-config.ts` (NEW - centralized config)
- ✅ `eas.json` (build profiles)
- ✅ `.env` (local development)
- ✅ `.env.example` (template)

## Usage Examples

### In Components
```typescript
import { API_URL } from '@/utils/api-config';

const fetchData = async () => {
  const response = await fetch(`${API_URL}/endpoint`);
  // ...
};
```

### Environment Checks
```typescript
import { IS_DEVELOPMENT, IS_PRODUCTION } from '@/utils/api-config';

if (IS_DEVELOPMENT) {
  console.log('Running in development mode');
}
```

## Testing

### Local Development
1. Ensure `.env` has `EXPO_PUBLIC_ENV=development`
2. Start local backend: `cd backend && npm start`
3. Start Expo: `npx expo start`
4. App will use `http://localhost:3000/api`

### Production Testing
1. Build preview APK: `eas build --platform android --profile preview`
2. Install APK on device
3. App will use `https://monotheism.vercel.app/api`

### Verify Configuration
Check console logs on app start:
```
API Configuration: {
  environment: 'development',
  apiUrl: 'http://localhost:3000/api',
  isDevelopment: true,
  isProduction: false
}
```

## Backend Setup

### Local Development
```bash
cd backend
npm start
# Server runs on http://localhost:3000
```

### Production (Vercel)
- Deployed at: `https://monotheism.vercel.app`
- API endpoints: `https://monotheism.vercel.app/api/*`

## Troubleshooting

### App can't connect to API
1. **Check environment**: Verify `EXPO_PUBLIC_ENV` is set correctly
2. **Check backend**: Ensure backend is running (local or Vercel)
3. **Check URL**: Look for console log showing API URL
4. **Network**: Ensure device can reach the API (same network for local)

### Wrong API URL being used
1. Clear Metro cache: `npx expo start -c`
2. Rebuild app: `eas build --platform android --profile preview`
3. Check `.env` file has correct values
4. Verify `eas.json` has correct env variables

### Local backend not accessible on device
For physical devices testing local backend:
1. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update `.env`: `EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000/api`
3. Restart Expo: `npx expo start -c`

## Environment Variables Reference

### Required Variables
```env
# API Configuration
EXPO_PUBLIC_ENV=development|production
EXPO_PUBLIC_API_URL=<api-url>

# RapidAPI (Bible data)
EXPO_PUBLIC_RAPIDAPI_KEY=<your-key>
EXPO_PUBLIC_RAPIDAPI_HOST=iq-bible.p.rapidapi.com
```

### Optional Overrides
You can override the automatic selection by setting `EXPO_PUBLIC_API_URL` explicitly:

```env
# Force specific URL regardless of environment
EXPO_PUBLIC_API_URL=https://custom-api.example.com/api
```

## Best Practices

1. **Never commit `.env`** - Contains sensitive keys
2. **Use `.env.example`** - Template for other developers
3. **Set env in EAS** - Configure in `eas.json` for builds
4. **Test both environments** - Verify local and production work
5. **Log API calls** - Use console.log in development to debug

## Migration Notes

### Before
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
```

### After
```typescript
import { API_URL } from '@/utils/api-config';
```

All files have been updated to use the centralized configuration.

## Future Enhancements

Potential improvements:
1. **Staging environment** - Add staging API URL
2. **Feature flags** - Environment-based feature toggles
3. **API versioning** - Support multiple API versions
4. **Retry logic** - Auto-retry failed requests
5. **Offline mode** - Queue requests when offline
