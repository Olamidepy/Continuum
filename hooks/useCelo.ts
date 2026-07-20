'use client';

import { useContinuumStore } from '../lib/store';

// Stacks uses block numbers for tracking, while Celo uses block timestamps.
// We map Celo timestamps to simulated block numbers to match the UI state.
const TIMESTAMP_SCALE_FACTOR = 600; // 1 block = 600 seconds (10 minutes)

// Celo Vaults Contract Address — Update this after deploying to Mainnet
export const CELO_VAULTS_CONTRACT_ADDRESS: string = '0x162fC5502B988B60d6c82e3248Fccf57C3663188';

const isDeployed = CELO_VAULTS_CONTRACT_ADDRESS && CELO_VAULTS_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

// Active EVM provider reference
let activeEvmProvider: any = null;

// EIP-6963: Collect wallet providers announced via events
const eip6963Store: Array<{ info: { name: string; icon?: string; uuid: string }; provider: any }> = [];
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', ((event: any) => {
    const detail = event.detail;
    if (detail?.provider && !eip6963Store.some(p => p.info.uuid === detail.info?.uuid)) {
      eip6963Store.push(detail);
    }
  }) as EventListener);
  // Request providers from all installed wallets
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

// ABI Helpers for manual encoding/decoding without external libraries
const pad32Bytes = (val: string | number | bigint) => {
  let hex = '';
  if (typeof val === 'bigint' || typeof val === 'number') {
    hex = val.toString(16);
  } else {
    hex = val.replace(/^0x/, '');
  }
  return hex.padStart(64, '0');
};

const waitForReceipt = async (txHash: string): Promise<boolean> => {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('https://forno.celo.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        })
      });
      const data = await res.json();
      if (data?.result?.status === '0x1') {
        return true;
      } else if (data?.result?.status === '0x0') {
        throw new Error('Transaction reverted');
      }
    } catch (e) {
      console.error('Polling receipt error:', e);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error('Transaction confirmation timeout');
};

