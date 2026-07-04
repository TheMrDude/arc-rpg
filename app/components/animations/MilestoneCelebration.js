'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useSound } from '../SoundProvider';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';


// Unlock data for different levels
const LEVEL_UNLOCKS = {
  5: {
    title: 'Novice Adventurer',
    unlocks: [
      '🔄 Recurring Quests - Set up daily, weekly habits',
      '🐾 First Companion - Unlock your first companion pet',
      '🛡️ Streak Freeze Shop - Protect your streak'
    ]
  },
  10: {
    title: 'Seasoned Hero',
    unlocks: [
      '⚔️ Archetype Selection - Choose your hero class',
      '📋 Quest Templates - Save and reuse quest patterns',
      '📖 Weekly Stories - Get personalized narrative chapters'
    ]
  },
  15: {
    title: 'Master Questor',
    unlocks: [
      '🎨 Custom Categories - Organize quests your way',
      '🔍 Advanced Filters - Powerful quest management',
      '😊 Mood Tracking - Track emotional patterns'
    ]
  },
  20: {
    title: 'Legendary Champion',
    unlocks: [
      '👥 Party Quests - Collaborate with friends',
      '🔌 API Access - Integrate with other apps',
      '⚜️ Legendary Equipment - Exclusive power-ups'
    ]
  },
  25: {
    title: 'Immortal Legend',
    unlocks: [
      '👑 Custom Avatar Designer - Create unique character art',
      '🎯 Advanced Analytics - Deep insights into your progress',
      '✨ Exclusive Badge Collection - Rare achievements unlocked'
    ]
  }
};

