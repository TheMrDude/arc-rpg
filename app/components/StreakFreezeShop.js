'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { STREAK_FREEZE_COST } from '@/lib/gamification/streak-protection';

interface StreakFreezeShopProps {
  currentXP;
  freezeCount;
  onPurchase: () => Promise<void>;
  className?;
}

export default function StreakFreezeShop({
  currentXP,
  freezeCount,
  onPurchase,
  className = ''
}: StreakFreezeShopProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const canAfford = currentXP >= STREAK_FREEZE_COST;
  const maxFreezesReached = freezeCount >= 10;

  const handlePurchase = async () => {
    if (!canAfford || isPurchasing || maxFreezesReached) return;

    setIsPurchasing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onPurchase();
      setSuccessMessage('Streak Freeze purchased! Your streak is now protected.');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase streak freeze');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <motion.div
      className={`
        bg-gradient-to-br from-blue-50 to-indigo-100
        border-3 border-blue-300
        rounded-2xl p-6 shadow-xl
        ${className}
      `}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          animate={{
            rotate: [0, -10, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
          }}
          className="text-4xl"
        >
          🛡️
        </motion.div>
        <div>
          <h3 className="text-2xl font-black text-blue-900">
            Streak Freeze
          </h3>
          <p className="text-sm text-blue-700">
            Protect your streak from breaking
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
        <p className="text-blue-900 text-sm leading-relaxed">
          If you miss a day, a Streak Freeze will automatically protect your progress.
          Keep your momentum going even on busy days!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Current XP */}
        <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
          <div className="text-xs font-bold text-blue-700 uppercase mb-1">
            Your XP
          </div>
          <div className="text-2xl font-black text-blue-900">
            {currentXP}
          </div>
        </div>

        {/* Freeze Count */}
        <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
          <div className="text-xs font-bold text-blue-700 uppercase mb-1">
            Freezes Banked
          </div>
          <div className="text-2xl font-black text-blue-900 flex items-center gap-2">
            {freezeCount}
            <span className="text-lg">🛡️</span>
          </div>
        </div>
      </div>

      {/* Purchase Button */}
      <motion.button
        onClick={handlePurchase}
        disabled={!canAfford || isPurchasing || maxFreezesReached}
        whileHover={canAfford && !maxFreezesReached ? { scale: 1.05 } : {}}
        whileTap={canAfford && !maxFreezesReached ? { scale: 0.95 } : {}}
        className={`
          w-full py-4 px-6 rounded-xl
          font-black text-lg uppercase tracking-wide
          border-4
          transition-all duration-200
          ${
            maxFreezesReached
              ? 'bg-gray-400 border-gray-600 text-gray-700 cursor-not-allowed'
              : canAfford
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-900 text-white cursor-pointer hover:shadow-lg'
              : 'bg-gray-300 border-gray-500 text-gray-600 cursor-not-allowed'
          }
        `}
        style={{
          boxShadow: canAfford && !maxFreezesReached
            ? '0 4px 0 #1e3a8a, 0 6px 12px rgba(30, 58, 138, 0.4)'
            : 'none'
        }}
      >
        {isPurchasing ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              ⏳
            </motion.span>
            Purchasing...
          </span>
        ) : maxFreezesReached ? (
          <span>Max Freezes Reached</span>
        ) : canAfford ? (
          <span className="flex items-center justify-center gap-2">
            Buy for {STREAK_FREEZE_COST} XP
            <span className="text-xl">🛡️</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Need {STREAK_FREEZE_COST - currentXP} More XP
          </span>
        )}
      </motion.button>

      {/* Info Text */}
      {!maxFreezesReached && (
        <div className="mt-3 text-center">
          <p className="text-xs text-blue-700">
            {canAfford
              ? `You can purchase ${Math.floor(currentXP / STREAK_FREEZE_COST)} freeze(s)`
              : `Complete more quests to earn XP`
            }
          </p>
        </div>
      )}

      {/* Max Freezes Info */}
      {maxFreezesReached && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3"
        >
          <p className="text-sm text-yellow-800 font-semibold text-center">
            ⚠️ You've reached the maximum of 10 streak freezes
          </p>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 bg-red-100 border-2 border-red-400 rounded-lg p-3"
        >
          <p className="text-sm text-red-800 font-semibold text-center">
            ❌ {error}
          </p>
        </motion.div>
      )}

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="mt-3 bg-green-100 border-2 border-green-400 rounded-lg p-3"
        >
          <p className="text-sm text-green-800 font-semibold text-center">
            ✅ {successMessage}
          </p>
        </motion.div>
      )}

      {/* How It Works */}
      <details className="mt-4">
        <summary className="text-sm font-bold text-blue-900 cursor-pointer hover:text-blue-700 transition-colors">
          How does it work?
        </summary>
        <div className="mt-2 text-xs text-blue-800 space-y-2 pl-4">
          <p>• Streak Freezes are automatically used when you miss a day</p>
          <p>• Your streak count stays the same when a freeze is used</p>
          <p>• You can bank up to 10 freezes at a time</p>
          <p>• Each freeze costs {STREAK_FREEZE_COST} XP</p>
          <p>• They're your safety net for busy days!</p>
        </div>
      </details>
    </motion.div>
  );
}

/**
 * Compact variant for sidebars or smaller spaces
 */
export function StreakFreezeShopCompact({
  currentXP,
  freezeCount,
  onPurchase
}: Omit<StreakFreezeShopProps, 'className'>) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const canAfford = currentXP >= STREAK_FREEZE_COST;

  const handlePurchase = async () => {
    if (!canAfford || isPurchasing) return;
    setIsPurchasing(true);
    try {
      await onPurchase();
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">🛡️</span>
        <div className="text-right">
          <div className="text-xs font-bold text-blue-700">Freezes</div>
          <div className="text-lg font-black text-blue-900">{freezeCount}</div>
        </div>
      </div>

      <button
        onClick={handlePurchase}
        disabled={!canAfford || isPurchasing}
        className={`
          w-full py-2 px-3 rounded-md
          font-bold text-sm uppercase
          border-2 transition-colors
          ${
            canAfford
              ? 'bg-blue-500 border-blue-700 text-white hover:bg-blue-600'
              : 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'
          }
        `}
      >
        {isPurchasing ? '...' : `${STREAK_FREEZE_COST} XP`}
      </button>
    </div>
  );
}
