'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useSound } from '../SoundProvider';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import ShareToSocial from '../ShareToSocial';
import Overlay from '../Overlay';
import { useOverlaySlot, OVERLAY_PRIORITY } from '@/lib/overlayQueue';


// Unlock data for different levels
const LEVEL_UNLOCKS = {
  5: {
    title: 'Novice Adventurer',
    unlocks: [
      '🔄 Recurring Quests - Set up daily, weekly habits',
      '🐾 First Companion - Unlock your first companion pet',
      '🌟 Skill Tree - Your first passive ability awakens'
    ]
  },
  10: {
    title: 'Seasoned Hero',
    unlocks: [
      '⚔️ Archetype Selection - Choose your hero class',
      '📋 Quest Templates - Save and reuse quest patterns',
      '📖 Weekly Stories - Get personalized narrative chapters'
    ]
  },
  15: {
    title: 'Master Questor',
    unlocks: [
      '🌟 New Skill Tier - A stronger passive ability unlocks',
      '😊 Mood Tracking - Track emotional patterns in your journal',
      '📜 Chronicle Depth - Your story grows richer each week'
    ]
  },
  20: {
    title: 'Legendary Champion',
    unlocks: [
      '👥 Party Quests - Team up in campaign mode',
      '🌊 The Sunken City - A new world map region opens',
      '⚜️ Legendary Equipment - Exclusive power-ups'
    ]
  },
  25: {
    title: 'Immortal Legend',
    unlocks: [
      '✨ Exclusive Badge Collection - Rare achievements unlocked',
      '📜 Chronicle Milestone - This moment joins your story',
      '⛰️ Deepstone Mines Ahead - A new region opens at Level 30'
    ]
  }
};

// Pro upsell moments shown to free users at early level-ups.
// Each ties the pitch to what Pro actually unlocks. No guilt, ever.
//
// These previously promised boss battles (level 3 and 5) and quest chains
// (level 8), all of which are free from level 1 -- so the pitch was selling the
// reader things they already had, at the exact moment they were enjoying them.
const PRO_MOMENTS = {
  3: {
    headline: 'Level 3 already? You are on a roll.',
    copy: 'Free gives you 10 habits. Pro lifts the limit entirely, so nothing caps your momentum.'
  },
  5: {
    headline: 'A true adventurer needs gear.',
    copy: 'Pro unlocks the gear shop: armour and equipment that boost the XP you earn. Suit up and see how far this hero goes.'
  },
  8: {
    headline: 'Your saga is getting good.',
    copy: 'Pro lets you switch hero any time, and keeps HabitQuest ad-free and independent.'
  }
};

