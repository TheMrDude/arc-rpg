'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import ShareToSocial from './ShareToSocial';

export default function QuestCompletionCelebration({
  show,
  onClose,
  rewards,
  questTitle,
  storyBeat
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  useEffect(() => {
    if (show) {
      // Trigger confetti celebration
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const colors = ['#FFC83D', '#E8B44C', '#FF7B6B', '#57D7F5', '#4F7DF3'];

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });

        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  }, [show]);

  const totalXP = rewards.xp + (rewards.equipment_bonus_xp || 0);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-navy/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="relative kq-card rounded-candy shadow-candy-lg max-w-lg w-full max-h-[90vh] overflow-y-auto border-4 border-gold"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              rotate: [0, -2, 2, -2, 0]
            }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
          >
            {/* Header */}
            <div className="relative text-center pt-8 pb-6 px-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: 1,
                  rotate: 0
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2
                }}
                className="text-8xl mb-4"
              >
                {rewards.level_up ? '⚡' : '🎉'}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="kq-display text-4xl font-black text-coral mb-2"
              >
                Quest Complete!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-hero-blue font-bold px-4"
              >
                {questTitle}
              </motion.p>
            </div>

            {/* Rewards Section */}
            <div className="relative px-6 pb-6">
              {/* XP Reward */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-gold to-coral rounded-candy p-6 mb-4 border-2 border-stone shadow-candy"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-navy">
                      +{totalXP} XP
                    </p>
                    {rewards.equipment_bonus_xp && rewards.equipment_bonus_xp > 0 && (
                      <p className="text-sm font-bold text-navy">
                        (+{rewards.equipment_bonus_xp} equipment bonus)
                      </p>
                    )}
                  </div>
                  <span className="text-5xl">⚡</span>
                </div>
              </motion.div>

              {/* Story beat: one flavor line from the server. Renders nothing
                  if the response did not include one (backwards compatible). */}
              {storyBeat && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="text-center text-sm italic text-navy/60 mb-4 px-2"
                >
                  {storyBeat}
                </motion.p>
              )}

              {/* Gold Reward */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-gold to-[#E8B44C] rounded-candy p-4 mb-4 border-2 border-stone shadow-candy"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xl font-black text-navy">
                    +{rewards.gold} Gold
                  </p>
                  <span className="text-4xl">💰</span>
                </div>
              </motion.div>

              {/* Skill Point Reward */}
              {rewards.skill_points_earned > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.65, type: 'spring', stiffness: 300 }}
                  className="bg-gradient-to-r from-purple to-[#7E22CE] rounded-candy p-4 mb-4 border-2 border-gold shadow-candy"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black text-white">
                        +{rewards.skill_points_earned} Skill Point{rewards.skill_points_earned > 1 ? 's' : ''}!
                      </p>
                      <p className="text-sm font-bold text-gold">
                        Visit the Skill Tree to unlock new abilities!
                      </p>
                    </div>
                    <span className="text-4xl">💎</span>
                  </div>
                </motion.div>
              )}

              {/* Comeback Bonus */}
              {rewards.comeback_bonus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="bg-gradient-to-r from-hero-blue to-emerald rounded-candy p-4 mb-4 border-2 border-stone shadow-candy"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black text-white">
                        Comeback Bonus!
                      </p>
                      <p className="text-sm font-bold text-white">
                        Welcome back! +20 XP
                      </p>
                    </div>
                    <span className="text-4xl">🎊</span>
                  </div>
                </motion.div>
              )}

              {/* Level Up Banner */}
              {rewards.level_up && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
                  className="bg-gradient-to-r from-coral to-gold rounded-candy p-6 mb-4 border-4 border-gold shadow-candy-lg"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: 3
                      }}
                      className="text-6xl mb-2"
                    >
                      ⚡
                    </motion.div>
                    <p className="kq-display text-3xl font-black text-white mb-1">
                      Level Up!
                    </p>
                    <p className="text-2xl font-bold text-white">
                      You are now level {rewards.new_level}!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Share Achievement */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
                className="mb-4"
              >
                <ShareToSocial
                  content={{
                    title: `Just completed "${questTitle}" in HabitQuest and earned ${totalXP} XP! 🎮⚔️`,
                    description: rewards.level_up
                      ? `Leveled up to ${rewards.new_level}! Join me on this epic journey!`
                      : 'Turning boring tasks into legendary quests!',
                    hashtags: ['HabitQuest', 'QuestComplete', 'Gamification', 'Productivity'],
                  }}
                  compact={true}
                  showLabels={true}
                />
              </motion.div>

              {/* Continue Button */}
              <motion.button
                onClick={onClose}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="kq-btn kq-btn-emerald w-full py-4 px-6 text-xl"
              >
                ✨ Continue Your Journey
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center text-sm text-hero-blue mt-4 font-semibold"
              >
                Keep up the great work!
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
