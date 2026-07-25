'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface RewardData {
  success: boolean;
  gold_awarded: number;
  base_gold: number;
  bonus_gold: number;
  streak_day: number;
  message: string;
}

interface DailyLoginRewardProps {
  userId: string;
  onRewardClaimed?: (goldAwarded: number) => void;
}

const STREAK_BONUS_DAYS = [3, 5, 7];

export default function DailyLoginReward({ userId, onRewardClaimed }: DailyLoginRewardProps) {
  const [visible, setVisible] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);
  const [coinAnimate, setCoinAnimate] = useState(false);

  const claimReward = useCallback(async () => {
    // Only show once per session
    if (sessionStorage.getItem('daily_login_claimed')) return;
    sessionStorage.setItem('daily_login_claimed', '1');

    try {
      const { data, error } = await supabase.rpc('claim_daily_login_reward', {
        p_user_id: userId,
      });

      if (error || !data) return;

      const result: RewardData = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result.success) return;

      setReward(result);
      setVisible(true);
      setCoinAnimate(true);

      // Notify parent
      if (onRewardClaimed) {
        onRewardClaimed(result.gold_awarded);
      }

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setVisible(false);
      }, 5000);
    } catch {
      // Silently fail — not critical
    }
  }, [userId, onRewardClaimed]);

  useEffect(() => {
    if (userId) {
      claimReward();
    }
  }, [userId, claimReward]);

  const isStreakBonus = reward ? STREAK_BONUS_DAYS.includes(reward.streak_day) : false;

  const dismiss = () => setVisible(false);

  // 7-day streak calendar
  const renderCalendar = () => {
    if (!reward) return null;
    const currentDay = reward.streak_day;
    return (
      <div className="flex justify-center gap-2 mt-4">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isClaimed = day <= currentDay;
          const isToday = day === currentDay;
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-navy/50 font-bold">D{day}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  isToday
                    ? 'bg-gold text-navy ring-2 ring-gold/50 scale-110'
                    : isClaimed
                    ? 'bg-emerald text-white'
                    : 'bg-cream text-navy/40 border border-stone'
                }`}
              >
                {isClaimed ? '✓' : '—'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Floating coin particles
  const renderCoins = () => {
    if (!coinAnimate) return null;
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: isStreakBonus ? 12 : 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 1,
              x: Math.random() * 200 - 100,
              y: 0,
              scale: 0.5 + Math.random() * 0.5,
            }}
            animate={{
              opacity: 0,
              y: -120 - Math.random() * 80,
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: 1.5 + Math.random() * 0.5,
              delay: Math.random() * 0.3,
              ease: 'easeOut',
            }}
            className="absolute bottom-1/2 left-1/2 text-2xl"
          >
            🪙
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {visible && reward && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 15 }}
            className={`relative kq-card rounded-candy p-6 md:p-8 max-w-sm w-full ${
              isStreakBonus
                ? 'border-4 border-gold shadow-candy-lg'
                : 'border-2 border-hero-blue shadow-candy'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {renderCoins()}

            {/* Header */}
            <div className="text-center mb-4 relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.15 }}
                className={`text-6xl mb-3 ${isStreakBonus ? 'text-7xl' : ''}`}
              >
                {isStreakBonus ? '🏆' : '🪙'}
              </motion.div>
              <h2
                className={`kq-display mb-1 ${
                  isStreakBonus
                    ? 'text-2xl text-gold'
                    : 'text-xl text-hero-blue'
                }`}
              >
                {isStreakBonus ? 'Milestone Bonus!' : 'Daily Login Reward'}
              </h2>
            </div>

            {/* Gold awarded */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`text-center rounded-candy p-4 mb-3 ${
                isStreakBonus
                  ? 'bg-gradient-to-r from-gold/20 to-coral/20 border-2 border-gold/50'
                  : 'bg-hero-blue/10 border-2 border-hero-blue/30'
              }`}
            >
              <div className="text-4xl font-black text-gold">
                +{reward.gold_awarded} Gold
              </div>
              {reward.bonus_gold > 0 && (
                <div className="text-sm text-navy/60 mt-1">
                  ({reward.base_gold} base + {reward.bonus_gold} milestone bonus)
                </div>
              )}
            </motion.div>

            {/* Message */}
            <p className="text-center text-navy/70 text-sm mb-3">
              {reward.message}
            </p>

            {/* Streak day */}
            <div className="text-center">
              <span className="text-xs font-bold text-navy/50">
                Bonus Day {reward.streak_day} of 7
              </span>
            </div>

            {/* 7-day calendar */}
            {renderCalendar()}

            {/* Dismiss hint */}
            <p className="text-center text-navy/40 text-xs mt-4">
              Tap anywhere to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