export default function MilestoneCelebration({
  show,
  onClose,
  milestone,
  type,
  unlocks: customUnlocks,
  isPremium = false
}) {
  const [confettiActive, setConfettiActive] = useState(false);
  const [proMomentDismissed, setProMomentDismissed] = useState(false);
  const { play } = useSound();
  const reducedMotion = usePrefersReducedMotion();

  // Priority-3 reward: waits its turn behind anything higher, never stacks, and
  // is remembered across a navigation so it is not silently dropped.
  const visible = useOverlaySlot('milestone-celebration', OVERLAY_PRIORITY.REWARD, show);

  useEffect(() => {
    // Fire the confetti and sound when it actually reaches the screen (holds the
    // slot), not merely when `show` flips -- otherwise it celebrates behind
    // whatever overlay is currently up.
    if (visible) {
      if (!reducedMotion) {
        // Start continuous confetti
        setConfettiActive(true);
        const confettiDuration = 3000;
        const confettiEnd = Date.now() + confettiDuration;

        const colors = type === 'level'
          ? ['#E8B44C', '#D4943C', '#FFD93D', '#FF6B6B']
          : type === 'streak'
          ? ['#FF6B35', '#F7931E', '#FDC830', '#F37335']
          : ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'];

        const frame = () => {
          confetti({
            particleCount: 7,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
          });

          confetti({
            particleCount: 7,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
          });

          if (Date.now() < confettiEnd) {
            requestAnimationFrame(frame);
          } else {
            setConfettiActive(false);
          }
        };

        frame();
      }

      play(type === 'level' ? 'level-up' : 'streak-milestone');
    }
  }, [visible, type]);

  // Get emoji based on type
  const getEmoji = () => {
    switch (type) {
      case 'level':
        return '⚡';
      case 'streak':
        return '🔥';
      case 'achievement':
        return '🏆';
      default:
        return '✨';
    }
  };

  // Get title based on type
  const getTitle = () => {
    switch (type) {
      case 'level':
        return 'Level Up!';
      case 'streak':
        return `${milestone} Active Days!`;
      case 'achievement':
        return 'Achievement Unlocked!';
      default:
        return 'Milestone Reached!';
    }
  };

  // Get unlocks list
  const unlocksToShow = customUnlocks ||
    (type === 'level' && LEVEL_UNLOCKS[milestone]?.unlocks) ||
    [];

  const levelTitle = type === 'level' && LEVEL_UNLOCKS[milestone]?.title;

  // Pro moment: only for free users, only at select level-ups
  const proMoment = type === 'level' && !isPremium && !proMomentDismissed
    ? PRO_MOMENTS[milestone]
    : null;

  // The shell owns the backdrop, the three close paths (all live immediately --
  // the old 1.5s canClose lock is gone, celebrations are closable at once), the
  // scroll lock, and the single z-index. Its title is hidden so the big level
  // numeral below can be the moment, while the ✕ stays reachable.
  return (
    <Overlay
      open={visible}
      onClose={onClose}
      title={getTitle()}
      hideTitle
      tone="light"
      reducedMotion={reducedMotion}
      closeLabel="Continue your journey"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            className="rounded-candy overflow-hidden -mx-4 -mt-2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
          >
            {/* Header Section */}
            <div className="bg-gradient-to-br from-purple via-coral to-gold p-8 text-center relative overflow-hidden">
              {/* Background Animation */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-gold via-coral to-purple opacity-50"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 180, 270, 360]
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {type === 'level' ? (
                <>
                  {/* Huge level numeral — this is the moment, not the emoji */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-xl font-black text-white relative z-10 mb-1"
                  >
                    Level Up
                  </motion.p>
                  <motion.h1
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.2 }}
                    className="kq-display text-8xl sm:text-9xl font-black text-white relative z-10 leading-none"
                    style={{ textShadow: '0 6px 16px rgba(0,0,0,0.4), 0 0 40px rgba(255,200,61,0.6)' }}
                  >
                    {milestone}
                  </motion.h1>
                  {levelTitle && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-xl text-white mt-3 font-semibold relative z-10"
                    >
                      {levelTitle}
                    </motion.p>
                  )}
                </>
              ) : (
                <>
                  {/* Emoji */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{
                      scale: 1,
                      rotate: 0
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 12,
                      delay: 0.2
                    }}
                    className="text-9xl mb-4 relative z-10"
                  >
                    {getEmoji()}
                  </motion.div>

                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="kq-display text-5xl font-black text-white mb-2 relative z-10"
                    style={{
                      textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    {getTitle()}
                  </motion.h1>
                </>
              )}

              {type === 'streak' && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl text-white font-bold relative z-10"
                >
                  {milestone} days of showing up for yourself!
                </motion.p>
              )}
            </div>

            {/* Body Content */}
            <div className="pt-6">
              {/* Congratulatory Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center mb-6"
              >
                <p className="text-xl text-navy/70 leading-relaxed">
                  {type === 'level' && "You've grown stronger! Your journey continues with new powers:"}
                  {type === 'streak' && "Your consistency is legendary! Keep building your momentum:"}
                  {type === 'achievement' && "You've earned something special!"}
                </p>
              </motion.div>

              {/* Unlocks List */}
              {unlocksToShow.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-gradient-to-br from-purple/10 to-coral/10 rounded-candy p-6 mb-6"
                >
                  <h3 className="kq-display text-2xl font-black text-navy mb-4 text-center">
                    🎁 New Unlocks
                  </h3>

                  <div className="space-y-3">
                    {unlocksToShow.map((unlock, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.8 + (index * 0.1),
                          type: 'spring',
                          stiffness: 300
                        }}
                        className="kq-card border-2 border-stone hover:border-purple/50 p-4 transition-colors"
                      >
                        <p className="text-navy font-semibold text-lg">
                          {unlock}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Stats Display (for levels) */}
              {type === 'level' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 }}
                  className="grid grid-cols-2 gap-4 mb-6"
                >
                  <div className="bg-gradient-to-br from-gold/20 to-gold/5 rounded-2xl p-4 text-center border-2 border-gold/40">
                    <div className="text-3xl mb-1">⚡</div>
                    <div className="text-2xl font-black text-navy">
                      Level {milestone}
                    </div>
                    <div className="text-sm font-semibold text-navy/60">
                      Power Level
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald/20 to-emerald/5 rounded-2xl p-4 text-center border-2 border-emerald/40">
                    <div className="text-3xl mb-1">🎯</div>
                    <div className="text-2xl font-black text-navy">
                      {unlocksToShow.length}
                    </div>
                    <div className="text-sm font-semibold text-navy/60">
                      Features Unlocked
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Pro Moment (free users, select levels) */}
              {proMoment && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.95 }}
                  className="bg-gradient-to-br from-gold/15 to-gold/5 rounded-candy p-6 mb-6 border-2 border-gold/40"
                >
                  <h3 className="kq-display text-xl font-black text-navy mb-2 text-center">
                    👑 {proMoment.headline}
                  </h3>
                  <p className="text-navy/70 text-center mb-4">
                    {proMoment.copy}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href="/pricing"
                      className="kq-btn kq-btn-gold text-center"
                    >
                      See What Pro Unlocks
                    </a>
                    <button
                      onClick={() => setProMomentDismissed(true)}
                      className="kq-btn kq-btn-ghost"
                    >
                      Keep questing free
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons. Closable immediately -- no canClose gate. */}
              <div className="space-y-3">
                <motion.button
                  onClick={onClose}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-4 px-6 font-black text-xl transition-all duration-200 kq-btn kq-btn-gold cursor-pointer"
                >
                  ✨ Continue Your Journey
                </motion.button>

                {/* Share Achievement */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <ShareToSocial
                    content={{
                      title:
                        type === 'level'
                          ? `Just hit Level ${milestone}${levelTitle ? ` (${levelTitle})` : ''} in HabitQuest! ⚡`
                          : type === 'streak'
                          ? `${milestone} active days in HabitQuest! 🔥`
                          : `Achievement unlocked in HabitQuest: ${milestone}! 🏆`,
                      description: 'Turning real life into an RPG, one quest at a time. No streaks, no guilt.',
                      hashtags: ['HabitQuest', 'LevelUp', 'Gamification', 'Productivity'],
                    }}
                    title="📢 Share Achievement"
                    compact={true}
                    showLabels={true}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Overlay>
  );
}

/**
 * Compact celebration for smaller milestones
 */
export function MilestoneCelebrationCompact({
  show,
  onClose,
  title,
  message
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

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
        >
          <div className="bg-gradient-to-br from-purple to-coral rounded-candy shadow-candy-lg p-6 text-white">
            <h3 className="kq-display text-2xl font-black mb-2">🎉 {title}</h3>
            <p className="text-lg">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
