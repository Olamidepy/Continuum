export interface Vault {
  id: number;
  owner: string;
  amount: number; // In micro-STX (1e6) or satoshis (1e8)
  shares: number; // Weighted amount based on duration multiplier
  assetType: 'STX' | 'sBTC';
  unlockAt: number; // Target block height
  createdAt: number; // Start block height
  lastRewardPerShare: string; // Serialized BigInt representation
  claimableRewards: number; // Pending rewards available for claim
  active: boolean;
}

export interface Transaction {
  id: string;
  txId?: string;
  type: 'create' | 'deposit' | 'extend' | 'withdraw' | 'emergency' | 'claim';
  vaultId: number;
  assetType: 'STX' | 'sBTC';
  amount: number;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
}

export interface WalletSession {
  connected: boolean;
  address: string | null;
  walletProvider: 'Leather' | 'Xverse' | 'Asigna' | 'Fordefi' | 'WalletConnect' | 'Celo' | 'MiniPay' | 'Celo (MiniPay)' | null;
  stxBalance: number;
  sbtcBalance: number;
  celoBalance?: number;
  cusdBalance?: number;
  avatarIndex?: number;
  avatarName?: string;
  customAvatarName?: string;
}

export interface GlobalStats {
  totalLockedSTX: number;
  totalLockedSBTC: number;
  totalSharesSTX: number;
  totalSharesSBTC: number;
  vaultCounter: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'loading' | 'info';
  message: string;
}

