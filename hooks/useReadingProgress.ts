import { useUser } from '@/contexts/UserContext';
import {
    ChapterProgress,
    completeChapter,
    getDayProgress,
    getPlanProgress,
    getPlanStats,
    getReadingStreak,
    PlanStats,
    ReadingStreak,
    startReadingChapter,
    updateReadingPosition,
} from '@/utils/progress-tracker';
import { useEffect, useState } from 'react';

export const useReadingProgress = (planId: string | null) => {
  const { walletAddress } = useUser();
  const [progress, setProgress] = useState<ChapterProgress[]>([]);
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [streak, setStreak] = useState<ReadingStreak | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProgress = async () => {
    if (!planId || !walletAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [progressData, statsData, streakData] = await Promise.all([
        getPlanProgress(walletAddress, planId),
        getPlanStats(walletAddress, planId),
        getReadingStreak(walletAddress, planId),
      ]);

      setProgress(progressData);
      setStats(statsData);
      setStreak(streakData);
    } catch (error) {
      console.error('Error loading reading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, [planId, walletAddress]);

  const startChapter = async (chapterData: {
    chapterId: string;
    bookName: string;
    bookId: string;
    chapterNumber: number;
    dayNumber: number;
  }) => {
    if (!planId || !walletAddress) return;
    await startReadingChapter(walletAddress, planId, chapterData);
    await loadProgress();
  };

  const updatePosition = async (chapterData: {
    chapterId: string;
    bookName: string;
    bookId: string;
    chapterNumber: number;
    dayNumber: number;
    progressPercentage: number;
    lastPosition: number;
  }) => {
    if (!planId || !walletAddress) return;
    await updateReadingPosition(walletAddress, planId, chapterData);
  };

  const finishChapter = async (chapterData: {
    chapterId: string;
    bookName: string;
    bookId: string;
    chapterNumber: number;
    dayNumber: number;
  }) => {
    if (!planId || !walletAddress) return;
    await completeChapter(walletAddress, planId, chapterData);
    await loadProgress();
  };

  const getDayChapters = async (dayNumber: number) => {
    if (!planId || !walletAddress) return [];
    return await getDayProgress(walletAddress, planId, dayNumber);
  };

  const isChapterCompleted = (chapterId: string): boolean => {
    return progress.some(p => p.chapterId === chapterId && p.completed);
  };

  const getChapterProgress = (chapterId: string): ChapterProgress | undefined => {
    return progress.find(p => p.chapterId === chapterId);
  };

  return {
    progress,
    stats,
    streak,
    loading,
    startChapter,
    updatePosition,
    finishChapter,
    getDayChapters,
    isChapterCompleted,
    getChapterProgress,
    refresh: loadProgress,
  };
};
