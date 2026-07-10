import { showConnect, openContractCall, AppConfig, UserSession } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { 
  uintCV, 
  stringAsciiCV, 
  contractPrincipalCV,
  PostConditionMode
} from '@stacks/transactions';
import { useContinuumStore } from '../lib/store';

// Stacks Contract Config
const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Mock/Testnet Address
const CONTRACT_NAME = 'continuum-vaults';
const SBTC_CONTRACT_NAME = 'sbtc-token-mock';

// App authentication configuration
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export function useStacks() {
  const { 
    wallet, 
    isSimulation, 
    connectWallet, 
    disconnectWallet,
    createVaultSim,
    increaseDepositSim,
    extendLockSim,
    claimRewardsSim,
    withdrawSim,
    emergencyWithdrawSim,
    addTransaction
  } = useContinuumStore();

  const network = new StacksTestnet();

  const fetchBalances = async (address: string) => {
    try {
      const res = await fetch(`https://api.testnet.hiro.so/v2/accounts/${address}/balances`);
      if (!res.ok) return { stx: 25000 * 1_000_000, sbtc: 1.5 * 100_000_000 };
      const data = await res.json();
      return {
        stx: Number(data.stx.balance) || 0,
        sbtc: Number(data.stx.fungible_tokens?.[`${CONTRACT_ADDRESS}.${SBTC_CONTRACT_NAME}::sbtc`]?.balance) || 0,
      };
    } catch (err) {
      console.error('Failed to fetch balances from network, using default fallback:', err);
      return { stx: 25000 * 1_000_000, sbtc: 1.5 * 100_000_000 };
    }
  };

  const handleConnectWallet = async (provider: 'Leather' | 'Xverse' | 'Asigna' | 'Fordefi' | 'WalletConnect') => {
    try {
      showConnect({
        userSession,
        appDetails: {
          name: 'Continuum Savings',
          icon: typeof window !== 'undefined' ? window.location.origin + '/fArtboard 2 copy 2.png' : '',
        },
        onFinish: async () => {
          try {
            const userData = userSession.loadUserData();
            const address =
              userData.profile?.stxAddress?.testnet ||
              userData.profile?.stxAddress?.mainnet ||
              '';
            if (!address) {
              console.warn('No Stacks address found in user session.');
              return;
            }
            const balances = await fetchBalances(address);
            connectWallet(address, provider, balances.stx, balances.sbtc);
          } catch (e) {
            console.error('Failed to parse Stacks user session data:', e);
          }
        },
        onCancel: () => {
          console.log('Wallet connection cancelled by user.');
        },
      });
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
          contractPrincipalCV(CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
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
    if (isSimulation) {
      increaseDepositSim(vaultId, additionalAmount);
      return true;
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
          contractPrincipalCV(CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
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
    if (isSimulation) {
      extendLockSim(vaultId, newDurationBlocks);
      return true;
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
    if (isSimulation) {
      return claimRewardsSim(vaultId);
    }

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'claim-rewards',
        functionArgs: [
          uintCV(vaultId),
          contractPrincipalCV(CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
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
    if (isSimulation) {
      return withdrawSim(vaultId);
    }

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'withdraw',
        functionArgs: [
          uintCV(vaultId),
          contractPrincipalCV(CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
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
    if (isSimulation) {
      return emergencyWithdrawSim(vaultId);
    }

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'emergency-withdraw',
        functionArgs: [
          uintCV(vaultId),
          contractPrincipalCV(CONTRACT_ADDRESS, SBTC_CONTRACT_NAME)
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
  };
}
