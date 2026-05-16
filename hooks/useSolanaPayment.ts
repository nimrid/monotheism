/**
 * useSolanaPayment
 * ----------------
 * Encapsulates the complete SKR SPL-token payment flow.
 *
 * Key behaviours:
 *  - Reads ALL config from EXPO_PUBLIC_* env vars (no hardcoded secrets)
 *  - Before any payment attempt, checks the backend for an existing
 *    subscription tied to the user's wallet — so users NEVER pay twice
 *  - Builds + signs the SPL transfer transaction via Mobile Wallet Adapter
 *  - Confirms on-chain with Alchemy RPC
 *  - Classified error codes for clean UX handling
 */

import { useUser } from '@/contexts/UserContext';
import {
    createTransferInstruction,
    getAccount,
    getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
    Connection,
    PublicKey,
    Transaction,
} from '@solana/web3.js';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '@/utils/api-config';
import { activatePremiumSubscription } from '@/utils/subscription';

// ─── Config (all from .env) ────────────────────────────────────────────────────
const SKR_MINT = new PublicKey(
  process.env.EXPO_PUBLIC_SKR_MINT ?? 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3'
);
const SKR_DECIMALS = parseInt(
  process.env.EXPO_PUBLIC_SKR_DECIMALS ?? '6',
  10
);
const RPC_ENDPOINT =
  process.env.EXPO_PUBLIC_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';

// ─── Types ──────────────────────────────────────────────────────────────────────
export type PaymentResult = {
  signature: string;
  amount: number; // human-readable SKR amount
  alreadyPaid?: boolean; // true if subscription was already recorded
};

export type PaymentError =
  | 'WALLET_NOT_CONNECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'USER_REJECTED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useSolanaPayment() {
  const { walletAddress } = useUser();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const connectionRef = useRef(new Connection(RPC_ENDPOINT, 'confirmed'));

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Check the payer's SKR token balance.
   */
  const checkBalance = async (payerPubkey: PublicKey): Promise<number> => {
    try {
      const ata = await getAssociatedTokenAddress(SKR_MINT, payerPubkey);
      const account = await getAccount(connectionRef.current, ata);
      return Number(account.amount) / Math.pow(10, SKR_DECIMALS);
    } catch {
      return 0; // ATA doesn't exist → zero balance
    }
  };

  /**
   * Check the backend to see if this wallet already has an active
   * premium subscription. Returns the subscription data or null.
   *
   * This is the primary deduplication guard — if the user already
   * paid on-chain and it was recorded, we grant access without asking
   * them to pay again.
   */
  const checkExistingSubscription = async (
    wallet: string
  ): Promise<{ isPremium: boolean; txSignature?: string | null } | null> => {
    try {
      const res = await fetch(`${API_URL}/users/${wallet}/subscription`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // ── Main payment function ─────────────────────────────────────────────────────

  /**
   * @param recipientAddress  Wallet that receives the SKR payment
   * @param amountSKR         Human-readable SKR amount (e.g. 350)
   * @param signerFn          Platform signer — wraps Mobile Wallet Adapter `transact`
   *
   * @returns PaymentResult on success
   * @throws  Typed error with `.code: PaymentError` on failure
   */
  const payWithSKR = async (
    recipientAddress: string,
    amountSKR: number,
    signerFn: (transaction: Transaction) => Promise<string>
  ): Promise<PaymentResult> => {
    // ── 1. Wallet connection guard ──────────────────────────────────────────────
    if (!walletAddress) {
      Alert.alert(
        'Wallet Required',
        'Please connect your Solana wallet first.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Profile',
            onPress: () => router.push('/(tabs)/profile'),
          },
        ]
      );
      const err: any = new Error('Wallet not connected');
      err.code = 'WALLET_NOT_CONNECTED' as PaymentError;
      throw err;
    }

    setPaying(true);

    try {
      // ── 2. Deduplication check — does this wallet already have premium? ──────
      //     This prevents "weird messages" and double charges entirely.
      const existing = await checkExistingSubscription(walletAddress);

      if (existing?.isPremium) {
        console.log(
          '[SKR Payment] Wallet already has premium. Restoring locally.'
        );

        // Silently restore local premium status so the user sees correct UI
        await activatePremiumSubscription(existing.txSignature ?? undefined);

        return {
          signature: existing.txSignature ?? 'already-paid',
          amount: amountSKR,
          alreadyPaid: true,
        };
      }

      const connection = connectionRef.current;
      const payerPubkey = new PublicKey(walletAddress);
      const recipientPubkey = new PublicKey(recipientAddress);

      // ── 3. Balance check ────────────────────────────────────────────────────
      const balance = await checkBalance(payerPubkey);
      if (balance < amountSKR) {
        const err: any = new Error(
          `Insufficient SKR balance. You have ${balance.toFixed(2)} SKR but need ${amountSKR} SKR.`
        );
        err.code = 'INSUFFICIENT_BALANCE' as PaymentError;
        throw err;
      }

      // ── 4. Build SPL transfer transaction ───────────────────────────────────
      const senderATA = await getAssociatedTokenAddress(SKR_MINT, payerPubkey);
      const recipientATA = await getAssociatedTokenAddress(
        SKR_MINT,
        recipientPubkey
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: payerPubkey,
      }).add(
        createTransferInstruction(
          senderATA,
          recipientATA,
          payerPubkey,
          BigInt(Math.round(amountSKR * Math.pow(10, SKR_DECIMALS)))
        )
      );

      // ── 5. Sign & send ──────────────────────────────────────────────────────
      const signature = await signerFn(transaction);

      // ── 6. Confirm on-chain (Alchemy RPC) ───────────────────────────────────
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      console.log(
        `[SKR Payment] ✅ ${amountSKR} SKR → ${recipientAddress} | sig: ${signature}`
      );

      return { signature, amount: amountSKR, alreadyPaid: false };
    } catch (error: any) {
      // ── Classify error ────────────────────────────────────────────────────
      const msg: string = error?.message ?? '';

      if (
        msg.includes('User rejected') ||
        msg.includes('rejected') ||
        msg.includes('cancelled') ||
        msg.includes('canceled')
      ) {
        const e: any = new Error('Transaction cancelled by user.');
        e.code = 'USER_REJECTED' as PaymentError;
        throw e;
      }

      if (
        msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('timeout') ||
        msg.includes('Failed to fetch')
      ) {
        const e: any = new Error(
          'Network error. Please check your connection and try again.'
        );
        e.code = 'NETWORK_ERROR' as PaymentError;
        throw e;
      }

      // Re-throw already-classified errors as-is
      throw error;
    } finally {
      setPaying(false);
    }
  };

  return {
    paying,
    payWithSKR,
    checkBalance,
    checkExistingSubscription,
    walletAddress,
    SKR_MINT: SKR_MINT.toBase58(),
    SKR_DECIMALS,
    RPC_ENDPOINT,
  };
}
