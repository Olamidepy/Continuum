'use client';

import { useContinuumStore } from '../lib/store';

export function useCelo() {
  const {
    wallet,
    vaults,
    connectWallet,
    setVaults,
    addTransaction
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

  const handleConnectCelo = async () => {
    if (typeof window === 'undefined') return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error('No injected wallet found. Please install MiniPay or a compatible wallet.');
    }

    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }
    const address = accounts[0];
    const { celoBal, cusdBal } = await fetchBalances(address);

    const providerName = ethereum.isMiniPay ? 'MiniPay' : 'Celo';
    connectWallet(address, providerName, 0, 0, celoBal, cusdBal);
  };

  const updateBalances = async () => {
    if (!wallet.address) return;
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
    if (!ethereum) throw new Error('No injected wallet found');

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
    createCeloVault,
    updateBalances,
  };
}
