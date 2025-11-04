'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export default function QuestCompletionCelebration({
  show,
  onClose,
  rewards,
  questTitle
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (show) {
      // Trigger confetti celebration
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const colors = ['#E8B44C', '#D4943C', '#FFD93D', '#FF6B6B', '#00D4FF'];

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

      // Play completion sound
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/quest-complete.mp3');
        audioRef.current.volume = 0.5;
      }
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err);
      });

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
            className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="relative bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-[#FFD93D]"
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
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD93D] via-transparent to-[#FF6B6B] opacity-20 animate-pulse" />

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
                className="text-4xl font-black text-[#FFD93D] mb-2 uppercase tracking-wide"
                style={{
                  textShadow: '0 4px 8px rgba(0,0,0,0.5), 0 0 20px rgba(255,217,61,0.5)'
                }}
              >
                Quest Complete!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-[#00D4FF] font-bold px-4"
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
                className="bg-gradient-to-r from-[#FFD93D] to-[#FF6B6B] rounded-2xl p-6 mb-4 border-3 border-[#0F3460] shadow-[0_0_20px_rgba(255,217,61,0.5)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-[#0F3460] uppercase">
                      +{totalXP} XP
                    </p>
                    {rewards.equipment_bonus_xp && rewards.equipment_bonus_xp > 0 && (
                      <p className="text-sm font-bold text-[#0F3460]">
                        (+{rewards.equipment_bonus_xp} equipment bonus)
                      </p>
                    )}
                  </div>
                  <span className="text-5xl">⚡</span>
                </div>
              </motion.div>

              {/* Gold Reward */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-[#FFD93D] to-[#E8B44C] rounded-2xl p-4 mb-4 border-3 border-[#0F3460] shadow-[0_0_15px_rgba(232,180,76,0.4)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xl font-black text-[#0F3460] uppercase">
                    +{rewards.gold} Gold
                  </p>
                  <span className="text-4xl">💰</span>
                </div>
              </motion.div>

              {/* Comeback Bonus */}
              {rewards.comeback_bonus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#48BB78] rounded-2xl p-4 mb-4 border-3 border-[#0F3460] shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black text-white uppercase">
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
                  className="bg-gradient-to-r from-[#FF6B6B] to-[#FFD93D] rounded-2xl p-6 mb-4 border-4 border-[#FFD93D] shadow-[0_0_30px_rgba(255,107,107,0.6)]"
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
                    <p className="text-3xl font-black text-white uppercase mb-1">
                      LEVEL UP!
                    </p>
                    <p className="text-2xl font-bold text-white">
                      You are now level {rewards.new_level}!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Continue Button */}
              <motion.button
                onClick={onClose}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#48BB78] to-[#38A169] text-white font-black text-xl uppercase tracking-wide border-4 border-[#0F3460] shadow-[0_6px_0_#0F3460] hover:shadow-[0_8px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
              >
                ✨ Continue Your Journey
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center text-sm text-[#00D4FF] mt-4 font-semibold"
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
