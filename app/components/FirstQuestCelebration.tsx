'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { trackEvent } from '@/lib/analytics';

interface FirstQuestCelebrationProps {
  xp: number;
  onContinue: () => void;
}

export default function FirstQuestCelebration({ xp, onContinue }: FirstQuestCelebrationProps) {
  useEffect(() => {
    // Track the completion
    trackEvent('first_quest_completed', { xp });

    // Fire confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        particleCount,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B4A', '#00D4FF', '#9B59B6', '#10B981', '#FCD34D']
      });

      confetti({
        particleCount,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FF6B4A', '#00D4FF', '#9B59B6', '#10B981', '#FCD34D']
      });

      confetti({
        particleCount,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF6B4A', '#00D4FF', '#9B59B6', '#10B981', '#FCD34D']
      });
    }, 250);

    return () => clearInterval(interval);
  }, [xp]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        className="relative w-full max-w-lg bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-4 border-[#FFD93D] rounded-2xl p-12 text-center shadow-2xl"
      >
        {/* Animated stars */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                repeatDelay: Math.random() * 3
              }}
              className="absolute w-2 h-2 bg-[#FFD93D] rounded-full"
            />
          ))}
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-8xl mb-6">🎉</div>

          <h2 className="text-4xl sm:text-5xl font-black text-[#FFD93D] uppercase tracking-wide mb-4">
            Quest Complete!
          </h2>

          <p className="text-xl text-gray-300 mb-6">
            You've earned your first XP and started your legendary journey!
          </p>

          {/* XP Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className="inline-block bg-gradient-to-r from-[#10B981] to-[#059669] border-4 border-[#FFD93D] rounded-xl px-8 py-4 mb-8"
          >
            <p className="text-sm text-[#FFD34D] uppercase font-bold mb-1">XP Earned</p>
            <p className="text-6xl text-white font-black">+{xp}</p>
          </motion.div>

          {/* Level up indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-2xl">⚡</span>
              <p className="text-lg text-[#00D4FF] font-bold">Level 1 Progress</p>
              <span className="text-2xl">⚡</span>
            </div>
            <div className="w-full bg-[#0F3460] rounded-full h-4 overflow-hidden border-2 border-[#00D4FF]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(xp / 100) * 100}%` }}
                transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#00D4FF] to-[#7C3AED]"
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">{xp}/100 XP to Level 2</p>
          </motion.div>

          {/* CTA Button */}
          <motion.button
            onClick={onContinue}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-4 bg-gradient-to-r from-[#FF6B4A] to-[#FF5733] hover:from-[#FF5733] hover:to-[#E74C3C] text-white border-3 border-[#0F3460] rounded-xl font-black text-xl uppercase tracking-wide shadow-lg transition-all"
          >
            ⚔️ Choose Your Character Class →
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
