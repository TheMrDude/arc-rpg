'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { checkStreakStatus, claimDailyReward, getStreakCalendar } from '@/lib/streaks';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import ShareToSocial from './ShareToSocial';

interface DailyRewardModalProps {
  userId: string;
  onRewardClaimed?: (xp: number, newLevel: number) => void;
}

export default function DailyRewardModal({ userId, onRewardClaimed }: DailyRewardModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    canClaimToday: false,
    streakBroken: false,
  });
  const [reward, setReward] = useState<{
    xp: number;
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (userId) {
      checkAndShowReward();
    }
  }, [userId]);

  const checkAndShowReward = async () => {
    setLoading(true);
    const status = await checkStreakStatus(userId, supabase);
    setStreakData(status);

    // Auto-open modal if user can claim
    if (status.canClaimToday) {
      setIsOpen(true);
    }

    setLoading(false);
  };

  const handleClaimReward = async () => {
    setClaiming(true);

    const result = await claimDailyReward(userId, supabase);

    if (result.success && result.reward) {
      setReward(result.reward);
      setClaimed(true);

      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD93D', '#00D4FF', '#FF6B4A', '#7C3AED'],
      });

      // Track event
      trackEvent('daily_reward_claimed', {
        streak: result.newStreak,
        xp: result.reward.xp,
        level: result.newLevel,
      });

      // Notify parent
      if (onRewardClaimed && result.newLevel) {
        onRewardClaimed(result.reward.xp, result.newLevel);
      }

      // Update streak data
      setStreakData((prev) => ({
        ...prev,
        currentStreak: result.newStreak || prev.currentStreak,
        canClaimToday: false,
      }));

      // Auto-close after 3 seconds
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => {
          setClaimed(false);
          setReward(null);
        }, 300);
      }, 3000);
    }

    setClaiming(false);
  };

  const calendar = getStreakCalendar(streakData.currentStreak);

  if (loading || !streakData.canClaimToday) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-4 border-[#FFD93D] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-[0_0_50px_rgba(255,217,61,0.3)]"
          >
            {!claimed ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="text-7xl mb-4"
                  >
                    🎁
                  </motion.div>
                  <h2 className="text-3xl font-black uppercase text-[#FFD93D] mb-2">
                    Daily Reward!
                  </h2>
                  <p className="text-gray-300">
                    Welcome back, hero! Claim your daily bonus.
                  </p>
                </div>

                {/* Streak Info */}
                <div className="bg-[#0F3460] border-2 border-[#00D4FF] rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-bold mb-1">
                        Current Streak
                      </div>
                      <div className="text-3xl font-black text-[#FFD93D]">
                        {streakData.streakBroken ? 0 : streakData.currentStreak} days
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400 uppercase font-bold mb-1">
                        Best Streak
                      </div>
                      <div className="text-3xl font-black text-[#00D4FF]">
                        {streakData.longestStreak} days
                      </div>
                    </div>
                  </div>

                  {streakData.streakBroken && (
                    <div className="bg-[#FF6B4A]/20 border border-[#FF6B4A] rounded-lg p-2 mb-3">
                      <p className="text-xs text-[#FF6B4A] font-bold text-center">
                        ⚠️ Streak broken! Starting fresh today.
                      </p>
                    </div>
                  )}

                  {/* Weekly Calendar */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendar.map((day, i) => (
                      <div key={i} className="text-center">
                        <div className="text-xs text-gray-500 mb-1">{day.day}</div>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                            day.completed
                              ? 'bg-[#10B981] text-white'
                              : 'bg-gray-700 text-gray-500'
                          }`}
                        >
                          {day.completed ? '✓' : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reward Preview */}
                <div className="bg-gradient-to-r from-[#7C3AED] to-[#FF5733] rounded-xl p-4 mb-6 text-center">
                  <div className="text-sm text-white/80 font-bold uppercase mb-2">
                    Today's Reward
                  </div>
                  <div className="text-5xl font-black text-white">
                    +{50 + Math.floor(streakData.currentStreak * 5)} XP
                  </div>
                  {(streakData.currentStreak + 1) % 7 === 0 && (
                    <div className="mt-2 text-[#FFD93D] text-sm font-black">
                      🔥 MILESTONE BONUS!
                    </div>
                  )}
                </div>

                {/* Claim Button */}
                <button
                  onClick={handleClaimReward}
                  disabled={claiming}
                  className="w-full bg-[#FFD93D] hover:bg-[#FFC700] text-[#1A1A2E] px-6 py-4 rounded-xl font-black uppercase text-lg transition-all shadow-[0_5px_0_#B8960E] hover:shadow-[0_7px_0_#B8960E] hover:-translate-y-1 active:shadow-[0_2px_0_#B8960E] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-5 h-5 border-3 border-[#1A1A2E] border-t-transparent rounded-full"></div>
                      Claiming...
                    </span>
                  ) : (
                    'Claim Reward'
                  )}
                </button>

                {/* Skip Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full mt-3 text-gray-400 hover:text-white text-sm font-bold transition-colors"
                >
                  Maybe later
                </button>
              </>
            ) : (
              /* Success State */
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="text-8xl mb-4"
                >
                  🎉
                </motion.div>
                <h3 className="text-3xl font-black uppercase text-[#10B981] mb-2">
                  {reward?.title}
                </h3>
                <p className="text-gray-300 mb-4">{reward?.description}</p>
                <div className="bg-[#0F3460] border-2 border-[#10B981] rounded-xl p-4 mb-4">
                  <div className="text-5xl font-black text-[#10B981]">
                    +{reward?.xp} XP
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    {streakData.currentStreak + 1} day streak! 🔥
                  </div>
                </div>

                {/* Share milestone streaks */}
                {(streakData.currentStreak + 1) >= 7 && (
                  <ShareToSocial
                    content={{
                      title: `Maintained a ${streakData.currentStreak + 1}-day streak in HabitQuest! 🔥⚡`,
                      description: 'Consistency is my superpower! Join me in turning daily habits into epic quests!',
                      hashtags: ['HabitQuest', 'Streak', 'Consistency', 'DailyHabits'],
                    }}
                    compact={true}
                    showLabels={true}
                  />
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
