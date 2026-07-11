'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useContinuumStore } from '../lib/store';

export default function ToastContainer() {
  const { toasts, removeToast } = useContinuumStore();

  const getToastStyles = (type: 'success' | 'error' | 'loading' | 'info') => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          borderColor: 'border-emerald-500/30',
          shadow: 'shadow-[0_8px_30px_rgba(16,185,129,0.15)]',
          glow: 'bg-emerald-500/5',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
          borderColor: 'border-red-500/30',
          shadow: 'shadow-[0_8px_30px_rgba(239,68,68,0.15)]',
          glow: 'bg-red-500/5',
        };
      case 'loading':
        return {
          icon: <Loader2 className="w-4 h-4 text-[#F5B400] animate-spin shrink-0" />,
          borderColor: 'border-[#F5B400]/30',
          shadow: 'shadow-[0_8px_30px_rgba(245,180,0,0.15)]',
          glow: 'bg-[#F5B400]/5',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
          borderColor: 'border-blue-500/30',
          shadow: 'shadow-[0_8px_30px_rgba(59,130,246,0.15)]',
          glow: 'bg-blue-500/5',
        };
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 50, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border bg-[#121212]/90 backdrop-blur-xl ${styles.borderColor} ${styles.shadow} ${styles.glow} max-w-full overflow-hidden`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {styles.icon}
                <span className="text-white text-xs font-semibold tracking-wide leading-snug truncate pr-2">
                  {toast.message}
                </span>
              </div>
              
              {toast.type !== 'loading' && (
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
