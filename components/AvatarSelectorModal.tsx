'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Check, User } from 'lucide-react';
import AvatarImage, { AVATARS_DATA } from './AvatarImage';

interface AvatarSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIndex?: number;
  currentName?: string;
  onSelect: (index: number, name: string) => void;
}

export default function AvatarSelectorModal({
  isOpen,
  onClose,
  currentIndex,
  currentName,
  onSelect
}: AvatarSelectorModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(currentIndex ?? 0);
  const [customName, setCustomName] = useState<string>('');

  useEffect(() => {
    if (currentIndex !== undefined) {
      setSelectedIndex(currentIndex);
    }
  }, [currentIndex, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCustomName(currentName || AVATARS_DATA[selectedIndex]?.name || 'Phantom');
    }
  }, [selectedIndex, isOpen, currentName]);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const selectedAvatar = AVATARS_DATA[index];
    setCustomName(selectedAvatar.name);
  };

  const handleConfirm = () => {
    onSelect(selectedIndex, customName.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-4xl max-h-[90vh] rounded-[24px] bg-[#121212]/90 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl flex flex-col text-white z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#F5B400]" />
                  Choose Your Avatar
                </h2>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  Select an avatar character and customize your profile name.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-[#A0A0A0] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Avatars */}
            <div 
              className="grid grid-cols-3 sm:grid-cols-5 gap-4 overflow-y-auto max-h-[45vh] pr-1 mb-6"
              style={{ perspective: 1000 }}
            >
              {AVATARS_DATA.map((avatar, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <motion.div
                    key={avatar.name}
                    onClick={() => handleSelect(idx)}
                    whileHover={{ 
                      scale: 1.06, 
                      rotateY: 8, 
                      rotateX: -6,
                      z: 10
                    }}
                    transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                    style={{ transformStyle: 'preserve-3d' }}
                    className={`group relative aspect-[4/5] rounded-2xl p-2 cursor-pointer transition-all duration-300 flex flex-col items-center justify-between border ${
                      isSelected
                        ? 'bg-[#F5B400]/10 border-[#F5B400] shadow-[0_0_20px_rgba(245,180,0,0.2)]'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 hover:shadow-[0_8px_24px_rgba(255,255,255,0.05)]'
                    } backdrop-blur-md overflow-hidden`}
                  >
                    {/* Glossy sheen sweep effect */}
                    <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-1000 ease-out group-hover:translate-x-full pointer-events-none" />

                    {/* Sliced Avatar Image */}
                    <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40 relative">
                      <AvatarImage index={idx} className="w-full h-full" />
                    </div>

                    {/* Name */}
                    <div className="text-center w-full mt-2 z-10">
                      <p className={`text-[11px] font-bold tracking-wide truncate ${isSelected ? 'text-[#F5B400]' : 'text-gray-400 group-hover:text-white'}`}>
                        {avatar.name}
                      </p>
                    </div>

                    {/* Selection Mark */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#F5B400] text-black flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Custom Avatar Name Input */}
            <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 max-w-md w-full text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0] mb-2 font-mono">
                  Avatar Profile Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={18}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter a custom name..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#F5B400] focus:ring-1 focus:ring-[#F5B400] text-white text-sm font-bold placeholder-gray-500 outline-none transition-all"
                  />
                  <Edit2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto mt-4 sm:mt-0">
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white font-bold text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!customName.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#F5B400] to-[#FFD54A] text-black font-bold text-sm hover:opacity-90 active:scale-95 shadow-[0_4px_16px_rgba(245,180,0,0.25)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Avatar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
