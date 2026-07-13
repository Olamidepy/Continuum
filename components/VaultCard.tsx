'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Unlock, 
  Coins, 
  Calendar, 
  TrendingUp, 
  ArrowUpRight, 
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Vault } from '../types';
import { 
  formatSTX, 
  formatSBTC, 
  formatBlockCountdown, 
  blocksToDurationLabel 
} from '../utils/format';
import { useStacks } from '../hooks/useStacks';
import { useContinuumStore } from '../lib/store';

interface VaultCardProps {
  vault: Vault;
}

export default function VaultCard({ vault }: VaultCardProps) {
  const { currentBlockHeight, setWithdrawOpen, setSelectedWithdrawVault } = useContinuumStore();
  const { increaseDeposit, extendLock, claimRewards } = useStacks();
  
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('12960'); // default 90 days
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMatured = currentBlockHeight >= vault.unlockAt;
  const progressPercent = Math.min(
    100, 
    Math.max(
      0, 
      ((currentBlockHeight - vault.createdAt) / (vault.unlockAt - vault.createdAt)) * 100
    )
  );

  const assetSymbol = vault.assetType;
  const formattedAmount = assetSymbol === 'STX' ? formatSTX(vault.amount) : formatSBTC(vault.amount);
  const formattedRewards = assetSymbol === 'STX' ? formatSTX(vault.claimableRewards) : formatSBTC(vault.claimableRewards);
  
  // 10% penalty calculations
  const penaltyAmount = Math.floor(vault.amount * 0.1);
  const formattedPenalty = assetSymbol === 'STX' ? formatSTX(penaltyAmount) : formatSBTC(penaltyAmount);
  const refundAmount = vault.amount - penaltyAmount;
  const formattedRefund = assetSymbol === 'STX' ? formatSTX(refundAmount) : formatSBTC(refundAmount);
  
  const multiplier = vault.shares / vault.amount;

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || isSubmitting) return;
    setIsSubmitting(true);
    const amountRaw = Number(depositAmount) * (assetSymbol === 'STX' ? 1_000_000 : 100_000_000);
    const success = await increaseDeposit(vault.id, amountRaw);
    setIsSubmitting(false);
    if (success) {
      setDepositAmount('');
      setIsDepositOpen(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const success = await extendLock(vault.id, Number(selectedDuration));
    setIsSubmitting(false);
    if (success) {
      setIsExtendOpen(false);
    }
  };

  const handleClaim = async () => {
    if (vault.claimableRewards <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    await claimRewards(vault.id, assetSymbol);
    setIsSubmitting(false);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden glass-card p-6 flex flex-col justify-between h-[360px] group transition-all duration-300 hover:border-[#F5B400]/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      >
        {/* Glow corner indicator */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none"></div>

        {/* Card Header */}
        <div className="z-10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center border ${
              vault.assetType === 'STX' 
                ? 'bg-amber-500/10 border-amber-500/20 text-[#F5B400]' 
                : 'bg-white/5 border-white/10 text-white'
            }`}>
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#A0A0A0] font-medium font-mono">Vault #{String(vault.id).padStart(2, '0')}</span>
                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">{assetSymbol} Lock</span>
              </div>
              <h4 className="text-2xl font-bold mt-1 text-white">{formattedAmount} <span className="text-xs text-[#A0A0A0] font-normal">{assetSymbol}</span></h4>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
              isMatured 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/5 border-amber-500/20 text-[#FFD54A]'
            } flex items-center gap-1`}>
              {isMatured ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isMatured ? 'Matured' : 'Locked'}
            </span>
            <div className="text-[10px] font-semibold font-mono text-[#A0A0A0] mt-1.5">
              Multiplier: {multiplier.toFixed(1)}x
            </div>
          </div>
        </div>

        {/* Middle Stats - Countdown & Rewards */}
        <div className="my-5 flex flex-col gap-3.5 z-10">
          {/* Progress Tracker */}
          <div className="w-full">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-[#A0A0A0] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#F5B400]" />
                Time lock progress
              </span>
              <span className="font-semibold text-white font-mono">{progressPercent.toFixed(0)}%</span>
            </div>
            
            <div className="w-full bg-[#121212] h-2 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-[#F5B400] to-[#FFD54A] h-full rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-medium text-[#A0A0A0] mt-1.5 font-mono">
              <span>Block: {vault.createdAt}</span>
              <span className="text-white font-semibold">
                {formatBlockCountdown(vault.unlockAt, currentBlockHeight)}
              </span>
              <span>Unlock: {vault.unlockAt}</span>
            </div>
          </div>

          {/* Reward Accrual display */}
          <div className="flex justify-between items-center p-3 rounded-xl bg-[#121212] border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-[26px] h-[26px] rounded bg-amber-500/10 flex items-center justify-center text-[#F5B400]">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-[#A0A0A0] block">Redistributed Rewards</span>
                <span className="text-sm font-bold text-white font-mono">{formattedRewards} {assetSymbol}</span>
              </div>
            </div>
            
            <button
              onClick={handleClaim}
              disabled={vault.claimableRewards <= 0 || isSubmitting}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                vault.claimableRewards > 0
                  ? 'bg-[#F5B400] border-[#F5B400] text-black hover:bg-[#FFD54A] cursor-pointer shadow-[0_4px_12px_rgba(245,180,0,0.15)]'
                  : 'bg-[#181818] border-white/5 text-[#A0A0A0] cursor-not-allowed'
              }`}
            >
              Claim
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 z-10 border-t border-white/5 pt-4">
          {isMatured ? (
            <button
              onClick={() => {
                setSelectedWithdrawVault(vault);
                setWithdrawOpen(true);
              }}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-center text-xs font-bold tracking-wide hover:opacity-90 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.15)] flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              Unlock Savings ({formattedAmount})
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsDepositOpen(true)}
                className="flex-1 py-2.5 rounded-xl bg-[#121212] border border-white/5 hover:border-white/10 hover:bg-[#181818] text-[#A0A0A0] hover:text-white text-center text-xs font-semibold tracking-wide transition-all cursor-pointer"
              >
                Top Up
              </button>
              
              <button
                onClick={() => setIsExtendOpen(true)}
                className="flex-1 py-2.5 rounded-xl bg-[#121212] border border-white/5 hover:border-white/10 hover:bg-[#181818] text-[#A0A0A0] hover:text-white text-center text-xs font-semibold tracking-wide transition-all cursor-pointer"
              >
                Extend Lock
              </button>

              <button
                onClick={() => {
                  setSelectedWithdrawVault(vault);
                  setWithdrawOpen(true);
                }}
                className="py-2.5 px-3.5 rounded-xl bg-red-950/20 border border-red-900/30 hover:border-red-500/30 text-red-400 hover:bg-red-900/30 text-center text-xs font-semibold transition-all cursor-pointer"
                title="Emergency Early Exit"
              >
                Exit Early
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* TOP UP MODAL */}
      <AnimatePresence>
        {isDepositOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDepositOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden glass-modal p-6 z-10"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#F5B400]" /> Increase Lock Deposit
              </h3>
              <p className="text-xs text-[#A0A0A0] mt-1">
                Add more {assetSymbol} to Vault #{vault.id}. Added amounts inherit the vault's original duration multiplier.
              </p>

              <form onSubmit={handleDepositSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block mb-1">
                    Amount ({assetSymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="e.g. 500"
                    required
                    className="w-full bg-[#121212] border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5B400]/40 transition-colors"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDepositOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#121212] border border-white/5 text-[#A0A0A0] hover:text-white text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-xs font-bold transition-all"
                  >
                    {isSubmitting ? 'Confirming...' : 'Add Deposit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EXTEND LOCK MODAL */}
      <AnimatePresence>
        {isExtendOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExtendOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden glass-modal p-6 z-10"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#F5B400]" /> Extend Lock Period
              </h3>
              <p className="text-xs text-[#A0A0A0] mt-1">
                Commit your assets for longer to increase your shares and penalty reward weight!
              </p>

              <form onSubmit={handleExtendSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider block mb-1">
                    Select New Lock Duration
                  </label>
                  <select
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="w-full bg-[#121212] border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5B400]/40 transition-colors"
                  >
                    <option value="4320">30 Days (1.0x share multiplier)</option>
                    <option value="12960">90 Days (1.2x share multiplier)</option>
                    <option value="25920">180 Days (1.5x share multiplier)</option>
                    <option value="52560">365 Days (2.0x share multiplier)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsExtendOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#121212] border border-white/5 text-[#A0A0A0] hover:text-white text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-xs font-bold transition-all"
                  >
                    {isSubmitting ? 'Extending...' : 'Extend Lock'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
