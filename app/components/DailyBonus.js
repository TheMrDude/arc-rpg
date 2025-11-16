'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DAILY_BONUSES = {
  1: { gold: 50, xp: 20, emoji: '📅', name: 'Day 1' },
  2: { gold: 75, xp: 30, emoji: '🔥', name: 'Day 2' },
  3: { gold: 100, xp: 50, emoji: '⭐', name: 'Day 3' },
  4: { gold: 150, xp: 75, emoji: '💫', name: 'Day 4' },
  5: { gold: 200, xp: 100, emoji: '🌟', name: 'Day 5' },
  6: { gold: 250, xp: 125, emoji: '✨', name: 'Day 6' },
  7: { gold: 500, xp: 250, emoji: '🏆', name: 'Day 7 - JACKPOT!' },
};

export default function DailyBonus({ profile, onClaim }) {
  const [canClaim, setCanClaim] = useState(false);
  const [nextBonusHours, setNextBonusHours] = useState(24);
  const [claiming, setClaiming] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState(null);

  useEffect(() => {
    checkBonusAvailability();
  }, [profile]);

  function checkBonusAvailability() {
    if (!profile?.last_daily_bonus_at) {
      setCanClaim(true);
      return;
    }

    const lastBonus = new Date(profile.last_daily_bonus_at);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(lastBonus.getFullYear(), lastBonus.getMonth(), lastBonus.getDate());

    if (lastDay.getTime() < today.getTime()) {
      setCanClaim(true);
    } else {
      setCanClaim(false);
      const hours = 24 - now.getHours();
      setNextBonusHours(hours);
    }
  }

  async function claimBonus() {
    if (!canClaim || claiming) return;

    setClaiming(true);

    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Please log in to claim your bonus');
        setClaiming(false);
        return;
      }

      const response = await fetch('/api/daily-bonus/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Already claimed') {
          alert(data.message);
        } else {
          alert('Failed to claim bonus');
        }
        setClaiming(false);
        return;
      }

      // Show reward animation
      setRewardData(data.bonus);
      setShowReward(true);
      setCanClaim(false);

      // Reload page after showing reward
      setTimeout(() => {
        if (onClaim) onClaim();
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Error claiming bonus:', error);
      alert('Failed to claim bonus');
    } finally {
      setClaiming(false);
    }
  }

  const currentStreak = profile?.daily_bonus_streak || 0;
  const nextStreakDay = ((currentStreak) % 7) + 1;
  const nextBonus = DAILY_BONUSES[nextStreakDay];

  return (
    <>
      <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-6 shadow-[0_0_20px_rgba(255,217,61,0.3)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-black text-[#FFD93D]" style={{ fontFamily: 'VT323, monospace' }}>
              🎁 DAILY BONUS
            </h3>
            <p className="text-sm text-gray-400">
              {canClaim ? 'Claim your reward!' : `Next bonus in ${nextBonusHours} hours`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[#00D4FF] font-black text-2xl" style={{ fontFamily: 'VT323, monospace' }}>
              {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-400">Current Streak</div>
          </div>
        </div>

        {/* Streak Progress */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const bonus = DAILY_BONUSES[day];
            const isNext = day === nextStreakDay && canClaim;
            const isPast = currentStreak >= day && currentStreak % 7 !== 0;
            const isCurrent = (currentStreak % 7) >= day;

            return (
              <div
                key={day}
                className={`text-center p-2 rounded border-2 ${
                  isNext
                    ? 'border-[#FFD93D] bg-[#FFD93D] bg-opacity-20'
                    : isCurrent
                    ? 'border-[#00D4FF] bg-[#00D4FF] bg-opacity-10'
                    : 'border-gray-600 bg-gray-800 bg-opacity-50'
                }`}
              >
                <div className={`text-2xl ${isNext ? 'animate-bounce' : ''}`}>{bonus.emoji}</div>
                <div className="text-xs text-gray-400 mt-1">{bonus.gold}g</div>
              </div>
            );
          })}
        </div>

        {/* Next Reward Info */}
        <div className="bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[#00D4FF] font-bold mb-1">
                {canClaim ? 'Available Now:' : 'Next Reward:'}
              </div>
              <div className="text-sm text-gray-300">{nextBonus.name}</div>
            </div>
            <div className="flex gap-3">
              <div className="text-center">
                <div className="text-xl font-black text-[#FFD93D]">+{nextBonus.gold}</div>
                <div className="text-xs text-gray-400">Gold</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-[#00D4FF]">+{nextBonus.xp}</div>
                <div className="text-xs text-gray-400">XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Button */}
        <button
          onClick={claimBonus}
          disabled={!canClaim || claiming}
          className={`w-full py-4 rounded-lg font-black uppercase border-3 transition-all ${
            canClaim && !claiming
              ? 'bg-[#FFD93D] border-[#FF6B6B] text-[#0F3460] hover:shadow-[0_5px_0_#FF6B6B] hover:-translate-y-0.5 active:shadow-[0_1px_0_#FF6B6B] active:translate-y-1 shadow-[0_3px_0_#FF6B6B]'
              : 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
          }`}
          style={{ fontFamily: 'VT323, monospace' }}
        >
          {claiming ? '⏳ CLAIMING...' : canClaim ? '🎁 CLAIM DAILY BONUS' : `🔒 COME BACK IN ${nextBonusHours}H`}
        </button>

        {currentStreak > 0 && (
          <p className="text-xs text-center text-gray-400 mt-3">
            💡 Keep your streak alive! Claim your bonus every day for bigger rewards.
          </p>
        )}
      </div>

      {/* Reward Animation */}
      <AnimatePresence>
        {showReward && rewardData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15, 52, 96, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', duration: 0.7 }}
              className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-8 max-w-md w-full shadow-[0_0_50px_rgba(255,217,61,0.5)]"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                  className="text-8xl mb-4"
                >
                  {rewardData.emoji}
                </motion.div>

                <h2 className="text-4xl font-black text-[#FFD93D] mb-4" style={{ fontFamily: 'VT323, monospace' }}>
                  DAILY BONUS CLAIMED!
                </h2>

                <div className={`grid ${rewardData.skill_points_earned > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-6`}>
                  <div className="bg-[#0F3460] border-2 border-[#FFD93D] rounded-lg p-4">
                    <div className="text-4xl mb-2">💰</div>
                    <div className="text-3xl font-black text-[#FFD93D]" style={{ fontFamily: 'VT323, monospace' }}>
                      +{rewardData.gold}
                    </div>
                    <div className="text-sm text-gray-400">GOLD</div>
                  </div>
                  <div className="bg-[#0F3460] border-2 border-[#00D4FF] rounded-lg p-4">
                    <div className="text-4xl mb-2">⭐</div>
                    <div className="text-3xl font-black text-[#00D4FF]" style={{ fontFamily: 'VT323, monospace' }}>
                      +{rewardData.xp}
                    </div>
                    <div className="text-sm text-gray-400">XP</div>
                  </div>
                  {rewardData.skill_points_earned > 0 && (
                    <div className="bg-[#0F3460] border-2 border-[#9333EA] rounded-lg p-4">
                      <div className="text-4xl mb-2">💎</div>
                      <div className="text-3xl font-black text-[#9333EA]" style={{ fontFamily: 'VT323, monospace' }}>
                        +{rewardData.skill_points_earned}
                      </div>
                      <div className="text-sm text-gray-400">SKILL PT</div>
                    </div>
                  )}
                </div>

                <div className="bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-50 rounded-lg p-3 mb-4">
                  <div className="text-[#00D4FF] font-bold">
                    🔥 {rewardData.total_streak} Day Streak!
                  </div>
                </div>

                <p className="text-sm text-gray-300">
                  Keep logging in daily to increase your rewards!
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
