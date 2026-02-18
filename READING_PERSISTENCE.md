# Reading Progress Persistence

## Problem
Previously, when users read chapters in the reading-day screen and marked them as complete, the checkmarks would disappear when:
- Navigating to another screen
- Closing the app completely
- Returning to the reading plan later

This made it difficult for users to track which chapters they had already read.

## Solution
Implemented a dual-layer persistence system that ensures read chapters remain marked:

### 1. AsyncStorage (Local Persistence)
- Immediately saves read chapters to device storage
- Persists across app restarts
- Provides instant loading on screen mount
- Uses unique keys per plan and day: `@read_chapters_{planId}_day_{dayNumber}`

### 2. Database (Server Persistence)
- Syncs with backend database via `useReadingProgress` hook
- Provides cross-device sync capability (when wallet connected)
- More reliable long-term storage
- Tracks detailed progress (percentage, timestamps, etc.)

## How It Works

### Loading Read Chapters
When the reading-day screen loads:
1. **Immediate Load**: Reads from AsyncStorage first for instant UI update
2. **Database Sync**: Fetches from database if plan ID exists
3. **Merge**: If database has data, it overrides AsyncStorage (source of truth)
4. **Update**: Saves database data back to AsyncStorage for next time

### Marking Chapters as Read
When a user marks a chapter as read:
1. **Update State**: Immediately updates UI (green checkmark)
2. **Save to AsyncStorage**: Persists locally for instant retrieval
3. **Save to Database**: Syncs with backend for long-term storage
4. **Refresh**: Reloads progress data to ensure consistency

### Storage Keys
Each day's progress is stored separately:
```
@read_chapters_{planId}_day_{dayNumber}
```

Example:
```
@read_chapters_abc123_day_1
@read_chapters_abc123_day_2
@read_chapters_xyz789_day_1
```

This ensures:
- Different plans don't interfere with each other
- Each day's progress is tracked independently
- Easy to clear/reset specific days if needed

## Benefits

### For Users
- ✅ Chapters stay marked after closing app
- ✅ Can see progress even offline
- ✅ No confusion about what's been read
- ✅ Progress syncs across devices (with wallet)

### For Developers
- ✅ Dual-layer redundancy (AsyncStorage + Database)
- ✅ Fast loading (AsyncStorage is instant)
- ✅ Reliable long-term storage (Database)
- ✅ Easy to debug (separate keys per day/plan)

## Technical Details

### Data Flow
```
User marks chapter → Update UI State
                  ↓
            Save to AsyncStorage (instant)
                  ↓
            Save to Database (async)
                  ↓
            Refresh from Database
                  ↓
            Update AsyncStorage with latest
```

### Data Structure
```typescript
// AsyncStorage
{
  "@read_chapters_planId_day_1": ["0101", "0102", "0103"]
}

// Database (via useReadingProgress hook)
{
  chapterId: "0101",
  completed: true,
  progressPercentage: 100,
  completedAt: "2024-02-17T10:30:00Z"
}
```

## Auto-Completion
Chapters are automatically marked as read when:
1. User scrolls to 95% of the chapter
2. User manually clicks "Mark as Read" button
3. User closes the chapter modal (assumes completion)

## Future Enhancements

Potential improvements:
1. **Conflict Resolution**: Handle cases where AsyncStorage and Database differ
2. **Partial Progress**: Save scroll position for partially read chapters
3. **Offline Queue**: Queue database updates when offline, sync when online
4. **Bulk Operations**: Efficiently load/save multiple days at once
5. **Migration**: Tool to migrate old data to new format

## Testing

To verify persistence:
1. Open reading-day screen
2. Mark a chapter as read (green checkmark appears)
3. Navigate to another screen
4. Return to reading-day → Chapter should still be marked
5. Close app completely
6. Reopen app and navigate to reading-day → Chapter should still be marked

## Troubleshooting

### Chapters not staying marked
- Check AsyncStorage permissions
- Verify planId and dayNumber are being passed correctly
- Check console for errors in loadReadChapters/saveReadChapters

### Database not syncing
- Verify useReadingProgress hook is working
- Check backend API is accessible
- Ensure planId is valid

### Duplicate marks
- Clear AsyncStorage: `AsyncStorage.clear()`
- Check for race conditions in markChapterAsRead

## Code Locations

- **Main Implementation**: `app/reading-day.tsx`
- **Progress Hook**: `hooks/useReadingProgress.ts`
- **Backend API**: `backend/server.js` (reading progress endpoints)
