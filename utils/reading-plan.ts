import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReadingPlanPreferences = {
  days: number;
  startDate: string; // ISO date string
  age: number;
  createdAt: string; // ISO date string
};

export type ReadingPlanDay = {
  day: number;
  date: string;
  bookAndChapterIds: string[];
  completed?: boolean;
};

export type ReadingPlanData = {
  daysRequested: string;
  daysFilled: string;
  sections: string;
  datesInfo: {
    todaysDate: string;
    startDate: string;
    daysUntilStartDate: number;
    endDate: string;
  };
  chaptersInfo: {
    totalChapters: number;
    averageChaptersPerDay: number;
  };
  readingTime?: {
    readersAge: string;
    silentReading: {
      averagePerDayInMinutes: number;
      averagePerDayInHours: number;
    };
  };
};

const READING_PLAN_PREFS_KEY = '@reading_plan_preferences';
const READING_PLAN_PROGRESS_KEY = '@reading_plan_progress';

export const saveReadingPlanPreferences = async (prefs: ReadingPlanPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(READING_PLAN_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save reading plan preferences:', error);
  }
};

export const getReadingPlanPreferences = async (): Promise<ReadingPlanPreferences | null> => {
  try {
    const data = await AsyncStorage.getItem(READING_PLAN_PREFS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get reading plan preferences:', error);
    return null;
  }
};

export const saveReadingPlanProgress = async (progress: { [dayNumber: number]: boolean }): Promise<void> => {
  try {
    await AsyncStorage.setItem(READING_PLAN_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save reading plan progress:', error);
  }
};

export const getReadingPlanProgress = async (): Promise<{ [dayNumber: number]: boolean }> => {
  try {
    const data = await AsyncStorage.getItem(READING_PLAN_PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to get reading plan progress:', error);
    return {};
  }
};

export const clearReadingPlan = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([READING_PLAN_PREFS_KEY, READING_PLAN_PROGRESS_KEY]);
  } catch (error) {
    console.error('Failed to clear reading plan:', error);
  }
};
