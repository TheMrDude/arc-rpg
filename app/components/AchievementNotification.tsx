'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getRarityColor } from '@/lib/achievements';

interface Achievement {
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
}

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export default function AchievementNotification({
  achievement,
  onClose,
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);

      // Fire confetti for epic and legendary
      if (achievement.rarity === 'epic' || achievement.rarity === 'legendary') {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.4 },
          colors: ['#FFD700', '#FFA500', '#9D4EDD', '#7209B7'],
        });
      }

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  const colors = getRarityColor(achievement.rarity);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
        >
          <div
            className={`kq-card bg-white rounded-candy shadow-candy-lg p-4 border-2 ${colors.border}`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-5xl"
              >
                {achievement.icon}
              </motion.div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="kq-display text-xl font-black text-navy">
                    Achievement Unlocked!
                  </h3>
                  <button
                    onClick={() => {
                      setIsVisible(false);
                      setTimeout(onClose, 300);
                    }}
                    className="text-navy/40 hover:text-navy transition-colors"
                  >
                    ×
                  </button>
                </div>
                <p className="text-navy font-bold mb-1">{achievement.title}</p>
                <p className="text-navy/60 text-sm mb-2">{achievement.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-gold text-sm font-black">
                    +{achievement.xp_reward} XP
                  </span>
                  <span className="kq-chip text-navy/60 text-xs font-bold">
                    {achievement.rarity}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar animation */}
            <div className="h-1.5 bg-stone rounded-full mt-3 overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="h-full bg-gold rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
