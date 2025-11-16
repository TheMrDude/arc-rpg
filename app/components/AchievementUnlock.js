'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { getTierColors } from '@/lib/achievements';

export default function AchievementUnlock({ achievements, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [show, setShow] = useState(true);

  const currentAchievement = achievements && achievements.length > 0 ? achievements[currentIndex] : null;

  useEffect(() => {
    if (currentAchievement) {
      // Trigger confetti based on tier
      const duration = currentAchievement.tier === 'diamond' || currentAchievement.tier === 'platinum' ? 4000 : 2000;
      const colors = getTierColorArray(currentAchievement.tier);

      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: currentAchievement.tier === 'diamond' ? 5 : 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: currentAchievement.tier === 'diamond' ? 5 : 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [currentIndex, currentAchievement]);

  useEffect(() => {
    // Auto-close or move to next achievement
    const timer = setTimeout(() => {
      if (currentIndex < achievements.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        handleClose();
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentIndex, achievements.length]);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  if (!currentAchievement) return null;

  const tierColors = getTierColors(currentAchievement.tier);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleNext}
        >
          <motion.div
            className={`${tierColors.bg} rounded-xl border-4 ${tierColors.border} p-8 max-w-md w-full ${tierColors.glow} relative overflow-hidden`}
            initial={{ scale: 0.3, rotateY: -180, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            exit={{ scale: 0.3, rotateY: 180, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Background */}
            <motion.div
              className="absolute inset-0 opacity-20"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
                rotate: [0, 360]
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }}
            />

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  className="inline-block text-7xl mb-4"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: [0, 1.2, 1], rotate: [0, 0, 0] }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  {currentAchievement.icon}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className={`text-3xl font-black uppercase mb-2 ${tierColors.text}`}>
                    Achievement Unlocked!
                  </h2>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className={`text-sm font-bold uppercase px-3 py-1 rounded-full border-2 ${tierColors.border} ${tierColors.text}`}>
                      {currentAchievement.tier}
                    </span>
                  </div>
                  <h3 className={`text-2xl font-bold ${tierColors.text}`}>
                    {currentAchievement.name}
                  </h3>
                </motion.div>
              </div>

              {/* Description */}
              <motion.div
                className={`bg-black bg-opacity-30 rounded-lg p-4 mb-4 border-2 ${tierColors.border}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className={`text-center ${tierColors.text} font-medium`}>
                  {currentAchievement.description}
                </p>
              </motion.div>

              {/* Rewards */}
              <motion.div
                className="flex justify-center gap-4 mb-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                {currentAchievement.xp_reward > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-black bg-opacity-30 border-2 ${tierColors.border}`}>
                    <span className="text-2xl">⚡</span>
                    <div>
                      <div className={`text-xs ${tierColors.text} opacity-75`}>XP Gained</div>
                      <div className={`text-lg font-bold ${tierColors.text}`}>+{currentAchievement.xp_reward}</div>
                    </div>
                  </div>
                )}
                {currentAchievement.gold_reward > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-black bg-opacity-30 border-2 ${tierColors.border}`}>
                    <span className="text-2xl">💰</span>
                    <div>
                      <div className={`text-xs ${tierColors.text} opacity-75`}>Gold Earned</div>
                      <div className={`text-lg font-bold ${tierColors.text}`}>+{currentAchievement.gold_reward}</div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Progress Indicator */}
              {achievements.length > 1 && (
                <div className={`text-center text-sm ${tierColors.text} mb-4 opacity-75`}>
                  {currentIndex + 1} of {achievements.length} achievements unlocked
                </div>
              )}

              {/* Continue Button */}
              <motion.button
                onClick={handleNext}
                className={`w-full ${tierColors.text} font-black py-3 px-6 rounded-lg border-3 ${tierColors.border} bg-black bg-opacity-20 hover:bg-opacity-30 transition-all shadow-lg`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {currentIndex < achievements.length - 1 ? 'Next Achievement' : 'Continue'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getTierColorArray(tier) {
  const colors = {
    bronze: ['#D97706', '#B45309', '#92400E'],
    silver: ['#9CA3AF', '#6B7280', '#4B5563'],
    gold: ['#FBBF24', '#F59E0B', '#D97706'],
    platinum: ['#22D3EE', '#06B6D4', '#0891B2'],
    diamond: ['#A855F7', '#EC4899', '#3B82F6']
  };
  return colors[tier] || colors.bronze;
}
