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
        style={{ backgroundColor: 'rgba(15, 52, 96, 0.95)' }}
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
              background: particle.id % 3 === 0 ? '#FFD93D' : particle.id % 3 === 1 ? '#00D4FF' : '#FF6B6B',
            }}
          />
        ))}

        {/* Main Card */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 10 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-8 max-w-lg w-full shadow-[0_0_50px_rgba(255,217,61,0.5)] relative"
        >
          {/* Glowing Effect */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-gradient-to-br from-[#FFD93D] to-[#00D4FF] opacity-20 rounded-lg blur-xl"
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
              className="text-4xl font-black text-center text-[#FFD93D] mb-4"
              style={{ fontFamily: 'VT323, monospace' }}
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
                <p className="text-2xl font-bold text-[#00D4FF]" style={{ fontFamily: 'VT323, monospace' }}>
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
                className="bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-50 rounded-lg p-4 mb-6"
              >
                <p className="text-white text-center">{narrativeImpact}</p>
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
                  <span className="text-sm text-gray-400">Story Progress</span>
                  <span className="text-[#FFD93D] font-black" style={{ fontFamily: 'VT323, monospace' }}>
                    {threadCompletion}%
                  </span>
                </div>
                <div className="bg-[#0F3460] rounded-full h-3 border-2 border-[#00D4FF] border-opacity-30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${threadCompletion}%` }}
                    transition={{ delay: 0.7, duration: 1 }}
                    className="h-full bg-gradient-to-r from-[#00D4FF] to-[#FFD93D]"
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
                <div className="bg-[#0F3460] border-2 border-[#FFD93D] rounded-lg p-3 text-center">
                  <div className="text-3xl mb-1">💰</div>
                  <div className="text-[#FFD93D] font-black text-xl" style={{ fontFamily: 'VT323, monospace' }}>
                    +500
                  </div>
                  <div className="text-xs text-gray-400">GOLD</div>
                </div>
                <div className="bg-[#0F3460] border-2 border-[#00D4FF] rounded-lg p-3 text-center">
                  <div className="text-3xl mb-1">⭐</div>
                  <div className="text-[#00D4FF] font-black text-xl" style={{ fontFamily: 'VT323, monospace' }}>
                    +200
                  </div>
                  <div className="text-xs text-gray-400">XP</div>
                </div>
                <div className="bg-[#0F3460] border-2 border-[#FF6B6B] rounded-lg p-3 text-center">
                  <div className="text-3xl mb-1">🎖️</div>
                  <div className="text-[#FF6B6B] font-black text-xl" style={{ fontFamily: 'VT323, monospace' }}>
                    +1
                  </div>
                  <div className="text-xs text-gray-400">BADGE</div>
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
              <p className="text-sm text-gray-400">
                {type === 'story_completed' && 'You have completed an epic saga! Your legend grows...'}
                {type === 'new_story' && 'A new adventure awaits! Complete related quests to advance the story.'}
                {type === 'major_progress' && 'Your actions have significantly impacted the story!'}
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
              className="w-full py-4 bg-gradient-to-r from-[#FFD93D] to-[#00D4FF] text-[#0F3460] font-black text-xl rounded-lg border-3 border-[#0F3460] shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              {type === 'story_completed' ? 'CLAIM REWARDS' : 'CONTINUE ADVENTURE'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
