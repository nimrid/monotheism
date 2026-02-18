# Wallet Integration & Database Setup

## Overview
The wallet connection is now the primary identifier that links all user data including reading progress, saved verses, and Bible definition searches.

## Changes Made

### 1. Database Schema Updates
Added new tables to link all data to users via wallet address:

- **users** - Primary table storing wallet addresses
  - `id` (UUID, primary key)
  - `wallet_address` (unique, indexed)
  - `created_at`, `updated_at`, `last_active`

- **reading_plans** - Now includes `user_id` foreign key
- **reading_progress** - Now includes `user_id` foreign key
- **reading_sessions** - Now includes `user_id` foreign key
- **saved_verses** - New table for saved Bible verses
- **definition_searches** - New table for Bible definition search history

### 2. Backend API Endpoints

#### User/Wallet Endpoints
- `POST /api/users/connect-wallet` - Creates or updates user when wallet connects
  - Body: `{ walletAddress: string }`
  - Returns: User object with id, walletAddress, createdAt, lastActive

- `GET /api/users/:walletAddress` - Get user by wallet address
  - Returns: User object

### 3. Frontend Changes

#### UserContext (`contexts/UserContext.tsx`)
New context provider that manages user state across the app:
- Loads wallet from AsyncStorage on app start
- Fetches user data from database
- Provides `connectWallet()` and `disconnectWallet()` methods
- Automatically syncs wallet connection to database

#### Profile Screen Updates
- Now uses UserContext for wallet management
- Automatically saves wallet to database when connected
- Simplified wallet connection flow

#### Bible Definition Screen
- Removed top navigation for cleaner UI
- Ready to integrate with user context for saving search history

### 4. App Layout
Updated `app/_layout.tsx` to wrap the app with UserProvider, making user/wallet data available throughout the app.

## Usage

### Connecting a Wallet
```typescript
import { useUser } from '@/contexts/UserContext';

function MyComponent() {
  const { connectWallet, walletAddress, user } = useUser();
  
  // After getting wallet address from Solana Mobile Wallet Adapter
  await connectWallet(addressString);
  
  // Now user.id can be used for all database operations
}
```

### Accessing User Data
```typescript
const { user, walletAddress, loading } = useUser();

if (loading) return <Loading />;
if (!user) return <ConnectWallet />;

// User is connected, use user.id for database queries
```

## Database Migration

To apply the schema changes, restart your backend server:
```bash
cd backend
node server.js
```

The tables will be created automatically on startup.

## Environment Variables

Make sure your `.env` file includes:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For testing on physical devices, replace `localhost` with your computer's IP address.

## Next Steps

1. Update reading plan creation to include `user_id`
2. Update reading progress tracking to include `user_id`
3. Implement saved verses feature
4. Implement Bible definition search history
5. Add user data sync across devices using wallet address
