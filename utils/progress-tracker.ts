// Reading progress tracking service
import { API_URL } from './api-config';

const API_BASE_URL = API_URL;

export type ChapterProgress = {
  id: string;
  planId: string;
  chapterId: string;
  bookName: string;
  bookId: string;
  chapterNumber: number;
  dayNumber: number;
  completed: boolean;
  progressPercentage: number;
  startedAt: string | null;
  completedAt: string | null;
  lastPosition: number;
};

export type PlanStats = {
  totalChapters: number;
  completedChapters: number;
  totalDays: number;
  completedDays: number;
  averageProgress: number;
  lastCompletedDay: number;
  completionPercentage: number;
};

export type ReadingStreak = {
  currentStreak: number;
  bestStreak: number;
  totalDaysCompleted: number;
  lastCompletedDate: string | null;
};

// Get all progress for a reading plan
export const getPlanProgress = async (planId: string): Promise<ChapterProgress[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reading-plans/${planId}/progress`);
    if (!response.ok) {
      throw new Error('Failed to fetch plan progress');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching plan progress:', error);
    return [];
  }
};

// Update chapter progress
export const updateChapterProgress = async (
  planId: string,
  chapterData: {
    chapterId: string;
    bookName: string;
    bookId: string;
    chapterNumber: number;
    dayNumber: number;
    progressPercentage: number;
    lastPosition: number;
    completed: boolean;
  }
): Promise<ChapterProgress | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reading-plans/${planId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chapterData),
    });

    if (!response.ok) {
      throw new Error('Failed to update chapter progress');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating chapter progress:', error);
    return null;
  }
};

// Get progress for a specific day
export const getDayProgress = async (
  planId: string,
  dayNumber: number
): Promise<ChapterProgress[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reading-plans/${planId}/progress/day/${dayNumber}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch day progress');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching day progress:', error);
    return [];
  }
};

// Get overall plan statistics
export const getPlanStats = async (planId: string): Promise<PlanStats | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reading-plans/${planId}/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch plan stats');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching plan stats:', error);
    return null;
  }
};

// Mark chapter as completed
export const markChapterComplete = async (
  planId: string,
  chapterId: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reading-plans/${planId}/progress/${chapterId}/complete`,
      {
        method: 'PATCH',
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Error marking chapter complete:', error);
    return false;
  }
};

// Get reading streak
export const getReadingStreak = async (planId: string): Promise<ReadingStreak | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reading-plans/${planId}/streak`);
    if (!response.ok) {
      throw new Error('Failed to fetch reading streak');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching reading streak:', error);
    return null;
  }
};

// Helper: Track reading session (call this when user starts reading a chapter)
export const startReadingChapter = async (
  planId: string,
  chapterData: {
    chapterId: string;
    bookName: string;
    bookId: string;
    chapterNumber: number;
    dayNumber: number;
  }
): Promise<void> => {
  await updateChapterProgress(planId, {
    ...chapterData,
    progressPercentage: 0,
    lastPosition: 0,
    completed: false,
  });
};

// Helper: Update reading position (call this periodically as user scrolls)
export const updateReadingPosition = async (
  planId: string,
  chapterData: {
    chapterId: string;
    bookName: string;
    bookId: string;
    chapterNumber: number;
    dayNumber: number;
    progressPercentage: number;
    lastPosition: number;
  }
): Promise<void> => {
  await updateChapterProgress(planId, {
    ...chapterData,
    completed: chapterData.progressPercentage >= 100,
  });
};

// Helper: Complete chapter (call this when user finishes reading)
export const completeChapter = async (
  planId: string,
  chapterData: {
    chapterId: string;
    bookName: string;
    bookId: string;
    chapterNumber: number;
    dayNumber: number;
  }
): Promise<void> => {
  await updateChapterProgress(planId, {
    ...chapterData,
    progressPercentage: 100,
    lastPosition: 0,
    completed: true,
  });
};
