'use client';

import { motion } from 'framer-motion';
import { STAGE_THRESHOLDS } from '@/lib/companions';

/**
 * Living Companion card. A creature that grows with total quests
 * completed and is always glad to see you. No decay, no guilt: away
 * time just means it naps until your next quest wakes it.
 */
export default function CompanionCard({ companion, reducedMotion = false, onRename }) {
  if (!companion) return null;

  const {
    emoji,
    name,
    speciesName,
    customName,
    stage,
    stageTitle,
    questsCompleted,
    nextEvolveIn,
    nextStageTitle,
    nextThreshold,
    mood,
  } = companion;

  const maxStage = stage >= STAGE_THRESHOLDS.length - 1;

  // Progress within the current stage (egg -> next threshold, etc.)
  const prevThreshold = STAGE_THRESHOLDS[stage] || 0;
  const span = nextThreshold ? nextThreshold - prevThreshold : 1;
  const into = Math.min(span, Math.max(0, (questsCompleted || 0) - prevThreshold));
  const progressPercent = maxStage ? 100 : Math.max(8, Math.round((into / span) * 100));

  return (
    <div className="kq-card border-2 border-emerald/30 p-5 mb-6">
      <div className="flex items-center gap-4">
        <motion.span
          className="text-5xl select-none"
          animate={
            reducedMotion
              ? {}
              : stage === 0
              ? { rotate: [0, -4, 4, 0] }
              : { y: [0, -4, 0] }
          }
          transition={{ duration: stage === 0 ? 2.4 : 2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          {emoji}
        </motion.span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="kq-display text-lg font-bold text-emerald">
              {name}
            </h3>
            <span className="kq-chip text-[10px] font-bold text-navy/60 bg-cream border border-stone">
              {/* Once a companion has a nickname, the chip carries the species
                  so the creature it actually is never disappears. */}
              {customName ? speciesName : 'Companion'}
            </span>
          </div>

          {/* Renaming stays available forever, not just at the arrival moment.
              Wording covers both cases: never named, or named and changing. */}
          {onRename && (
            <button
              type="button"
              onClick={onRename}
              style={{ minHeight: 44, touchAction: 'manipulation' }}
              className="text-xs font-bold text-navy/50 hover:text-emerald underline"
            >
              {customName ? 'Change name' : 'Give them a name'}
            </button>
          )}

          <p className="text-sm text-navy/70 mt-1">{mood}</p>

          {maxStage ? (
            <p className="text-xs text-gold font-bold mt-2">
              🌟 Fully evolved. {questsCompleted} quests together and counting.
            </p>
          ) : (
            <div className="mt-2">
              <div className="h-2.5 bg-cream rounded-full border border-stone overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald to-aqua"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
              <p className="text-xs text-navy/60 mt-1">
                {nextEvolveIn} quest{nextEvolveIn === 1 ? '' : 's'} until they become{' '}
                <span className="text-emerald font-bold">{nextStageTitle}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
