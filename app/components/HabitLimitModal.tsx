'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FREE_TIER_QUEST_LIMIT } from '@/lib/quest-limits';

interface HabitLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentHabits: number;
}

export default function HabitLimitModal({ isOpen, onClose, onUpgrade, currentHabits }: HabitLimitModalProps) {
  // Third close path, alongside the backdrop tap and the dismiss button. This
  // app is used by children, so an upgrade prompt must never be a dead end.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

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
            {/* Previously sold "Boss battles & equipment shop" and "Quest
                chains & journal" as Pro unlocks. Boss battles and quest chains
                are free at level 1, so this was selling the reader things they
                already had. */}
            <h2 className="kq-display text-2xl font-black text-navy mb-3">
              You&apos;ve got {currentHabits} habits on the go
            </h2>
            <p className="text-navy/60 mb-2">
              That&apos;s the free tier, and it&apos;s a lot. Pro removes the limit and adds
              the gear shop, so your hero can start kitting out.
            </p>
            <p className="text-coral font-bold mb-6">
              It&apos;s also what keeps HabitQuest ad-free.
            </p>

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
              I'll stick with {FREE_TIER_QUEST_LIMIT} habits for now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