export default function MilestoneCelebration({
  show,
  onClose,
  milestone,
  type,
  unlocks: customUnlocks
}) {
  const [canClose, setCanClose] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const { play } = useSound();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (show) {
      // Prevent closing for first 1.5 seconds — this is meant to feel like
      // an event, not a toast, so it intentionally holds past the 800ms cap
      // that applies to the rest of the celebration juice.
      setCanClose(false);
      const timer = setTimeout(() => {
        setCanClose(true);
      }, 1500);

      if (!reducedMotion) {
        // Start continuous confetti
        setConfettiActive(true);
        const confettiDuration = 3000;
        const confettiEnd = Date.now() + confettiDuration;

        const colors = type === 'level'
          ? ['#E8B44C', '#D4943C', '#FFD93D', '#FF6B6B']
          : type === 'streak'
          ? ['#FF6B35', '#F7931E', '#FDC830', '#F37335']
          : ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'];

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

          if (Date.now() < confettiEnd) {
            requestAnimationFrame(frame);
          } else {
            setConfettiActive(false);
          }
        };

        frame();
      }

      play(type === 'level' ? 'level-up' : 'streak-milestone');

      return () => clearTimeout(timer);
    }
  }, [show, type]);

  const handleClose = () => {
    if (canClose) {
      onClose();
    }
  };

  // Get emoji based on type
  const getEmoji = () => {
    switch (type) {
      case 'level':
        return '⚡';
      case 'streak':
        return '🔥';
      case 'achievement':
        return '🏆';
      default:
        return '✨';
    }
  };

  // Get title based on type
  const getTitle = () => {
    switch (type) {
      case 'level':
        return 'Level Up!';
      case 'streak':
        return `${milestone}-Day Streak!`;
      case 'achievement':
        return 'Achievement Unlocked!';
      default:
        return 'Milestone Reached!';
    }
  };

  // Get unlocks list
  const unlocksToShow = customUnlocks ||
    (type === 'level' && LEVEL_UNLOCKS[milestone]?.unlocks) ||
    [];

  const levelTitle = type === 'level' && LEVEL_UNLOCKS[milestone]?.title;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dark Overlay */}
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ cursor: canClose ? 'pointer' : 'not-allowed' }}
          />

          {/* Modal Card */}
          <motion.div
            className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, rotateZ: -5 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotateZ: [0, 5, -5, 0]
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
          >
            {/* Header Section */}
            <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-12 text-center relative overflow-hidden">
              {/* Background Animation */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-red-400 to-pink-500 opacity-50"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 180, 270, 360]
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {type === 'level' ? (
                <>
                  {/* Huge level numeral — this is the moment, not the emoji */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-xl font-black text-white uppercase tracking-widest relative z-10 mb-1"
                  >
                    Level Up
                  </motion.p>
                  <motion.h1
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.2 }}
                    className="text-8xl sm:text-9xl font-black text-white relative z-10 leading-none"
                    style={{ textShadow: '0 6px 16px rgba(0,0,0,0.4), 0 0 40px rgba(255,217,61,0.6)' }}
                  >
                    {milestone}
                  </motion.h1>
                  {levelTitle && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-xl text-white mt-3 font-semibold relative z-10"
                    >
                      {levelTitle}
                    </motion.p>
                  )}
                </>
              ) : (
                <>
                  {/* Emoji */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{
                      scale: 1,
                      rotate: 0
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 12,
                      delay: 0.2
                    }}
                    className="text-9xl mb-4 relative z-10"
                  >
                    {getEmoji()}
                  </motion.div>

                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-5xl font-black text-white mb-2 relative z-10"
                    style={{
                      textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    {getTitle()}
                  </motion.h1>
                </>
              )}

              {type === 'streak' && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl text-white font-bold relative z-10"
                >
                  {milestone} days of dedication!
                </motion.p>
              )}
            </div>

            {/* Body Content */}
            <div className="p-8">
              {/* Congratulatory Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center mb-6"
              >
                <p className="text-xl text-gray-700 leading-relaxed">
                  {type === 'level' && "You've grown stronger! Your journey continues with new powers:"}
                  {type === 'streak' && "Your consistency is legendary! Keep building your momentum:"}
                  {type === 'achievement' && "You've earned something special!"}
                </p>
              </motion.div>

              {/* Unlocks List */}
              {unlocksToShow.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-6"
                >
                  <h3 className="text-2xl font-black text-gray-800 mb-4 text-center">
                    🎁 New Unlocks
                  </h3>

                  <div className="space-y-3">
                    {unlocksToShow.map((unlock, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.8 + (index * 0.1),
                          type: 'spring',
                          stiffness: 300
                        }}
                        className="bg-white rounded-xl p-4 shadow-md border-2 border-purple-200 hover:border-purple-400 transition-colors"
                      >
                        <p className="text-gray-800 font-semibold text-lg">
                          {unlock}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Stats Display (for levels) */}
              {type === 'level' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 }}
                  className="grid grid-cols-2 gap-4 mb-6"
                >
                  <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl p-4 text-center border-2 border-yellow-300">
                    <div className="text-3xl mb-1">⚡</div>
                    <div className="text-2xl font-black text-orange-600">
                      Level {milestone}
                    </div>
                    <div className="text-sm font-semibold text-orange-800">
                      Power Level
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4 text-center border-2 border-green-300">
                    <div className="text-3xl mb-1">🎯</div>
                    <div className="text-2xl font-black text-green-600">
                      {unlocksToShow.length}
                    </div>
                    <div className="text-sm font-semibold text-green-800">
                      Features Unlocked
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <motion.button
                  onClick={handleClose}
                  disabled={!canClose}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: canClose ? 1 : 0.5, y: 0 }}
                  transition={{ delay: 1 }}
                  whileHover={canClose ? { scale: 1.05 } : {}}
                  whileTap={canClose ? { scale: 0.95 } : {}}
                  className={`
                    w-full py-4 px-6 rounded-xl
                    font-black text-xl uppercase tracking-wide
                    border-4
                    transition-all duration-200
                    ${canClose
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-900 text-white cursor-pointer hover:shadow-xl'
                      : 'bg-gray-300 border-gray-500 text-gray-500 cursor-not-allowed'
                    }
                  `}
                  style={{
                    boxShadow: canClose ? '0 4px 0 #581c87' : 'none'
                  }}
                >
                  {canClose ? '✨ Continue Your Journey' : '⏳ Celebrating...'}
                </motion.button>

                {/* Share Achievement */}
                {canClose && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    whileHover={{ scale: 1.02 }}
                    className="w-full py-3 px-6 rounded-xl font-bold text-purple-600 border-2 border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    📢 Share Achievement
                  </motion.button>
                )}
              </div>

              {/* Cannot Close Message */}
              {!canClose && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm text-gray-500 mt-4"
                >
                  Savor this moment... ✨
                </motion.p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact celebration for smaller milestones
 */
export function MilestoneCelebrationCompact({
  show,
  onClose,
  title,
  message
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-20 right-4 z-50 max-w-sm"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
        >
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl p-6 text-white">
            <h3 className="text-2xl font-black mb-2">🎉 {title}</h3>
            <p className="text-lg">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
