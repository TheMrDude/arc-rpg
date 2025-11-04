'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface StreakFreezeActivationProps {
  show: boolean;
  onClose: () => void;
  streakCount: number;
}

/**
 * Modal that displays when a streak freeze automatically activates
 * Shows celebration and relief (not guilt) - user made a smart investment!
 */
export default function StreakFreezeActivation({
  show,
  onClose,
  streakCount
}: StreakFreezeActivationProps) {
  useEffect(() => {
    if (show) {
      // Trigger confetti celebration (relief confetti - cooler colors)
      const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE', '#8B5CF6'];

      const duration = 3000;
      const animationEnd = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: colors
        });

        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: colors
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

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
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
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
            {/* Header Background */}
            <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 p-8 text-center">
              {/* Shield Animation */}
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
                🛡️
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black text-white mb-2"
              >
                Streak Protected!
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-lg text-blue-100"
              >
                Your streak freeze saved your progress!
              </motion.p>
            </div>

            {/* Body Content */}
            <div className="p-8">
              {/* Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center mb-6"
              >
                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                  You missed a day, but your <span className="font-bold text-blue-600">Streak Freeze</span> automatically
                  protected your <span className="font-black text-2xl text-orange-600">{streakCount}-day</span> streak!
                </p>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-900 font-semibold">
                    💡 Smart investment! Keep building your legend.
                  </p>
                </div>
              </motion.div>

              {/* Streak Display */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
                className="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-6 mb-6"
              >
                <div className="flex items-center justify-center gap-4">
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [-10, 10, -10]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                    className="text-5xl"
                  >
                    🔥
                  </motion.span>

                  <div className="text-center">
                    <div className="text-4xl font-black text-orange-600">
                      {streakCount}
                    </div>
                    <div className="text-sm font-bold text-orange-800 uppercase">
                      Day Streak
                    </div>
                    <div className="text-xs text-orange-700 mt-1">
                      Still Going Strong!
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Call to Action */}
              <motion.button
                onClick={onClose}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="
                  w-full py-4 px-6 rounded-xl
                  bg-gradient-to-r from-blue-500 to-indigo-600
                  text-white font-black text-lg uppercase
                  border-4 border-blue-900
                  shadow-lg hover:shadow-xl
                  transition-all duration-200
                "
                style={{
                  boxShadow: '0 4px 0 #1e3a8a'
                }}
              >
                Continue Your Journey
              </motion.button>

              {/* Reminder Text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-xs text-gray-500 text-center mt-4"
              >
                Don't forget to complete a quest today to keep your streak alive!
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact notification variant (less intrusive)
 * Good for subsequent freeze activations
 */
export function StreakFreezeActivationToast({
  show,
  onClose,
  streakCount
}: StreakFreezeActivationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

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
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border-4 border-blue-500 p-4">
            <div className="flex items-start gap-3">
              {/* Shield Icon */}
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
                className="text-4xl flex-shrink-0"
              >
                🛡️
              </motion.div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-black text-blue-900 text-lg mb-1">
                  Streak Protected!
                </h3>
                <p className="text-sm text-gray-700">
                  Your {streakCount}-day streak was saved by a Streak Freeze
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