export function useCelo() {
  const {
    wallet,
    vaults,
    connectWallet,
    setVaults,
    addTransaction,
    isSimulation,
    currentBlockHeight,
    setGlobalStats,
    createVaultSim,
    increaseDepositSim,
    extendLockSim,
    claimRewardsSim,
    withdrawSim,
    emergencyWithdrawSim
  } = useContinuumStore();

  const fetchBalances = async (address: string) => {
    let celoBal = 0;
    let cusdBal = 0;
    try {
      // Fetch native CELO balance
      const balanceRes = await fetch('https://forno.celo.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest']
        })
      });
      const balanceData = await balanceRes.json();
      if (balanceData && balanceData.result) {
        celoBal = parseInt(balanceData.result, 16) / 1e18;
      }

      // Fetch cUSD balance (contract: 0x765de816845861e75a25fca122bb6898b8b1282a)
      const cusdRes = await fetch('https://forno.celo.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_call',
          params: [
            {
              to: '0x765de816845861e75a25fca122bb6898b8b1282a',
              data: '0x70a08231000000000000000000000000' + address.replace('0x', '')
            },
            'latest'
          ]
        })
      });
      const cusdData = await cusdRes.json();
      if (cusdData && cusdData.result) {
        cusdBal = parseInt(cusdData.result, 16) / 1e18;
      }
    } catch (err) {
      console.error('Error fetching Celo balances:', err);
    }
    return { celoBal, cusdBal };
  };

  const discoverProviders = (): Array<{ name: string; provider: any }> => {
    if (typeof window === 'undefined') return [];
    const found: Array<{ name: string; provider: any }> = [];
    const seen = new Set<any>();

    // Check for EIP-6963 providers (modern standard)
    for (const detail of eip6963Store) {
      if (detail?.provider && !seen.has(detail.provider)) {
        seen.add(detail.provider);
        found.push({ name: detail.info?.name || 'Unknown Wallet', provider: detail.provider });
      }
    }

    // Check specifically for Zerion Wallet provider
    const zerionWallet = (window as any).zerionWallet;
    if (zerionWallet && !seen.has(zerionWallet)) {
      seen.add(zerionWallet);
      found.push({ name: 'Zerion', provider: zerionWallet });
    }

    // Check legacy providers array (MetaMask/Rabby/Zerion multi-provider)
    const ethereum = (window as any).ethereum;
    if (ethereum?.providers && Array.isArray(ethereum.providers)) {
      for (const p of ethereum.providers) {
        if (p && !seen.has(p)) {
          seen.add(p);
          // Note: Check specific flags BEFORE isMetaMask as other wallets copy isMetaMask for compat
          const name = p.isZerion ? 'Zerion'
            : p.isRabby ? 'Rabby' 
            : p.isMetaMask ? 'MetaMask' 
            : p.isCoinbaseWallet ? 'Coinbase'
            : 'EVM Wallet';
          found.push({ name, provider: p });
        }
      }
    }

    if (found.length === 0 && ethereum) {
      const name = ethereum.isMiniPay ? 'MiniPay'
        : ethereum.isZerion ? 'Zerion'
        : ethereum.isRabby ? 'Rabby' 
        : ethereum.isMetaMask ? 'MetaMask' 
        : 'Browser Wallet';
      found.push({ name, provider: ethereum });
    }

    return found;
  };

  const handleConnectCelo = async (selectedProvider?: any) => {
    if (typeof window === 'undefined') return;

    const providers = discoverProviders();
    if (providers.length === 0) {
      throw new Error('No injected wallet found. Please install MetaMask, Rabby, or a compatible wallet extension.');
    }

    const provider = selectedProvider || providers[0].provider;
    activeEvmProvider = provider;

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }
      const address = accounts[0];

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa4ec' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xa4ec',
                chainName: 'Celo Mainnet',
                nativeCurrency: {
                  name: 'CELO',
                  symbol: 'CELO',
                  decimals: 18,
                },
                rpcUrls: ['https://forno.celo.org'],
                blockExplorerUrls: ['https://celoscan.io'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      const { celoBal, cusdBal } = await fetchBalances(address);
      const providerName = provider.isMiniPay ? 'MiniPay'
        : provider.isZerion ? 'Zerion'
        : provider.isRabby ? 'Rabby'
        : provider.isMetaMask ? 'MetaMask'
        : 'Celo';
      connectWallet(address, providerName, 0, 0, celoBal, cusdBal);
    } catch (err: any) {
      console.error('Ethereum request failed:', err);
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('cancelled')) {
        throw new Error('cancelled');
      }
      throw err;
    }
  };

  const updateBalances = async () => {
    if (!wallet.address) return;
    if (wallet.address === '0x71C7656EC7ab88b098defB751B7401B5f6d8976F') return;
    const { celoBal, cusdBal } = await fetchBalances(wallet.address);
    connectWallet(
      wallet.address,
      wallet.walletProvider || 'Celo',
      0,
      0,
      celoBal,
      cusdBal
    );
  };

  const getActiveProvider = () => {
    if (typeof window === 'undefined') return null;
    if (activeEvmProvider) return activeEvmProvider;

    const providers = discoverProviders();
    const targetName = wallet.walletProvider;
    const foundProvider = providers.find(p => p.name === targetName);
    if (foundProvider) return foundProvider.provider;

    if (providers.length > 0) {
      return providers[0].provider;
    }
    return (window as any).ethereum;
  };

  const runCeloContractTx = async (to: string, valueHex: string, data: string): Promise<string> => {
    if (typeof window === 'undefined') return '';
    const provider = getActiveProvider();
    if (!provider) {
      throw new Error('No injected Ethereum/Celo wallet found.');
    }
    const accounts = await provider.request({ method: 'eth_accounts' });
    const fromAddress = accounts?.[0] || wallet.address;
    if (!fromAddress) {
      throw new Error('No wallet connected.');
    }
    let cleanValue = valueHex.replace(/^0x-?/, '');
    if (!cleanValue || cleanValue === '') cleanValue = '0';
    const formattedValueHex = '0x' + BigInt('0x' + cleanValue).toString(16);

    const txParams: any = {
      from: fromAddress,
      to,
      value: formattedValueHex,
      data,
      gas: '0x7a120', // 500,000 gas limit to bypass eth_estimateGas reverting when balance is tight
    };
    return await provider.request({
      method: 'eth_sendTransaction',
      params: [txParams]
    });
  };

  const createCeloVault = async (amountRaw: number, durationBlocks: number, assetType: 'STX' | 'sBTC') => {
    if (typeof window === 'undefined' || !wallet.address) return null;
    const provider = getActiveProvider();

    if (isSimulation || !isDeployed) {
      return createVaultSim(amountRaw, durationBlocks, assetType);
    }

    if (!provider) {
      throw new Error('No compatible wallet found for Celo transactions.');
    }

    const cleanAmountRaw = Math.max(0, Math.round(Math.abs(amountRaw)));
    const weiAmount = assetType === 'STX' 
      ? BigInt(cleanAmountRaw) * BigInt(1e12) 
      : BigInt(cleanAmountRaw) * BigInt(1e10);

    let durationSeconds = 30 * 24 * 60 * 60; // 30 days
    if (Number(durationBlocks) === 12960 || Number(durationBlocks) === 90) durationSeconds = 90 * 24 * 60 * 60;
    else if (Number(durationBlocks) === 25920 || Number(durationBlocks) === 180) durationSeconds = 180 * 24 * 60 * 60;
    else if (Number(durationBlocks) === 52560 || Number(durationBlocks) === 365) durationSeconds = 365 * 24 * 60 * 60;

    let txHash = '';
    try {
      if (assetType === 'STX') {
        // Native CELO: createVault(uint256 duration, uint8 assetType=0, uint256 amount=0)
        // Selector: 0x7460c510
        const data = '0x7460c510' + pad32Bytes(durationSeconds) + pad32Bytes(0) + pad32Bytes(0);
        txHash = await runCeloContractTx(CELO_VAULTS_CONTRACT_ADDRESS, '0x' + weiAmount.toString(16), data);
      } else {
        // cUSD: (1) approve, then (2) createVault(duration, assetType=1, amount)
        // cUSD address: 0x765de816845861e75a25fca122bb6898b8b1282a
        // approve(address,uint256) selector: 0x095ea7b3
        const approveData = '0x095ea7b3' + pad32Bytes(CELO_VAULTS_CONTRACT_ADDRESS) + pad32Bytes(weiAmount);
        const appTx = await runCeloContractTx('0x765de816845861e75a25fca122bb6898b8b1282a', '0x0', approveData);
        
        // Wait for approval transaction receipt
        await waitForReceipt(appTx);

        // createVault(uint256 duration, uint8 assetType=1, uint256 amount) selector: 0x7460c510
        const createData = '0x7460c510' + pad32Bytes(durationSeconds) + pad32Bytes(1) + pad32Bytes(weiAmount);
        txHash = await runCeloContractTx(CELO_VAULTS_CONTRACT_ADDRESS, '0x0', createData);
      }

      addTransaction({
        type: 'create',
        vaultId: vaults.length + 1,
        assetType,
        amount: amountRaw,
        status: 'pending',
        network: 'Celo',
        txId: txHash,
      });

      await updateBalances();
      return vaults.length + 1;
    } catch (err) {
      console.error('Celo createVault failed:', err);
      throw err;
    }
  };

  const increaseCeloDeposit = async (vaultId: number, amountRaw: number, assetType: 'STX' | 'sBTC'): Promise<boolean> => {
    if (isSimulation || !isDeployed) {
      increaseDepositSim(vaultId, amountRaw);
      return true;
    }

    const cleanAmountRaw = Math.max(0, Math.round(Math.abs(amountRaw)));
    const weiAmount = assetType === 'STX' 
      ? BigInt(cleanAmountRaw) * BigInt(1e12) 
      : BigInt(cleanAmountRaw) * BigInt(1e10);

    try {
      let txHash = '';
      if (assetType === 'STX') {
        // increaseDeposit(uint256 vaultId, uint256 amount) selector: 0x4299b922
        const data = '0x4299b922' + pad32Bytes(vaultId) + pad32Bytes(0);
        txHash = await runCeloContractTx(CELO_VAULTS_CONTRACT_ADDRESS, '0x' + weiAmount.toString(16), data);
      } else {
        // approve cUSD first
        const approveData = '0x095ea7b3' + pad32Bytes(CELO_VAULTS_CONTRACT_ADDRESS) + pad32Bytes(weiAmount);
        const appTx = await runCeloContractTx('0x765de816845861e75a25fca122bb6898b8b1282a', '0x0', approveData);
        await waitForReceipt(appTx);

        const data = '0x4299b922' + pad32Bytes(vaultId) + pad32Bytes(weiAmount);
        txHash = await runCeloContractTx(CELO_VAULTS_CONTRACT_ADDRESS, '0x0', data);
      }

      addTransaction({
        type: 'extend', // Maps conceptually to general vault actions
        vaultId,
        assetType,
        amount: amountRaw,
        status: 'pending',
        network: 'Celo',
        txId: txHash,
      });

      await updateBalances();
      return true;
    } catch (err) {
      console.error('Celo increaseDeposit failed:', err);
      throw err;
    }
  };

  const extendCeloLock = async (vaultId: number, newDurationBlocks: number): Promise<boolean> => {
    if (isSimulation || !isDeployed) {
      extendLockSim(vaultId, newDurationBlocks);
      return true;
    }

    let durationSeconds = 30 * 24 * 60 * 60; // 30 days
    if (newDurationBlocks === 12960) durationSeconds = 90 * 24 * 60 * 60;
    else if (newDurationBlocks === 25920) durationSeconds = 180 * 24 * 60 * 60;
    else if (newDurationBlocks === 52560) durationSeconds = 365 * 24 * 60 * 60;

    try {
      // extendLock(uint256 vaultId, uint256 newLockDuration) selector: 0x7e706f3b
      const data = '0x7e706f3b' + pad32Bytes(vaultId) + pad32Bytes(durationSeconds);
      const txHash = await runCeloContractTx(CELO_VAULTS_CONTRACT_ADDRESS, '0x0', data);

      addTransaction({
        type: 'extend',
        vaultId,
        assetType: 'STX',
        amount: 0,
        status: 'pending',
        network: 'Celo',
        txId: txHash,
      });

      await updateBalances();
      return true;
    } catch (err) {
      console.error('Celo extendLock failed:', err);
      throw err;
    }
  };

  const claimCeloRewards = async (vaultId: number, assetType: 'STX' | 'sBTC'): Promise<number> => {
    if (isSimulation || !isDeployed) {
      return claimRewardsSim(vaultId);
    }

    try {
      // claimRewards(uint256 vaultId) selector: 0xb0849925
      const data = '0xb0849925' + pad32Bytes(vaultId);
      const txHash = await runCeloContractTx(CELO_VAULTS_CONTRACT_ADDRESS, '0x0', data);

      addTransaction({
        type: 'claim',
        vaultId,
        assetType,
        amount: 0,
        status: 'pending',
        network: 'Celo',
        txId: txHash,
      });

      await updateBalances();
      return 0;
    } catch (err) {
      console.error('Celo claimRewards failed:', err);
      throw err;
    }
  };

  const withdrawCelo = async (vaultId: number, assetType: 'STX' | 'sBTC'): Promise<number> => {
    if (isSimulation || !isDeployed) {
      return withdrawSim(vaultId);
    }

    try {
      // withdraw(uint256 vaultId) selector: 0x2e1a7d4d
      const data = '0x2e1a7d4d' + pad32Bytes(vaultId);
      const txHash = await runCeloContractTx(CELO_VAULTS_CONTRACT_ADDRESS, '0x0', data);

      addTransaction({
        type: 'withdraw',
        vaultId,
        assetType,
        amount: 0,
        status: 'pending',
        network: 'Celo',
        txId: txHash,
      });

      await updateBalances();
      return 0;
    } catch (err) {
      console.error('Celo withdraw failed:', err);
      throw err;
    }
  };

  const emergencyWithdrawCelo = async (vaultId: number, assetType: 'STX' | 'sBTC'): Promise<number> => {
    if (isSimulation || !isDeployed) {
      return emergencyWithdrawSim(vaultId);
    }

    try {
      // emergencyWithdraw(uint256 vaultId) selector: 0xe1d49f05
      const data = '0xe1d49f05' + pad32Bytes(vaultId);
      const txHash = await runCeloContractTx(CELO_VAULTS_CONTRACT_ADDRESS, '0x0', data);

      addTransaction({
        type: 'emergency',
        vaultId,
        assetType,
        amount: 0,
        status: 'pending',
        network: 'Celo',
        txId: txHash,
      });

      await updateBalances();
      return 0;
    } catch (err) {
      console.error('Celo emergencyWithdraw failed:', err);
      throw err;
    }
  };

  const loadRealCeloVaults = async (address: string) => {
    if (!isDeployed) return;

    try {
      // (1) Get all user vaults: getUserVaults(address) selector: 0x7a3a936a
      const userVaultsData = '0x7a3a936a' + pad32Bytes(address);
      const userVaultsRes = await fetch('https://forno.celo.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 101,
          method: 'eth_call',
          params: [{ to: CELO_VAULTS_CONTRACT_ADDRESS, data: userVaultsData }, 'latest']
        })
      });

      const resJson = await userVaultsRes.json();
      if (!resJson?.result || resJson.result === '0x') return;

      const hex = resJson.result.replace('0x', '');
      if (hex.length < 128) return;

      const length = parseInt(hex.substring(64, 128), 16);
      const vaultIds: number[] = [];
      for (let i = 0; i < length; i++) {
        const start = 128 + i * 64;
        if (start + 64 <= hex.length) {
          vaultIds.push(parseInt(hex.substring(start, start + 64), 16));
        }
      }

      const loadedVaults = [];
      const nowTimestamp = Math.floor(Date.now() / 1000);

      // (2) Fetch data for each vault ID
      for (const id of vaultIds) {
        // getVault(uint256) selector: 0x1cd64df4
        const vaultCallData = '0x1cd64df4' + pad32Bytes(id);
        const vaultCallRes = await fetch('https://forno.celo.org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 102 + id,
            method: 'eth_call',
            params: [{ to: CELO_VAULTS_CONTRACT_ADDRESS, data: vaultCallData }, 'latest']
          })
        });

        const vJson = await vaultCallRes.json();
        if (!vJson?.result || vJson.result === '0x') continue;

        const vHex = vJson.result.replace('0x', '');
        if (vHex.length < 576) continue;

        const owner = '0x' + vHex.substring(24, 64);
        const onChainAmount = BigInt('0x' + vHex.substring(64, 128));
        const onChainShares = BigInt('0x' + vHex.substring(128, 192));
        const assetTypeVal = parseInt(vHex.substring(192, 256), 16); // 0 = CELO, 1 = cUSD
        const unlockAt = parseInt(vHex.substring(256, 320), 16);
        const createdAt = parseInt(vHex.substring(320, 384), 16);
        const lastRewardPerShare = BigInt('0x' + vHex.substring(384, 448)).toString();
        const claimableRewardsWei = BigInt('0x' + vHex.substring(448, 512));
        const active = parseInt(vHex.substring(512, 576), 16) !== 0;

        if (!active) continue;

        // Fetch actual pending rewards: getPendingRewards(uint256) selector: 0x7f75a6c3
        let onChainPendingRewards = claimableRewardsWei;
        try {
          const prCallData = '0x7f75a6c3' + pad32Bytes(id);
          const prCallRes = await fetch('https://forno.celo.org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 200 + id,
              method: 'eth_call',
              params: [{ to: CELO_VAULTS_CONTRACT_ADDRESS, data: prCallData }, 'latest']
            })
          });
          const prJson = await prCallRes.json();
          if (prJson?.result && prJson.result !== '0x') {
            onChainPendingRewards = BigInt(prJson.result);
          }
        } catch (e) {
          console.error(`Failed to load pending rewards for Celo vault ${id}:`, e);
        }

        const isSTX = assetTypeVal === 0;
        const scaleDiv = isSTX ? BigInt(1e12) : BigInt(1e10);

        const amount = Number(onChainAmount / scaleDiv);
        const shares = Number(onChainShares / scaleDiv);
        const claimableRewards = Number(onChainPendingRewards / scaleDiv);

        // Map block timestamps to simulated Stacks block numbers
        const elapsed = nowTimestamp - createdAt;
        const duration = unlockAt - createdAt;
        const createdAtBlock = currentBlockHeight - Math.floor(elapsed / TIMESTAMP_SCALE_FACTOR);
        const unlockAtBlock = createdAtBlock + Math.floor(duration / TIMESTAMP_SCALE_FACTOR);

        loadedVaults.push({
          id,
          owner,
          amount,
          shares,
          assetType: isSTX ? ('STX' as const) : ('sBTC' as const),
          createdAt: createdAtBlock,
          unlockAt: unlockAtBlock,
          lastRewardPerShare,
          claimableRewards,
          active,
          network: 'Celo' as const,
        });
      }

      setVaults(loadedVaults);
    } catch (err) {
      console.error('Failed to load Celo vaults from contract:', err);
    }
  };

  const loadCeloGlobalStats = async () => {
    if (!isDeployed) return;

    try {
      // getContractStats() selector: 0x7383792a
      const statsCallRes = await fetch('https://forno.celo.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 110,
          method: 'eth_call',
          params: [{ to: CELO_VAULTS_CONTRACT_ADDRESS, data: '0x7383792a' }, 'latest']
        })
      });

      const resJson = await statsCallRes.json();
      if (!resJson?.result || resJson.result === '0x') return;

      const hex = resJson.result.replace('0x', '');
      if (hex.length < 320) return;

      const totalLockedCelo = BigInt('0x' + hex.substring(0, 64));
      const totalLockedCusd = BigInt('0x' + hex.substring(64, 128));
      const totalSharesCelo = BigInt('0x' + hex.substring(128, 192));
      const totalSharesCusd = BigInt('0x' + hex.substring(192, 256));
      const vaultCounter = parseInt(hex.substring(256, 320), 16);

      setGlobalStats({
        totalLockedSTX: Number(totalLockedCelo / BigInt(1e12)),
        totalLockedSBTC: Number(totalLockedCusd / BigInt(1e10)),
        totalSharesSTX: Number(totalSharesCelo / BigInt(1e12)),
        totalSharesSBTC: Number(totalSharesCusd / BigInt(1e10)),
        vaultCounter,
      });
    } catch (err) {
      console.error('Failed to load Celo global stats:', err);
    }
  };

  return {
    wallet,
    connectCelo: handleConnectCelo,
    discoverProviders,
    createCeloVault,
    updateBalances,
    increaseCeloDeposit,
    extendCeloLock,
    claimCeloRewards,
    withdrawCelo,
    emergencyWithdrawCelo,
    loadRealCeloVaults,
    loadCeloGlobalStats,
  };
}

