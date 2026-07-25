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
          className="fixed inset-0 bg-navy/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="kq-card border-2 border-gold rounded-candy p-8 max-w-md w-full text-center shadow-candy-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">&#x2694;&#xFE0F;</div>
            <h2 className="kq-display text-2xl font-black text-navy mb-3">
              You've Mastered the Starter Path!
            </h2>
            <p className="text-navy/60 mb-2">
              You're tracking {currentHabits} habits, that's impressive!
            </p>
            <p className="text-coral font-bold mb-6">
              Ready for unlimited quests and the full experience?
            </p>

            <div className="space-y-3 text-left mb-6">
              <div className="flex items-center gap-3 text-sm text-navy/70">
                <span className="text-emerald">&#x2713;</span> Unlimited habits & quests
              </div>
              <div className="flex items-center gap-3 text-sm text-navy/70">
                <span className="text-emerald">&#x2713;</span> Boss battles & equipment shop
              </div>
              <div className="flex items-center gap-3 text-sm text-navy/70">
                <span className="text-emerald">&#x2713;</span> Quest chains & journal
              </div>
              <div className="flex items-center gap-3 text-sm text-navy/70">
                <span className="text-emerald">&#x2713;</span> 7-day free trial available
              </div>
            </div>

            <button
              onClick={onUpgrade}
              className="kq-btn kq-btn-gold w-full text-lg mb-3"
            >
              Unlock Pro for $5/mo
            </button>
            <button
              onClick={onClose}
              className="w-full text-navy/40 hover:text-navy/70 text-sm font-bold transition-colors"
            >
              I'll stick with 3 habits for now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
