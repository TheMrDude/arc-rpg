'use client';

import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function StreakFlame({
  streakCount,
  hasFreeze = false,
  className = '',
  showAnimation = true
}) {
  const [previousStreak, setPreviousStreak] = useState(streakCount);
  const controls = useAnimation();

  useEffect(() => {
    // Animate number when streak increments
    if (streakCount > previousStreak) {
      controls.start({
        scale: [1, 1.3, 1],
        rotate: [0, 10, -10, 0],
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 17,
          duration: 0.6
        }
      });
    }
    setPreviousStreak(streakCount);
  }, [streakCount, previousStreak, controls]);

  // Flame animation configuration
  const flameAnimation = showAnimation ? {
    scale: [1, 1.2, 1],
    rotate: [-10, 10, -10],
  } : {};

  const flameTransition = {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  };

  return (
    <motion.div
      className={`
        relative inline-block
        bg-gradient-to-br from-orange-50 via-red-50 to-orange-100
        border-2 border-orange-200
        rounded-xl p-4
        shadow-lg
        ${className}
      `}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20
      }}
    >
      {/* Freeze Shield Badge (if active) */}
      {hasFreeze && (
        <motion.div
          className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-2 border-2 border-blue-700 shadow-md z-10"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15
          }}
        >
          <span className="text-xl" role="img" aria-label="Streak Freeze Active">
            🛡️
          </span>
        </motion.div>
      )}

      {/* Content Container */}
      <div className="flex flex-col items-center gap-2">
        {/* Animated Flame Icon */}
        <motion.div
          animate={flameAnimation}
          transition={flameTransition}
          className="text-5xl leading-none"
          role="img"
          aria-label="Streak Flame"
        >
          🔥
        </motion.div>

        {/* Streak Number with Spring Animation */}
        <motion.div
          animate={controls}
          className="text-4xl font-black text-orange-600 leading-none"
        >
          {streakCount}
        </motion.div>

        {/* Label */}
        <div className="text-sm font-bold text-orange-800 uppercase tracking-wide">
          day streak
        </div>

        {/* Freeze Status Text */}
        {hasFreeze && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-md border border-blue-300 mt-1"
          >
            Protected
          </motion.div>
        )}
      </div>

      {/* Pulsing Glow Effect */}
      {streakCount > 0 && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-400 to-red-400 opacity-20 -z-10"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.div>
  );
}

/**
 * Milestone variant with special styling for significant streaks
 */
export function StreakFlameMilestone({
  streakCount,
  milestone,
  hasFreeze = false
}) {
  const isMilestone = streakCount >= milestone;

  return (
    <motion.div
      className="relative"
      animate={isMilestone ? {
        scale: [1, 1.1, 1],
      } : {}}
      transition={{
        duration: 1,
        repeat: Infinity,
        repeatDelay: 2
      }}
    >
      <StreakFlame
        streakCount={streakCount}
        hasFreeze={hasFreeze}
        showAnimation={true}
      />

      {/* Milestone Badge */}
      {isMilestone && (
        <motion.div
          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2
                     bg-purple-500 text-white text-xs font-bold px-3 py-1
                     rounded-full border-2 border-purple-700 shadow-lg whitespace-nowrap"
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
            delay: 0.2
          }}
        >
          🏆 {milestone} Day Milestone!
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Compact variant for smaller spaces (like headers/nav)
 */
export function StreakFlameCompact({
  streakCount,
  hasFreeze = false
}) {
  return (
    <motion.div
      className="
        inline-flex items-center gap-2
        bg-gradient-to-r from-orange-100 to-red-100
        border border-orange-300
        rounded-full px-3 py-1.5
        shadow-sm
      "
      whileHover={{ scale: 1.05 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17
      }}
    >
      {/* Flame Icon (smaller) */}
      <motion.span
        animate={{
          scale: [1, 1.15, 1],
          rotate: [-5, 5, -5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="text-2xl leading-none"
      >
        🔥
      </motion.span>

      {/* Streak Count */}
      <span className="text-lg font-black text-orange-600">
        {streakCount}
      </span>

      {/* Freeze Shield (if active) */}
      {hasFreeze && (
        <span className="text-sm leading-none">
          🛡️
        </span>
      )}
    </motion.div>
  );
}
