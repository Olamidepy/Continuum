'use client';

import { motion } from 'framer-motion';
import { Shield, Sparkles, TrendingUp, Lock } from 'lucide-react';

export default function MockupPhone() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: [0, -15, 0],
        rotate: [0, 1.2, -0.8, 0]
      }}
      transition={{
        opacity: { duration: 1.2 },
        y: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 9, repeat: Infinity, ease: 'easeInOut' }
      }}
      className="relative mx-auto w-full max-w-[310px] aspect-[9/19] bg-[#000000] border-4 border-[#1f1f1f] rounded-[40px] p-3 shadow-[0_25px_60px_-15px_rgba(245,180,0,0.15)] ring-1 ring-white/10 overflow-hidden"
    >
      {/* Speaker and Camera notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#000000] rounded-full flex items-center justify-center gap-2 z-20">
        <div className="w-10 h-1 bg-[#1a1a1a] rounded-full"></div>
        <div className="w-2 h-2 bg-[#1a1a1a] rounded-full"></div>
      </div>

      {/* Screen Container */}
      <div className="relative w-full h-full bg-[#090909] rounded-[32px] pt-6 px-3 pb-3 flex flex-col justify-between overflow-hidden border border-white/5">
        
        {/* Glow blob behind phone screen */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F5B400] opacity-10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#FFD54A] opacity-5 rounded-full blur-2xl pointer-events-none"></div>

        {/* Screen Header */}
        <div className="flex items-center justify-between mt-2 z-10">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[#121212] border border-white/10 flex items-center justify-center">
              <span className="text-[10px] text-[#F5B400] font-bold">C</span>
            </div>
            <span className="text-[10px] tracking-widest font-semibold text-white">CONTINUUM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] text-[#A0A0A0] font-medium font-mono">Mainnet</span>
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 flex flex-col gap-3 justify-center z-10">
          {/* Locked Balance Card */}
          <div className="p-3.5 rounded-2xl bg-[#121212] border border-white/5 relative overflow-hidden">
            <div className="text-[9px] text-[#A0A0A0] uppercase tracking-wider font-medium">Total Locked Assets</div>
            <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-1">
              $36,845<span className="text-[10px] text-emerald-400 font-medium font-mono flex items-center"><TrendingUp className="w-2.5 h-2.5" /> +14.8%</span>
            </div>
            
            <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
              <div>
                <span className="text-[8px] text-[#A0A0A0] block">STX locked</span>
                <span className="text-[10px] text-white font-semibold">12,450 STX</span>
              </div>
              <div className="border-l border-white/5 pl-2">
                <span className="text-[8px] text-[#A0A0A0] block">sBTC locked</span>
                <span className="text-[10px] text-[#F5B400] font-semibold">0.45 sBTC</span>
              </div>
            </div>
          </div>

          {/* Active Vault Tier */}
          <div className="p-3 rounded-2xl bg-[#181818] border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#F5B400]" />
                <span className="text-[10px] text-white font-medium">Vault #04</span>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">365 Days (2x)</span>
            </div>
            
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-white">5,000 STX</span>
              <span className="text-[9px] text-emerald-400 font-mono">+124.5 STX Earned</span>
            </div>

            {/* Simulated Progress */}
            <div className="w-full bg-[#121212] h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#F5B400] to-[#FFD54A] h-full w-[68%] rounded-full"></div>
            </div>
            <div className="flex justify-between text-[8px] text-[#A0A0A0]">
              <span>Progress</span>
              <span className="font-mono">116 blocks left</span>
            </div>
          </div>

          {/* Rewards Panel Mini */}
          <div className="p-3 rounded-2xl bg-[#121212] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#181818] flex items-center justify-center border border-white/5">
                <Sparkles className="w-3 h-3 text-[#F5B400]" />
              </div>
              <div>
                <span className="text-[8px] text-[#A0A0A0] block">Redistribution APY</span>
                <span className="text-[11px] text-white font-bold">18.42%</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-[#A0A0A0] block">Unclaimed Rewards</span>
              <span className="text-[10px] text-[#F5B400] font-mono font-bold">42.5 STX</span>
            </div>
          </div>
        </div>

        {/* Action Button Mini */}
        <div className="z-10 mt-auto">
          <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-center text-[10px] font-bold tracking-wide shadow-[0_4px_12px_rgba(245,180,0,0.2)]">
            Create Savings Lock
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[8px] text-[#A0A0A0] mt-2">
            <Shield className="w-2.5 h-2.5 text-[#F5B400]" />
            Secured by Stacks Consensus L1
          </div>
        </div>

        {/* Screen Footer Home indicator */}
        <div className="w-20 h-1 bg-[#1a1a1a] rounded-full mx-auto mt-2"></div>
      </div>
    </motion.div>
  );
}
