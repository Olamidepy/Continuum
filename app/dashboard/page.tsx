'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Wallet, 
  Coins, 
  Lock, 
  TrendingUp, 
  Clock, 
  Plus, 
  Compass, 
  Calendar, 
  History,
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { useContinuumStore } from '../../lib/store';
import { useStacks } from '../../hooks/useStacks';
import { 
  formatAddress, 
  formatSTX, 
  formatSBTC, 
  formatNumber 
} from '../../utils/format';
import VaultCard from '../../components/VaultCard';
import WalletModal from '../../components/WalletModal';

// Recharts dynamically imported to prevent SSR hydration warnings
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Deterministic User ID Generator
const getUserId = (address: string | null) => {
  if (!address) return '12455665'; // default mock ID
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 90000000 + 10000000).toString();
};

// Gender Neutral SVG Avatar Component
function GenderNeutralAvatar({ seed }: { seed: string }) {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % 4;
  
  const avatars = [
    // Visor Bot
    <svg viewBox="0 0 100 100" className="w-full h-full fill-none text-[#F5B400]" key="bot">
      <rect width="100" height="100" fill="#181818" />
      <circle cx="50" cy="50" r="28" fill="#222" stroke="currentColor" strokeWidth="2" />
      <path d="M30 46h40v8H30z" fill="currentColor" />
      <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1" strokeDasharray="4,4" />
    </svg>,
    // Miniature Phone GIF Avatar
    <div className="w-full h-full bg-[#181818] flex items-center justify-center p-1" key="liphon">
      <img src="/liphon17-6.gif" alt="Phone Visor" className="w-full h-full object-contain rounded-[8px]" />
    </div>,
    // Pixel Core
    <svg viewBox="0 0 100 100" className="w-full h-full fill-none text-blue-400" key="pixel">
      <rect width="100" height="100" fill="#181818" />
      <rect x="26" y="26" width="48" height="48" rx="8" fill="#222" stroke="currentColor" strokeWidth="2" />
      <line x1="38" y1="46" x2="62" y2="46" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="38" cy="58" r="3" fill="currentColor" />
      <circle cx="62" cy="58" r="3" fill="currentColor" />
    </svg>,
    // Cyber Crown
    <svg viewBox="0 0 100 100" className="w-full h-full fill-none text-purple-400" key="crown">
      <rect width="100" height="100" fill="#181818" />
      <path d="M50 20 L75 40 L65 75 L35 75 L25 40 Z" fill="#222" stroke="currentColor" strokeWidth="2" />
      <path d="M38 52 C38 52 45 60 50 60 C55 60 62 52 62 52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="38" r="5" fill="currentColor" />
    </svg>
  ];
  
  return avatars[index];
}

