import AsyncStorage from '@react-native-async-storage/async-storage';

const DAY_STREAK_KEY = '@day_streak';

export type DayStreak = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalDaysActive: number;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isYesterday = (date: Date, today: Date): boolean => {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

export const getDayStreak = async (): Promise<DayStreak> => {
  try {
    const stored = await AsyncStorage.getItem(DAY_STREAK_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to get day streak:', error);
  }

  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    totalDaysActive: 0,
  };
};

export const updateDayStreak = async (): Promise<DayStreak> => {
  const streak = await getDayStreak();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // If already updated today, return current streak
  if (streak.lastActiveDate === todayStr) {
    return streak;
  }

  const lastActiveDate = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;

  let newStreak: DayStreak;

  if (!lastActiveDate) {
    // First time tracking
    newStreak = {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: todayStr,
      totalDaysActive: 1,
    };
  } else if (isSameDay(lastActiveDate, today)) {
    // Already counted today
    return streak;
  } else if (isYesterday(lastActiveDate, today)) {
    // Consecutive day
    const newCurrentStreak = streak.currentStreak + 1;
    newStreak = {
      currentStreak: newCurrentStreak,
      longestStreak: Math.max(newCurrentStreak, streak.longestStreak),
      lastActiveDate: todayStr,
      totalDaysActive: streak.totalDaysActive + 1,
    };
  } else {
    // Streak broken
    newStreak = {
      currentStreak: 1,
      longestStreak: streak.longestStreak,
      lastActiveDate: todayStr,
      totalDaysActive: streak.totalDaysActive + 1,
    };
  }

  try {
    await AsyncStorage.setItem(DAY_STREAK_KEY, JSON.stringify(newStreak));
  } catch (error) {
    console.error('Failed to save day streak:', error);
  }

  return newStreak;
};

export const resetDayStreak = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DAY_STREAK_KEY);
  } catch (error) {
    console.error('Failed to reset day streak:', error);
  }
};
