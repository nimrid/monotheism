import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReadingPlanStatus = 'active' | 'completed' | 'none';

export type ReadingPlan = {
  id: string; // Unique ID for the plan
  totalDays: number; // Total days to complete (90, 180, 365)
  startDate: string; // ISO date string when plan started
  status: ReadingPlanStatus;
  currentDay: number; // Current day in the plan (1-based)
  completedDays: string[]; // Array of chapter IDs that have been read
  dailyChapters: string[][]; // Array of arrays - each inner array is chapter IDs for that day
  changesRemaining: number; // Number of times user can recreate plan (starts at 3)
  lastModifiedDate: string; // ISO date string of last modification
  isLocked: boolean; // True after 3 changes, unlocks only when plan is completed
};

export type DayProgress = {
  dayNumber: number;
  date: string; // ISO date string
  chapters: string[]; // Chapter IDs for this day
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
  completedChapters: string[]; // Which chapters in this day are done
};

const READING_PLAN_KEY = '@reading_plan';
const READING_STREAK_KEY = '@reading_plan_streak';

export type ReadingPlanStreak = {
  currentStreak: number; // Consecutive days of completing daily reading
  bestStreak: number;
  totalDaysCompleted: number; // Total days completed in current plan
  lastCompletedDate: string; // ISO date string
  completedDates: string[]; // Array of dates when daily reading was completed
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Get yesterday's date
const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

// Calculate date for a specific day in the plan
const getDateForDay = (startDate: string, dayNumber: number): string => {
  const start = new Date(startDate);
  const targetDate = new Date(start);
  targetDate.setDate(start.getDate() + (dayNumber - 1));
  return targetDate.toISOString().split('T')[0];
};

// Get current day number based on start date
const getCurrentDayNumber = (startDate: string): number => {
  const start = new Date(startDate);
  const today = new Date();
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1); // Day 1 is the start date
};

// Initialize streak
const initializeStreak = (): ReadingPlanStreak => ({
  currentStreak: 0,
  bestStreak: 0,
  totalDaysCompleted: 0,
  lastCompletedDate: '',
  completedDates: [],
});

