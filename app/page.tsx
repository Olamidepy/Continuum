'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  Coins, 
  ArrowDownRight, 
  Check, 
  HelpCircle,
  Cpu,
  Layers,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import MockupPhone from '../components/MockupPhone';
import Strands from '../components/Strands';
import WalletModal from '../components/WalletModal';
import { useContinuumStore } from '../lib/store';
import { formatAddress } from '../utils/format';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 100,
    },
  },
};

export default function LandingPage() {
  const { wallet, disconnectWallet } = useContinuumStore();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      icon: <Sparkles className="w-5 h-5 text-[#F5B400]" />,
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

  const headingWords = ["Time", "Builds", "Wealth."];

  return (
    <div className="relative min-h-screen bg-[#090909] text-white flex flex-col justify-between overflow-x-hidden selection:bg-[#F5B400]/30">
      
      {/* Background Ambience Blobs */}
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[160px] pointer-events-none"></div>

      {/* Header / Nav */}
      <header className="sticky top-0 z-40 bg-[#090909]/60 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#121212] border border-white/10 flex items-center justify-center shadow-[0_4px_10px_rgba(245,180,0,0.15)]">
              <span className="text-[#F5B400] font-bold text-sm">C</span>
            </div>
            <span className="font-bold tracking-widest text-sm text-white">CONTINUUM</span>
          </Link>
          
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-xs text-[#A0A0A0] hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-xs text-[#A0A0A0] hover:text-white transition-colors">How It Works</a>
              <a href="#security" className="text-xs text-[#A0A0A0] hover:text-white transition-colors">Security</a>
              <a href="#faq" className="text-xs text-[#A0A0A0] hover:text-white transition-colors">FAQ</a>
            </nav>

            <div className="flex items-center gap-3">
              {wallet.connected ? (
                <div className="flex items-center gap-3">
                  <Link 
                    href="/dashboard" 
                    className="px-4 py-2 rounded-xl bg-[#121212] border border-white/5 hover:border-white/10 text-xs font-semibold hover:text-white transition-all"
                  >
                    App Dashboard
                  </Link>
                  <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-semibold hover:bg-red-900/30 transition-all cursor-pointer"
                  >
                    {formatAddress(wallet.address)} (Disconnect)
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsWalletOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-xs font-bold shadow-[0_4px_12px_rgba(245,180,0,0.15)] hover:opacity-90 transition-all cursor-pointer"
                >
                  Connect Wallet
                </button>
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
        {/* Subtle grid mesh overlay to enhance depth */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,9,9,0)_70%,#090909_100%)] pointer-events-none z-0"></div>

        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-0 md:pt-28 md:pb-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center z-10">
          <div className="lg:col-span-5 space-y-6 flex flex-col items-start text-left">
            <motion.h1
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1] flex flex-wrap justify-start gap-x-[0.25em]"
            >
              {headingWords.map((word, idx) => (
                <motion.span
                  key={idx}
                  variants={wordVariants}
                  className={idx === 2 ? "text-transparent bg-clip-text bg-gradient-to-r from-[#F5B400] via-[#FFD54A] to-amber-200" : "text-white"}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-base md:text-lg text-[#A0A0A0] leading-relaxed max-w-xl"
            >
              Bitcoin-native savings secured by Stacks through non-custodial time-locked vaults. Establish financial discipline and earn penalty-redistributed yields.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-start gap-4 pt-2"
            >
              <Link 
                href="/dashboard"
                className="px-6 py-4 rounded-[16px] bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black font-bold text-sm tracking-wide shadow-[0_4px_16px_rgba(245,180,0,0.2)] hover:opacity-90 transition-all flex items-center gap-2"
              >
                Launch Savings App <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Floating Mockup Phone Centerpiece */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end -mt-8 lg:-mt-24 -mb-36 md:-mb-44 relative z-10">
            <MockupPhone />
          </div>
        </section>
      </div>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest">Core Features</span>
          <h2 className="text-3xl font-bold tracking-tight">Built for Uncompromising Savers</h2>
          <p className="text-sm text-[#A0A0A0]">We combine cryptographic commitment with protocol incentives to encourage long-term focus.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Strands Wavy 3D Animation */}
          <div className="lg:col-span-5 w-full h-[400px] lg:h-[500px] relative bg-gradient-to-b from-[#121212]/50 to-[#0c0c0c]/80 rounded-[32px] border border-white/5 overflow-hidden shadow-2xl flex items-center justify-center group hover:border-[#F5B400]/20 transition-all duration-500">
            <div className="absolute inset-0 z-0 scale-100 group-hover:scale-105 transition-all duration-700">
              <Strands
                colors={["#000000","#fed245","#fed245"]}
                count={3}
                speed={0.5}
                amplitude={1}
                waviness={1}
                thickness={0.7}
                glow={2.6}
                taper={3}
                spread={1}
                intensity={0.35}
                saturation={1.6}
                opacity={0.9}
                scale={1.5}
                glass={false}
                refraction={1}
                dispersion={1}
                glassSize={1}
                hueShift={0}
              />
            </div>
            {/* Ambient gold glow in the center */}
            <div className="absolute w-48 h-48 rounded-full bg-[#F5B400]/5 filter blur-3xl z-10 pointer-events-none"></div>
          </div>

          {/* Right Column: 2x2 Grid of 4 Boxes */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-[20px] bg-[#121212] border border-white/5 flex flex-col gap-4 text-left hover:border-[#F5B400]/25 transition-all shadow-md">
                <div className="w-10 h-10 rounded-lg bg-[#181818] border border-white/5 flex items-center justify-center text-[#F5B400]">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{f.title}</h3>
                  <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 bg-gradient-to-b from-transparent to-[#121212]/30">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Workflow</span>
          <h2 className="text-3xl font-bold tracking-tight">Three Steps to Disciplined Wealth</h2>
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
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 flex justify-center">
          <div className="p-8 rounded-[24px] bg-[#121212]/80 border border-white/5 text-left relative overflow-hidden w-full max-w-sm shadow-xl">
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

        <div className="lg:col-span-7 space-y-6 text-left">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Protocol Philosophy</span>
          <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">Escape the Market Clutter. Commit to Accumulation.</h2>
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
      <section id="security" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 bg-[#121212]/30">
        <div className="text-left max-w-3xl">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Security Architecture</span>
          <h2 className="text-4xl font-bold tracking-tight text-white mt-2 mb-6">Designed for Absolute Custodial Integrity</h2>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">
            Continuum vaults are governed entirely by Stacks Clarity smart contracts. Clarity is a decidable language which prevents common EVM exploits like reentrancy and integer overflows. 
            The contract logic is transparent, deterministic, and immutable. No admin keys can withdraw or freeze your funds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left">
            <h3 className="font-bold text-white text-base">Decidable Language</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Clarity is not compiled to bytecode. The code published on the Stacks blockchain is exactly the source code you read, facilitating validation.
            </p>
          </div>
          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left">
            <h3 className="font-bold text-white text-base">No Reentrancy</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Clarity prevents dynamic calls from calling back into the executing contract, making reentrancy attacks completely impossible by language design.
            </p>
          </div>
          <div className="p-6 rounded-[20px] bg-[#121212] border border-white/5 text-left">
            <h3 className="font-bold text-white text-base">Immutable Rules</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Once deployed, contract parameters cannot be updated, ensuring the 10% penalty and O(1) redistribution structures can never be modified.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Wallets */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-white/5 text-center">
        <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">Supported Wallets</span>
        <h3 className="text-2xl font-bold tracking-tight text-white mt-2 mb-10">Connect Securely via Bitcoin Layer 2 Integrations</h3>
        
        <div className="flex flex-wrap justify-center gap-8 items-center opacity-70">
          {['Leather', 'Xverse', 'Asigna', 'Fordefi'].map((walletName) => (
            <div 
              key={walletName} 
              className="px-6 py-3 rounded-xl bg-[#121212] border border-white/5 text-white font-bold text-sm tracking-wide min-w-[130px]"
            >
              {walletName}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-12">
          <span className="text-[#F5B400] text-xs font-bold uppercase tracking-widest font-mono">FAQ</span>
          <h2 className="text-3xl font-bold tracking-tight mt-1 text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div 
              key={index} 
              className="rounded-[16px] bg-[#121212] border border-white/5 overflow-hidden transition-all duration-300"
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

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#090909] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#121212] border border-white/10 flex items-center justify-center">
              <span className="text-[#F5B400] font-bold text-xs">C</span>
            </div>
            <span className="font-bold tracking-widest text-xs text-white">CONTINUUM</span>
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
    </div>
  );
}