export default function Dashboard() {
  const { 
    currentBlockHeight, 
    vaults, 
    transactions, 
    globalStats, 
    isSimulation,
    toggleSimulation,
    advanceBlocks,
    simulateExternalActivity
  } = useContinuumStore();

  const { wallet, createVault, disconnectWallet } = useStacks();

  const router = useRouter();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [assetType, setAssetType] = useState<'STX' | 'sBTC'>('STX');
  const [lockAmount, setLockAmount] = useState('');
  const [lockDuration, setLockDuration] = useState('12960'); // Default 90 days
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevConnected = useRef(false);

  // Fire confetti when wallet transitions from disconnected -> connected
  useEffect(() => {
    if (wallet.connected && !prevConnected.current) {
      setShowCelebration(true);
      // Burst confetti in brand yellow + white
      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...opts,
          origin: { y: 0.6 },
          colors: ['#F5B400', '#FFD54A', '#ffffff', '#fffbe6'],
          particleCount: Math.floor(200 * particleRatio),
        });
      };
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2,  { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1,  { spread: 120, startVelocity: 45 });
      setTimeout(() => setShowCelebration(false), 4000);
    }
    prevConnected.current = wallet.connected;
  }, [wallet.connected]);

  const handleBack = () => {
    router.push('/');
  };

  useEffect(() => {
    setIsMounted(true);
    
    // Periodically simulate external activity in background to add rewards
    const interval = setInterval(() => {
      if (isSimulation) {
        simulateExternalActivity();
      }
    }, 12000); // every 12 seconds
    
    return () => clearInterval(interval);
  }, [isSimulation, simulateExternalActivity]);

  if (!isMounted) return null;

  // Calculate user specific sums
  const userVaults = vaults.filter(v => v.active && (v.owner === wallet.address || isSimulation));
  
  const totalLockedSTX = userVaults
    .filter(v => v.assetType === 'STX')
    .reduce((sum, v) => sum + v.amount, 0);

  const totalLockedSBTC = userVaults
    .filter(v => v.assetType === 'sBTC')
    .reduce((sum, v) => sum + v.amount, 0);

  const totalSharesSTX = userVaults
    .filter(v => v.assetType === 'STX')
    .reduce((sum, v) => sum + v.shares, 0);

  const totalSharesSBTC = userVaults
    .filter(v => v.assetType === 'sBTC')
    .reduce((sum, v) => sum + v.shares, 0);

  const totalClaimableSTX = userVaults
    .filter(v => v.assetType === 'STX')
    .reduce((sum, v) => sum + v.claimableRewards, 0);

  const totalClaimableSBTC = userVaults
    .filter(v => v.assetType === 'sBTC')
    .reduce((sum, v) => sum + v.claimableRewards, 0);

  // Approximate dollar values (mock exchange rates: STX = $2, sBTC = $60,000)
  const stxToUsd = (microStx: number) => (microStx / 1_000_000) * 2;
  const sbtcToUsd = (sats: number) => (sats / 100_000_000) * 60_000;
  
  const totalLockedUSD = stxToUsd(totalLockedSTX) + sbtcToUsd(totalLockedSBTC);
  const totalClaimableUSD = stxToUsd(totalClaimableSTX) + sbtcToUsd(totalClaimableSBTC);

  // Graph Data simulation based on locked assets and accumulated rewards
  const chartData = [
    { block: '95k', stx: (totalLockedSTX / 1_000_000) * 0.4 },
    { block: '96k', stx: (totalLockedSTX / 1_000_000) * 0.6 },
    { block: '97k', stx: (totalLockedSTX / 1_000_000) * 0.75 },
    { block: '98k', stx: (totalLockedSTX / 1_000_000) * 0.9 },
    { block: '99k', stx: (totalLockedSTX / 1_000_000) + (totalClaimableSTX / 1_000_000) * 0.8 },
    { block: 'Current', stx: (totalLockedSTX / 1_000_000) + (totalClaimableSTX / 1_000_000) }
  ];

  // Duration Options Details
  const getMultiplierLabel = (duration: string) => {
    if (duration === '4320') return '1.0x Share';
    if (duration === '12960') return '1.2x Share';
    if (duration === '25920') return '1.5x Share';
    if (duration === '52560') return '2.0x Share';
    return '1.0x';
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockAmount || isSubmitting) return;
    setIsSubmitting(true);

    const amountRaw = Number(lockAmount) * (assetType === 'STX' ? 1_000_000 : 100_000_000);
    const duration = Number(lockDuration);

    const newId = await createVault(amountRaw, duration, assetType);
    setIsSubmitting(false);
    if (newId !== null) {
      setLockAmount('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative min-h-screen bg-[#090909] text-white flex flex-col justify-between overflow-x-hidden selection:bg-[#F5B400]/30"
    >
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#F5B400]/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 🎉 Wallet Connected Celebration Toast */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#111] border border-[#F5B400]/40 shadow-[0_8px_40px_rgba(245,180,0,0.3)] backdrop-blur-xl">
              <div className="text-2xl">🎉</div>
              <div>
                <p className="text-white font-bold text-sm tracking-tight">Wallet Connected!</p>
                <p className="text-[#F5B400] text-xs mt-0.5 font-mono">{wallet.address ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}` : ''}</p>
              </div>
              <div className="text-2xl">🎊</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header wrapper (no grid background) */}
      <div className="w-full border-b border-white/5 bg-[#090909]">
        <div className="max-w-7xl mx-auto px-6">
          <header className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-[#121212] border border-white/5 flex items-center justify-center text-[#A0A0A0] hover:text-white hover:border-white/10 transition-colors cursor-pointer shrink-0"
              title="Back to Homepage"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            {/* Deterministic Profile Card */}
            <div className="p-2 pr-5 rounded-[18px] bg-[#121212] border border-white/5 flex items-center gap-3.5 shadow-xl">
              <div className="w-11 h-11 rounded-[12px] overflow-hidden border border-white/10 bg-[#181818] shrink-0 flex items-center justify-center">
                <GenderNeutralAvatar seed={wallet.address || 'SP3FBR2AGK5H9QBDWX84EEFVT827VREQAHHHT2K4'} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white tracking-tight">
                    {wallet.address ? `Saver-${wallet.address.slice(2, 8)}` : 'Demo Saver'}
                  </span>
                  <span className="w-3.5 h-3.5 rounded-full bg-[#F5B400] text-black text-[8px] flex items-center justify-center font-extrabold select-none" title="Verified Saver">✓</span>
                </div>
                <p className="text-[9px] font-mono text-[#A0A0A0] mt-0.5">
                  ID: {getUserId(wallet.address)}
                </p>
                <div className="flex items-center gap-1 mt-0.5 text-[8px] text-emerald-400 font-bold">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Active Saver</span>
                  <span className="text-[#666] font-normal font-mono">({wallet.connected ? 'Connected' : 'Simulation'})</span>
                </div>
              </div>
            </div>

            {/* Title Text */}
            <div className="hidden lg:block border-l border-white/5 pl-4 text-left">
              <h1 className="text-sm font-bold tracking-tight text-white">
                Continuum Savings Vaults
              </h1>
              <p className="text-[10px] text-[#A0A0A0] mt-0.5">
                Establish commitment locks and manage non-custodial savings.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Simulation controls */}
            <div className="px-3.5 py-2 rounded-xl bg-[#121212] border border-white/5 flex items-center gap-3">
              <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider">Mode</span>
              <button 
                onClick={() => toggleSimulation(!isSimulation)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                  isSimulation 
                    ? 'bg-amber-500/10 border border-amber-500/20 text-[#F5B400]' 
                    : 'bg-white/5 border border-white/5 text-[#A0A0A0]'
                }`}
              >
                {isSimulation ? 'Simulation Mode' : 'Live Stacks'}
              </button>
            </div>

            {/* Block height controls */}
            <div className="px-3.5 py-2 rounded-xl bg-[#121212] border border-white/5 flex items-center gap-3">
              <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Block
              </span>
              <span className="font-mono text-xs text-white font-bold">{currentBlockHeight}</span>
              {isSimulation && (
                <button
                  onClick={() => advanceBlocks(1000)}
                  className="text-[9px] font-bold bg-[#181818] border border-white/10 hover:border-white/20 text-white px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Advance 1000 blocks to simulate time lock expiry"
                >
                  +1k Blocks
                </button>
              )}
            </div>

            {/* Wallet button */}
            {wallet.connected ? (
              <button
                onClick={disconnectWallet}
                className="px-4 py-2.5 rounded-xl bg-[#121212] border border-[#F5B400]/20 text-[#F5B400] text-xs font-bold hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                {formatAddress(wallet.address)}
              </button>
            ) : (
              <button
                onClick={() => setIsWalletOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-xs font-bold shadow-[0_4px_12px_rgba(245,180,0,0.15)] hover:opacity-90 transition-all cursor-pointer flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </header>
      </div>
    </div>

      {/* Rest of the dashboard page with grid background */}
      <div className="relative w-full flex-1 flex flex-col justify-between pb-12">
        {/* Background Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.15] z-0"
          style={{ 
            backgroundImage: 'url(/Background.webp)',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
          }}
        />

        <div className="max-w-7xl mx-auto px-6 w-full flex-1 relative z-10">

        {/* Global Warnings in live mode without wallet */}
        {!isSimulation && !wallet.connected && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-[#F5B400] shrink-0 mt-0.5" />
            <div className="text-left">
              <span className="text-xs font-bold text-white block">Connection Required</span>
              <p className="text-[11px] text-[#A0A0A0] mt-0.5 leading-relaxed">
                Connect your Stacks wallet (Leather or Xverse) to view your on-chain vaults and sign transactions. You can also switch to <span className="text-white font-medium">Simulation Mode</span> in the header to experiment instantly with mock balances.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          
          <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 flex flex-col justify-between min-h-[110px] relative overflow-hidden">
            <div className="absolute top-4 right-4 text-[#A0A0A0]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block">Total Locked Savings</span>
              <h2 className="text-2xl font-bold text-white mt-1.5">${formatNumber(totalLockedUSD, 2)}</h2>
            </div>
            <div className="flex gap-3 text-[10px] text-[#A0A0A0] mt-2 pt-2 border-t border-white/5">
              <span>{formatSTX(totalLockedSTX)} STX</span>
              <span>{formatSBTC(totalLockedSBTC)} sBTC</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 flex flex-col justify-between min-h-[110px] relative overflow-hidden">
            <div className="absolute top-4 right-4 text-[#A0A0A0]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block">Commitment Weight (Shares)</span>
              <h2 className="text-2xl font-bold text-[#F5B400] mt-1.5">
                {formatNumber((totalSharesSTX + totalSharesSBTC * 60_000) / 1_000_000, 0)} <span className="text-xs text-[#A0A0A0] font-normal">Shares</span>
              </h2>
            </div>
            <div className="flex gap-3 text-[10px] text-[#A0A0A0] mt-2 pt-2 border-t border-white/5">
              <span>{formatNumber(totalSharesSTX / 1_000_000, 0)} STX shares</span>
              <span>{formatNumber(totalSharesSBTC / 100_000_000, 4)} sBTC shares</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 flex flex-col justify-between min-h-[110px] relative overflow-hidden">
            <div className="absolute top-4 right-4 text-[#F5B400]">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block">Claimable Rewards (Earned)</span>
              <h2 className="text-2xl font-bold text-white mt-1.5">${formatNumber(totalClaimableUSD, 2)}</h2>
            </div>
            <div className="flex gap-3 text-[10px] text-[#A0A0A0] mt-2 pt-2 border-t border-white/5">
              <span className="text-emerald-400 font-mono">+{formatSTX(totalClaimableSTX)} STX</span>
              <span className="text-emerald-400 font-mono">+{formatSBTC(totalClaimableSBTC)} sBTC</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 flex flex-col justify-between min-h-[110px] relative overflow-hidden">
            <div className="absolute top-4 right-4 text-[#A0A0A0]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block">Active / Closed Locks</span>
              <h2 className="text-2xl font-bold text-white mt-1.5">
                {userVaults.length} <span className="text-xs text-[#A0A0A0] font-normal">Active</span>
              </h2>
            </div>
            <div className="text-[10px] text-[#A0A0A0] mt-2 pt-2 border-t border-white/5 flex justify-between">
              <span>Total historical: {vaults.length}</span>
              <span className="font-mono">Global vaults: {globalStats.vaultCounter}</span>
            </div>
          </div>

        </section>

        {/* Dashboard Analytics & Create Vault Form */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          
          {/* Chart Panel */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-[#121212] border border-white/5 flex flex-col justify-between min-h-[380px]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#F5B400]" /> Savings Accumulation Chart
              </h3>
              <p className="text-xs text-[#A0A0A0] mt-0.5">
                Reflects locked deposit growth alongside earned penalty-redistributed rewards.
              </p>
            </div>

            <div className="flex-1 w-full min-h-[220px] mt-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5B400" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#F5B400" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="block" stroke="#404040" fontSize={10} tickLine={false} />
                  <YAxis stroke="#404040" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#181818', 
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#FFF'
                    }} 
                  />
                  <Area type="monotone" dataKey="stx" stroke="#F5B400" strokeWidth={2} fillOpacity={1} fill="url(#colorStx)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Create Vault Form Card */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#121212] border border-white/5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#F5B400]" /> Lock Savings Capital
            </h3>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Secure STX or sBTC under non-custodial time commitment rules.
            </p>

            <form onSubmit={handleCreateVault} className="mt-5 space-y-4">
              
              {/* Asset type toggle */}
              <div>
                <label className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block mb-1.5">
                  Select Asset
                </label>
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setAssetType('STX')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      assetType === 'STX' 
                        ? 'bg-[#181818] text-[#F5B400] border border-white/5 shadow-md' 
                        : 'text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    Stacks (STX)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetType('sBTC')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      assetType === 'sBTC' 
                        ? 'bg-[#181818] text-white border border-white/5 shadow-md' 
                        : 'text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    Super BTC (sBTC)
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block mb-1.5">
                  Deposit Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={lockAmount}
                    onChange={(e) => setLockAmount(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5B400]/40 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A0A0A0]">
                    {assetType}
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-[#A0A0A0] mt-1.5 px-1 font-mono">
                  <span>Balance: {assetType === 'STX' ? formatSTX(wallet.stxBalance) : formatSBTC(wallet.sbtcBalance)}</span>
                  <span className="text-[#F5B400] cursor-pointer hover:underline" onClick={() => setLockAmount(String(assetType === 'STX' ? wallet.stxBalance / 1_000_000 : wallet.sbtcBalance / 100_000_000))}>Max</span>
                </div>
              </div>

              {/* Lock Duration selector */}
              <div>
                <label className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block mb-1.5">
                  Savings Duration Commitment
                </label>
                <select
                  value={lockDuration}
                  onChange={(e) => setLockDuration(e.target.value)}
                  className="w-full bg-[#181818] border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5B400]/40 transition-colors"
                >
                  <option value="4320">30 Days (1.0x Share multiplier)</option>
                  <option value="12960">90 Days (1.2x Share multiplier)</option>
                  <option value="25920">180 Days (1.5x Share multiplier)</option>
                  <option value="52560">365 Days (2.0x Share multiplier)</option>
                </select>
              </div>

              {/* Summary detail list */}
              <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 space-y-2 text-[10px] font-medium text-[#A0A0A0]">
                <div className="flex justify-between items-center">
                  <span>Calculated Shares Weight:</span>
                  <span className="text-white font-bold font-mono">
                    {lockAmount ? formatNumber((Number(lockAmount) * (lockDuration === '52560' ? 2 : lockDuration === '25920' ? 1.5 : lockDuration === '12960' ? 1.2 : 1)), 2) : '0.00'} Shares
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Lock Unlock Block Target:</span>
                  <span className="text-white font-semibold font-mono">
                    #{currentBlockHeight + Number(lockDuration)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Estimated Maturity Date:</span>
                  <span className="text-white font-semibold">
                    ~{Math.round(Number(lockDuration) / 144)} Days from now
                  </span>
                </div>
              </div>

              {/* Confirm submit */}
              <button
                type="submit"
                disabled={isSubmitting || !wallet.connected && !isSimulation}
                className={`w-full py-3.5 rounded-xl text-center text-xs font-bold tracking-wide transition-all ${
                  wallet.connected || isSimulation
                    ? 'bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black shadow-[0_4px_14px_rgba(245,180,0,0.15)] hover:opacity-95 cursor-pointer'
                    : 'bg-[#181818] border border-white/5 text-[#A0A0A0] cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Confirming Lock...' : 'Lock Savings Capital'}
              </button>
            </form>
          </div>

        </section>

        {/* Active Vaults Area */}
        <section className="mt-12 text-left">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#F5B400]" /> Active Savings Locks
              </h2>
              <p className="text-xs text-[#A0A0A0] mt-0.5">
                Vaults holding capital. Active multiplier weight dictates reward share allocations.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#A0A0A0]">{userVaults.length} vaults active</span>
          </div>

          {userVaults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userVaults.map((v) => (
                <VaultCard key={v.id} vault={v} />
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-[24px] border border-white/5 bg-[#121212]/30 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-[#121212] border border-white/10 flex items-center justify-center text-[#A0A0A0] mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-sm">No Active Commitment Locks</h3>
              <p className="text-xs text-[#A0A0A0] max-w-xs mt-1 leading-relaxed">
                Your portfolio is currently idle. Establish a lock on the form above to protect capital and accrue redistributed yields.
              </p>
            </div>
          )}
        </section>

        {/* Transaction History Logs */}
        <section className="mt-12 text-left">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <History className="w-4 h-4 text-[#F5B400]" /> Recent Activity Log
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#121212]">
            <table className="w-full text-xs text-left">
              <thead className="bg-black/20 text-[#A0A0A0] uppercase font-bold text-[9px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Action Type</th>
                  <th className="px-6 py-4">Vault ID</th>
                  <th className="px-6 py-4">Asset type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 font-mono">TX Hash</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#A0A0A0]">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.01]">
                      <td className="px-6 py-3.5 font-semibold text-white capitalize">{tx.type === 'create' ? 'Create Vault' : tx.type === 'emergency' ? 'Emergency Exit' : tx.type === 'deposit' ? 'Top Up' : tx.type}</td>
                      <td className="px-6 py-3.5 font-mono">#{String(tx.vaultId).padStart(2, '0')}</td>
                      <td className="px-6 py-3.5 uppercase">{tx.assetType}</td>
                      <td className="px-6 py-3.5 font-mono text-white">
                        {tx.amount === 0 ? '-' : tx.assetType === 'STX' ? `${formatSTX(tx.amount)} STX` : `${formatSBTC(tx.amount)} sBTC`}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[10px] text-[#A0A0A0]">{tx.txId ? formatAddress(tx.txId, 8) : '-'}</td>
                      <td className="px-6 py-3.5">{new Date(tx.timestamp).toLocaleTimeString()}</td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          tx.status === 'success' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/5 border-amber-500/20 text-[#FFD54A]'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-[#A0A0A0]">
                      No transaction operations registered yet. Lock capital or trigger withdraws to log history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>

      {/* Wallet Connection Modal */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </motion.div>
  );
}
