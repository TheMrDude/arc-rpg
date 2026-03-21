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
              <span className="text-[10px] text-gray-500 font-bold">D{day}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  isToday
                    ? 'bg-[#F59E0B] text-[#0F172A] ring-2 ring-[#F59E0B]/50 scale-110'
                    : isClaimed
                    ? 'bg-[#10B981] text-white'
                    : 'bg-[#1E293B] text-gray-600 border border-gray-700'
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 15 }}
            className={`relative bg-gradient-to-br from-[#1A1A2E] to-[#16213E] rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl ${
              isStreakBonus
                ? 'border-4 border-[#F59E0B] shadow-[0_0_60px_rgba(245,158,11,0.4)]'
                : 'border-3 border-[#00D4FF] shadow-[0_0_30px_rgba(0,212,255,0.2)]'
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
                className={`font-black uppercase mb-1 ${
                  isStreakBonus
                    ? 'text-2xl text-[#F59E0B]'
                    : 'text-xl text-[#00D4FF]'
                }`}
              >
                {isStreakBonus ? 'Streak Bonus!' : 'Daily Login Reward'}
              </h2>
            </div>

            {/* Gold awarded */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`text-center rounded-xl p-4 mb-3 ${
                isStreakBonus
                  ? 'bg-gradient-to-r from-[#F59E0B]/20 to-[#FF6B35]/20 border-2 border-[#F59E0B]/50'
                  : 'bg-[#0F3460] border-2 border-[#00D4FF]/30'
              }`}
            >
              <div
                className={`text-4xl font-black ${
                  isStreakBonus ? 'text-[#F59E0B]' : 'text-[#F59E0B]'
                }`}
              >
                +{reward.gold_awarded} Gold
              </div>
              {reward.bonus_gold > 0 && (
                <div className="text-sm text-gray-400 mt-1">
                  ({reward.base_gold} base + {reward.bonus_gold} streak bonus)
                </div>
              )}
            </motion.div>

            {/* Message */}
            <p className="text-center text-gray-300 text-sm mb-3">
              {reward.message}
            </p>

            {/* Streak day */}
            <div className="text-center">
              <span className="text-xs font-bold text-gray-500 uppercase">
                Streak Day {reward.streak_day} of 7
              </span>
            </div>

            {/* 7-day calendar */}
            {renderCalendar()}

            {/* Dismiss hint */}
            <p className="text-center text-gray-600 text-xs mt-4">
              Tap anywhere to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
