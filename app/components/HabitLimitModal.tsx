'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface HabitLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentHabits: number;
}

export default function HabitLimitModal({ isOpen, onClose, onUpgrade, currentHabits }: HabitLimitModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-3 border-[#F59E0B] rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_40px_rgba(245,158,11,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">&#x2694;&#xFE0F;</div>
            <h2 className="text-2xl font-black text-[#F59E0B] uppercase mb-3">
              You've Mastered the Starter Path!
            </h2>
            <p className="text-gray-300 mb-2">
              You're tracking {currentHabits} habits — that's impressive!
            </p>
            <p className="text-[#FF6B35] font-bold mb-6">
              Ready for unlimited quests and the full RPG experience?
            </p>

            <div className="space-y-3 text-left mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-[#10B981]">&#x2713;</span> Unlimited habits & quests
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-[#10B981]">&#x2713;</span> Boss battles & equipment shop
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-[#10B981]">&#x2713;</span> Quest chains & journal
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-[#10B981]">&#x2713;</span> 7-day free trial available
              </div>
            </div>

            <button
              onClick={onUpgrade}
              className="w-full px-6 py-4 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:scale-105 mb-3"
            >
              Unlock Pro — $5/mo
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-500 hover:text-gray-300 text-sm font-bold transition-colors"
            >
              I'll stick with 3 habits for now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
