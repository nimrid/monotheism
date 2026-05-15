// Database utility for reading plans
// This uses fetch to communicate with your backend API
import { API_URL } from './api-config';

const API_BASE_URL = API_URL;

export type SavedReadingPlan = {
  id: string;
  userId: string;
  name: string;
  days: number;
  startDate: string;
  age: number;
  createdAt: string;
  status: 'active' | 'completed' | 'archived';
  isTrial: boolean;
  costSkr: number;
};

export type CreatePlanRequest = {
  walletAddress: string;
  name: string;
  days: number;
  startDate: string;
  age: number;
  paymentTxSignature?: string;
};

export type TrialStatus = {
  trialsUsed: number;
  trialsRemaining: number;
  isTrialAvailable: boolean;
  costPerDay: number;
};

// Check trial status and get plan creation cost
export const checkTrialStatus = async (walletAddress: string): Promise<TrialStatus | null> => {
  try {
    if (!walletAddress) {
      console.warn('No wallet address provided to checkTrialStatus');
      return null;
    }
    
    const response = await fetch(`${API_BASE_URL}/users/${walletAddress}/reading-plans/trial-status`);
    if (!response.ok) {
      throw new Error('Failed to check trial status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking trial status:', error);
    return null;
  }
};

// Fetch all reading plans for the user
export const fetchReadingPlans = async (walletAddress: string): Promise<SavedReadingPlan[]> => {
  try {
    if (!walletAddress) {
      console.warn('No wallet address provided to fetchReadingPlans');
      return [];
    }
    
    const response = await fetch(`${API_BASE_URL}/users/${walletAddress}/reading-plans`);
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
  const { walletAddress, paymentTxSignature, ...planData } = plan;
  
  if (!walletAddress) {
    throw new Error('Wallet address is required to create a reading plan');
  }
  
  const body: any = planData;
  if (paymentTxSignature) {
    body.paymentTxSignature = paymentTxSignature;
  }
  
  const response = await fetch(`${API_BASE_URL}/users/${walletAddress}/reading-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 402) {
      // Payment required
      throw new Error(JSON.stringify(errorData));
    }
    throw new Error('Failed to create reading plan');
  }

  return await response.json();
};

// Get a specific reading plan by ID
export const getReadingPlanById = async (walletAddress: string, id: string): Promise<SavedReadingPlan | null> => {
  try {
    if (!walletAddress) {
      console.warn('No wallet address provided to getReadingPlanById');
      return null;
    }
    
    const response = await fetch(`${API_BASE_URL}/users/${walletAddress}/reading-plans/${id}`);
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
  walletAddress: string,
  id: string,
  status: 'active' | 'completed' | 'archived'
): Promise<void> => {
  if (!walletAddress) {
    throw new Error('Wallet address is required to update reading plan status');
  }
  
  const response = await fetch(`${API_BASE_URL}/users/${walletAddress}/reading-plans/${id}/status`, {
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
export const deleteReadingPlanFromDB = async (walletAddress: string, id: string): Promise<void> => {
  if (!walletAddress) {
    throw new Error('Wallet address is required to delete reading plan');
  }
  
  const response = await fetch(`${API_BASE_URL}/users/${walletAddress}/reading-plans/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete reading plan');
  }
};
