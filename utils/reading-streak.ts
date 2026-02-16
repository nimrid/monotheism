import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReadingStreak = {
  currentStreak: number;
  bestStreak: number;
  totalDaysRead: number;
  lastReadDate: string; // ISO date string (YYYY-MM-DD)
  readDates: string[]; // Array of ISO date strings when user read
};

const READING_STREAK_KEY = '@reading_streak';

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Get yesterday's date in YYYY-MM-DD format
const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

// Get the day of week (0 = Sunday, 6 = Saturday)
const getDayOfWeek = (dateString: string): number => {
  return new Date(dateString).getDay();
};

// Get dates for the current week (Sunday to Saturday)
export const getCurrentWeekDates = (): string[] => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  
  return weekDates;
};

// Initialize streak data
const initializeStreak = (): ReadingStreak => ({
  currentStreak: 0,
  bestStreak: 0,
  totalDaysRead: 0,
  lastReadDate: '',
  readDates: [],
});

// Get reading streak data
export const getReadingStreak = async (): Promise<ReadingStreak> => {
  try {
    const data = await AsyncStorage.getItem(READING_STREAK_KEY);
    if (!data) {
      return initializeStreak();
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to get reading streak:', error);
    return initializeStreak();
  }
};

// Mark today as read and update streak
export const markTodayAsRead = async (): Promise<ReadingStreak> => {
  try {
    const streak = await getReadingStreak();
    const today = getTodayDate();
    
    // If already read today, just return current streak
    if (streak.readDates.includes(today)) {
      return streak;
    }
    
    // Add today to read dates
    const updatedReadDates = [...streak.readDates, today];
    
    // Calculate new streak
    let newCurrentStreak = 1;
    
    if (streak.lastReadDate) {
      const yesterday = getYesterdayDate();
      
      // If last read was yesterday, increment streak
      if (streak.lastReadDate === yesterday) {
        newCurrentStreak = streak.currentStreak + 1;
      }
      // If last read was today (shouldn't happen due to check above), keep streak
      else if (streak.lastReadDate === today) {
        newCurrentStreak = streak.currentStreak;
      }
      // Otherwise, streak is broken, start new streak
      else {
        newCurrentStreak = 1;
      }
    }
    
    // Update best streak if current is higher
    const newBestStreak = Math.max(newCurrentStreak, streak.bestStreak);
    
    const updatedStreak: ReadingStreak = {
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
      totalDaysRead: streak.totalDaysRead + 1,
      lastReadDate: today,
      readDates: updatedReadDates,
    };
    
    await AsyncStorage.setItem(READING_STREAK_KEY, JSON.stringify(updatedStreak));
    return updatedStreak;
  } catch (error) {
    console.error('Failed to mark today as read:', error);
    return await getReadingStreak();
  }
};

// Check if a specific date was read
export const wasDateRead = (dateString: string, readDates: string[]): boolean => {
  return readDates.includes(dateString);
};

// Get week calendar data for display
export const getWeekCalendarData = (readDates: string[]): Array<{
  day: string;
  date: string;
  isRead: boolean;
  isToday: boolean;
}> => {
  const weekDates = getCurrentWeekDates();
  const today = getTodayDate();
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  return weekDates.map((date, index) => ({
    day: dayNames[index],
    date,
    isRead: wasDateRead(date, readDates),
    isToday: date === today,
  }));
};

// Reset streak (for testing or user request)
export const resetStreak = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(READING_STREAK_KEY);
  } catch (error) {
    console.error('Failed to reset streak:', error);
  }
};
