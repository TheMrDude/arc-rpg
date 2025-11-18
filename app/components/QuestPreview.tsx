'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { PreviewQuest, storePreviewQuest } from '@/lib/onboarding';
import { trackEvent } from '@/lib/analytics';

interface QuestPreviewProps {
  quest: PreviewQuest | null;
  onClose: () => void;
}

export default function QuestPreview({ quest, onClose }: QuestPreviewProps) {
  const router = useRouter();

  useEffect(() => {
    if (quest) {
      trackEvent('preview_modal_opened', {
        xp: quest.xp,
        difficulty: quest.difficulty
      });
    }
  }, [quest]);

  if (!quest) return null;

  const handleStartAdventure = () => {
    // Store quest in localStorage
    storePreviewQuest(quest);

    // Track conversion
    trackEvent('signup_clicked_from_preview', {
      xp: quest.xp,
      difficulty: quest.difficulty
    });

    // Redirect to signup
    router.push('/signup');
  };

  const difficultyColors = {
    easy: 'text-green-400 border-green-500 bg-green-500/20',
    medium: 'text-yellow-400 border-yellow-500 bg-yellow-500/20',
    hard: 'text-red-400 border-red-500 bg-red-500/20'
  };

  const difficultyEmojis = {
    easy: '⚡',
    medium: '🔥',
    hard: '💀'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-4 border-[#00D4FF] rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-[#16213E] hover:bg-[#0F3460] border-2 border-[#00D4FF] text-[#00D4FF] text-2xl font-bold transition-colors"
          >
            ×
          </button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-4">⚔️</div>
            <h2 className="text-4xl font-black text-[#00D4FF] uppercase tracking-wide mb-2">
              Your Quest Awaits...
            </h2>
            <p className="text-gray-400">See how we transform your tasks into epic adventures</p>
          </motion.div>

          {/* Before/After transformation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            {/* Before */}
            <div className="bg-[#0F3460]/50 border-2 border-gray-600 rounded-lg p-6 mb-4">
              <p className="text-sm text-gray-400 uppercase font-bold mb-2">Before</p>
              <p className="text-lg text-gray-300">{quest.original}</p>
            </div>

            {/* Arrow */}
            <div className="text-center text-5xl my-4">⚡</div>

            {/* After */}
            <div className="bg-gradient-to-br from-[#FF6B4A]/20 to-[#9B59B6]/20 border-3 border-[#FF6B4A] rounded-lg p-6">
              <p className="text-sm text-[#FF6B4A] uppercase font-bold mb-2">After (Epic Quest)</p>
              <p className="text-xl text-white font-semibold leading-relaxed">
                {quest.transformed}
              </p>
            </div>
          </motion.div>

          {/* Rewards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 mb-8"
          >
            {/* XP Badge */}
            <div className="bg-[#10B981]/20 border-2 border-[#10B981] rounded-lg px-6 py-3">
              <p className="text-sm text-[#10B981] uppercase font-bold">XP Reward</p>
              <p className="text-3xl text-white font-black">+{quest.xp}</p>
            </div>

            {/* Difficulty Badge */}
            <div className={`border-2 rounded-lg px-6 py-3 ${difficultyColors[quest.difficulty]}`}>
              <p className="text-sm uppercase font-bold">Difficulty</p>
              <p className="text-3xl font-black">
                {difficultyEmojis[quest.difficulty]} {quest.difficulty}
              </p>
            </div>
          </motion.div>

          {/* Story snippet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0F3460]/50 border-2 border-[#7C3AED] rounded-lg p-6 mb-8"
          >
            <p className="text-sm text-[#7C3AED] uppercase font-bold mb-3">
              📖 This quest becomes part of your story:
            </p>
            <p className="text-gray-300 italic leading-relaxed">
              "Week 1: You emerged from the ordinary realm and conquered your first quest.
              Your legend begins here..."
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.button
            onClick={handleStartAdventure}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 bg-gradient-to-r from-[#FF6B4A] to-[#FF5733] hover:from-[#FF5733] hover:to-[#E74C3C] text-white border-3 border-[#0F3460] rounded-xl font-black text-2xl uppercase tracking-wide shadow-lg shadow-[#FF6B4A]/50 transition-all mb-6"
          >
            🚀 Start My Adventure (Free) →
          </motion.button>

          {/* Benefits */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-[#10B981]">✓</span>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#10B981]">✓</span>
              <span>Choose character after signup</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#10B981]">✓</span>
              <span>Get story this week</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
