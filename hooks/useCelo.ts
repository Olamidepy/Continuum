'use client';

import { useContinuumStore } from '../lib/store';

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

export function useCelo() {
  const {
    wallet,
    vaults,
    connectWallet,
    setVaults,
    addTransaction,
    isSimulation
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

  /**
   * Discover all available EVM wallet providers using EIP-6963 and legacy fallbacks.
   * Returns an array of { name, provider } objects.
   */
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

    // Check legacy providers array (MetaMask multi-provider)
    const ethereum = (window as any).ethereum;
    if (ethereum?.providers && Array.isArray(ethereum.providers)) {
      for (const p of ethereum.providers) {
        if (p && !seen.has(p)) {
          seen.add(p);
          const name = p.isMetaMask ? 'MetaMask' 
            : p.isRabby ? 'Rabby' 
            : p.isZerion ? 'Zerion'
            : p.isCoinbaseWallet ? 'Coinbase'
            : 'EVM Wallet';
          found.push({ name, provider: p });
        }
      }
    }

    // Fallback: use window.ethereum directly if nothing else found
    if (found.length === 0 && ethereum) {
      const name = ethereum.isMiniPay ? 'MiniPay'
        : ethereum.isMetaMask ? 'MetaMask' 
        : ethereum.isRabby ? 'Rabby' 
        : ethereum.isZerion ? 'Zerion'
        : 'Browser Wallet';
      found.push({ name, provider: ethereum });
    }

    return found;
  };

  /**
   * Connect to Celo using a specific EVM provider.
   * If no provider is given, uses the first discovered provider.
   */
  const handleConnectCelo = async (selectedProvider?: any) => {
    if (typeof window === 'undefined') return;

    const providers = discoverProviders();
    if (providers.length === 0) {
      throw new Error('No injected wallet found. Please install MetaMask, Rabby, or a compatible wallet extension.');
    }

    const provider = selectedProvider || providers[0].provider;

    try {
      // Request accounts first to trigger the wallet authentication popup immediately
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }
      const address = accounts[0];

      // Try to switch to Celo Mainnet (chain ID 42220 / 0xa4ec)
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

      const providerName = provider.isMiniPay ? 'MiniPay' : 'Celo';
      connectWallet(address, providerName, 0, 0, celoBal, cusdBal);
    } catch (err: any) {
      console.error('Ethereum request failed:', err);
      // Propagate the error so the UI modal can handle it correctly
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('cancelled')) {
        throw new Error('cancelled');
      }
      throw err;
    }
  };

  const updateBalances = async () => {
    if (!wallet.address) return;
    // Don't update live balances if connected to simulated address
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

  const createCeloVault = async (amountRaw: number, durationBlocks: number, assetType: 'STX' | 'sBTC') => {
    if (typeof window === 'undefined' || !wallet.address) return null;
    const ethereum = (window as any).ethereum;

    if (isSimulation) {
      // Add simulated tx log
      addTransaction({
        type: 'create',
        vaultId: vaults.length + 1,
        assetType,
        amount: amountRaw,
        status: 'success',
      });

      // Add vault card to UI locally
      const newVault = {
        id: vaults.length + 1,
        owner: wallet.address,
        amount: amountRaw,
        shares: amountRaw * (durationBlocks === 52560 ? 2 : durationBlocks === 25920 ? 1.5 : durationBlocks === 12960 ? 1.2 : 1),
        assetType,
        createdAt: 100000,
        unlockAt: 100000 + durationBlocks,
        lastRewardPerShare: '0',
        claimableRewards: 0,
        active: true
      };
      setVaults([...vaults, newVault]);

      // Deduct mock balance
      const currentCelo = wallet.celoBalance || 0;
      const currentCusd = wallet.cusdBalance || 0;
      const amountFloat = assetType === 'STX' ? amountRaw / 1e6 : amountRaw / 1e8;
      
      connectWallet(
        wallet.address,
        wallet.walletProvider || 'Celo',
        0,
        0,
        assetType === 'STX' ? Math.max(0, currentCelo - amountFloat) : currentCelo,
        assetType === 'sBTC' ? Math.max(0, currentCusd - amountFloat) : currentCusd
      );

      return vaults.length + 1;
    }

    if (!ethereum) {
      throw new Error('No compatible wallet found for Celo transactions.');
    }

    const providerName = wallet.walletProvider || 'Celo';
    
    // Amount conversion for sending tx:
    // STX internal maps to CELO (18 decimals, so multiply micro-amount by 1e12 to get wei)
    // sBTC internal maps to cUSD (18 decimals, so multiply micro-amount by 1e10 to get wei)
    const weiAmount = assetType === 'STX' 
      ? BigInt(amountRaw) * BigInt(1e12) 
      : BigInt(amountRaw) * BigInt(1e10);

    let txHash = '';
    try {
      if (assetType === 'STX') {
        // Native CELO transfer
        const txParams = {
          from: wallet.address,
          to: wallet.address, // self-transfer
          value: '0x' + weiAmount.toString(16),
        };
        txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams]
        });
      } else {
        // cUSD ERC20 transfer (contract: 0x765de816845861e75a25fca122bb6898b8b1282a)
        const paddedTo = wallet.address.replace('0x', '').padStart(64, '0');
        const paddedValue = weiAmount.toString(16).padStart(64, '0');
        const data = '0xa9059cbb' + paddedTo + paddedValue; // transfer(address,uint256)

        const txParams = {
          from: wallet.address,
          to: '0x765de816845861e75a25fca122bb6898b8b1282a',
          data: data,
        };
        txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams]
        });
      }

      // Add pending tx log
      addTransaction({
        type: 'create',
        vaultId: vaults.length + 1,
        assetType,
        amount: amountRaw,
        status: 'success',
      });

      // Add vault card to UI locally
      const newVault = {
        id: vaults.length + 1,
        owner: wallet.address,
        amount: amountRaw,
        shares: amountRaw * (durationBlocks === 52560 ? 2 : durationBlocks === 25920 ? 1.5 : durationBlocks === 12960 ? 1.2 : 1),
        assetType,
        createdAt: 100000,
        unlockAt: 100000 + durationBlocks,
        lastRewardPerShare: '0',
        claimableRewards: 0,
        active: true
      };
      setVaults([...vaults, newVault]);

      // Refresh balance after transaction
      await updateBalances();

      return vaults.length + 1;
    } catch (err) {
      console.error('Celo/MiniPay transaction failed:', err);
      throw err;
    }
  };

  return {
    wallet,
    connectCelo: handleConnectCelo,
    discoverProviders,
    createCeloVault,
    updateBalances,
  };
}
