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
          colors: ['#FFD93D', '#E8B44C', '#00D4FF'],
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
            className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative bg-gradient-to-br from-[#1A1A2E] to-[#0F3460] rounded-2xl p-8 max-w-xs w-full border-4 border-[#FFD93D] text-center shadow-[0_0_30px_rgba(255,217,61,0.5)]"
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
            <h3 className="text-xl font-black text-[#FFD93D] uppercase tracking-wide mb-1">
              You found a chest!
            </h3>
            <p className="text-2xl font-black text-white mb-6">+{gold} Gold</p>
            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-xl bg-[#48BB78] hover:bg-[#38A169] text-white font-black uppercase tracking-wide border-3 border-[#0F3460] shadow-[0_4px_0_#0F3460] hover:-translate-y-0.5 active:translate-y-1 transition-all"
            >
              Nice
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
