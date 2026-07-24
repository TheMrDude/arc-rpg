'use client';

// ─── Second Wind UI (kid-first candy design system) ─────────────────
// Built on the landing-redesign tokens (font-display = Baloo 2, cream /
// navy / coral / gold, rounded-candy, shadow-candy) rather than the legacy
// dark dashboard theme. Anti-shame is the whole point here: the WOUNDED
// flame is hurt but never extinguished, and RESET copy only ever looks
// forward. The word "failed" appears nowhere.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Format a ms duration as a friendly "Xh Ym" countdown (or "Xm" under 1h).
export function formatTimeRemaining(ms) {
  if (ms == null || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function bonusPercent(multiplier) {
  return Math.round((Number(multiplier || 1.5) - 1) * 100);
}

// ─── Streak flame ───────────────────────────────────────────────────
// healthy: bright, alive. wounded: dimmed + flickering, still burning.
// reset: a small fresh spark — a new run, never a broken chain.
export function StreakFlame({ state = 'healthy', size = 40 }) {
  const style = { fontSize: size, lineHeight: 1 };

  if (state === 'wounded') {
    return (
      <motion.span
        role="img"
        aria-label="Wounded streak, still alive"
        style={{ ...style, filter: 'grayscale(0.35) brightness(0.85)' }}
        animate={{ opacity: [1, 0.45, 0.8, 0.5, 0.95, 0.6, 1], scale: [1, 0.94, 1.02, 0.96, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🔥
      </motion.span>
    );
  }

  if (state === 'reset') {
    return (
      <motion.span
        role="img"
        aria-label="Fresh streak"
        style={style}
        initial={{ scale: 0.6, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
      >
        ✨
      </motion.span>
    );
  }

  return (
    <span role="img" aria-label="Active streak" style={style}>
      🔥
    </span>
  );
}

// ─── Current + longest streak display (for habit cards) ─────────────
export function StreakDisplay({ current = 0, longest = 0, state = 'healthy', size = 28 }) {
  return (
    <div className="inline-flex items-center gap-2 font-body">
      <StreakFlame state={state} size={size} />
      <div className="leading-tight">
        <div className="font-display font-extrabold text-navy" style={{ fontSize: size * 0.6 }}>
          {current}
          <span className="ml-1 text-navy/50 font-body font-bold" style={{ fontSize: size * 0.4 }}>
            day{current === 1 ? '' : 's'}
          </span>
        </div>
        {longest > 0 && (
          <div className="text-navy/50 font-bold" style={{ fontSize: size * 0.4 }}>
            Best: {longest}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WOUNDED banner with live countdown ─────────────────────────────
export function WoundedStreakBanner({ habitName = 'your habit', windowExpiresAt, timeRemainingMs, onAct }) {
  const initial =
    typeof timeRemainingMs === 'number'
      ? timeRemainingMs
      : windowExpiresAt
      ? new Date(windowExpiresAt).getTime() - Date.now()
      : 0;
  const [remaining, setRemaining] = useState(Math.max(0, initial));

  useEffect(() => {
    if (!windowExpiresAt) return undefined;
    const target = new Date(windowExpiresAt).getTime();
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 30000); // 30s cadence is plenty for h/m
    return () => clearInterval(id);
  }, [windowExpiresAt]);

  return (
    <div className="font-body rounded-candy shadow-candy border-2 border-coral/40 bg-cream p-5 flex items-start gap-4">
      <StreakFlame state="wounded" size={44} />
      <div className="flex-1">
        <h3 className="font-display font-extrabold text-navy text-lg mb-1">
          Your streak took a hit. It&apos;s still alive.
        </h3>
        <p className="text-navy/70 font-semibold">
          Complete <span className="text-coral font-bold">{habitName}</span> in the next{' '}
          <span className="text-navy font-extrabold tabular-nums">{formatTimeRemaining(remaining)}</span> for a Second Wind.
        </p>
        {onAct && (
          <button
            onClick={onAct}
            className="mt-3 inline-flex items-center gap-2 rounded-candy bg-coral text-cream font-display font-bold px-5 py-2 shadow-candy hover:brightness-105 active:scale-95 transition"
          >
            Catch my Second Wind →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Second Wind reignition celebration ─────────────────────────────
// Distinct from a normal completion: a flame roars back to life with a
// "+50% Second Wind bonus" callout.
export function SecondWindCelebration({ multiplier = 1.5, streak, onClose }) {
  useEffect(() => {
    // A warm reignition burst — gold + coral, from the center.
    const colors = ['#FFC83D', '#FF7B6B', '#2ECC71'];
    confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.55 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 }, colors }), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="font-body rounded-candy shadow-candy-lg bg-cream max-w-sm w-full p-8 text-center"
          initial={{ scale: 0.7, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className="mx-auto mb-3"
            initial={{ scale: 0.2, rotate: -20 }}
            animate={{ scale: [0.2, 1.35, 1], rotate: [-20, 8, 0] }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ fontSize: 72, lineHeight: 1 }}
          >
            🔥
          </motion.div>
          <h2 className="font-display font-extrabold text-navy text-2xl mb-1">Second Wind!</h2>
          <p className="text-navy/70 font-semibold mb-4">
            Your streak reignited{typeof streak === 'number' ? ` at ${streak} day${streak === 1 ? '' : 's'}` : ''}. It never went out.
          </p>
          <div className="inline-block rounded-candy bg-gold/20 border-2 border-gold px-4 py-2 mb-5">
            <span className="font-display font-extrabold text-navy text-lg">
              +{bonusPercent(multiplier)}% Second Wind bonus
            </span>
          </div>
          <div>
            <button
              onClick={onClose}
              className="rounded-candy bg-coral text-cream font-display font-bold px-6 py-2.5 shadow-candy hover:brightness-105 active:scale-95 transition"
            >
              Keep going →
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── RESET: forward-looking only ────────────────────────────────────
export function StreakResetCard({ longestStreak = 0, onStart }) {
  return (
    <div className="font-body rounded-candy shadow-candy bg-cream border-2 border-emerald/30 p-5 flex items-start gap-4">
      <StreakFlame state="reset" size={40} />
      <div className="flex-1">
        <h3 className="font-display font-extrabold text-navy text-lg mb-1">New run starts today.</h3>
        <p className="text-navy/70 font-semibold">
          Your longest is still on the books:{' '}
          <span className="text-emerald font-extrabold">{longestStreak} day{longestStreak === 1 ? '' : 's'}</span>.
        </p>
        {onStart && (
          <button
            onClick={onStart}
            className="mt-3 inline-flex items-center gap-2 rounded-candy bg-emerald text-cream font-display font-bold px-5 py-2 shadow-candy hover:brightness-105 active:scale-95 transition"
          >
            Start today&apos;s run →
          </button>
        )}
      </div>
    </div>
  );
}
