// Database utility for reading plans
// This uses fetch to communicate with your backend API
import { API_URL } from './api-config';

const API_BASE_URL = API_URL;

export type SavedReadingPlan = {
  id: string;
  name: string;
  days: number;
  startDate: string;
  age: number;
  createdAt: string;
  status: 'active' | 'completed' | 'archived';
};

export type CreatePlanRequest = {
  name: string;
  days: number;
  startDate: string;
  age: number;
};

// Fetch all reading plans for the user
export const fetchReadingPlans = async (): Promise<SavedReadingPlan[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reading-plans`);
    if (!response.ok) {
      throw new Error('Failed to fetch reading plans');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching reading plans:', error);
    return [];
  }
};

// Create a new reading plan
export const createReadingPlanInDB = async (plan: CreatePlanRequest): Promise<SavedReadingPlan> => {
  const response = await fetch(`${API_BASE_URL}/reading-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(plan),
  });

  if (!response.ok) {
    throw new Error('Failed to create reading plan');
  }

  return await response.json();
};

// Get a specific reading plan by ID
export const getReadingPlanById = async (id: string): Promise<SavedReadingPlan | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reading-plans/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch reading plan');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching reading plan:', error);
    return null;
  }
};

// Update reading plan status
export const updateReadingPlanStatus = async (
  id: string,
  status: 'active' | 'completed' | 'archived'
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/reading-plans/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update reading plan status');
  }
};

// Delete a reading plan
export const deleteReadingPlanFromDB = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/reading-plans/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete reading plan');
  }
};
