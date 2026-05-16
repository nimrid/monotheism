import { API_URL } from '@/utils/api-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIPTION_KEY = '@premium_subscription';

export type SubscriptionStatus = {
  isPremium: boolean;
  purchaseDate: string | null;
  expiryDate: string | null;
  txSignature?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Local-first helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the user's subscription status (local cache first).
 */
export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  try {
    const data = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to get subscription status:', error);
  }

  return {
    isPremium: false,
    purchaseDate: null,
    expiryDate: null,
    txSignature: null,
  };
};

/**
 * Activate premium locally (call after backend confirms payment).
 */
export const activatePremiumSubscription = async (
  txSignature?: string
): Promise<SubscriptionStatus> => {
  try {
    const subscription: SubscriptionStatus = {
      isPremium: true,
      purchaseDate: new Date().toISOString(),
      expiryDate: null, // Lifetime access
      txSignature: txSignature ?? null,
    };

    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
    return subscription;
  } catch (error) {
    console.error('Failed to activate subscription:', error);
    throw error;
  }
};

/**
 * Check if user has premium access (local).
 */
export const hasPremiumAccess = async (): Promise<boolean> => {
  const status = await getSubscriptionStatus();
  return status.isPremium;
};

/**
 * Clear subscription status (for logout or testing).
 */
export const clearSubscription = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
  } catch (error) {
    console.error('Failed to clear subscription:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Backend sync helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a premium subscription payment to the backend.
 * Call this after a successful on-chain SKR payment.
 *
 * @param walletAddress  The payer's Solana wallet address
 * @param txSignature    On-chain transaction signature
 * @param amountSKR      Amount of SKR paid
 */
export const syncSubscriptionWithBackend = async (
  walletAddress: string,
  txSignature: string,
  amountSKR: number
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/users/${walletAddress}/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txSignature, amountSKR }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Backend subscription sync failed:', err);
      return false;
    }

    const data = await response.json();
    console.log('[Subscription] Backend sync OK:', data);

    // Persist locally
    await activatePremiumSubscription(txSignature);
    return true;
  } catch (error) {
    console.error('[Subscription] Backend sync error:', error);
    return false;
  }
};

/**
 * Fetch subscription status from the backend and sync to local cache.
 * Use on app startup or after wallet connection.
 */
export const fetchAndSyncSubscription = async (
  walletAddress: string
): Promise<SubscriptionStatus> => {
  try {
    const response = await fetch(
      `${API_URL}/users/${walletAddress}/subscription`
    );

    if (!response.ok) {
      // Fall back to local cache
      return getSubscriptionStatus();
    }

    const data = await response.json();
    const status: SubscriptionStatus = {
      isPremium: data.isPremium ?? false,
      purchaseDate: data.purchaseDate ?? null,
      expiryDate: data.expiryDate ?? null,
      txSignature: data.txSignature ?? null,
    };

    // Update local cache
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(status));
    return status;
  } catch (error) {
    console.error('[Subscription] Fetch from backend failed:', error);
    return getSubscriptionStatus();
  }
};
