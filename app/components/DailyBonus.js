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
      <div className="kq-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="kq-display text-2xl text-navy">
              🎁 Daily Bonus
            </h3>
            <p className="text-sm text-navy/60">
              {canClaim ? 'Claim your reward!' : `Next bonus in ${nextBonusHours} hours`}
            </p>
          </div>
          <div className="text-right">
            <div className="kq-display text-hero-blue text-2xl">
              {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-navy/60">Days in a Row</div>
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
                className={`text-center p-2 rounded-2xl border-2 ${
                  isNext
                    ? 'border-gold bg-gold/20'
                    : isCurrent
                    ? 'border-hero-blue bg-hero-blue/10'
                    : 'border-stone bg-cream'
                }`}
              >
                <div className={`text-2xl ${isNext ? 'animate-bounce' : ''}`}>{bonus.emoji}</div>
                <div className="text-xs text-navy/60 mt-1">{bonus.gold}g</div>
              </div>
            );
          })}
        </div>

        {/* Next Reward Info */}
        <div className="bg-hero-blue/10 border-2 border-hero-blue/40 rounded-candy p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-hero-blue font-bold mb-1">
                {canClaim ? 'Available Now:' : 'Next Reward:'}
              </div>
              <div className="text-sm text-navy/70">{nextBonus.name}</div>
            </div>
            <div className="flex gap-3">
              <div className="text-center">
                <div className="text-xl font-black text-gold">+{nextBonus.gold}</div>
                <div className="text-xs text-navy/60">Gold</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-hero-blue">+{nextBonus.xp}</div>
                <div className="text-xs text-navy/60">XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Button */}
        <button
          onClick={claimBonus}
          disabled={!canClaim || claiming}
          className={`w-full ${
            canClaim && !claiming
              ? 'kq-btn kq-btn-gold'
              : 'kq-btn bg-navy/10 text-navy/40 cursor-not-allowed'
          }`}
        >
          {claiming ? '⏳ Claiming...' : canClaim ? '🎁 Claim Daily Bonus' : `🔒 Come back in ${nextBonusHours}h`}
        </button>

        {currentStreak > 0 && (
          <p className="text-xs text-center text-navy/60 mt-3">
            💡 Claim your bonus each day for bigger rewards. Miss a day? No harm done, the bonuses just start fresh.
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
            style={{ backgroundColor: 'rgba(36, 59, 90, 0.6)' }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', duration: 0.7 }}
              className="kq-card p-8 max-w-md w-full"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                  className="text-8xl mb-4"
                >
                  {rewardData.emoji}
                </motion.div>

                <h2 className="kq-display text-4xl text-navy mb-4">
                  Daily Bonus Claimed!
                </h2>

                <div className={`grid ${rewardData.skill_points_earned > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-6`}>
                  <div className="bg-gold/10 border-2 border-gold rounded-candy p-4">
                    <div className="text-4xl mb-2">💰</div>
                    <div className="kq-display text-3xl text-gold">
                      +{rewardData.gold}
                    </div>
                    <div className="text-sm text-navy/60">Gold</div>
                  </div>
                  <div className="bg-hero-blue/10 border-2 border-hero-blue rounded-candy p-4">
                    <div className="text-4xl mb-2">⭐</div>
                    <div className="kq-display text-3xl text-hero-blue">
                      +{rewardData.xp}
                    </div>
                    <div className="text-sm text-navy/60">XP</div>
                  </div>
                  {rewardData.skill_points_earned > 0 && (
                    <div className="bg-purple/10 border-2 border-purple rounded-candy p-4">
                      <div className="text-4xl mb-2">💎</div>
                      <div className="kq-display text-3xl text-purple">
                        +{rewardData.skill_points_earned}
                      </div>
                      <div className="text-sm text-navy/60">Skill Pt</div>
                    </div>
                  )}
                </div>

                <div className="bg-hero-blue/10 border-2 border-hero-blue/40 rounded-candy p-3 mb-4">
                  <div className="text-hero-blue font-bold">
                    🔥 {rewardData.total_streak} Day{rewardData.total_streak !== 1 ? 's' : ''} in a Row!
                  </div>
                </div>

                <p className="text-sm text-navy/70">
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
