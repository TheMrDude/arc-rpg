'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Small orbs that fly from the point of the completed quest card to the
 * XP bar (element with id="xp-bar-target"), then vanish. Purely decorative,
 * skips entirely under prefers-reduced-motion.
 */
export default function QuestRewardBurst({ show, originX, originY, onComplete, reducedMotion }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!show) return;

    if (reducedMotion) {
      onComplete?.();
      return;
    }

    const xpBarEl = document.getElementById('xp-bar-target');
    const rect = xpBarEl?.getBoundingClientRect();
    setTarget(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);

    const timer = setTimeout(() => onComplete?.(), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show || reducedMotion || !target || originX == null || originY == null) return null;

  const orbCount = 4;

  return (
    <AnimatePresence>
      <div className="pointer-events-none fixed inset-0 z-[60]">
        {Array.from({ length: orbCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: originX,
              top: originY,
              background: i % 2 === 0 ? '#FFD93D' : '#00D4FF',
              boxShadow: '0 0 8px rgba(255,217,61,0.8)',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: target.x - originX,
              y: target.y - originY,
              opacity: 0,
              scale: 0.4,
            }}
            transition={{
              duration: 0.55,
              delay: i * 0.05,
              ease: 'easeIn',
            }}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}
