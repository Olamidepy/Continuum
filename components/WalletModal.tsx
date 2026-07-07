'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { useStacks } from '../hooks/useStacks';
import { useContinuumStore } from '../lib/store';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const storeConnectWallet = useContinuumStore((state) => state.connectWallet);
  const { connectWallet: stacksConnectWallet } = useStacks();

  const wallets = [
    {
      name: 'Leather',
      logo: (
        <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current text-white">
          <path d="M50 15L15 35v30l35 20 35-20V35L50 15zm0 10.5L74.5 40 50 54.5 25.5 40 50 25.5zM26 48.5l20.5 12v20.5L26 69V48.5zm48 20.5L53.5 81V60.5l20.5-12V69z" />
        </svg>
      ),
      description: 'Connect using Leather browser extension. Optimized for Stacks.',
      tag: 'Recommended'
    },
    {
      name: 'Xverse',
      logo: (
        <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current text-[#F5B400]">
          <path d="M50 10L10 30v40l40 20 40-20V30L50 10zm-6 26.5h12V48H44V36.5zm0 17h12V70H44V53.5z" />
        </svg>
      ),
      description: 'Connect using Xverse wallet. Popular for BTC and Stacks Layer 2.',
      tag: 'Popular'
    },
    {
      name: 'Asigna',
      logo: (
        <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current text-white">
          <rect x="20" y="20" width="60" height="60" rx="10" stroke="currentColor" strokeWidth="6" fill="none" />
          <path d="M35 50h30M50 35v30" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </svg>
      ),
      description: 'Multisig security for teams and high-net-worth vaults.',
      tag: 'Multisig'
    },
    {
      name: 'Fordefi',
      logo: (
        <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current text-[#A0A0A0]">
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="6" fill="none" />
          <polygon points="50,30 65,60 35,60" fill="currentColor" />
        </svg>
      ),
      description: 'Institutional-grade MPC wallet connection.',
      tag: 'Institutional'
    },
    {
      name: 'WalletConnect',
      logo: (
        <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current text-[#3b99fc]">
          <path d="M23.33 33.33c14.73-14.73 38.6-14.73 53.34 0l4.35 4.35c.78.78.78 2.05 0 2.83l-7.25 7.25c-.78.78-2.05.78-2.83 0l-4.35-4.35c-8.06-8.06-21.13-8.06-29.2 0l-4.66 4.66c-.78.78-2.05.78-2.83 0l-7.25-7.25c-.78-.78-.78-2.05 0-2.83l4.66-4.66zM7.39 50c23.54-23.54 61.68-23.54 85.22 0l4.35 4.35c.78.78.78 2.05 0 2.83l-7.25 7.25c-.78.78-2.05.78-2.83 0l-4.35-4.35c-16.88-16.88-44.25-16.88-61.13 0l-4.66 4.66c-.78.78-2.05.78-2.83 0L6.64 57.5c-.78-.78-.78-2.05 0-2.83L11 54.67 7.39 50z" />
        </svg>
      ),
      description: 'Connect via QR code scan. Supports multi-chain mobile wallets.',
      tag: 'Universal'
    }
  ];

  const selectWallet = async (walletName: 'Leather' | 'Xverse' | 'Asigna' | 'Fordefi' | 'WalletConnect') => {
    try {
      if (walletName === 'Leather') {
        if (typeof window !== 'undefined' && ((window as any).LeatherProvider || (window as any).StacksProvider)) {
          await stacksConnectWallet('Leather');
          onClose();
        } else {
          window.open('https://leather.io/install-extension', '_blank');
        }
      } else if (walletName === 'Xverse') {
        if (typeof window !== 'undefined' && ((window as any).XverseProvider || (window as any).StacksProvider)) {
          await stacksConnectWallet('Xverse');
          onClose();
        } else {
          window.open('https://www.xverse.app/download', '_blank');
        }
      } else if (walletName === 'Asigna') {
        if (typeof window !== 'undefined' && (window as any).StacksProvider) {
          await stacksConnectWallet('Asigna');
          onClose();
        } else {
          window.open('https://asigna.io/', '_blank');
        }
      } else if (walletName === 'Fordefi') {
        if (typeof window !== 'undefined' && (window as any).StacksProvider) {
          await stacksConnectWallet('Fordefi');
          onClose();
        } else {
          window.open('https://www.fordefi.com/', '_blank');
        }
      } else if (walletName === 'WalletConnect') {
        await stacksConnectWallet('WalletConnect');
        onClose();
      }
    } catch (err) {
      console.error(`Failed to connect to ${walletName}:`, err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#000000]/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg overflow-hidden glass-modal z-10"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Connect Wallet
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  Choose a Stacks-supported Bitcoin Layer 2 wallet.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-[#181818] border border-white/5 flex items-center justify-center text-[#A0A0A0] hover:text-white hover:border-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wallets List */}
            <div className="p-6 flex flex-col gap-3">
              {wallets.map((w) => (
                <button
                  key={w.name}
                  onClick={() => selectWallet(w.name as any)}
                  className="group flex items-center justify-between p-4 rounded-[16px] bg-[#181818] hover:bg-gradient-to-r hover:from-[#181818] hover:to-[#222222] border border-white/5 hover:border-[#F5B400]/30 transition-all duration-300 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[12px] bg-[#121212] border border-white/10 flex items-center justify-center group-hover:border-[#F5B400]/40 transition-colors">
                      {w.logo}
                    </div>
                    <div className="max-w-[280px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-[#F5B400] transition-colors">
                          {w.name}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[#A0A0A0] uppercase tracking-wider">
                          {w.tag}
                        </span>
                      </div>
                      <p className="text-xs text-[#A0A0A0] mt-0.5 leading-relaxed">
                        {w.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#A0A0A0] group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            {/* Footer Notice */}
            <div className="px-6 py-4 bg-[#121212] border-t border-white/5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#F5B400] shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#A0A0A0] leading-relaxed">
                <span className="text-white font-medium">Non-Custodial Connection.</span> Continuum never holds your private keys or accesses your wallet without explicit smart contract approval.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
