'use client';

import { motion } from 'framer-motion';

export default function MockupPhone() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 1.05 }}
      animate={{ 
        opacity: 1, 
        y: [0, -18, 0],
        scale: [1.2, 1.24, 1.2],
      }}
      transition={{
        opacity: { duration: 1.2, ease: 'easeOut' },
        y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
      }}
      className="relative mx-auto w-full max-w-[1280px] aspect-[4/3] flex items-center justify-center origin-center lg:origin-right"
    >
      {/* Mockup Image Frame */}
      <img
        src="/Image0001.png"
        alt="Continuum Vaults Mockup"
        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_20px_50px_rgba(245,180,0,0.15)]"
      />
    </motion.div>
  );
}

