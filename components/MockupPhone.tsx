'use client';

import { motion } from 'framer-motion';

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
      className="relative mx-auto w-full max-w-[1120px] aspect-[4/3] flex items-center justify-center"
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

