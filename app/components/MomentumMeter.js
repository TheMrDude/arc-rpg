'use client';

import { motion } from 'framer-motion';
import { computeActiveDays, MOMENTUM_GOAL_DAYS } from '@/lib/momentum';

export default function MomentumMeter({ quests, profile, reducedMotion }) {
  if (!profile) return null;

  const activeDays = computeActiveDays(quests || [], profile.momentum_boost_week);
  const filled = Math.min(activeDays, MOMENTUM_GOAL_DAYS);
  const progress = filled / MOMENTUM_GOAL_DAYS;
  const isFull = activeDays >= MOMENTUM_GOAL_DAYS;

  return (
    <div className="kq-card p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-emerald">
          Momentum: {filled}/{MOMENTUM_GOAL_DAYS} days this week
        </p>
        {isFull && <span className="text-lg">✨</span>}
      </div>
      <div className="h-3 bg-cream rounded-full overflow-hidden border border-stone">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #34D399, #57D7F5)' }}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-navy/60 mt-1.5">
        {isFull
          ? 'Goal hit. No punishment for missed days, ever, just keep building.'
          : 'Any 4 active days count. Missing a day never resets this.'}
      </p>
    </div>
  );
}
