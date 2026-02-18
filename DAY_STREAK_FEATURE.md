# Day Streak Feature

## Overview
Added day streak tracking to motivate users to open the app daily and maintain their reading habits.

## Changes Made

### 1. New Utility: `utils/day-streak.ts`
Created a comprehensive day streak tracking system that:
- Tracks current streak (consecutive days)
- Tracks longest streak ever achieved
- Tracks total days active
- Automatically updates when user opens the app
- Resets streak if user misses a day
- Stores data in AsyncStorage

### 2. Icon Updates: `components/ui/icon-symbol.tsx`
- Added `book.closed.fill` icon mapping for Bible Dictionary (uses 'import-contacts' Material Icon)
- Added `trash` icon mapping for delete functionality

### 3. Home Screen Updates: `app/(tabs)/index.tsx`
**Day Streak Display:**
- Shows current day streak in the streak card
- Shows longest streak in the "Best" section
- Shows total days active instead of reading plan days
- Automatically updates streak when app opens

**Bible Dictionary Icon:**
- Changed from generic book icon to `book.closed.fill` for better visual distinction

### 4. Profile Screen Updates: `app/(tabs)/profile.tsx`
**Stats Cards:**
- First card: Current day streak (🔥)
- Second card: Chapters read (📚)
- Third card: Best/longest streak (🏆)

## How It Works

### Streak Logic
1. **First Time**: Streak starts at 1
2. **Consecutive Day**: If user opens app the next day, streak increases by 1
3. **Same Day**: Multiple opens on same day don't increase streak
4. **Missed Day**: If user skips a day, streak resets to 1
5. **Longest Streak**: Always tracks the highest streak achieved

### Auto-Update
- Streak updates automatically when:
  - App opens (useEffect on mount)
  - User navigates to home/profile screen (useFocusEffect)

### Data Persistence
- Stored in AsyncStorage under `@day_streak` key
- Survives app restarts
- Can be reset if needed

## API

```typescript
// Get current streak data
const streak = await getDayStreak();
// Returns: { currentStreak, longestStreak, lastActiveDate, totalDaysActive }

// Update streak (call when user is active)
const updatedStreak = await updateDayStreak();

// Reset streak (if needed)
await resetDayStreak();
```

## User Benefits

1. **Motivation**: Visual feedback encourages daily app usage
2. **Gamification**: Streak counter creates a sense of achievement
3. **Habit Formation**: Helps users build consistent Bible reading habits
4. **Progress Tracking**: Shows total days active over time

## Display Locations

### Home Screen
- Streak card shows current streak with fire emoji 🔥
- "Best" shows longest streak with trophy icon 🏆
- Total days active shown at bottom of streak card

### Profile Screen
- Three stat cards at top:
  - Current streak (🔥)
  - Chapters read (📚)
  - Best streak (🏆)

## Future Enhancements

Potential improvements:
1. Sync streak to database (linked to wallet)
2. Streak milestones and rewards
3. Streak recovery (grace period for missed days)
4. Weekly/monthly streak statistics
5. Share streak achievements
6. Streak notifications/reminders

## Testing

To test the feature:
1. Open the app - streak should be 1
2. Close and reopen same day - streak stays 1
3. Change device date to tomorrow - streak becomes 2
4. Change device date to 2 days later - streak resets to 1

## Notes

- Streak is independent of reading plan progress
- Tracks app opens, not reading completion
- Uses local device date/time
- Stored locally (not synced to server yet)