// Get reading plan
export const getReadingPlan = async (): Promise<ReadingPlan | null> => {
  try {
    const data = await AsyncStorage.getItem(READING_PLAN_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get reading plan:', error);
    return null;
  }
};

// Save reading plan
export const saveReadingPlan = async (plan: ReadingPlan): Promise<void> => {
  try {
    await AsyncStorage.setItem(READING_PLAN_KEY, JSON.stringify(plan));
  } catch (error) {
    console.error('Failed to save reading plan:', error);
  }
};

// Get reading plan streak
export const getReadingPlanStreak = async (): Promise<ReadingPlanStreak> => {
  try {
    const data = await AsyncStorage.getItem(READING_STREAK_KEY);
    return data ? JSON.parse(data) : initializeStreak();
  } catch (error) {
    console.error('Failed to get reading plan streak:', error);
    return initializeStreak();
  }
};

// Save reading plan streak
const saveReadingPlanStreak = async (streak: ReadingPlanStreak): Promise<void> => {
  try {
    await AsyncStorage.setItem(READING_STREAK_KEY, JSON.stringify(streak));
  } catch (error) {
    console.error('Failed to save reading plan streak:', error);
  }
};

// Create a new reading plan
export const createReadingPlan = async (
  totalDays: number,
  dailyChapters: string[][]
): Promise<ReadingPlan> => {
  const existingPlan = await getReadingPlan();
  
  // Check if user has changes remaining
  if (existingPlan && existingPlan.isLocked) {
    throw new Error('Reading plan is locked. Complete your current plan to create a new one.');
  }
  
  const changesRemaining = existingPlan 
    ? Math.max(0, existingPlan.changesRemaining - 1)
    : 3;
  
  const plan: ReadingPlan = {
    id: Date.now().toString(),
    totalDays,
    startDate: getTodayDate(),
    status: 'active',
    currentDay: 1,
    completedDays: [],
    dailyChapters,
    changesRemaining,
    lastModifiedDate: getTodayDate(),
    isLocked: changesRemaining === 0,
  };
  
  await saveReadingPlan(plan);
  
  // Reset streak when creating new plan
  await saveReadingPlanStreak(initializeStreak());
  
  return plan;
};

// Mark a chapter as read
export const markChapterAsRead = async (chapterId: string): Promise<void> => {
  const plan = await getReadingPlan();
  if (!plan || plan.status !== 'active') return;
  
  // Add to completed days if not already there
  if (!plan.completedDays.includes(chapterId)) {
    plan.completedDays.push(chapterId);
    
    // Update current day
    plan.currentDay = getCurrentDayNumber(plan.startDate);
    
    // Check if entire plan is completed
    const totalChapters = plan.dailyChapters.flat().length;
    if (plan.completedDays.length >= totalChapters) {
      plan.status = 'completed';
      plan.isLocked = false; // Unlock when completed
    }
    
    await saveReadingPlan(plan);
    
    // Check if today's reading is complete and update streak
    await checkAndUpdateDailyProgress(plan);
  }
};

// Check if today's reading is complete and update streak
const checkAndUpdateDailyProgress = async (plan: ReadingPlan): Promise<void> => {
  const today = getTodayDate();
  const currentDay = getCurrentDayNumber(plan.startDate);
  
  // Don't update if we're beyond the plan days
  if (currentDay > plan.totalDays) return;
  
  const todayChapters = plan.dailyChapters[currentDay - 1] || [];
  const completedToday = todayChapters.filter(chapterId => 
    plan.completedDays.includes(chapterId)
  );
  
  // If all today's chapters are completed
  if (completedToday.length === todayChapters.length && todayChapters.length > 0) {
    const streak = await getReadingPlanStreak();
    
    // Don't update if already completed today
    if (streak.completedDates.includes(today)) return;
    
    // Calculate new streak
    let newCurrentStreak = 1;
    const yesterday = getYesterdayDate();
    
    if (streak.lastCompletedDate === yesterday) {
      newCurrentStreak = streak.currentStreak + 1;
    } else if (streak.lastCompletedDate === today) {
      newCurrentStreak = streak.currentStreak;
    }
    
    const updatedStreak: ReadingPlanStreak = {
      currentStreak: newCurrentStreak,
      bestStreak: Math.max(newCurrentStreak, streak.bestStreak),
      totalDaysCompleted: streak.totalDaysCompleted + 1,
      lastCompletedDate: today,
      completedDates: [...streak.completedDates, today],
    };
    
    await saveReadingPlanStreak(updatedStreak);
  }
};

// Get progress for a specific day
export const getDayProgress = async (dayNumber: number): Promise<DayProgress | null> => {
  const plan = await getReadingPlan();
  if (!plan) return null;
  
  if (dayNumber < 1 || dayNumber > plan.totalDays) return null;
  
  const chapters = plan.dailyChapters[dayNumber - 1] || [];
  const completedChapters = chapters.filter(chapterId => 
    plan.completedDays.includes(chapterId)
  );
  
  const date = getDateForDay(plan.startDate, dayNumber);
  const today = getTodayDate();
  const currentDay = getCurrentDayNumber(plan.startDate);
  
  return {
    dayNumber,
    date,
    chapters,
    isCompleted: completedChapters.length === chapters.length && chapters.length > 0,
    isToday: dayNumber === currentDay,
    isFuture: dayNumber > currentDay,
    completedChapters,
  };
};

// Get week view of progress (7 days starting from a specific day)
export const getWeekProgress = async (startDay: number): Promise<DayProgress[]> => {
  const weekProgress: DayProgress[] = [];
  
  for (let i = 0; i < 7; i++) {
    const dayNumber = startDay + i;
    const progress = await getDayProgress(dayNumber);
    if (progress) {
      weekProgress.push(progress);
    }
  }
  
  return weekProgress;
};

// Get overall plan progress
export const getPlanProgress = async (): Promise<{
  plan: ReadingPlan | null;
  streak: ReadingPlanStreak;
  todayProgress: DayProgress | null;
  progressPercentage: number;
  daysRemaining: number;
  canModify: boolean;
}> => {
  const plan = await getReadingPlan();
  const streak = await getReadingPlanStreak();
  
  if (!plan) {
    return {
      plan: null,
      streak,
      todayProgress: null,
      progressPercentage: 0,
      daysRemaining: 0,
      canModify: true,
    };
  }
  
  const currentDay = getCurrentDayNumber(plan.startDate);
  const todayProgress = await getDayProgress(currentDay);
  
  const totalChapters = plan.dailyChapters.flat().length;
  const progressPercentage = totalChapters > 0 
    ? Math.round((plan.completedDays.length / totalChapters) * 100)
    : 0;
  
  const daysRemaining = Math.max(0, plan.totalDays - streak.totalDaysCompleted);
  
  return {
    plan,
    streak,
    todayProgress,
    progressPercentage,
    daysRemaining,
    canModify: !plan.isLocked && plan.changesRemaining > 0,
  };
};

// Delete reading plan (only if not locked or if completed)
export const deleteReadingPlan = async (): Promise<boolean> => {
  const plan = await getReadingPlan();
  
  if (!plan) return true;
  
  if (plan.isLocked && plan.status !== 'completed') {
    return false; // Cannot delete locked plan
  }
  
  try {
    await AsyncStorage.removeItem(READING_PLAN_KEY);
    await AsyncStorage.removeItem(READING_STREAK_KEY);
    return true;
  } catch (error) {
    console.error('Failed to delete reading plan:', error);
    return false;
  }
};

// Check if chapter is part of today's reading
export const isChapterInTodaysPlan = async (chapterId: string): Promise<boolean> => {
  const plan = await getReadingPlan();
  if (!plan || plan.status !== 'active') return false;
  
  const currentDay = getCurrentDayNumber(plan.startDate);
  if (currentDay > plan.totalDays) return false;
  
  const todayChapters = plan.dailyChapters[currentDay - 1] || [];
  return todayChapters.includes(chapterId);
};
