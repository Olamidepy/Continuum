import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vault, Transaction, WalletSession, GlobalStats, Toast } from '../types';

interface ContinuumState {
  // Connection state
  wallet: WalletSession;
  isSimulation: boolean;
  currentBlockHeight: number;
  
  // Protocol state
  globalStats: GlobalStats;
  accRewardPerShareSTX: bigint;
  accRewardPerShareSBTC: bigint;
  
  // User state
  vaults: Vault[];
  transactions: Transaction[];
  
  // Actions
  toggleSimulation: (val: boolean) => void;
  connectWallet: (address: string, provider: 'Leather' | 'Xverse' | 'Asigna' | 'Fordefi' | 'WalletConnect', stxBalance?: number, sbtcBalance?: number) => void;
  disconnectWallet: () => void;
  advanceBlocks: (count: number) => void;
  
  // Smart Contract actions (Simulated or triggers for Stacks interaction)
  createVaultSim: (amount: number, durationBlocks: number, assetType: 'STX' | 'sBTC') => number;
  increaseDepositSim: (vaultId: number, additionalAmount: number) => void;
  extendLockSim: (vaultId: number, newDurationBlocks: number) => void;
  claimRewardsSim: (vaultId: number) => number;
  withdrawSim: (vaultId: number) => number;
  emergencyWithdrawSim: (vaultId: number) => number;
  
  // Background simulation ticks
  simulateExternalActivity: () => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateAvatar: (index: number, name: string) => void;
  updateCustomAvatarName: (customName: string) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (type: 'success' | 'error' | 'loading' | 'info', message: string, duration?: number) => string;
  removeToast: (id: string) => void;

  // Withdraw flow state
  isWithdrawOpen: boolean;
  setWithdrawOpen: (open: boolean) => void;
  selectedWithdrawVault: Vault | null;
  setSelectedWithdrawVault: (vault: Vault | null) => void;
}

const INITIAL_BLOCK_HEIGHT = 100000;
const REWARD_SCALE = 1_000_000_000_000n; // 1e12

