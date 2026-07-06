'use client';

import { motion } from 'framer-motion';
import { Shield, Sparkles, TrendingUp, Lock } from 'lucide-react';

export default function MockupPhone() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ 
        opacity: 1, 
        y: [0, -12, 0],
      }}
      transition={{
        opacity: { duration: 1.2 },
        y: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
      }}
      className="relative mx-auto w-full max-w-[560px] aspect-[4/3] flex items-center justify-center"
    >
      {/* Mockup Image Frame */}
      <img
        src="/Image0001.png"
        alt="Continuum Vaults Mockup"
        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_20px_50px_rgba(245,180,0,0.15)]"
      />

      {/* Mocked Dashboard Screen Overlay */}
      {/* Absolute positioned, scaled, translated, and rotated to fit the screen inside the Image0001.png */}
      <div 
        className="absolute overflow-hidden bg-[#090909] select-none border border-white/5 shadow-inner"
        style={{
          top: '49%',
          left: '49.8%',
          width: '51%',
          height: '42%',
          transform: 'translate(-50%, -50%) rotate(-35.8deg)',
          borderRadius: '2.5rem',
        }}
      >
        {/* Dynamic Island Notch Cover */}
        <div 
          className="absolute bg-black rounded-full z-20"
          style={{
            top: '7%',
            left: '11.5%',
            width: '18%',
            height: '7%',
          }}
        />

        {/* Screen Container */}
        <div className="relative w-full h-full p-4 flex flex-col justify-between overflow-hidden">
          {/* Glow blob behind phone screen */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F5B400] opacity-10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#FFD54A] opacity-5 rounded-full blur-2xl pointer-events-none"></div>

          {/* Screen Header */}
          <div className="flex items-center justify-between mt-6 z-10">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-[#121212] border border-white/10 flex items-center justify-center">
                <span className="text-[10px] text-[#F5B400] font-bold">C</span>
              </div>
              <span className="text-[9px] tracking-widest font-semibold text-white">CONTINUUM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[8px] text-[#A0A0A0] font-medium font-mono">Mainnet</span>
            </div>
          </div>

          {/* Screen Content */}
          <div className="flex-1 flex flex-col gap-2 justify-center z-10 mt-1">
            {/* Locked Balance Card */}
            <div className="p-3 rounded-xl bg-[#121212] border border-white/5 relative overflow-hidden">
              <div className="text-[8px] text-[#A0A0A0] uppercase tracking-wider font-medium">Total Locked Assets</div>
              <div className="text-base font-bold text-white mt-0.5 flex items-baseline gap-1">
                $36,845<span className="text-[9px] text-emerald-400 font-medium font-mono flex items-center"><TrendingUp className="w-2.5 h-2.5" /> +14.8%</span>
              </div>
              
              <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-white/5">
                <div>
                  <span className="text-[7px] text-[#A0A0A0] block">STX locked</span>
                  <span className="text-[9px] text-white font-semibold">12,450 STX</span>
                </div>
                <div className="border-l border-white/5 pl-2">
                  <span className="text-[7px] text-[#A0A0A0] block">sBTC locked</span>
                  <span className="text-[9px] text-[#F5B400] font-semibold">0.45 sBTC</span>
                </div>
              </div>
            </div>

            {/* Active Vault Tier */}
            <div className="p-2.5 rounded-xl bg-[#181818] border border-white/5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-[#F5B400]" />
                  <span className="text-[9px] text-white font-medium">Vault #04</span>
                </div>
                <span className="text-[7px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">365 Days (2x)</span>
              </div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold text-white">5,000 STX</span>
                <span className="text-[8px] text-emerald-400 font-mono">+124.5 STX Earned</span>
              </div>

              {/* Simulated Progress */}
              <div className="w-full bg-[#121212] h-1 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-[#F5B400] to-[#FFD54A] h-full w-[68%] rounded-full"></div>
              </div>
            </div>

            {/* Rewards APY info */}
            <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-[#181818] flex items-center justify-center border border-white/5">
                  <Sparkles className="w-2.5 h-2.5 text-[#F5B400]" />
                </div>
                <div>
                  <span className="text-[7px] text-[#A0A0A0] block">Redistribution APY</span>
                  <span className="text-[9px] text-white font-bold">18.42%</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[7px] text-[#A0A0A0] block">Unclaimed</span>
                <span className="text-[9px] text-[#F5B400] font-mono font-bold">42.5 STX</span>
              </div>
            </div>
          </div>

          {/* Action Button Mini */}
          <div className="z-10 mt-auto flex flex-col items-center">
            <div className="w-full py-2 rounded-lg bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black text-center text-[9px] font-bold tracking-wide shadow-[0_4px_12px_rgba(245,180,0,0.2)]">
              Create Savings Lock
            </div>
            <div className="flex items-center justify-center gap-1 text-[7px] text-[#A0A0A0] mt-1.5">
              <Shield className="w-2 h-2 text-[#F5B400]" />
              Secured by Stacks Consensus L1
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
