'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface ActiveStreakLoginProps {
  streakCount: number;
  onComplete: () => void;
}

export default function ActiveStreakLogin({ streakCount, onComplete }: ActiveStreakLoginProps) {
  // Auto-hide after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Generate 8 light rays evenly spaced at 45° intervals
  const lightRays = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    rotation: i * 45, // 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
  }));

  // Generate 20 sparkle particles with random positioning
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100, // Random position as percentage
    y: Math.random() * 100,
    delay: Math.random() * 3, // Random delay up to 3s
    duration: 0.8 + Math.random() * 0.4, // Duration between 0.8-1.2s
    scale: 0.5 + Math.random() * 0.5, // Scale between 0.5-1
  }));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{
        background: 'linear-gradient(to bottom, #1e1b4b 0%, #0f172a 100%)',
      }}
      animate={{
        background: [
          'linear-gradient(to bottom, #1e1b4b 0%, #0f172a 100%)',
          'linear-gradient(to bottom, #fb923c 0%, #fbbf24 50%, #38bdf8 100%)',
        ],
      }}
      transition={{
        duration: 2,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {/* Sun rising from bottom */}
      <motion.div
        className="absolute left-1/2 bottom-0"
        style={{ transformOrigin: 'center' }}
        initial={{ y: 200, x: '-50%' }}
        animate={{ y: -100, x: '-50%' }}
        transition={{
          duration: 2,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {/* Sun glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.5) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            left: '50%',
            top: '50%',
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 2, opacity: 1 }}
          transition={{
            duration: 2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />

        {/* Sun core */}
        <div
          className="rounded-full bg-gradient-to-br from-yellow-300 to-orange-400"
          style={{
            width: 120,
            height: 120,
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Light rays emanating from sun */}
        {lightRays.map((ray) => (
          <motion.div
            key={ray.id}
            className="absolute bg-gradient-to-t from-yellow-300/60 to-transparent"
            style={{
              width: 4,
              height: 300,
              transformOrigin: 'bottom center',
              left: '50%',
              top: '50%',
              transform: `translateX(-50%) rotate(${ray.rotation}deg)`,
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: [0, 1, 0.7] }}
            transition={{
              duration: 1.5,
              delay: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        ))}
      </motion.div>

      {/* Sparkle particles */}
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute text-2xl"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, sparkle.scale, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          ✨
        </motion.div>
      ))}

      {/* Streak count display */}
      <motion.div
        className="relative z-10 text-center px-8"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.8,
          delay: 1.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {/* Animated flame emoji */}
        <motion.div
          className="text-6xl mb-4 inline-block"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [-10, 10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          🔥
        </motion.div>

        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-wide drop-shadow-lg">
          {streakCount} Day Streak!
        </h1>
        <p className="text-lg text-yellow-100 font-bold drop-shadow-md">
          Keep the momentum going!
        </p>
      </motion.div>

      {/* Fade out entire component */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.5,
          delay: 3.5,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      />
    </motion.div>
  );
}
