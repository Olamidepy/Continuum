'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Coins, 
  Lock, 
  Unlock, 
  Calendar, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  AlertTriangle, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { useContinuumStore } from '../lib/store';
import { useStacks } from '../hooks/useStacks';
import { 
  formatSTX, 
  formatSBTC, 
  formatBlockCountdown, 
  blocksToDurationLabel,
  formatNumber 
} from '../utils/format';
import { Vault } from '../types';

type Step = 1 | 2 | 3 | 4 | 5; // 1: Select, 2: Amount, 3: Review, 4: Processing/Confirm, 5: Success/Error

export default function WithdrawModal() {
  const { 
    currentBlockHeight, 
    vaults, 
    wallet, 
    isSimulation, 
    addToast, 
    removeToast,
    isWithdrawOpen,
    setWithdrawOpen,
    selectedWithdrawVault,
    setSelectedWithdrawVault
  } = useContinuumStore();
  
  const { withdraw, emergencyWithdraw } = useStacks();

  const [step, setStep] = useState<Step>(1);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalPayout, setFinalPayout] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset modal state on close/open
  useEffect(() => {
    if (isWithdrawOpen) {
      if (selectedWithdrawVault) {
        setSelectedVault(selectedWithdrawVault);
        const amountVal = selectedWithdrawVault.assetType === 'STX' 
          ? selectedWithdrawVault.amount / 1_000_000 
          : selectedWithdrawVault.amount / 100_000_000;
        setWithdrawAmount(String(amountVal));
        setStep(2); // Jump directly to Step 2 if vault is already selected
      } else {
        setStep(1);
        setSelectedVault(null);
        setWithdrawAmount('');
      }
      setFinalPayout(0);
      setErrorMessage('');
    }
  }, [isWithdrawOpen, selectedWithdrawVault]);

  const handleClose = () => {
    setSelectedWithdrawVault(null);
    setWithdrawOpen(false);
  };

  const activeVaults = vaults.filter(
    (v) => v.active && (v.owner === wallet.address || isSimulation)
  );

  const handleSelectVault = (vault: Vault) => {
    setSelectedVault(vault);
    const amountVal = vault.assetType === 'STX' ? vault.amount / 1_000_000 : vault.amount / 100_000_000;
    setWithdrawAmount(String(amountVal));
    setStep(2);
  };

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVault) return;

    const parsedAmount = Number(withdrawAmount);
    const maxAmount = selectedVault.assetType === 'STX' ? selectedVault.amount / 1_000_000 : selectedVault.amount / 100_000_000;

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      addToast('error', 'Please enter a valid positive amount.');
      return;
    }

    if (parsedAmount > maxAmount) {
      addToast('error', `Amount cannot exceed the vault balance of ${maxAmount} ${selectedVault.assetType}.`);
      return;
    }

    setStep(3);
  };

  const handleConfirmWithdrawal = async () => {
    if (!selectedVault) return;
    setIsSubmitting(true);
    setStep(4);
    const toastId = addToast('loading', 'Initiating withdrawal transaction...');

    const isMatured = currentBlockHeight >= selectedVault.unlockAt;
    const assetType = selectedVault.assetType;

    try {
      let payout = 0;
      if (isMatured) {
        payout = await withdraw(selectedVault.id, assetType);
      } else {
        payout = await emergencyWithdraw(selectedVault.id, assetType);
      }

      removeToast(toastId);
      addToast('success', 'Withdrawal transaction executed successfully!');
      
      // Calculate display payout: for simulation we get the actual returned value, 
      // for live mode we calculate the expected payout (since it returns 0 pending block confirmation)
      if (payout > 0) {
        setFinalPayout(payout);
      } else {
        if (isMatured) {
          setFinalPayout(selectedVault.amount + selectedVault.claimableRewards);
        } else {
          const penalty = Math.floor(selectedVault.amount * 0.1);
          setFinalPayout(selectedVault.amount - penalty + selectedVault.claimableRewards);
        }
      }
      setStep(5);
    } catch (err) {
      removeToast(toastId);
      addToast('error', 'Withdrawal transaction failed.');
      setErrorMessage(err instanceof Error ? err.message : 'Transaction signing was cancelled or failed.');
      setStep(5); // Show error inside step 5 using errorMessage state
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI helpers
  const isMatured = selectedVault ? currentBlockHeight >= selectedVault.unlockAt : false;
  const asset = selectedVault?.assetType || 'STX';
  const decimals = asset === 'STX' ? 1_000_000 : 100_000_000;
  
  // Math for locked vaults
  const penaltyPct = 10;
  const penaltyAmount = selectedVault ? Math.floor(selectedVault.amount * 0.1) : 0;
  const refundAmount = selectedVault ? selectedVault.amount - penaltyAmount : 0;
  const claimable = selectedVault?.claimableRewards || 0;
  const estPayout = selectedVault ? (isMatured ? selectedVault.amount + claimable : refundAmount + claimable) : 0;

  // Animation variants
  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.25, ease: 'easeIn' } }
  };

  return (
    <AnimatePresence>
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step < 4 ? handleClose : undefined} // Prevent clicking backdrop during confirmation
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className={`relative w-full max-w-lg overflow-hidden glass-modal z-10 p-7 md:p-8 flex flex-col justify-between ${
              step === 3 && !isMatured ? 'border-red-500/30 shadow-[0_20px_50px_rgba(239,68,68,0.1)]' : ''
            }`}
          >
            {/* Header */}
            {step < 4 && (
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  {step > 1 && (
                    <button
                      onClick={() => setStep((prev) => (prev - 1) as Step)}
                      className="p-1.5 rounded-lg bg-[#121212] border border-white/5 text-[#A0A0A0] hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight font-heading">
                      {step === 1 && 'Select Savings Vault'}
                      {step === 2 && 'Enter Withdrawal Amount'}
                      {step === 3 && (isMatured ? 'Review Withdrawal' : 'Early Exit Warning')}
                    </h3>
                    <p className="text-[10px] text-[#A0A0A0] mt-0.5 font-mono">
                      Step {step} of 3
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl bg-[#121212] border border-white/5 text-[#A0A0A0] hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto max-h-[420px] pr-1">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: Select Vault */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-4"
                  >
                    <p className="text-xs text-[#A0A0A0] leading-relaxed">
                      Choose which active vault you would like to withdraw funds from. Locked vaults will trigger early withdrawal penalties.
                    </p>

                    {activeVaults.length > 0 ? (
                      <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-1">
                        {activeVaults.map((vault) => {
                          const vaultMatured = currentBlockHeight >= vault.unlockAt;
                          const vaultAmount = vault.assetType === 'STX' ? formatSTX(vault.amount) : formatSBTC(vault.amount);
                          
                          return (
                            <div
                              key={vault.id}
                              onClick={() => handleSelectVault(vault)}
                              className="p-4 rounded-2xl bg-[#121212] border border-white/5 hover:border-[#F5B400]/30 hover:bg-[#181818] transition-all cursor-pointer flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                  vault.assetType === 'STX' 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-[#F5B400]' 
                                    : 'bg-white/5 border-white/10 text-white'
                                }`}>
                                  <Coins className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                  <span className="text-[10px] text-[#A0A0A0] block font-mono">Vault #{String(vault.id).padStart(2, '0')}</span>
                                  <span className="text-sm font-bold text-white tracking-tight">{vaultAmount} {vault.assetType}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  vaultMatured 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                    : 'bg-amber-500/5 border-amber-500/20 text-[#FFD54A]'
                                }`}>
                                  {vaultMatured ? 'Matured' : 'Locked'}
                                </span>
                                <span className="text-[9px] text-[#A0A0A0] block mt-1.5 font-mono">
                                  Unlock: #{vault.unlockAt}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-2xl border border-white/5 bg-[#121212]/40 mt-4">
                        <Lock className="w-8 h-8 text-[#666] mx-auto mb-2.5" />
                        <h4 className="text-xs font-bold text-white font-heading">No Active Vaults Found</h4>
                        <p className="text-[10px] text-[#A0A0A0] max-w-[240px] mx-auto mt-1">
                          You do not have any active commitment vaults. Deposit funds first to create a vault.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: Enter Amount */}
                {step === 2 && selectedVault && (
                  <motion.div
                    key="step-2"
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-5"
                  >
                    <p className="text-xs text-[#A0A0A0] leading-relaxed">
                      Enter the amount of locked assets you would like to withdraw from Vault #{selectedVault.id}.
                    </p>

                    <form onSubmit={handleAmountSubmit} className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider">
                            Withdrawal Amount
                          </label>
                          <span className="text-[10px] text-[#A0A0A0] font-mono">
                            Available Balance: {selectedVault.assetType === 'STX' ? formatSTX(selectedVault.amount) : formatSBTC(selectedVault.amount)} {selectedVault.assetType}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            required
                            className="w-full bg-[#121212] border border-white/8 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#F5B400]/40 transition-colors pr-16"
                          />
                          <button
                            type="button"
                            onClick={() => setWithdrawAmount(String(selectedVault.assetType === 'STX' ? selectedVault.amount / 1_000_000 : selectedVault.amount / 100_000_000))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#F5B400] hover:underline cursor-pointer"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      {/* Full liquidation warning */}
                      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-[#F5B400] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[#A0A0A0] leading-relaxed">
                          <span className="text-white font-semibold">Important Contract Rule:</span> Stacks smart contracts enforce full vault liquidation on withdrawal. Withdrawing less than MAX will still require closing this vault and withdrawing all funds.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setStep(selectedWithdrawVault ? 1 : 1)} // If preselected, go back to step 1 which allows choosing other vaults
                          className="flex-1 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-[#A0A0A0] hover:text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-xs font-bold transition-all cursor-pointer shadow-[0_4px_12px_rgba(245,180,0,0.15)]"
                        >
                          Continue
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* STEP 3: Review / Warn */}
                {step === 3 && selectedVault && (
                  <motion.div
                    key="step-3"
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-5 text-left"
                  >
                    {isMatured ? (
                      /* Normal matured withdrawal review */
                      <div className="space-y-4">
                        <p className="text-xs text-[#A0A0A0]">
                          Your lock period has matured. You are eligible to withdraw 100% of your deposits and rewards without penalty fees.
                        </p>
                        
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 font-mono text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[#A0A0A0]">Available Balance:</span>
                            <span className="text-white font-semibold">{selectedVault.assetType === 'STX' ? formatSTX(selectedVault.amount) : formatSBTC(selectedVault.amount)} {asset}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#A0A0A0]">Withdrawal Amount:</span>
                            <span className="text-white font-semibold">{withdrawAmount} {asset}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-white/5 pt-3 text-[#A0A0A0]">
                            <span>Network Fee:</span>
                            <span className="text-white">0.05 STX</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-[#F5B400]/20 pt-3 text-sm font-bold text-white">
                            <span>Receive Amount:</span>
                            <span className="text-[#F5B400]">
                              {selectedVault.assetType === 'STX' 
                                ? formatSTX(selectedVault.amount + selectedVault.claimableRewards) 
                                : formatSBTC(selectedVault.amount + selectedVault.claimableRewards)
                              } {asset}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex gap-2.5 items-center">
                          <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-heading">No Penalty Applied</span>
                        </div>
                      </div>
                    ) : (
                      /* Early withdrawal warning flow */
                      <div className="space-y-4">
                        <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 flex gap-2.5 items-start">
                          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                          <div className="text-left">
                            <span className="text-xs font-bold text-white block font-heading">Early Exit Warning!</span>
                            <p className="text-[10px] text-[#A0A0A0] mt-0.5 leading-relaxed">
                              This vault is locked. Exiting early incurs an immutable penalty. Confirm details below.
                            </p>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 font-mono text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[#A0A0A0]">Remaining Lock:</span>
                            <span className="text-white font-semibold">{formatBlockCountdown(selectedVault.unlockAt, currentBlockHeight)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#A0A0A0]">Unlock Date Target:</span>
                            <span className="text-white font-semibold">Block #{selectedVault.unlockAt}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-white/5 pt-3 text-red-400">
                            <span className="font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Penalty Rate (%):
                            </span>
                            <span className="font-bold">{penaltyPct}%</span>
                          </div>
                          <div className="flex justify-between items-center text-red-400">
                            <span className="font-semibold">Penalty Amount:</span>
                            <span className="font-bold">
                              -{selectedVault.assetType === 'STX' ? formatSTX(penaltyAmount) : formatSBTC(penaltyAmount)} {asset}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400 border-t border-white/5 pt-3">
                            <span>Accrued Yield:</span>
                            <span className="font-semibold">
                              +{selectedVault.assetType === 'STX' ? formatSTX(selectedVault.claimableRewards) : formatSBTC(selectedVault.claimableRewards)} {asset}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-t border-[#F5B400]/20 pt-3 text-sm font-bold text-white">
                            <span>Final Receive Estimate:</span>
                            <span className="text-[#F5B400]">
                              {selectedVault.assetType === 'STX' ? formatSTX(refundAmount + claimable) : formatSBTC(refundAmount + claimable)} {asset}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 flex gap-3 items-start">
                          <Sparkles className="w-4 h-4 text-[#F5B400] shrink-0 mt-0.5" />
                          <p className="text-[9px] text-[#A0A0A0] leading-relaxed">
                            <span className="text-white font-medium">Yield Redistribution:</span> Of this penalty, 80% is redistributed directly back to remaining active Continuum savers, and 20% is routed to the treasury reserve.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex-1 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-[#A0A0A0] hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmWithdrawal}
                        className={`flex-1 py-3.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer ${
                          isMatured 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:opacity-90'
                            : 'bg-red-600 hover:bg-red-500 shadow-[0_4px_12px_rgba(220,38,38,0.2)]'
                        }`}
                      >
                        {isMatured ? 'Confirm Unlock' : 'Withdraw Anyway'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Processing / Loading */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#181818] border border-white/5 flex items-center justify-center shadow-lg relative">
                      <Loader2 className="w-8 h-8 text-[#F5B400] animate-spin" />
                      <div className="absolute inset-0 rounded-full border border-[#F5B400]/20 animate-ping pointer-events-none" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading">Broadcasting Transaction</h4>
                      <p className="text-xs text-[#A0A0A0] mt-1.5 max-w-[280px] leading-relaxed mx-auto">
                        {isSimulation 
                          ? 'Processing simulation actions on the local state store...' 
                          : 'Please confirm and sign the transaction in your Stacks wallet extension.'
                        }
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Success / Error */}
                {step === 5 && selectedVault && (
                  <motion.div
                    key="step-5"
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="py-6 flex flex-col items-center justify-center text-center"
                  >
                    {errorMessage ? (
                      /* Failure Case */
                      <div className="space-y-4">
                        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                          <AlertCircle className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white font-heading">Withdrawal Failed</h4>
                          <p className="text-xs text-red-400 mt-2 max-w-[320px] leading-relaxed mx-auto font-mono text-[10px] bg-red-950/15 border border-red-900/10 p-3 rounded-xl text-left overflow-x-auto">
                            {errorMessage}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="px-6 py-2.5 rounded-xl bg-[#121212] border border-white/5 hover:border-white/10 text-white text-xs font-bold transition-all cursor-pointer mx-auto"
                        >
                          Retry Review
                        </button>
                      </div>
                    ) : (
                      /* Success Case */
                      <div className="space-y-5">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white font-heading">Withdrawal Initiated!</h4>
                          <p className="text-xs text-[#A0A0A0] mt-1.5 max-w-[280px] leading-relaxed mx-auto">
                            The funds are being released back to your wallet. The vault has been closed successfully.
                          </p>
                        </div>

                        {/* Payout Breakdown Card */}
                        <div className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl font-mono text-xs text-left max-w-sm mx-auto space-y-2">
                          <div className="flex justify-between">
                            <span className="text-[#A0A0A0]">Closed Vault:</span>
                            <span className="text-white font-semibold">Vault #{selectedVault.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A0A0A0]">Withdrawn Asset:</span>
                            <span className="text-white font-semibold uppercase">{asset}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-2 text-emerald-400 font-semibold">
                            <span>Amount Transferred:</span>
                            <span>
                              {asset === 'STX' ? formatSTX(finalPayout) : formatSBTC(finalPayout)} {asset}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleClose}
                          className="w-full max-w-xs py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-bold transition-all cursor-pointer mx-auto block shadow-md hover:opacity-95"
                        >
                          Finish
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
