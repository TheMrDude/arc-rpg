'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import ShareToSocial from './ShareToSocial';

export default function StoryMilestoneCelebration({ storyData, onClose }) {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    // Generate confetti particles
    const particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        rotation: Math.random() * 360,
      });
    }
    setConfetti(particles);
  }, []);

  if (!storyData) return null;

  const { type, threadName, narrativeImpact, threadCompletion } = storyData;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(36, 59, 90, 0.7)' }}
      >
        {/* Confetti */}
        {confetti.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ y: -100, opacity: 1, rotate: 0 }}
            animate={{
              y: window.innerHeight + 100,
              opacity: [1, 1, 0],
              rotate: particle.rotation * 4,
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'linear',
            }}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${particle.x}%`,
              background: particle.id % 3 === 0 ? '#FFC83D' : particle.id % 3 === 1 ? '#57D7F5' : '#FF7B6B',
            }}
          />
        ))}

        {/* Main Card */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 10 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="kq-card border-2 border-gold rounded-candy p-8 max-w-lg w-full shadow-candy-lg relative"
        >
          {/* Soft glow accent */}
          <motion.div
            animate={{
              opacity: [0.15, 0.3, 0.15],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-gradient-to-br from-gold to-aqua opacity-10 rounded-candy blur-xl"
          />

          <div className="relative z-10">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', duration: 0.8 }}
              className="text-center mb-6"
            >
              <span className="text-8xl">
                {type === 'story_completed' ? '🏆' : type === 'new_story' ? '📖' : '⚡'}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="kq-display text-4xl font-black text-center text-navy mb-4"
            >
              {type === 'story_completed' && 'STORY COMPLETED!'}
              {type === 'new_story' && 'NEW STORY BEGINS!'}
              {type === 'major_progress' && 'MAJOR PROGRESS!'}
            </motion.h2>

            {/* Story Name */}
            {threadName && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center mb-6"
              >
                <p className="kq-display text-2xl font-bold text-hero-blue">
                  "{threadName}"
                </p>
              </motion.div>
            )}

            {/* Narrative Impact */}
            {narrativeImpact && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-hero-blue/10 border-2 border-hero-blue/40 rounded-candy p-4 mb-6"
              >
                <p className="text-navy text-center">{narrativeImpact}</p>
              </motion.div>
            )}

            {/* Progress Bar (for non-completed stories) */}
            {type !== 'story_completed' && threadCompletion !== undefined && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.6 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-navy/60">Story Progress</span>
                  <span className="kq-display text-gold font-black">
                    {threadCompletion}%
                  </span>
                </div>
                <div className="bg-cream rounded-full h-3 border-2 border-hero-blue/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${threadCompletion}%` }}
                    transition={{ delay: 0.7, duration: 1 }}
                    className="h-full bg-gradient-to-r from-hero-blue to-gold"
                  />
                </div>
              </motion.div>
            )}

            {/* Rewards (for completed stories) */}
            {type === 'story_completed' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-4 mb-6"
              >
                <div className="bg-gold/10 border-2 border-gold rounded-candy p-3 text-center">
                  <div className="text-3xl mb-1">💰</div>
                  <div className="kq-display text-gold font-black text-xl">
                    +500
                  </div>
                  <div className="text-xs text-navy/60">GOLD</div>
                </div>
                <div className="bg-hero-blue/10 border-2 border-hero-blue rounded-candy p-3 text-center">
                  <div className="text-3xl mb-1">⭐</div>
                  <div className="kq-display text-hero-blue font-black text-xl">
                    +200
                  </div>
                  <div className="text-xs text-navy/60">XP</div>
                </div>
                <div className="bg-coral/10 border-2 border-coral rounded-candy p-3 text-center">
                  <div className="text-3xl mb-1">🎖️</div>
                  <div className="kq-display text-coral font-black text-xl">
                    +1
                  </div>
                  <div className="text-xs text-navy/60">BADGE</div>
                </div>
              </motion.div>
            )}

            {/* Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center mb-6"
            >
              <p className="text-sm text-navy/60">
                {type === 'story_completed' && 'You completed an epic saga! Your story keeps growing...'}
                {type === 'new_story' && 'A new adventure awaits! Complete related quests to move the story forward.'}
                {type === 'major_progress' && 'Your actions have made a big impact on the story!'}
              </p>
            </motion.div>

            {/* Share Achievement */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              className="mb-4"
            >
              <ShareToSocial
                content={{
                  title: type === 'story_completed'
                    ? `Just completed the "${threadName}" story in HabitQuest! 📖🏆`
                    : `Progressing through "${threadName}" story in HabitQuest! ⚡📖`,
                  description: type === 'story_completed'
                    ? 'Completed an epic saga! Join me in turning life into an RPG adventure!'
                    : 'Advancing through epic stories by completing quests!',
                  hashtags: ['HabitQuest', 'StoryMode', 'Gamification', 'RPG'],
                }}
                compact={true}
                showLabels={true}
              />
            </motion.div>

            {/* Continue Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onClick={onClose}
              className="kq-btn kq-btn-gold w-full py-4 text-xl"
            >
              {type === 'story_completed' ? 'CLAIM REWARDS' : 'CONTINUE ADVENTURE'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
