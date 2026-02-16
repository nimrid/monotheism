import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReadingProgress = {
  bookId: string;
  bookName: string;
  chapterId: string;
  testament: 'old' | 'new' | 'extra';
  progress: number; // percentage 0-100
  lastRead: string; // ISO date string
};

const READING_PROGRESS_KEY = '@reading_progress';

export const saveReadingProgress = async (progress: ReadingProgress): Promise<void> => {
  try {
    await AsyncStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save reading progress:', error);
  }
};

export const getReadingProgress = async (): Promise<ReadingProgress | null> => {
  try {
    const data = await AsyncStorage.getItem(READING_PROGRESS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get reading progress:', error);
    return null;
  }
};

export const clearReadingProgress = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(READING_PROGRESS_KEY);
  } catch (error) {
    console.error('Failed to clear reading progress:', error);
  }
};
