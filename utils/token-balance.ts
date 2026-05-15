import { getAssociatedTokenAddress, getMint } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

const SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export type TokenBalance = {
  balance: number;
  decimals: number;
  formattedBalance: string;
};

/**
 * Fetch SKR token balance for a wallet address
 * @param walletAddress - The Solana wallet address
 * @returns Token balance information
 */
export const fetchSKRBalance = async (walletAddress: string): Promise<TokenBalance | null> => {
  try {
    if (!walletAddress) {
      console.warn('No wallet address provided');
      return null;
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Get the associated token account for the wallet
    const walletPublicKey = new PublicKey(walletAddress);
    const skrMintPublicKey = new PublicKey(SKR_MINT);
    
    const associatedTokenAccount = await getAssociatedTokenAddress(
      skrMintPublicKey,
      walletPublicKey
    );

    // Get the token account info
    const tokenAccountInfo = await connection.getParsedAccountInfo(associatedTokenAccount);
    
    if (!tokenAccountInfo.value) {
      // Account doesn't exist, balance is 0
      return {
        balance: 0,
        decimals: 6,
        formattedBalance: '0.00',
      };
    }

    // Get mint info to determine decimals
    const mintInfo = await getMint(connection, skrMintPublicKey);
    
    // Parse the token account data
    const parsedData = tokenAccountInfo.value.data;
    if ('parsed' in parsedData) {
      const tokenAmount = parsedData.parsed.info.tokenAmount;
      const balance = tokenAmount.uiAmount || 0;
      
      return {
        balance: balance,
        decimals: mintInfo.decimals,
        formattedBalance: balance.toFixed(2),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching SKR balance:', error);
    return null;
  }
};

/**
 * Format token balance for display
 * @param balance - The balance number
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export const formatTokenBalance = (balance: number, decimals: number = 6): string => {
  return balance.toFixed(Math.min(decimals, 2));
};
