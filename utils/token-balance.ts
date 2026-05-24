import { Connection, PublicKey } from '@solana/web3.js';

// Use the Alchemy RPC from env — falls back to public endpoints on 429/failure
const SKR_MINT = process.env.EXPO_PUBLIC_SKR_MINT ?? 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
const SKR_DECIMALS = parseInt(process.env.EXPO_PUBLIC_SKR_DECIMALS ?? '6', 10);

// Ordered list of RPC endpoints — first non-rate-limited one wins
const RPC_ENDPOINTS: string[] = [
  process.env.EXPO_PUBLIC_SOLANA_RPC ?? '',
  'https://rpc.ankr.com/solana',
  'https://api.mainnet-beta.solana.com',
].filter(Boolean);

export type TokenBalance = {
  balance: number;
  decimals: number;
  formattedBalance: string;
};

// ─── Simple in-memory cache (60 s TTL per wallet) ────────────────────────────
type CacheEntry = { value: TokenBalance | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function getCached(key: string): TokenBalance | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: TokenBalance | null) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Exponential-backoff helper ───────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const is429 =
        err?.message?.includes('429') ||
        err?.code === 429 ||
        String(err).includes('Too many requests');
      if (!is429 || attempt === maxAttempts - 1) throw err;
      const delay = baseDelayMs * 2 ** attempt; // 1.5 s → 3 s → 6 s
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── Try each RPC in order, falling back on 429 ──────────────────────────────
async function fetchWithFallback(
  walletPublicKey: PublicKey,
  skrMintPublicKey: PublicKey
) {
  let lastError: unknown;
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      return await withRetry(() =>
        connection.getParsedTokenAccountsByOwner(walletPublicKey, {
          mint: skrMintPublicKey,
        })
      );
    } catch (err: any) {
      lastError = err;
      const is429 =
        err?.message?.includes('429') ||
        String(err).includes('Too many requests');
      if (!is429) throw err; // Non-rate-limit error — don't try next endpoint
      // Rate-limited — silently try the next endpoint
    }
  }
  throw lastError;
}

/**
 * Fetch SKR token balance for a wallet address.
 * Uses a single RPC call (getParsedTokenAccountsByOwner) to avoid double billing,
 * caches results for 60 s, and retries on 429 with exponential back-off.
 */
export const fetchSKRBalance = async (
  walletAddress: string
): Promise<TokenBalance | null> => {
  if (!walletAddress) {
    console.warn('No wallet address provided');
    return null;
  }

  // Return cached value if still fresh
  const cached = getCached(walletAddress);
  if (cached !== undefined) return cached;

  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const skrMintPublicKey = new PublicKey(SKR_MINT);

    // Try each RPC endpoint in order, falling back on 429
    const response = await fetchWithFallback(walletPublicKey, skrMintPublicKey);

    let result: TokenBalance;

    if (response.value.length === 0) {
      result = { balance: 0, decimals: SKR_DECIMALS, formattedBalance: '0.00' };
    } else {
      const tokenAmount = response.value[0].account.data.parsed.info.tokenAmount;
      const balance: number = tokenAmount.uiAmount ?? 0;
      const decimals: number = tokenAmount.decimals ?? SKR_DECIMALS;
      result = {
        balance,
        decimals,
        formattedBalance: balance.toFixed(Math.min(decimals, 2)),
      };
    }

    setCached(walletAddress, result);
    return result;
  } catch (error) {
    // Use warn (not error) so it doesn't trigger the LogBox red overlay
    console.warn('SKR balance unavailable:', error instanceof Error ? error.message : error);
    // Cache null for 15 s to prevent rapid re-hammering
    cache.set(walletAddress, { value: null, expiresAt: Date.now() + 15_000 });
    return null;
  }
};

/**
 * Invalidate the cached balance for a wallet (call after a transaction).
 */
export const invalidateSKRBalanceCache = (walletAddress: string) => {
  cache.delete(walletAddress);
};

/**
 * Format token balance for display
 */
export const formatTokenBalance = (balance: number, decimals: number = 6): string => {
  return balance.toFixed(Math.min(decimals, 2));
};
