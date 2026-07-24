'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useSound } from './SoundProvider';

export default function ChestDropReveal({ show, gold, onClose, reducedMotion }) {
  const firedRef = useRef(false);
  const { play } = useSound();

  useEffect(() => {
    if (show && !firedRef.current) {
      firedRef.current = true;
      play('chest');

      if (!reducedMotion) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FFC83D', '#FF7B6B', '#57D7F5'],
        });
      }
    }

    if (!show) {
      firedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative kq-card rounded-candy p-8 max-w-xs w-full border-2 border-gold text-center shadow-candy-lg"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={reducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 18 }}
          >
            <motion.div
              className="text-6xl mb-3"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={reducedMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 250, damping: 12, delay: 0.1 }}
            >
              🎁
            </motion.div>
            <h3 className="kq-display text-xl text-navy mb-1">
              You found a chest!
            </h3>
            <p className="text-2xl font-black text-emerald mb-6">+{gold} Gold</p>
            <button
              onClick={onClose}
              className="kq-btn kq-btn-emerald w-full"
            >
              Nice
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
