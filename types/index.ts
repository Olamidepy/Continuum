/**
 * Represents a savings vault on Stacks or Celo network.
 */
export interface Vault {
  id: number;
  owner: string;
  amount: number; // In micro-STX (1e6), satoshis (1e8), or wei (1e18)
  shares: number; // Weighted amount based on duration multiplier
  assetType: 'STX' | 'sBTC';
  unlockAt: number; // Target block height or timestamp
  createdAt: number; // Start block height or timestamp
  lastRewardPerShare: string; // Serialized BigInt representation
  claimableRewards: number; // Pending rewards available for claim
  active: boolean;
  isPending?: boolean;
  txId?: string;
  network?: 'Stacks' | 'Celo';
}

/**
 * Represents a historical transaction operation in the protocol.
 */
export interface Transaction {
  id: string;
  txId?: string;
  type: 'create' | 'deposit' | 'extend' | 'withdraw' | 'emergency' | 'claim';
  vaultId: number;
  assetType: 'STX' | 'sBTC';
  amount: number;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  durationBlocks?: number;
  network?: 'Stacks' | 'Celo';
}

/**
 * Connected user wallet state and balance information.
 */
export interface WalletSession {
  connected: boolean;
  address: string | null;
  walletProvider: string | null;
  stxBalance: number;
  sbtcBalance: number;
  celoBalance?: number;
  cusdBalance?: number;
  avatarIndex?: number;
  avatarName?: string;
  customAvatarName?: string;
}

/**
 * Aggregated protocol stats across all vaults.
 */
export interface GlobalStats {
  totalLockedSTX: number;
  totalLockedSBTC: number;
  totalSharesSTX: number;
  totalSharesSBTC: number;
  vaultCounter: number;
}

/**
 * Toast notification payload structure.
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'loading' | 'info';
  message: string;
}

