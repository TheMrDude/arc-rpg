'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Shown once per return: the guard stores the last_quest_date value it was
// shown for, so it will not reappear until the user completes another quest
// and then goes quiet again.
const ACK_KEY = 'hq_comeback_ack';
const COMEBACK_DAYS = 3;
const RESTART_QUEST_TEXT = 'Drink a glass of water';

function capitalize(str) {
  if (!str) return 'Hero';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Comeback moment: a warm full-screen welcome for players returning after
 * 3+ quiet days. Brand promise: missing days is a non-event. We never count
 * the days out loud. We show that nothing was lost, then offer one gentle
 * quest to restart, or a no-pressure look around.
 */
export default function ComebackMoment({ profile, creature, onPick, creating }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only for players who have completed quests before
    if (!profile?.last_quest_date) return;

    const last = new Date(profile.last_quest_date);
    if (Number.isNaN(last.getTime())) return;

    const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < COMEBACK_DAYS) return;

    try {
      // Already shown for this exact absence? Stay quiet.
      if (localStorage.getItem(ACK_KEY) === profile.last_quest_date) return;
    } catch (e) {
      // localStorage unavailable: skip rather than risk showing every load
      return;
    }

    setShow(true);
  }, [profile?.last_quest_date]);

  function acknowledge() {
    try {
      localStorage.setItem(ACK_KEY, profile.last_quest_date);
    } catch (e) {
      // Best effort only
    }
  }

  function handleRestart() {
    if (creating) return;
    acknowledge();
    setShow(false);
    onPick(RESTART_QUEST_TEXT);
  }

  function handleDismiss() {
    acknowledge();
    setShow(false);
  }

  if (!profile) return null;

  // "The Seeker Returns" named an archetype the player never chose as a
  // character. The companion is the one she picked and named, so the return is
  // about the pair. Falls back to the old wording if there is no companion.
  const returningName = creature?.name || capitalize(profile.archetype);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* Card */}
          <motion.div
            className="relative kq-card border-2 border-stone max-w-md w-full p-8 text-center"
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
              className="text-6xl mb-3"
            >
              🌅
            </motion.div>

            <p className="text-xs font-bold text-navy/50 mb-2">
              It has been a minute.
            </p>

            <h2 className="kq-display text-3xl font-black text-hero-blue mb-3">
              {returningName} waited for you.
            </h2>

            <p className="text-navy/70 mb-6">
              Your XP held. Your map held. The campaign continues.
            </p>

            {/* Proof nothing was lost */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-cream border-2 border-stone rounded-2xl p-3">
                <div className="text-2xl font-black text-hero-blue">
                  {profile.level || 1}
                </div>
                <div className="text-[10px] font-bold text-navy/50">
                  Level, intact
                </div>
              </div>
              <div className="bg-cream border-2 border-stone rounded-2xl p-3">
                <div className="text-2xl font-black text-gold">
                  {(profile.xp || 0).toLocaleString()}
                </div>
                <div className="text-[10px] font-bold text-navy/50">
                  XP, all yours
                </div>
              </div>
            </div>

            {/* One-tap gentle restart */}
            <motion.button
              onClick={handleRestart}
              disabled={creating}
              whileTap={creating ? {} : { scale: 0.96 }}
              className="kq-btn kq-btn-emerald w-full mb-3 disabled:opacity-60 disabled:cursor-wait"
            >
              {creating ? 'Forging your quest...' : '💧 Restart Easy: Drink a Glass of Water'}
            </motion.button>

            <button
              onClick={handleDismiss}
              className="w-full py-2 text-sm font-bold text-navy/50 hover:text-navy transition-colors"
            >
              Just look around
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
