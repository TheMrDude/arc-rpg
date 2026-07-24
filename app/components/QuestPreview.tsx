'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { PreviewQuest, storePreviewQuest } from '@/lib/onboarding';
import { trackEvent } from '@/lib/analytics';
import { track } from '@/lib/track';

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
      // First-party funnel: demo result viewed.
      track('demo_transform_result_viewed');
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
    easy: 'text-emerald border-emerald bg-emerald/10',
    medium: 'text-gold border-gold bg-gold/10',
    hard: 'text-coral border-coral bg-coral/10'
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
          className="relative w-full max-w-2xl kq-card border-2 border-stone rounded-candy p-8 shadow-candy-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-cream hover:bg-stone border-2 border-hero-blue text-hero-blue text-2xl font-bold transition-colors"
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
            <h2 className="kq-display text-4xl font-black text-hero-blue mb-2">
              Your Quest Awaits...
            </h2>
            <p className="text-navy/60">See how we transform your tasks into epic adventures</p>
          </motion.div>

          {/* Before/After transformation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            {/* Before */}
            <div className="bg-cream border-2 border-stone rounded-2xl p-6 mb-4">
              <p className="text-sm text-navy/50 font-bold mb-2">Before</p>
              <p className="text-lg text-navy/70">{quest.original}</p>
            </div>

            {/* Arrow */}
            <div className="text-center text-5xl my-4">⚡</div>

            {/* After */}
            <div className="bg-gradient-to-br from-coral/10 to-purple/10 border-2 border-coral rounded-2xl p-6">
              <p className="text-sm text-coral font-bold mb-2">After (Epic Quest)</p>
              <p className="text-xl text-navy font-semibold leading-relaxed">
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
            <div className="bg-emerald/10 border-2 border-emerald rounded-2xl px-6 py-3">
              <p className="text-sm text-emerald font-bold">XP Reward</p>
              <p className="text-3xl text-navy font-black">+{quest.xp}</p>
            </div>

            {/* Difficulty Badge */}
            <div className={`border-2 rounded-2xl px-6 py-3 ${difficultyColors[quest.difficulty]}`}>
              <p className="text-sm font-bold">Difficulty</p>
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
            className="bg-purple/10 border-2 border-purple rounded-2xl p-6 mb-8"
          >
            <p className="text-sm text-purple font-bold mb-3">
              📖 This quest becomes part of your story:
            </p>
            <p className="text-navy/70 italic leading-relaxed">
              "Week 1: You emerged from the ordinary realm and conquered your first quest.
              Your legend begins here..."
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.button
            onClick={handleStartAdventure}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="kq-btn kq-btn-gold w-full py-5 text-2xl mb-6"
          >
            🚀 Start My Adventure (Free) →
          </motion.button>

          {/* Benefits */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-navy/60">
            <div className="flex items-center gap-2">
              <span className="text-emerald">✓</span>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald">✓</span>
              <span>Choose character after signup</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald">✓</span>
              <span>Get story this week</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
