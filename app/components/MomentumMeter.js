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
    <div className="bg-[#1A1A2E] border-2 border-[#48BB78]/50 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-black uppercase tracking-wide text-[#48BB78]">
          Momentum: {filled}/{MOMENTUM_GOAL_DAYS} days this week
        </p>
        {isFull && <span className="text-lg">✨</span>}
      </div>
      <div className="h-3 bg-[#0F3460] rounded-full overflow-hidden border border-[#1A1A2E]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #48BB78, #22d3ee)' }}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-[#94a3b8] mt-1.5">
        {isFull
          ? 'Goal hit. No punishment for missed days, ever, just keep building.'
          : 'Any 4 active days count. Missing a day never resets this.'}
      </p>
    </div>
  );
}
