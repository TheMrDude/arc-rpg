'use client';

import { motion, AnimatePresence } from 'framer-motion';

/**
 * Small "+N" text that floats up and fades near a reward counter
 * (gold, XP). Anchored to a target element's position via targetId.
 */
export default function FloatingReward({ show, text, color = '#FFD93D', targetId, reducedMotion }) {
  if (!show) return null;

  const targetEl = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
  const rect = targetEl?.getBoundingClientRect();

  if (!rect) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="pointer-events-none fixed z-[60] font-black text-lg"
        style={{ left: rect.left + rect.width / 2, top: rect.top, color, transform: 'translateX(-50%)' }}
        initial={{ opacity: 1, y: 0 }}
        animate={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -28 }}
        transition={{ duration: reducedMotion ? 0.2 : 0.55, ease: 'easeOut' }}
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
