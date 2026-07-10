'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  Check, 
  Cpu,
  ChevronDown,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import MockupPhone from '../components/MockupPhone';
import WalletModal from '../components/WalletModal';
import { useContinuumStore } from '../lib/store';
import { formatAddress } from '../utils/format';
import TypingText from '../components/TypingText';
import ScrollReveal from '../components/ScrollReveal';

const LogoLoop = dynamic(() => import('../components/LogoLoop'), { ssr: false });
const SplitText = dynamic(() => import('../components/SplitText'), { ssr: false });

// Hook: fires once when the element first enters the viewport
function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// Wraps TypingText — starts when section scrolls into view, then loops forever
function InViewTyping({ text, className, delay = 28 }: { text: string; className?: string; delay?: number }) {
  const { ref, inView } = useInView(0.2);
  return (
    <div ref={ref} className={className}>
      {inView && (
        <TypingText
          text={text}
          delay={delay}
          repeat={true}
          grow
          hideCursorOnComplete={false}
          smooth={false}
          waitTime={1200}
        />
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const { wallet, disconnectWallet } = useContinuumStore();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showWalletGuide, setShowWalletGuide] = useState(false);

  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  const handleLaunchApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!wallet.connected) {
      useContinuumStore.setState({ isSimulation: true });
    }
    setIsExiting(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 400);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      q: 'How does the non-custodial vault work?',
      a: 'Your funds are locked directly into a Stacks Clarity smart contract. The contract is immutable and contains no administrator backdoors. Only the vault owner can withdraw funds, either after maturity (for 100% of the funds + accumulated rewards) or before maturity (which triggers a 10% early exit penalty).'
    },
    {
      q: 'What is the early withdrawal penalty?',
      a: 'If you choose to withdraw your STX or sBTC before your lock period expires, a 10% penalty is deducted. 80% of this penalty is instantly redistributed to remaining active savers in the pool. The remaining 20% is routed to the treasury reserve to fund protocol growth.'
    },
    {
      q: 'How are rewards calculated and distributed?',
      a: 'Continuum uses a highly scalable, gas-efficient O(1) reward distribution algorithm. Rewards are calculated based on your share size (locked amount multiplied by your duration weight). When an early withdrawal occurs, the penalty rewards are distributed proportionally to all active shares, ensuring zero gas spikes regardless of participant counts.'
    },
    {
      q: 'What are the lock duration multipliers?',
      a: 'We reward longer-term commitments with larger share weights: 30 Days gives a 1.0x multiplier, 90 Days gives 1.2x, 180 Days gives 1.5x, and 365 Days gives a 2.0x multiplier. Higher multipliers grant you a larger portion of early withdrawal penalties.'
    },
    {
      q: 'What wallets are supported?',
      a: 'We fully support popular Stacks Layer 2 wallets: Leather and Xverse. We also support multisig vaults via Asigna and institutional-grade MPC connection via Fordefi.'
    }
  ];

  const features = [
    {
      icon: <Lock className="w-5 h-5 text-[#F5B400]" />,
      title: 'Time-Locked Savings',
      desc: 'Commit STX or sBTC for 30, 90, 180, or 365 days. The locked assets remain fully protected by Clarity smart contracts.'
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-[#F5B400]" />,
      title: 'Penalty Redistribution',
      desc: 'Disciplined savers earn yield from participants who exit early. Early exit penalties are redistributed directly to the pool.'
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#F5B400]" />,
      title: 'Secured by Stacks L2',
      desc: 'All smart contracts run on Stacks, inheriting the security and finality of Bitcoin consensus.'
    },
    {
      icon: <Cpu className="w-5 h-5 text-[#F5B400]" />,
      title: 'O(1) Scale Reward Alg',
      desc: 'Bespoke scaling logic ensures rewards accrue gas-efficiently without iterating lists, maintaining high security.'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="relative min-h-screen bg-[#090909] text-white flex flex-col justify-between overflow-x-hidden selection:bg-[#F5B400]/30"
    >
      
      {/* Background Ambience Blobs */}
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[160px] pointer-events-none"></div>

      {/* Header / Nav */}
      <header className="sticky top-0 z-40 bg-[#090909]/60 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-24 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <img 
              src="/fArtboard 2 copy 2.png" 
              alt="Continuum Logo" 
              className="w-[170px] sm:w-[210px] md:w-[240px] h-auto object-contain" 
            />
          </Link>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-xs text-[#A0A0A0] hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-xs text-[#A0A0A0] hover:text-white transition-colors">How It Works</a>
              <a href="#security" className="text-xs text-[#A0A0A0] hover:text-white transition-colors">Security</a>
              <a href="#faq" className="text-xs text-[#A0A0A0] hover:text-white transition-colors">FAQ</a>
            </nav>

            <div className="flex items-center gap-2">
              {wallet.connected ? (
                <button
                  onClick={disconnectWallet}
                  className="px-3 py-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-[10px] sm:text-xs font-semibold hover:bg-red-900/30 transition-all cursor-pointer"
                >
                  <span className="hidden sm:inline">{formatAddress(wallet.address)} (Disconnect)</span>
                  <span className="sm:hidden">Disconnect</span>
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setIsWalletOpen(true)}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-[10px] sm:text-xs font-bold shadow-[0_4px_12px_rgba(245,180,0,0.15)] hover:opacity-90 transition-all cursor-pointer relative z-30 whitespace-nowrap"
                  >
                    Connect Wallet
                  </button>
                  {showWalletGuide && (
                    <>
                      <div className="absolute inset-0 -m-1.5 rounded-2xl border-2 border-red-500 animate-ping opacity-75 pointer-events-none z-20" />
                      <div className="absolute inset-0 -m-1.5 rounded-2xl border border-red-500 animate-pulse pointer-events-none z-20" />
                      <div className="absolute top-12 right-0 bg-red-950/95 border border-red-500/50 rounded-xl px-3 py-2 text-[10px] sm:text-xs text-red-200 shadow-xl min-w-[160px] sm:min-w-[200px] text-center font-mono z-40 animate-bounce">
                        <div className="absolute -top-1.5 right-6 w-3 h-3 bg-[#180303] border-t border-l border-red-500/50 transform rotate-45" />
                        <span className="font-bold text-red-400">ALERT:</span> kindly connect your wallet
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section Background Wrapper */}
      <div 
        className="w-full bg-cover bg-center bg-no-repeat relative overflow-hidden"
        style={{ backgroundImage: 'url(/Back.png)' }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,9,9,0)_70%,#090909_100%)] pointer-events-none z-0"></div>

        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-6 sm:pt-20 sm:pb-12 md:pt-24 md:pb-16 lg:pt-28 lg:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center z-10">
          <div className="lg:col-span-5 space-y-5 sm:space-y-6 flex flex-col items-start text-left relative z-20">
            <SplitText
              text="Time Builds Wealth."
              tag="h1"
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]"
              textAlign="left"
              delay={50}
              duration={1.25}
            />

            <SplitText
              text="Bitcoin-native savings secured by Stacks through non-custodial time-locked vaults. Establish financial discipline and earn penalty-redistributed yields."
              tag="p"
              className="text-sm sm:text-base md:text-lg text-[#A0A0A0] leading-relaxed max-w-xl"
              textAlign="left"
              delay={20}
              duration={1}
            />

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-start gap-3 sm:gap-4 pt-2"
            >
              <Link 
                href="/dashboard"
                onClick={handleLaunchApp}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black font-bold text-xs tracking-wider shadow-[0_4px_12px_rgba(245,180,0,0.15)] hover:opacity-90 transition-all flex items-center gap-1.5 w-fit"
              >
                Launch App <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </div>

          {/* Floating Mockup Phone */}
          <div className="flex lg:col-span-7 justify-center lg:justify-end relative z-10 w-full mt-8 lg:mt-0">
            <MockupPhone />
          </div>
        </section>
      </div>

      {/* Middle Sections with Grid Background */}
      <div className="relative w-full overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.15] z-0"
          style={{ 
            backgroundImage: 'url(/Background.webp)',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="relative z-10">

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 transition-transform duration-500 ease-out hover:-translate-y-2">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest">Core Features</span>
          <h2 className="text-3xl font-bold tracking-tight">
            <InViewTyping text="Built for Uncompromising Savers" delay={60} />
          </h2>
          <p className="text-sm text-[#A0A0A0]">
            We combine cryptographic commitment with protocol incentives to encourage long-term focus.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Left Column: 2x2 Grid of 4 Boxes */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 order-2 lg:order-1">
            {features.map((f, i) => (
              <div key={i} className="p-4 sm:p-6 rounded-[20px] bg-[#121212] border border-white/5 flex flex-col gap-3 sm:gap-4 text-left hover:border-[#F5B400]/25 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300 shadow-md">
                <div className="w-10 h-10 rounded-lg bg-[#181818] border border-white/5 flex items-center justify-center text-[#F5B400]">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">{f.title}</h3>
                  <p className="text-xs text-[#A0A0A0] mt-1.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Mockup Image Showcase */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end items-center h-full order-1 lg:order-2">
            <ScrollReveal className="w-full flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[340px] sm:max-w-[480px] lg:max-w-[500px] flex items-center justify-center">
                <img 
                  src="/mockup.png" 
                  alt="Continuum Vaults Mockup" 
                  className="w-full h-auto object-contain select-none pointer-events-auto cursor-pointer transition-transform duration-1000 ease-out hover:scale-[1.03]" 
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 bg-gradient-to-b from-transparent to-[#121212]/30 transition-transform duration-500 ease-out hover:-translate-y-2">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Workflow</span>
          <h2 className="text-3xl font-bold tracking-tight">
            <InViewTyping text="Three Steps to Disciplined Wealth" delay={60} />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-[1px] bg-white/5 z-0"></div>

          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-full bg-[#121212] border border-white/10 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              01
            </div>
            <h3 className="font-bold text-white mt-2">Establish Lock Duration</h3>
            <p className="text-xs text-[#A0A0A0] max-w-xs leading-relaxed">
              Deposit STX or sBTC. Choose your lock maturity (30, 90, 180, or 365 Days) to determine your reward share multiplier.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-full bg-[#121212] border border-white/10 flex items-center justify-center text-[#F5B400] font-bold text-lg shadow-lg">
              02
            </div>
            <h3 className="font-bold text-white mt-2">Earn Penalty Yield</h3>
            <p className="text-xs text-[#A0A0A0] max-w-xs leading-relaxed">
              As other pool participants break commitments early and pay penalties, you earn automated distributions based on your locked shares.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-full bg-[#121212] border border-white/10 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              03
            </div>
            <h3 className="font-bold text-white mt-2">Claim at Maturity</h3>
            <p className="text-xs text-[#A0A0A0] max-w-xs leading-relaxed">
              Once the Stacks block height passes your lock maturity, withdraw 100% of your deposits plus accumulated penalty yield with zero fees.
            </p>
          </div>
        </div>
      </section>

      {/* Why Continuum */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center transition-transform duration-500 ease-out hover:-translate-y-2">
        <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
          <div className="p-6 sm:p-8 rounded-[20px] sm:rounded-[24px] bg-[#121212]/80 border border-white/5 text-left relative overflow-hidden w-full max-w-sm shadow-xl hover:border-[#F5B400]/20 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B400]/5 rounded-bl-full pointer-events-none"></div>
            <span className="text-[#F5B400] font-bold text-xs uppercase tracking-wider block mb-2 font-mono">Discipline Multipliers</span>
            <h4 className="text-lg font-bold text-white mb-4">Maturity Weightings</h4>
            <div className="space-y-3">
              {[
                { d: '30 Days Savings', m: '1.0x multiplier' },
                { d: '90 Days Savings', m: '1.2x multiplier' },
                { d: '180 Days Savings', m: '1.5x multiplier' },
                { d: '365 Days Savings', m: '2.0x multiplier' }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-white/5 text-xs">
                  <span className="text-[#A0A0A0]">{item.d}</span>
                  <span className="text-white font-semibold font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{item.m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6 text-left order-1 lg:order-2">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Protocol Philosophy</span>
          <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">
            <InViewTyping text="Escape the Market Clutter. Commit to Accumulation." delay={50} />
          </h2>
          <p className="text-xs md:text-sm text-[#A0A0A0] leading-relaxed">
            Market volatility encourages short-term, emotional trades that erode portfolio value. Continuum introduces an immutable time-lock commitment. By enforcing discipline with code, savers are isolated from transient market impulses and rewarded for long-term consistency.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'Non-custodial: Contract contains absolutely no administrator override methods.',
              'Bitcoin-Native: Direct lock support for Stacks (STX) and wrapping sBTC satoshis.',
              'Savers First: 80% of exit penalties are automatically redistributed to committed savers.'
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-white">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Layer */}
      <section id="security" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 bg-[#121212]/30 transition-transform duration-500 ease-out hover:-translate-y-2">
        <div className="text-left max-w-3xl">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Security Architecture</span>
          <h2 className="text-4xl font-bold tracking-tight text-white mt-2 mb-6">
            <InViewTyping text="Designed for Absolute Custodial Integrity" delay={55} />
          </h2>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">
            Continuum vaults are governed entirely by Stacks Clarity smart contracts. Clarity is a decidable language which prevents common EVM exploits like reentrancy and integer overflows. The contract logic is transparent, deterministic, and immutable. No admin keys can withdraw or freeze your funds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left hover:border-[#F5B400]/20 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300">
            <h3 className="font-bold text-white text-base">Decidable Language</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Clarity is not compiled to bytecode. The code published on the Stacks blockchain is exactly the source code you read, facilitating validation.
            </p>
          </div>
          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left hover:border-[#F5B400]/20 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300">
            <h3 className="font-bold text-white text-base">No Reentrancy</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Clarity prevents dynamic calls from calling back into the executing contract, making reentrancy attacks completely impossible by language design.
            </p>
          </div>
          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left hover:border-[#F5B400]/20 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300">
            <h3 className="font-bold text-white text-base">Immutable Rules</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Once deployed, contract parameters cannot be updated, ensuring the 10% penalty and O(1) redistribution structures can never be modified.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Wallets */}
      <section className="w-full py-16 border-t border-white/5 text-center overflow-hidden transition-transform duration-500 ease-out hover:-translate-y-2">
        <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Supported Wallets</span>
        <h3 className="text-2xl font-bold tracking-tight text-white mt-2 mb-16">
          <InViewTyping text="Connect Securely via Bitcoin Layer 2 Integrations" delay={55} />
        </h3>
        
        {/* Full-width Logo Ticker Banner */}
        <div className="w-screen relative left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#F5B400] via-[#FFD54A] to-[#F5B400] py-3 shadow-[0_8px_30px_rgba(245,180,0,0.25)] border-y border-amber-400/20 overflow-hidden flex items-center">
          <LogoLoop 
            logos={[
              {
                node: (
                  <div className="flex items-center gap-2.5 text-black font-extrabold text-[13px] tracking-widest font-mono select-none">
                    <svg viewBox="0 0 100 100" className="w-5 h-5 fill-current">
                      <path d="M50 15L15 35v30l35 20 35-20V35L50 15zm0 10.5L74.5 40 50 54.5 25.5 40 50 25.5zM26 48.5l20.5 12v20.5L26 69V48.5zm48 20.5L53.5 81V60.5l20.5-12V69z" />
                    </svg>
                    <span>LEATHER</span>
                  </div>
                )
              },
              {
                node: (
                  <div className="flex items-center gap-2.5 text-black font-extrabold text-[13px] tracking-widest font-mono select-none">
                    <svg viewBox="0 0 100 100" className="w-5 h-5 fill-current">
                      <path d="M50 10L10 30v40l40 20 40-20V30L50 10zm-6 26.5h12V48H44V36.5zm0 17h12V70H44V53.5z" />
                    </svg>
                    <span>XVERSE</span>
                  </div>
                )
              },
              {
                node: (
                  <div className="flex items-center gap-2.5 text-black font-extrabold text-[13px] tracking-widest font-mono select-none">
                    <svg viewBox="0 0 100 100" className="w-5 h-5 stroke-current fill-none" strokeWidth="6">
                      <rect x="20" y="20" width="60" height="60" rx="10" />
                      <path d="M35 50h30M50 35v30" strokeLinecap="round" />
                    </svg>
                    <span>ASIGNA</span>
                  </div>
                )
              },
              {
                node: (
                  <div className="flex items-center gap-2.5 text-black font-extrabold text-[13px] tracking-widest font-mono select-none">
                    <svg viewBox="0 0 100 100" className="w-5 h-5 fill-current">
                      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="6" fill="none" />
                      <polygon points="50,30 65,60 35,60" />
                    </svg>
                    <span>FORDEFI</span>
                  </div>
                )
              },
              {
                node: (
                  <div className="flex items-center gap-2.5 text-black font-extrabold text-[13px] tracking-widest font-mono select-none">
                    <svg viewBox="0 0 100 100" className="w-5 h-5 fill-current">
                      <path d="M23.33 33.33c14.73-14.73 38.6-14.73 53.34 0l4.35 4.35c.78.78.78 2.05 0 2.83l-7.25 7.25c-.78.78-2.05.78-2.83 0l-4.35-4.35c-8.06-8.06-21.13-8.06-29.2 0l-4.66 4.66c-.78.78-2.05.78-2.83 0l-7.25-7.25c-.78-.78-.78-2.05 0-2.83l4.66-4.66zM7.39 50c23.54-23.54 61.68-23.54 85.22 0l4.35 4.35c.78.78.78 2.05 0 2.83l-7.25 7.25c-.78.78-2.05.78-2.83 0l-4.35-4.35c-16.88-16.88-44.25-16.88-61.13 0l-4.66 4.66c-.78.78-2.05.78-2.83 0L6.64 57.5c-.78-.78-.78-2.05 0-2.83L11 54.67 7.39 50z" />
                    </svg>
                    <span>WALLETCONNECT</span>
                  </div>
                )
              }
            ]}
            speed={60}
            gap={64}
            fadeOut={true}
            fadeOutColor="#F5B400"
            logoHeight={24}
          />
        </div>
      </section>

      {/* Protocol Yield Architecture */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 transition-transform duration-500 ease-out hover:-translate-y-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Yield Architecture</span>
            <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">
              <InViewTyping text="The Mechanics of Risk-Free Commitment Yields" delay={55} />
            </h2>
            <p className="text-xs md:text-sm text-[#A0A0A0] leading-relaxed">
              Unlike traditional DeFi protocols that rely on risky lending markets, liquidation loops, or inflationary token emissions, Continuum's yield is derived entirely from protocol-enforced commitment discipline. When a depositor breaks their lock duration early, they forfeit a portion of their capital, which is directly routed back to the savers who remain committed. This creates a zero-liquidation, non-custodial, and highly sustainable yield environment.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#121212] border border-white/5 text-left">
                <span className="text-[#F5B400] text-xs font-bold font-mono">10%</span>
                <h4 className="font-bold text-white text-xs mt-1">Exit Penalty</h4>
                <p className="text-[10px] text-[#A0A0A0] mt-1 leading-relaxed">Deducted from the principal of any savers withdrawing early before lock expiry.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-white/5 text-left">
                <span className="text-emerald-400 text-xs font-bold font-mono">80%</span>
                <h4 className="font-bold text-white text-xs mt-1">Redistributed</h4>
                <p className="text-[10px] text-[#A0A0A0] mt-1 leading-relaxed">Instantly streamed to remaining savers, scaling dynamically via O(1) gas logic.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-white/5 text-left">
                <span className="text-blue-400 text-xs font-bold font-mono">20%</span>
                <h4 className="font-bold text-white text-xs mt-1">Reserve Treasury</h4>
                <p className="text-[10px] text-[#A0A0A0] mt-1 leading-relaxed">Routed to the reserve treasury to support protocol security and development grants.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            {/* Visual Penalty Yield Calculator Simulation */}
            <div className="p-6 rounded-[24px] bg-[#121212]/80 border border-white/5 text-left w-full max-w-sm shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
              <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider block mb-2 font-mono flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Simulated Yield Output
              </span>
              <h4 className="text-base font-bold text-white mb-4">Savings Pool Simulation</h4>
              
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#A0A0A0]">Initial Deposit</span>
                  <span className="text-white font-semibold font-mono">10,000 STX</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#A0A0A0]">Lock Commitment</span>
                  <span className="text-white font-semibold">180 Days (1.5x)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#A0A0A0]">Pool Early Exits</span>
                  <span className="text-white font-semibold font-mono">140,000 STX</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-emerald-400 font-medium">Earned Penalty Shares</span>
                  <span className="text-emerald-400 font-bold font-mono">+1,248.50 STX</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm font-bold">
                  <span className="text-white">Estimated Net APR</span>
                  <span className="text-[#F5B400] font-mono">12.48% APR</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Bitcoin Security Alignment */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 transition-transform duration-500 ease-out hover:-translate-y-2 bg-[#121212]/10">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Security Alignment</span>
          <h2 className="text-3xl font-bold tracking-tight">
            <InViewTyping text="Deep Stacks L2 & Bitcoin Consensus Safeguards" delay={55} />
          </h2>
          <p className="text-sm text-[#A0A0A0]">
            Every smart contract interaction on Continuum is anchored onto the most secure decentralized computing network in the world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left hover:border-[#F5B400]/25 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#181818] border border-white/5 flex items-center justify-center text-[#F5B400] mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Bitcoin Write Finality</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Transactions are bundled and settled directly onto the Stacks Layer 2, which writes its state history into Bitcoin blocks, ensuring full mathematical immutability.
            </p>
          </div>

          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left hover:border-[#F5B400]/25 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#181818] border border-white/5 flex items-center justify-center text-[#F5B400] mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Nakamoto Upgrade</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Continuum leverages Stacks' Nakamoto upgrade to deliver 100% Bitcoin finality in under 5 seconds, combining high transaction speed with BTC security.
            </p>
          </div>

          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left hover:border-[#F5B400]/25 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#181818] border border-white/5 flex items-center justify-center text-[#F5B400] mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">sBTC Native Integration</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Deposit native-wrapped sBTC into vaults. Keep your Bitcoin yielding rewards natively without relying on centralized wrap bridges or synthetic wrappers.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20 border-t border-white/5 transition-transform duration-500 ease-out hover:-translate-y-2">
        <div className="text-center mb-12">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">FAQ</span>
          <h2 className="text-3xl font-bold tracking-tight mt-1 text-white">
            <InViewTyping text="Frequently Asked Questions" delay={60} />
          </h2>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div 
              key={index} 
              className="rounded-[16px] bg-[#121212] border border-white/5 overflow-hidden hover:border-[#F5B400]/20 hover:shadow-[0_0_20px_rgba(245,180,0,0.12)] transition-all duration-300"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-sm text-white hover:text-[#F5B400] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#A0A0A0] transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence initial={false}>
                {openFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-5 text-xs text-[#A0A0A0] leading-relaxed border-t border-white/5 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#090909] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <img 
              src="/fArtboard 2 copy 2.png" 
              alt="Continuum Logo" 
              className="w-[240px] h-auto object-contain" 
            />
          </div>

          <div className="text-[11px] text-[#A0A0A0]">
            © {new Date().getFullYear()} Continuum Savings Protocol. Built on Stacks L2. Secured by Bitcoin.
          </div>

          <div className="flex items-center gap-6 text-xs text-[#A0A0A0]">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
              Github <ExternalLink className="w-3 h-3" />
            </a>
            <a href="#" className="hover:text-white transition-colors">Security Audit</a>
          </div>
        </div>
      </footer>

      {/* Wallet Connection Modal */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </motion.div>
  );
}
