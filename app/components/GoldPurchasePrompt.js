'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function GoldPurchasePrompt({ show, onClose, trigger, currentGold = 0 }) {
  const router = useRouter();

  if (!show) return null;

  const triggers = {
    insufficient_gold: {
      title: 'Not Enough Gold!',
      emoji: '💰',
      message: `You need more gold to unlock this item. You currently have ${currentGold} gold.`,
      cta: 'Get Gold Now',
      urgency: 'Skip the grind and unlock equipment faster!',
    },
    level_milestone: {
      title: 'Congratulations!',
      emoji: '🎉',
      message: 'You reached a new level! Celebrate by upgrading your equipment.',
      cta: 'Upgrade Your Gear',
      urgency: 'Limited time: Boost your progress with gold!',
    },
    story_completion: {
      title: 'Epic Achievement!',
      emoji: '🏆',
      message: 'You completed a major story! Continue your legend with better equipment.',
      cta: 'Power Up Now',
      urgency: 'Keep the momentum going!',
    },
    quest_streak: {
      title: 'Amazing Streak!',
      emoji: '🔥',
      message: 'Your dedication deserves a reward! Speed up your progress.',
      cta: 'Accelerate Growth',
      urgency: 'Maintain your momentum with premium equipment!',
    },
    equipment_viewed: {
      title: 'Like What You See?',
      emoji: '⚔️',
      message: 'Premium equipment can significantly boost your XP gains.',
      cta: 'Get Gold for Equipment',
      urgency: 'Unlock powerful gear faster!',
    },
  };

  const promptData = triggers[trigger] || triggers.insufficient_gold;

  function handleGetGold() {
    router.push('/shop');
    onClose();
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 52, 96, 0.95)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,217,61,0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', duration: 0.8 }}
              className="text-center mb-6"
            >
              <span className="text-8xl">{promptData.emoji}</span>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-center text-[#FFD93D] mb-4"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              {promptData.title}
            </motion.h2>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white text-center mb-4"
            >
              {promptData.message}
            </motion.p>

            {/* Urgency Banner */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#FFD93D] text-[#0F3460] rounded-lg p-3 mb-6 text-center font-bold"
            >
              ⚡ {promptData.urgency}
            </motion.div>

            {/* Package Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 gap-3 mb-6"
            >
              <div className="bg-[#0F3460] border-2 border-[#00D4FF] rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">⚔️</div>
                <div className="text-[#00D4FF] font-bold text-sm">Hero Pack</div>
                <div className="text-[#FFD93D] font-black">2,500g</div>
                <div className="text-xs text-gray-400">$9.99</div>
              </div>
              <div className="bg-[#0F3460] border-2 border-[#FFD93D] rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">👑</div>
                <div className="text-[#FFD93D] font-bold text-sm">Legend Pack</div>
                <div className="text-[#FFD93D] font-black">6,000g</div>
                <div className="text-xs text-gray-400">$19.99</div>
              </div>
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-3"
            >
              <button
                onClick={handleGetGold}
                className="w-full py-4 bg-gradient-to-r from-[#FFD93D] to-[#00D4FF] text-[#0F3460] font-black text-xl rounded-lg border-3 border-[#0F3460] shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
                style={{ fontFamily: 'VT323, monospace' }}
              >
                🪙 {promptData.cta}
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 bg-[#1A1A2E] border-2 border-[#00D4FF] border-opacity-50 text-[#00D4FF] rounded-lg font-bold hover:border-opacity-100 transition-all"
              >
                Maybe Later
              </button>
            </motion.div>

            {/* Fair Play Notice */}
            <p className="text-xs text-center text-gray-400 mt-4">
              💡 You can earn all gold for free by completing quests daily!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
