'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

export default function RegionUnlockNotification({ region, onClose, isMilestone }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (region && isMilestone) {
      // Trigger confetti for milestone regions
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#FFD700', '#FFA500', '#FF6347', '#8B4513'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 3,
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
  }, [region, isMilestone]);

  useEffect(() => {
    // Auto-close after 8 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!region) return null;

  const getRegionIcon = (theme) => {
    const icons = {
      village: '🏡',
      forest: '🌲',
      mountain: '⛰️',
      cave: '🗻',
      library: '📚',
      volcanic: '🌋',
      garden: '🌸',
      shadow: '🌑',
      celestial: '⭐',
      ethereal: '✨'
    };
    return icons[theme] || '📍';
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-gradient-to-br from-amber-50 via-yellow-100 to-amber-100 rounded-xl border-4 border-amber-800 p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            initial={{ scale: 0.5, rotateY: -180, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotateY: 180, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative Corner Ornaments */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-900 opacity-30" />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-amber-900 opacity-30" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-amber-900 opacity-30" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-amber-900 opacity-30" />

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  className="inline-block text-6xl mb-4"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  {getRegionIcon(region.aesthetic_theme)}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-amber-900 mb-2">
                    {isMilestone ? '🎉 MILESTONE UNLOCKED! 🎉' : '✨ New Region Discovered! ✨'}
                  </h2>
                  <h3 className="text-xl font-semibold text-amber-800">
                    {region.name}
                  </h3>
                  <p className="text-sm text-amber-700 uppercase tracking-wider mt-1">
                    {region.region_type?.replace('_', ' ')}
                  </p>
                </motion.div>
              </div>

              {/* Lore Text */}
              <motion.div
                className="bg-amber-100 rounded-lg p-4 border-2 border-amber-300 mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-amber-900 italic text-center leading-relaxed">
                  "{region.lore_text}"
                </p>
              </motion.div>

              {/* Description */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-amber-800 text-center">
                  {region.description}
                </p>
              </motion.div>

              {/* Achievement Badge */}
              {isMilestone && (
                <motion.div
                  className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 rounded-lg p-3 text-center mb-4 border-2 border-yellow-600 shadow-lg"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, type: 'spring' }}
                >
                  <p className="text-amber-900 font-bold text-lg">
                    🏆 Major Achievement Unlocked 🏆
                  </p>
                  <p className="text-amber-800 text-sm">
                    You've reached a significant milestone in your journey!
                  </p>
                </motion.div>
              )}

              {/* Continue Button */}
              <motion.button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-amber-700 to-amber-600 text-white font-bold py-3 px-6 rounded-lg hover:from-amber-800 hover:to-amber-700 transition-all shadow-lg border-2 border-amber-900"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Continue Your Journey
              </motion.button>
            </div>

            {/* Animated Background Elements */}
            <motion.div
              className="absolute -top-10 -right-10 w-40 h-40 bg-amber-300 rounded-full opacity-10"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            <motion.div
              className="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-300 rounded-full opacity-10"
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, -90, 0]
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
