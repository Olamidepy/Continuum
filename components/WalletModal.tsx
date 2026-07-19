'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, ArrowRight, ShieldCheck, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { useContinuumStore } from '../lib/store';
import { authenticate, AppConfig, UserSession } from '@stacks/connect';
import { useCelo } from '../hooks/useCelo';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalPhase = 'select' | 'celo-pick' | 'connecting' | 'install' | 'success';

// Chrome Extension install URLs
const INSTALL_URLS: Record<string, string> = {
  Leather: 'https://chrome.google.com/webstore/detail/leather/ldinpeekobnhjjdofggfgjlcehhmanlj',
  Xverse:  'https://chrome.google.com/webstore/detail/xverse-wallet/idnnbdplmphpflfnlkomgpfbpcgelopg',
  Asigna:  'https://asigna.io',
  Fordefi: 'https://www.fordefi.com',
  WalletConnect: 'https://walletconnect.com',
  'Celo (MiniPay)': 'https://opera.com/minipay',
};

const WALLET_PROVIDERS = [
  {
    name: 'Celo (MiniPay)' as const,
    description: 'Connect using MiniPay (Opera) or Celo wallet. Zero gas fees, instant stablecoin payments.',
    logo: (
      <img src="/celo.png" alt="Celo Logo" className="w-8 h-8 object-contain" />
    ),
  },
  {
    name: 'Leather' as const,
    description: 'Connect using Leather browser extension. Optimized for Stacks.',
    logo: (
      <img src="/Leather.png" alt="Leather Logo" className="w-8 h-8 object-contain" />
    ),
  },
  {
    name: 'Xverse' as const,
    description: 'Connect using Xverse wallet. Popular for BTC and Stacks Layer 2.',
    logo: (
      <img src="/Xverse.png" alt="Xverse Logo" className="w-8 h-8 object-contain" />
    ),
  },
  {
    name: 'Asigna' as const,
    description: 'Multisig security for teams and high-net-worth vaults.',
    logo: (
      <img src="/Asigna.png" alt="Asigna Logo" className="w-8 h-8 object-contain" />
    ),
  },
  {
    name: 'Fordefi' as const,
    description: 'Institutional-grade MPC wallet connection.',
    logo: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current text-[#A0A0A0]">
        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="6" fill="none" />
        <polygon points="50,30 65,60 35,60" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'WalletConnect' as const,
    description: 'Connect via QR code scan. Supports multi-chain mobile wallets.',
    logo: (
      <img src="/Wallet connect.png" alt="WalletConnect Logo" className="w-8 h-8 object-contain" />
    ),
  },
];

function shootConfetti() {
  const fire = (particleRatio: number, opts: confetti.Options) => {
    confetti({
      ...opts,
      origin: { y: 0.55 },
      colors: ['#F5B400', '#FFD54A', '#ffffff', '#fffbe6', '#ffd700'],
      particleCount: Math.floor(220 * particleRatio),
    });
  };
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2,  { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1,  { spread: 120, startVelocity: 45 });
}

/** Install URLs for wallets that don't use showConnect */
const NON_STACKS_WALLETS = ['Asigna', 'Fordefi', 'WalletConnect'];

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const router = useRouter();
  const connectWallet = useContinuumStore((state) => state.connectWallet);
  const { connectCelo, discoverProviders } = useCelo();

  const [phase, setPhase] = useState<ModalPhase>('select');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [countdown, setCountdown] = useState(5);
  const [installUrl, setInstallUrl] = useState('');
  const [evmProviders, setEvmProviders] = useState<Array<{ name: string; provider: any }>>([]);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const confettiFired = useRef(false);

  const startCountdown = () => {
    let remaining = 5;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        onClose();
        router.push('/dashboard');
      }
    }, 1000);
  };

  const handleSuccess = (address: string, provider: string) => {
    // Prefetch dashboard page for instant redirection transition
    router.prefetch('/dashboard');

    // Fetch real mainnet balances
    fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/balances`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const stx  = data ? (Number(data.stx?.balance) || 0) : 0;
        const sbtc = data ? (Number(data.fungible_tokens?.['SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc']?.balance) || 0) : 0;
        connectWallet(
          address,
          provider as 'Leather' | 'Xverse' | 'Asigna' | 'Fordefi' | 'WalletConnect',
          stx,
          sbtc,
        );
      })
      .catch(() => {
        connectWallet(
          address,
          provider as 'Leather' | 'Xverse' | 'Asigna' | 'Fordefi' | 'WalletConnect',
          0,
          0,
        );
      });

    setPhase('success');
    if (!confettiFired.current) {
      confettiFired.current = true;
      setTimeout(shootConfetti, 120);
    }
    startCountdown();
  };

  const handleCeloProviderSelect = async (provider: any) => {
    try {
      setPhase('connecting');
      await connectCelo(provider);
      setPhase('success');
      if (!confettiFired.current) {
        confettiFired.current = true;
        setTimeout(shootConfetti, 120);
      }
      startCountdown();
    } catch (err) {
      console.error('Celo connection error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'cancelled') {
        setPhase('select');
        setSelectedWallet('');
      } else if (msg.includes('No injected wallet found') || msg.includes('install') || msg.includes('compatible')) {
        setInstallUrl('https://metamask.io/download/');
        setPhase('install');
      } else {
        setPhase('select');
        setSelectedWallet('');
      }
    }
  };

  const handleSelectWallet = async (walletName: string) => {
    setSelectedWallet(walletName);

    if (walletName === 'Celo (MiniPay)') {
      // Discover available EVM providers and show picker
      const providers = discoverProviders();
      if (providers.length === 0) {
        setInstallUrl('https://metamask.io/download/');
        setPhase('install');
        return;
      }
      if (providers.length === 1) {
        // Only one provider, connect directly
        await handleCeloProviderSelect(providers[0].provider);
      } else {
        // Multiple providers, show picker
        setEvmProviders(providers);
        setPhase('celo-pick');
      }
      return;
    }

    // Non-Stacks wallets → just open their website
    if (NON_STACKS_WALLETS.includes(walletName)) {
      setInstallUrl(INSTALL_URLS[walletName] || '');
      setPhase('install');
      return;
    }

    // Always attempt live connection using Stacks Connect!
    setPhase('connecting');

    try {
      const appConfig = new AppConfig(['store_write', 'publish_data']);
      const userSession = new UserSession({ appConfig });

      // Resolve the injected provider object for the selected wallet
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

      await new Promise<void>((resolve, reject) => {
        authenticate({
          userSession,
          appDetails: {
            name: 'Continuum Savings',
            icon: typeof window !== 'undefined'
              ? `${window.location.origin}/Logo.png`
              : '',
          },
          onFinish: async () => {
            try {
              const userData = userSession.loadUserData();
              const address =
                userData.profile?.stxAddress?.mainnet ||
                userData.profile?.stxAddress?.testnet ||
                '';
              if (!address) { reject(new Error('No address found')); return; }
              handleSuccess(address, walletName);
              resolve();
            } catch (e) { reject(e); }
          },
          onCancel: () => reject(new Error('cancelled')),
        }, provider);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'cancelled') {
        // User closed the popup — go back to select
        setPhase('select');
        setSelectedWallet('');
      } else {
        // Only go to install page if Stacks Connect fails to trigger
        console.error('Connection error:', err);
        setInstallUrl(INSTALL_URLS[walletName] || '');
        setPhase('install');
      }
    }
  };

  const handleClose = () => {
    if (phase === 'connecting') return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPhase('select');
    setSelectedWallet('');
    onClose();
  };

  // Initialize state when the modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      confettiFired.current = false;
      setPhase('select');
      setSelectedWallet('');
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const walletInfo = WALLET_PROVIDERS.find((w) => w.name === selectedWallet);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={phase !== 'connecting' ? handleClose : undefined}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] bg-[#111111] border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.8)] z-10"
          >
            <AnimatePresence mode="wait">

              {/* ── SELECT PHASE ── */}
              {phase === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Connect Wallet</h3>
                      <p className="text-xs text-[#A0A0A0] mt-1">Choose a Stacks-supported Bitcoin Layer 2 wallet.</p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/[0.08] flex items-center justify-center text-[#A0A0A0] hover:text-white hover:border-white/15 transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col gap-2.5">
                    {WALLET_PROVIDERS.map((w) => (
                      <motion.button
                        key={w.name}
                        onClick={() => handleSelectWallet(w.name)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="group flex items-center justify-between p-4 rounded-[16px] bg-[#181818] hover:bg-[#1f1f1f] border border-white/5 hover:border-[#F5B400]/30 transition-all duration-200 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[12px] bg-[#121212] border border-white/10 flex items-center justify-center group-hover:border-[#F5B400]/40 transition-colors shrink-0">
                            {w.logo}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white group-hover:text-[#F5B400] transition-colors text-sm">
                                {w.name}
                              </span>
                            </div>
                            <p className="text-xs text-[#A0A0A0] mt-0.5 leading-relaxed">{w.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#A0A0A0] group-hover:text-[#F5B400] group-hover:translate-x-1 transition-all shrink-0" />
                      </motion.button>
                    ))}
                  </div>

                  <div className="px-6 py-4 bg-[#0d0d0d] border-t border-white/5 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#F5B400] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                      <span className="text-white font-medium">Non-Custodial.</span>{' '}
                      Continuum never holds your private keys or accesses your wallet without explicit smart contract approval.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ── CELO EVM WALLET PICKER PHASE ── */}
              {phase === 'celo-pick' && (
                <motion.div
                  key="celo-pick"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Select EVM Wallet</h3>
                      <p className="text-xs text-[#A0A0A0] mt-1">Choose which wallet to connect for Celo network.</p>
                    </div>
                    <button
                      onClick={() => { setPhase('select'); setSelectedWallet(''); }}
                      className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/[0.08] flex items-center justify-center text-[#A0A0A0] hover:text-white hover:border-white/15 transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col gap-2.5">
                    {evmProviders.map((p, i) => (
                      <motion.button
                        key={`${p.name}-${i}`}
                        onClick={() => handleCeloProviderSelect(p.provider)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="group flex items-center justify-between p-4 rounded-[16px] bg-[#181818] hover:bg-[#1f1f1f] border border-white/5 hover:border-[#35D07F]/30 transition-all duration-200 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[12px] bg-[#121212] border border-white/10 flex items-center justify-center group-hover:border-[#35D07F]/40 transition-colors shrink-0">
                            {p.name === 'MetaMask' ? (
                              <svg viewBox="0 0 100 100" className="w-7 h-7"><path d="M89.1 10L55.4 34.8l6.2-14.7L89.1 10z" fill="#E2761B"/><path d="M10.9 10l33.4 25.1-5.9-15L10.9 10z" fill="#E4761B"/><path d="M77 67.4l-9 13.8 19.2 5.3 5.5-18.7-15.7-.4z" fill="#E4761B"/><path d="M7.4 67.8L12.8 86.5l19.2-5.3-9-13.8-15.6.4z" fill="#E4761B"/><path d="M30.7 43.6l-5.3 8 19 .8-.7-20.4-13 11.6z" fill="#E4761B"/><path d="M69.3 43.6L56 31.8l-.5 20.6 19-.8-5.2-8z" fill="#E4761B"/><path d="M32 81.2l11.5-5.6-9.9-7.7-1.6 13.3z" fill="#E4761B"/><path d="M56.5 75.6L68 81.2l-1.6-13.3-9.9 7.7z" fill="#E4761B"/></svg>
                            ) : p.name === 'Rabby' ? (
                              <svg viewBox="0 0 100 100" className="w-7 h-7 text-[#8697FF]"><circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.15"/><circle cx="50" cy="50" r="20" fill="currentColor"/></svg>
                            ) : p.name === 'Zerion' ? (
                              <svg viewBox="0 0 100 100" className="w-7 h-7 text-[#2962EF]"><rect x="20" y="20" width="60" height="60" rx="14" fill="currentColor" opacity="0.15"/><path d="M30 65L50 35l20 30H30z" fill="currentColor"/></svg>
                            ) : (
                              <svg viewBox="0 0 100 100" className="w-7 h-7 text-[#A0A0A0]"><circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="5" fill="none"/><circle cx="50" cy="50" r="10" fill="currentColor"/></svg>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-white group-hover:text-[#35D07F] transition-colors text-sm">
                              {p.name}
                            </span>
                            <p className="text-xs text-[#A0A0A0] mt-0.5">Connect to Celo via {p.name}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#A0A0A0] group-hover:text-[#35D07F] group-hover:translate-x-1 transition-all shrink-0" />
                      </motion.button>
                    ))}
                  </div>

                  <div className="px-6 py-4 bg-[#0d0d0d] border-t border-white/5">
                    <button
                      onClick={() => { setPhase('select'); setSelectedWallet(''); }}
                      className="text-xs text-[#A0A0A0] hover:text-white transition-colors cursor-pointer"
                    >
                      ← Back to wallet list
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── CONNECTING PHASE ── */}
              {phase === 'connecting' && (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center justify-center py-16 px-8 gap-6 min-h-[380px]"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 -m-4 rounded-full bg-[#F5B400]/20 blur-xl"
                    />
                    <div className="relative w-20 h-20 rounded-[20px] bg-[#1a1a1a] border border-[#F5B400]/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,180,0,0.15)]">
                      {walletInfo?.logo ?? <div className="w-8 h-8 rounded-full bg-[#F5B400]/20" />}
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute -inset-2"
                    >
                      <div className="w-full h-full rounded-full border-2 border-transparent border-t-[#F5B400]/60 border-r-[#F5B400]/20" />
                    </motion.div>
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-white">Connecting to {selectedWallet}</h3>
                    <p className="text-sm text-[#A0A0A0]">
                      Please approve the connection in your <span className="text-white font-medium">{selectedWallet}</span> extension popup.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[#A0A0A0] text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Awaiting wallet approval…</span>
                  </div>

                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-[#F5B400]"
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => { setPhase('select'); setSelectedWallet(''); }}
                    className="text-xs text-[#A0A0A0] hover:text-white transition-colors cursor-pointer underline underline-offset-2"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}

              {/* ── INSTALL PHASE ── */}
              {phase === 'install' && (
                <motion.div
                  key="install"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center justify-center py-14 px-8 gap-6 min-h-[380px] text-center"
                >
                  {/* Icon */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-[20px] bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                      {walletInfo?.logo ?? <div className="w-8 h-8 rounded-full bg-white/10" />}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black text-xs font-bold border-2 border-[#111]">
                      !
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">{selectedWallet} Not Detected</h3>
                    <p className="text-sm text-[#A0A0A0] max-w-xs leading-relaxed">
                      The <span className="text-white font-medium">{selectedWallet}</span> extension is not installed in your browser.
                      Install it to connect to Continuum on Stacks testnet.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <a
                      href={installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_16px_rgba(245,180,0,0.25)] cursor-pointer"
                    >
                      Install {selectedWallet} <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-[11px] text-[#A0A0A0]">
                      After installation, refresh the page and try connecting again.
                    </p>
                    <button
                      onClick={() => { setPhase('select'); setSelectedWallet(''); }}
                      className="text-xs text-[#A0A0A0] hover:text-white transition-colors cursor-pointer underline underline-offset-2"
                    >
                      ← Back to wallet selection
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── SUCCESS PHASE ── */}
              {phase === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                  className="flex flex-col items-center justify-center py-14 px-8 gap-6 min-h-[380px] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,180,0,0.08)_0%,transparent_70%)] pointer-events-none" />

                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 250, delay: 0.1 }}
                    className="relative"
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#F5B400]/20 to-[#FFD54A]/10 border border-[#F5B400]/40 flex items-center justify-center shadow-[0_0_40px_rgba(245,180,0,0.25)]">
                      <CheckCircle2 className="w-12 h-12 text-[#F5B400]" strokeWidth={1.5} />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
                      className="absolute inset-0 rounded-full border-2 border-[#F5B400]/40"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-center space-y-2"
                  >
                    <h3 className="text-2xl font-bold text-white tracking-tight">🎉 Congratulations!</h3>
                    <p className="text-base text-[#F5B400] font-semibold">Wallet Connected Successfully</p>
                    <p className="text-sm text-[#A0A0A0] max-w-xs">
                      You&apos;re now connected with <span className="text-white font-medium">{selectedWallet}</span> on Stacks Testnet. Redirecting to your dashboard…
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                        <motion.circle
                          cx="28" cy="28" r="24"
                          fill="none"
                          stroke="#F5B400"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          initial={{ strokeDashoffset: 0 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 24 }}
                          transition={{ duration: 5, ease: 'linear' }}
                        />
                      </svg>
                      <span className="text-xl font-bold text-white tabular-nums">{countdown}</span>
                    </div>
                    <p className="text-xs text-[#A0A0A0]">Redirecting to dashboard in {countdown}s</p>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => {
                      if (countdownRef.current) clearInterval(countdownRef.current);
                      onClose();
                      router.push('/dashboard');
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-sm font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-[0_4px_16px_rgba(245,180,0,0.25)]"
                  >
                    Go to Dashboard Now →
                  </motion.button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
