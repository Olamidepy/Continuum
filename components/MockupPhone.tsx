'use client';

import { motion } from 'framer-motion';

export default function MockupPhone() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 1.0 }}
      animate={{ 
        opacity: 1, 
        y: [0, -10, 0],
        scale: [1.0, 1.03, 1.0],
      }}
      transition={{
        opacity: { duration: 1.2, ease: 'easeOut' },
        y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
      }}
      className="relative mx-auto lg:mr-0 lg:ml-auto w-full max-w-[295px] xs:max-w-[355px] sm:max-w-[460px] lg:max-w-[720px] flex items-center justify-center origin-center lg:origin-right"
    >
      {/* Premium Showcase GIF Frame */}
      <img
        src="/iPhone 17 - 6.gif"
        alt="Continuum Premium Showcase"
        className="w-full h-auto object-contain pointer-events-none"
      />
    </motion.div>
  );
}