export const useContinuumStore = create<ContinuumState>()(
  persist(
    (set, get) => ({
      wallet: {
        connected: false,
        address: null,
        walletProvider: null,
        stxBalance: 25000 * 1_000_000, // 25,000 STX
        sbtcBalance: 1.5 * 100_000_000, // 1.50 sBTC
      },
      isSimulation: true,
      currentBlockHeight: INITIAL_BLOCK_HEIGHT,
      
      globalStats: {
        totalLockedSTX: 75000 * 1_000_000,
        totalLockedSBTC: 4.8 * 100_000_000,
        totalSharesSTX: 95000 * 1_000_000,
        totalSharesSBTC: 6.2 * 100_000_000,
        vaultCounter: 3,
      },
      
      accRewardPerShareSTX: 250_000_000n, // Simulated starting accumulated reward per share
      accRewardPerShareSBTC: 15_000_000n,
      
      vaults: [
        {
          id: 1,
          owner: 'SP3FBR2AGK5H9QBDWX84EEFVT827VREQAHHHT2K4',
          amount: 5000 * 1_000_000, // 5,000 STX
          shares: 6000 * 1_000_000, // 1.2x multiplier for 90 days
          assetType: 'STX',
          createdAt: INITIAL_BLOCK_HEIGHT - 6480, // 45 days ago
          unlockAt: INITIAL_BLOCK_HEIGHT + 6480, // 45 days left
          lastRewardPerShare: '100000000',
          claimableRewards: 125 * 1_000_000, // 125 STX accrued
          active: true,
        },
        {
          id: 2,
          owner: 'SP3FBR2AGK5H9QBDWX84EEFVT827VREQAHHHT2K4',
          amount: 0.5 * 100_000_000, // 0.5 sBTC
          shares: 1.0 * 100_000_000, // 2.0x multiplier for 365 days
          assetType: 'sBTC',
          createdAt: INITIAL_BLOCK_HEIGHT - 20000,
          unlockAt: INITIAL_BLOCK_HEIGHT + 32560,
          lastRewardPerShare: '5000000',
          claimableRewards: 0.015 * 100_000_000, // 0.015 sBTC accrued
          active: true,
        },
        {
          id: 3,
          owner: 'SP3FBR2AGK5H9QBDWX84EEFVT827VREQAHHHT2K4',
          amount: 2000 * 1_000_000, // 2,000 STX
          shares: 2000 * 1_000_000, // 1.0x multiplier for 30 days
          assetType: 'STX',
          createdAt: INITIAL_BLOCK_HEIGHT - 5000,
          unlockAt: INITIAL_BLOCK_HEIGHT - 680, // Already matured!
          lastRewardPerShare: '200000000',
          claimableRewards: 45 * 1_000_000,
          active: true,
        }
      ],
      
      transactions: [],
      toasts: [],
      isWithdrawOpen: false,
      selectedWithdrawVault: null,
      
      toggleSimulation: (val) => set({ isSimulation: val }),
      
      connectWallet: (address, provider, stxBalance, sbtcBalance) => set((state) => ({
        isSimulation: false,
        wallet: {
          ...state.wallet,
          connected: true,
          address,
          walletProvider: provider,
          stxBalance: stxBalance !== undefined ? stxBalance : state.wallet.stxBalance,
          sbtcBalance: sbtcBalance !== undefined ? sbtcBalance : state.wallet.sbtcBalance,
        }
      })),
      
      disconnectWallet: () => set((state) => ({
        isSimulation: true,
        wallet: {
          ...state.wallet,
          connected: false,
          address: null,
          walletProvider: null,
          stxBalance: 25000 * 1_000_000,
          sbtcBalance: 1.5 * 100_000_000,
        },
        vaults: state.vaults.filter(v => v.owner !== state.wallet.address) // Clear user vaults on disconnect
      })),

      updateAvatar: (index, name) => set((state) => ({
        wallet: {
          ...state.wallet,
          avatarIndex: index,
          avatarName: name
        }
      })),

      updateCustomAvatarName: (customName) => set((state) => ({
        wallet: {
          ...state.wallet,
          customAvatarName: customName
        }
      })),

      addToast: (type, message, duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({
          toasts: [...state.toasts, { id, type, message }]
        }));
        if (type !== 'loading' && duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, duration);
        }
        return id;
      },

      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),

      setWithdrawOpen: (open) => set({ isWithdrawOpen: open }),
      setSelectedWithdrawVault: (vault) => set({ selectedWithdrawVault: vault }),
      
      advanceBlocks: (count) => {
        set((state) => {
          const nextHeight = state.currentBlockHeight + count;
          
          // Periodically distribute rewards from other simulated early exits
          let addSTXAcc = 0n;
          let addsBTCAcc = 0n;
          
          if (count >= 100) {
            // Simulate random emergency withdrawals from other participants
            const exitsCount = Math.floor(count / 500) + 1;
            addSTXAcc = BigInt(exitsCount * 45_000_000); // Scaled
            addsBTCAcc = BigInt(exitsCount * 2_500_000);
          }
          
          const newAccSTX = state.accRewardPerShareSTX + addSTXAcc;
          const newAccSBTC = state.accRewardPerShareSBTC + addsBTCAcc;
          
          // Recalculate claimable rewards for all user vaults
          const updatedVaults = state.vaults.map((v) => {
            if (!v.active) return v;
            
            const currentAcc = v.assetType === 'STX' ? newAccSTX : newAccSBTC;
            const lastAcc = BigInt(v.lastRewardPerShare);
            const diff = currentAcc - lastAcc;
            const accrued = Number((BigInt(v.shares) * diff) / REWARD_SCALE);
            
            return {
              ...v,
              claimableRewards: v.claimableRewards + accrued,
              lastRewardPerShare: currentAcc.toString(),
            };
          });
          
          return {
            currentBlockHeight: nextHeight,
            accRewardPerShareSTX: newAccSTX,
            accRewardPerShareSBTC: newAccSBTC,
            vaults: updatedVaults,
          };
        });
      },
      
      createVaultSim: (amount, durationBlocks, assetType) => {
        const state = get();
        const vaultId = state.globalStats.vaultCounter + 1;
        const currentHeight = state.currentBlockHeight;
        
        let multiplier = 1000;
        if (durationBlocks >= 52560) multiplier = 2000;
        else if (durationBlocks >= 25920) multiplier = 1500;
        else if (durationBlocks >= 12960) multiplier = 1200;
        
        const shares = Math.floor((amount * multiplier) / 1000);
        const lastAcc = assetType === 'STX' ? state.accRewardPerShareSTX : state.accRewardPerShareSBTC;
        
        const newVault: Vault = {
          id: vaultId,
          owner: state.wallet.address || 'SP3FBR2AGK5H9QBDWX84EEFVT827VREQAHHHT2K4',
          amount,
          shares,
          assetType,
          createdAt: currentHeight,
          unlockAt: currentHeight + durationBlocks,
          lastRewardPerShare: lastAcc.toString(),
          claimableRewards: 0,
          active: true,
        };
        
        set((state) => {
          // Deduct balance
          const walletUpdate = { ...state.wallet };
          if (assetType === 'STX') {
            walletUpdate.stxBalance -= amount;
          } else {
            walletUpdate.sbtcBalance -= amount;
          }
          
          // Update globals
          const globalUpdate = {
            ...state.globalStats,
            vaultCounter: vaultId,
            totalLockedSTX: state.globalStats.totalLockedSTX + (assetType === 'STX' ? amount : 0),
            totalLockedSBTC: state.globalStats.totalLockedSBTC + (assetType === 'sBTC' ? amount : 0),
            totalSharesSTX: state.globalStats.totalSharesSTX + (assetType === 'STX' ? shares : 0),
            totalSharesSBTC: state.globalStats.totalSharesSBTC + (assetType === 'sBTC' ? shares : 0),
          };
          
          return {
            wallet: walletUpdate,
            globalStats: globalUpdate,
            vaults: [...state.vaults, newVault],
          };
        });
        
        get().addTransaction({
          type: 'create',
          vaultId,
          assetType,
          amount,
          status: 'success',
        });
        
        return vaultId;
      },
      
      increaseDepositSim: (vaultId, additionalAmount) => {
        set((state) => {
          const vaultIndex = state.vaults.findIndex((v) => v.id === vaultId);
          if (vaultIndex === -1) return {};
          
          const vault = state.vaults[vaultIndex];
          const assetType = vault.assetType;
          
          let multiplier = 1000;
          const duration = vault.unlockAt - vault.createdAt;
          if (duration >= 52560) multiplier = 2000;
          else if (duration >= 25920) multiplier = 1500;
          else if (duration >= 12960) multiplier = 1200;
          
          const additionalShares = Math.floor((additionalAmount * multiplier) / 1000);
          
          // Deduct balance
          const walletUpdate = { ...state.wallet };
          if (assetType === 'STX') {
            walletUpdate.stxBalance -= additionalAmount;
          } else {
            walletUpdate.sbtcBalance -= additionalAmount;
          }
          
          // First update and claim rewards (add to claimable balance)
          const currentAcc = assetType === 'STX' ? state.accRewardPerShareSTX : state.accRewardPerShareSBTC;
          const lastAcc = BigInt(vault.lastRewardPerShare);
          const diff = currentAcc - lastAcc;
          const newRewards = Number((BigInt(vault.shares) * diff) / REWARD_SCALE);
          const totalClaimable = vault.claimableRewards + newRewards;
          
          // Update Vault
          const updatedVaults = [...state.vaults];
          updatedVaults[vaultIndex] = {
            ...vault,
            amount: vault.amount + additionalAmount,
            shares: vault.shares + additionalShares,
            claimableRewards: totalClaimable, // accumulate rewards
            lastRewardPerShare: currentAcc.toString(),
          };
          
          // Update globals
          const globalUpdate = {
            ...state.globalStats,
            totalLockedSTX: state.globalStats.totalLockedSTX + (assetType === 'STX' ? additionalAmount : 0),
            totalLockedSBTC: state.globalStats.totalLockedSBTC + (assetType === 'sBTC' ? additionalAmount : 0),
            totalSharesSTX: state.globalStats.totalSharesSTX + (assetType === 'STX' ? additionalShares : 0),
            totalSharesSBTC: state.globalStats.totalSharesSBTC + (assetType === 'sBTC' ? additionalShares : 0),
          };
          
          return {
            wallet: walletUpdate,
            globalStats: globalUpdate,
            vaults: updatedVaults,
          };
        });
        
        get().addTransaction({
          type: 'deposit',
          vaultId,
          assetType: get().vaults.find(v => v.id === vaultId)?.assetType || 'STX',
          amount: additionalAmount,
          status: 'success',
        });
      },
      
      extendLockSim: (vaultId, newDurationBlocks) => {
        set((state) => {
          const vaultIndex = state.vaults.findIndex((v) => v.id === vaultId);
          if (vaultIndex === -1) return {};
          
          const vault = state.vaults[vaultIndex];
          const assetType = vault.assetType;
          
          // Calculate new shares
          let newMultiplier = 1000;
          if (newDurationBlocks >= 52560) newMultiplier = 2000;
          else if (newDurationBlocks >= 25920) newMultiplier = 1500;
          else if (newDurationBlocks >= 12960) newMultiplier = 1200;
          
          const newShares = Math.floor((vault.amount * newMultiplier) / 1000);
          const oldShares = vault.shares;
          
          // First update and claim rewards
          const currentAcc = assetType === 'STX' ? state.accRewardPerShareSTX : state.accRewardPerShareSBTC;
          const lastAcc = BigInt(vault.lastRewardPerShare);
          const diff = currentAcc - lastAcc;
          const newRewards = Number((BigInt(vault.shares) * diff) / REWARD_SCALE);
          const totalClaimable = vault.claimableRewards + newRewards;
          
          // Update Vault
          const updatedVaults = [...state.vaults];
          updatedVaults[vaultIndex] = {
            ...vault,
            shares: newShares,
            unlockAt: state.currentBlockHeight + newDurationBlocks,
            createdAt: state.currentBlockHeight,
            claimableRewards: totalClaimable,
            lastRewardPerShare: currentAcc.toString(),
          };
          
          // Update globals
          const globalUpdate = {
            ...state.globalStats,
            totalSharesSTX: state.globalStats.totalSharesSTX - (assetType === 'STX' ? oldShares : 0) + (assetType === 'STX' ? newShares : 0),
            totalSharesSBTC: state.globalStats.totalSharesSBTC - (assetType === 'sBTC' ? oldShares : 0) + (assetType === 'sBTC' ? newShares : 0),
          };
          
          return {
            globalStats: globalUpdate,
            vaults: updatedVaults,
          };
        });
        
        get().addTransaction({
          type: 'extend',
          vaultId,
          assetType: get().vaults.find(v => v.id === vaultId)?.assetType || 'STX',
          amount: 0,
          status: 'success',
        });
      },
      
      claimRewardsSim: (vaultId) => {
        let claimedAmount = 0;
        
        set((state) => {
          const vaultIndex = state.vaults.findIndex((v) => v.id === vaultId);
          if (vaultIndex === -1) return {};
          
          const vault = state.vaults[vaultIndex];
          const assetType = vault.assetType;
          
          // Update rewards
          const currentAcc = assetType === 'STX' ? state.accRewardPerShareSTX : state.accRewardPerShareSBTC;
          const lastAcc = BigInt(vault.lastRewardPerShare);
          const diff = currentAcc - lastAcc;
          const newRewards = Number((BigInt(vault.shares) * diff) / REWARD_SCALE);
          claimedAmount = vault.claimableRewards + newRewards;
          
          if (claimedAmount <= 0) return {};
          
          // Credit user wallet
          const walletUpdate = { ...state.wallet };
          if (assetType === 'STX') {
            walletUpdate.stxBalance += claimedAmount;
          } else {
            walletUpdate.sbtcBalance += claimedAmount;
          }
          
          const updatedVaults = [...state.vaults];
          updatedVaults[vaultIndex] = {
            ...vault,
            claimableRewards: 0,
            lastRewardPerShare: currentAcc.toString(),
          };
          
          return {
            wallet: walletUpdate,
            vaults: updatedVaults,
          };
        });
        
        if (claimedAmount > 0) {
          get().addTransaction({
            type: 'claim',
            vaultId,
            assetType: get().vaults.find(v => v.id === vaultId)?.assetType || 'STX',
            amount: claimedAmount,
            status: 'success',
          });
        }
        
        return claimedAmount;
      },
      
      withdrawSim: (vaultId) => {
        let totalPayout = 0;
        const state = get();
        const vaultIndex = state.vaults.findIndex((v) => v.id === vaultId);
        if (vaultIndex === -1) return 0;
        
        const vault = state.vaults[vaultIndex];
        const assetType = vault.assetType;
        
        // Update rewards
        const currentAcc = assetType === 'STX' ? state.accRewardPerShareSTX : state.accRewardPerShareSBTC;
        const lastAcc = BigInt(vault.lastRewardPerShare);
        const diff = currentAcc - lastAcc;
        const newRewards = Number((BigInt(vault.shares) * diff) / REWARD_SCALE);
        const claimable = vault.claimableRewards + newRewards;
        
        totalPayout = vault.amount + claimable;
        
        set((state) => {
          // Pay user
          const walletUpdate = { ...state.wallet };
          if (assetType === 'STX') {
            walletUpdate.stxBalance += totalPayout;
          } else {
            walletUpdate.sbtcBalance += totalPayout;
          }
          
          // Update globals
          const globalUpdate = {
            ...state.globalStats,
            totalLockedSTX: state.globalStats.totalLockedSTX - (assetType === 'STX' ? vault.amount : 0),
            totalLockedSBTC: state.globalStats.totalLockedSBTC - (assetType === 'sBTC' ? vault.amount : 0),
            totalSharesSTX: state.globalStats.totalSharesSTX - (assetType === 'STX' ? vault.shares : 0),
            totalSharesSBTC: state.globalStats.totalSharesSBTC - (assetType === 'sBTC' ? vault.shares : 0),
          };
          
          // Deactivate Vault
          const updatedVaults = [...state.vaults];
          updatedVaults[vaultIndex] = {
            ...vault,
            amount: 0,
            shares: 0,
            claimableRewards: 0,
            active: false,
          };
          
          return {
            wallet: walletUpdate,
            globalStats: globalUpdate,
            vaults: updatedVaults,
          };
        });
        
        get().addTransaction({
          type: 'withdraw',
          vaultId,
          assetType,
          amount: vault.amount,
          status: 'success',
        });
        
        return totalPayout;
      },
      
      emergencyWithdrawSim: (vaultId) => {
        let totalPayout = 0;
        const state = get();
        const vaultIndex = state.vaults.findIndex((v) => v.id === vaultId);
        if (vaultIndex === -1) return 0;
        
        const vault = state.vaults[vaultIndex];
        const assetType = vault.assetType;
        
        // 10% penalty
        const penalty = Math.floor(vault.amount * 0.1);
        const refundAmount = vault.amount - penalty;
        
        // Get accrued rewards
        const currentAcc = assetType === 'STX' ? state.accRewardPerShareSTX : state.accRewardPerShareSBTC;
        const lastAcc = BigInt(vault.lastRewardPerShare);
        const diff = currentAcc - lastAcc;
        const newRewards = Number((BigInt(vault.shares) * diff) / REWARD_SCALE);
        const accruedRewards = vault.claimableRewards + newRewards;
        
        totalPayout = refundAmount + accruedRewards;
        
        set((state) => {
          // Pay user
          const walletUpdate = { ...state.wallet };
          if (assetType === 'STX') {
            walletUpdate.stxBalance += totalPayout;
          } else {
            walletUpdate.sbtcBalance += totalPayout;
          }
          
          // Distribute penalty (80% to active pool, 20% to treasury)
          const redistribute = Math.floor(penalty * 0.8);
          
          // Calculate remaining active shares
          const totalShares = assetType === 'STX' ? state.globalStats.totalSharesSTX : state.globalStats.totalSharesSBTC;
          const remainingShares = totalShares - vault.shares;
          
          let newAccRewardPerShare = assetType === 'STX' ? state.accRewardPerShareSTX : state.accRewardPerShareSBTC;
          if (remainingShares > 0) {
            const addedPerShare = (BigInt(redistribute) * REWARD_SCALE) / BigInt(remainingShares);
            newAccRewardPerShare += addedPerShare;
          }
          
          // Update globals
          const globalUpdate = {
            ...state.globalStats,
            totalLockedSTX: state.globalStats.totalLockedSTX - (assetType === 'STX' ? vault.amount : 0),
            totalLockedSBTC: state.globalStats.totalLockedSBTC - (assetType === 'sBTC' ? vault.amount : 0),
            totalSharesSTX: state.globalStats.totalSharesSTX - (assetType === 'STX' ? vault.shares : 0),
            totalSharesSBTC: state.globalStats.totalSharesSBTC - (assetType === 'sBTC' ? vault.shares : 0),
          };
          
          // Deactivate Vault
          const updatedVaults = [...state.vaults];
          updatedVaults[vaultIndex] = {
            ...vault,
            amount: 0,
            shares: 0,
            claimableRewards: 0,
            active: false,
          };
          
          return {
            wallet: walletUpdate,
            globalStats: globalUpdate,
            vaults: updatedVaults,
            accRewardPerShareSTX: assetType === 'STX' ? newAccRewardPerShare : state.accRewardPerShareSTX,
            accRewardPerShareSBTC: assetType === 'sBTC' ? newAccRewardPerShare : state.accRewardPerShareSBTC,
          };
        });
        
        get().addTransaction({
          type: 'emergency',
          vaultId,
          assetType,
          amount: vault.amount,
          status: 'success',
        });
        
        return totalPayout;
      },
      
      simulateExternalActivity: () => {
        set((state) => {
          // Add random reward to STX and sBTC pools representing a simulated early exit penalty
          const addedSTX = BigInt(Math.floor(Math.random() * 50 + 10) * 1_000_000); // 10-60 STX penalty distributed
          const addedSBTC = BigInt(Math.floor(Math.random() * 5 + 1) * 100_000); // sBTC satoshis penalty distributed
          
          const sharesSTX = BigInt(state.globalStats.totalSharesSTX);
          const sharesSBTC = BigInt(state.globalStats.totalSharesSBTC);
          
          const addPerShareSTX = sharesSTX > 0n ? (addedSTX * REWARD_SCALE) / sharesSTX : 0n;
          const addPerShareSBTC = sharesSBTC > 0n ? (addedSBTC * REWARD_SCALE) / sharesSBTC : 0n;
          
          const newAccSTX = state.accRewardPerShareSTX + addPerShareSTX;
          const newAccSBTC = state.accRewardPerShareSBTC + addPerShareSBTC;
          
          // Recalculate claimable rewards for all user vaults
          const updatedVaults = state.vaults.map((v) => {
            if (!v.active) return v;
            
            const currentAcc = v.assetType === 'STX' ? newAccSTX : newAccSBTC;
            const lastAcc = BigInt(v.lastRewardPerShare);
            const diff = currentAcc - lastAcc;
            const accrued = Number((BigInt(v.shares) * diff) / REWARD_SCALE);
            
            return {
              ...v,
              claimableRewards: v.claimableRewards + accrued,
              lastRewardPerShare: currentAcc.toString(),
            };
          });
          
          return {
            accRewardPerShareSTX: newAccSTX,
            accRewardPerShareSBTC: newAccSBTC,
            vaults: updatedVaults,
          };
        });
      },
      
      addTransaction: (tx) => set((state) => {
        const newTx: Transaction = {
          ...tx,
          id: Math.random().toString(36).substring(2, 11),
          txId: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          timestamp: Date.now(),
        };
        return {
          transactions: [newTx, ...state.transactions].slice(0, 50), // keep last 50
        };
      }),
    }),
    {
      name: 'continuum-storage',
      partialize: (state) => ({
        // Do NOT persist wallet.connected — always start disconnected on page load
        isSimulation: state.isSimulation,
        currentBlockHeight: state.currentBlockHeight,
        globalStats: state.globalStats,
        accRewardPerShareSTX: state.accRewardPerShareSTX.toString(),
        accRewardPerShareSBTC: state.accRewardPerShareSBTC.toString(),
        vaults: state.vaults,
        transactions: state.transactions,
      }),
      // Custom deserialization for bigint — SSR-safe (guards against server-side localStorage access)
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          try {
            const raw = localStorage.getItem(name);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed.state) {
              if (parsed.state.accRewardPerShareSTX) {
                parsed.state.accRewardPerShareSTX = BigInt(parsed.state.accRewardPerShareSTX);
              }
              if (parsed.state.accRewardPerShareSBTC) {
                parsed.state.accRewardPerShareSBTC = BigInt(parsed.state.accRewardPerShareSBTC);
              }
            }
            return parsed;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch { /* ignore quota errors */ }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(name);
        },
      }
    }
  )
);
