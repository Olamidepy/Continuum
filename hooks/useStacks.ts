import { authenticate, openContractCall, AppConfig, UserSession } from '@stacks/connect';
import { StacksMainnet } from '@stacks/network';
import { 
  uintCV, 
  stringAsciiCV, 
  contractPrincipalCV,
  PostConditionMode,
  callReadOnlyFunction,
  cvToValue,
  principalCV,
  ClarityType
} from '@stacks/transactions';
import { useContinuumStore } from '../lib/store';
import { useCelo } from './useCelo';

// Stacks Contract Config (Mainnet)
const CONTRACT_ADDRESS = 'SP20H0X9X4KXDAFQWZGV57BQCWZJWXMVF85KWBEMJ';
const CONTRACT_NAME = 'continuum-vaults';
const SBTC_CONTRACT_ADDRESS = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4';
const SBTC_CONTRACT_NAME = 'sbtc-token';

// App authentication configuration
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export function useStacks() {
  const { 
    wallet, 
    isSimulation, 
    vaults,
    connectWallet, 
    disconnectWallet,
    createVaultSim,
    increaseDepositSim,
    extendLockSim,
    claimRewardsSim,
    withdrawSim,
    emergencyWithdrawSim,
    addTransaction,
    setVaults,
    setGlobalStats
  } = useContinuumStore();

  const { 
    updateBalances,
    increaseCeloDeposit,
    extendCeloLock,
    claimCeloRewards,
    withdrawCelo,
    emergencyWithdrawCelo
  } = useCelo();

  const runCeloTx = async (to: string, valueHex: string, data = '0x') => {
    if (typeof window === 'undefined') return '';
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error('No injected Ethereum/Celo wallet found.');
    }
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const fromAddress = accounts?.[0] || wallet.address;
    if (!fromAddress) {
      throw new Error('No wallet connected.');
    }
    const txParams = {
      from: fromAddress,
      to,
      value: valueHex,
      data,
    };
    return await ethereum.request({
      method: 'eth_sendTransaction',
      params: [txParams]
    });
  };

  const network = new StacksMainnet();

  const fetchBalances = async (address: string) => {
    try {
      const res = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/balances`);
      if (!res.ok) return { stx: 0, sbtc: 0 };
      const data = await res.json();
      return {
        stx: Number(data.stx.balance) || 0,
        sbtc: Number(data.fungible_tokens?.[`${SBTC_CONTRACT_ADDRESS}.${SBTC_CONTRACT_NAME}::sbtc`]?.balance) || 0,
      };
    } catch (err) {
      console.error('Failed to fetch balances from network:', err);
      return { stx: 0, sbtc: 0 };
    }
  };

  const handleConnectWallet = async (walletName: 'Leather' | 'Xverse' | 'Asigna' | 'Fordefi' | 'WalletConnect') => {
    try {
      const getProvider = () => {
        if (typeof window === 'undefined') return undefined;
        if (walletName === 'Leather') {
          return (window as any).LeatherProvider || (window as any).StacksProvider || (window as any).stacksProvider;
        }
        if (walletName === 'Xverse') {
          return (window as any).XverseProviders?.StacksProvider || (window as any).XverseProvider || (window as any).StacksProvider || (window as any).stacksProvider;
        }
        return (window as any).StacksProvider || (window as any).stacksProvider;
      };

      const provider = getProvider();

      authenticate({
        userSession,
        appDetails: {
          name: 'Continuum Savings',
          icon: typeof window !== 'undefined' ? window.location.origin + '/Logo.png' : '',
        },
        onFinish: async () => {
          try {
            const userData = userSession.loadUserData();
            const address =
              userData.profile?.stxAddress?.mainnet ||
              userData.profile?.stxAddress?.testnet ||
              '';
            if (!address) {
              console.warn('No Stacks address found in user session.');
              return;
            }
            const balances = await fetchBalances(address);
            connectWallet(address, walletName, balances.stx, balances.sbtc);
          } catch (e) {
            console.error('Failed to parse Stacks user session data:', e);
          }
        },
        onCancel: () => {
          console.log('Wallet connection cancelled by user.');
        },
      }, provider);
    } catch (err) {
      console.error('Wallet connection error:', err);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  const createVault = async (amount: number, durationBlocks: number, assetType: 'STX' | 'sBTC'): Promise<number | null> => {
    if (isSimulation) {
      return createVaultSim(amount, durationBlocks, assetType);
    }

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'create-vault',
        functionArgs: [
          uintCV(amount),
          uintCV(durationBlocks),
          stringAsciiCV(assetType),
          contractPrincipalCV(SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
        ],
        network,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          addTransaction({
            type: 'create',
            vaultId: 0, // Pending actual index confirmation
            assetType,
            amount,
            status: 'pending',
            durationBlocks,
            txId: data.txId,
          });
          resolve(null);
        },
        onCancel: () => {
          console.log('Transaction cancelled');
          resolve(null);
        }
      });
    });
  };

  const increaseDeposit = async (vaultId: number, additionalAmount: number): Promise<boolean> => {
    const isCelo = wallet.walletProvider === 'Celo' || wallet.walletProvider === 'MiniPay' || wallet.walletProvider === 'Celo (MiniPay)';

    if (isSimulation) {
      increaseDepositSim(vaultId, additionalAmount);
      return true;
    }

    if (isCelo) {
      const vault = vaults.find(v => v.id === vaultId);
      const assetType = vault?.assetType || 'STX';
      try {
        return await increaseCeloDeposit(vaultId, additionalAmount, assetType);
      } catch (err) {
        console.error('Celo increase deposit failed:', err);
        throw err;
      }
    }

    return new Promise((resolve) => {
      const assetType = vaultId === 2 ? 'sBTC' : 'STX'; // Quick resolution for mock index
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'increase-deposit',
        functionArgs: [
          uintCV(vaultId),
          uintCV(additionalAmount),
          contractPrincipalCV(SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
        ],
        network,
        postConditionMode: PostConditionMode.Allow,
        onFinish: () => {
          addTransaction({
            type: 'deposit',
            vaultId,
            assetType,
            amount: additionalAmount,
            status: 'pending',
          });
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        }
      });
    });
  };

  const extendLock = async (vaultId: number, newDurationBlocks: number): Promise<boolean> => {
    const isCelo = wallet.walletProvider === 'Celo' || wallet.walletProvider === 'MiniPay' || wallet.walletProvider === 'Celo (MiniPay)';

    if (isSimulation) {
      extendLockSim(vaultId, newDurationBlocks);
      return true;
    }

    if (isCelo) {
      try {
        return await extendCeloLock(vaultId, newDurationBlocks);
      } catch (err) {
        console.error('Celo extendLock failed:', err);
        throw err;
      }
    }

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'extend-lock',
        functionArgs: [
          uintCV(vaultId),
          uintCV(newDurationBlocks)
        ],
        network,
        postConditionMode: PostConditionMode.Allow,
        onFinish: () => {
          addTransaction({
            type: 'extend',
            vaultId,
            assetType: 'STX',
            amount: 0,
            status: 'pending',
          });
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        }
      });
    });
  };

  const claimRewards = async (vaultId: number, assetType: 'STX' | 'sBTC'): Promise<number> => {
    const isCelo = wallet.walletProvider === 'Celo' || wallet.walletProvider === 'MiniPay' || wallet.walletProvider === 'Celo (MiniPay)';

    if (isSimulation) {
      return claimRewardsSim(vaultId);
    }

    if (isCelo) {
      try {
        return await claimCeloRewards(vaultId, assetType);
      } catch (err) {
        console.error('Celo claimRewards failed:', err);
        throw err;
      }
    }

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'claim-rewards',
        functionArgs: [
          uintCV(vaultId),
          contractPrincipalCV(SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
        ],
        network,
        postConditionMode: PostConditionMode.Allow,
        onFinish: () => {
          addTransaction({
            type: 'claim',
            vaultId,
            assetType,
            amount: 0, // Pending broadcast resolution
            status: 'pending',
          });
          resolve(0);
        },
        onCancel: () => {
          resolve(0);
        }
      });
    });
  };

  const withdraw = async (vaultId: number, assetType: 'STX' | 'sBTC'): Promise<number> => {
    const isCelo = wallet.walletProvider === 'Celo' || wallet.walletProvider === 'MiniPay' || wallet.walletProvider === 'Celo (MiniPay)';

    if (isSimulation) {
      return withdrawSim(vaultId);
    }

    if (isCelo) {
      try {
        return await withdrawCelo(vaultId, assetType);
      } catch (err) {
        console.error('Celo withdraw failed:', err);
        throw err;
      }
    }

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'withdraw',
        functionArgs: [
          uintCV(vaultId),
          contractPrincipalCV(SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
        ],
        network,
        postConditionMode: PostConditionMode.Allow,
        onFinish: () => {
          addTransaction({
            type: 'withdraw',
            vaultId,
            assetType,
            amount: 0,
            status: 'pending',
          });
          resolve(0);
        },
        onCancel: () => {
          resolve(0);
        }
      });
    });
  };

  const emergencyWithdraw = async (vaultId: number, assetType: 'STX' | 'sBTC'): Promise<number> => {
    const isCelo = wallet.walletProvider === 'Celo' || wallet.walletProvider === 'MiniPay' || wallet.walletProvider === 'Celo (MiniPay)';

    if (isSimulation) {
      return emergencyWithdrawSim(vaultId);
    }

    if (isCelo) {
      try {
        return await emergencyWithdrawCelo(vaultId, assetType);
      } catch (err) {
        console.error('Celo emergencyWithdraw failed:', err);
        throw err;
      }
    }

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'emergency-withdraw',
        functionArgs: [
          uintCV(vaultId),
          contractPrincipalCV(SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
        ],
        network,
        postConditionMode: PostConditionMode.Allow,
        onFinish: () => {
          addTransaction({
            type: 'emergency',
            vaultId,
            assetType,
            amount: 0,
            status: 'pending',
          });
          resolve(0);
        },
        onCancel: () => {
          resolve(0);
        }
      });
    });
  };

  const loadRealVaults = async (address: string) => {
    try {
      const response = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-user-vaults',
        functionArgs: [principalCV(address)],
        senderAddress: address,
        network,
      });
      const vaultIdsDecoded = cvToValue(response);
      if (!Array.isArray(vaultIdsDecoded)) return;

      const loadedVaults = [];
      for (const idBig of vaultIdsDecoded) {
        const id = Number(idBig);
        const vaultRes = await callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-vault',
          functionArgs: [uintCV(id)],
          senderAddress: address,
          network,
        });
        const decoded = cvToValue(vaultRes);
        if (decoded && decoded.active) {
          loadedVaults.push({
            id,
            owner: decoded.owner,
            amount: Number(decoded.amount),
            shares: Number(decoded.shares),
            assetType: decoded['asset-type'] as 'STX' | 'sBTC',
            createdAt: Number(decoded['created-at']),
            unlockAt: Number(decoded['unlock-at']),
            lastRewardPerShare: decoded['last-reward-per-share'].toString(),
            claimableRewards: Number(decoded['claimable-rewards']),
            active: decoded.active,
            network: 'Stacks' as const,
          });
        }
      }
      setVaults(loadedVaults);
    } catch (err) {
      console.error('Failed to load real vaults from blockchain:', err);
    }
  };

  const loadGlobalStats = async () => {
    try {
      const response = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-contract-stats',
        functionArgs: [],
        senderAddress: CONTRACT_ADDRESS,
        network,
      });
      const resultVal = response.type === ClarityType.ResponseOk ? response.value : response;
      const decoded = cvToValue(resultVal);
      if (!decoded) return;
      setGlobalStats({
        totalLockedSTX: Number(decoded['total-locked-stx']),
        totalLockedSBTC: Number(decoded['total-locked-sbtc']),
        totalSharesSTX: Number(decoded['total-shares-stx']),
        totalSharesSBTC: Number(decoded['total-shares-sbtc']),
        vaultCounter: Number(decoded['vault-counter']),
      });
    } catch (err) {
      console.error('Failed to load global stats from blockchain:', err);
    }
  };

  return {
    wallet,
    isSimulation,
    connectWallet: handleConnectWallet,
    disconnectWallet: handleDisconnect,
    createVault,
    increaseDeposit,
    extendLock,
    claimRewards,
    withdraw,
    emergencyWithdraw,
    loadRealVaults,
    loadGlobalStats,
  };
}
