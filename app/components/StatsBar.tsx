'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  heroesOnline: number;
  questsCompletedToday: number;
  founderSpotsRemaining: number;
  totalHeroes: number;
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats>({
    heroesOnline: 47,
    questsCompletedToday: 247,
    founderSpotsRemaining: 23,
    totalHeroes: 1247
  });

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Fetch real stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const deadline = new Date('2025-11-25T23:59:59');

    const updateCountdown = () => {
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#7C3AED] to-[#FF5733] py-3 px-4 text-center font-bold text-sm text-white"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="hidden sm:inline">
            <motion.span
              key={stats.heroesOnline}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="font-black"
            >
              {stats.heroesOnline}
            </motion.span>{' '}
            heroes online now
          </span>
          <span className="sm:hidden">
            <span className="font-black">{stats.heroesOnline}</span> online
          </span>
        </div>

        <span className="text-white/50">•</span>

        <div className="hidden sm:block">
          <motion.span
            key={stats.questsCompletedToday}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="font-black"
          >
            {stats.questsCompletedToday.toLocaleString()}
          </motion.span>{' '}
          quests completed today
        </div>

        <span className="hidden sm:inline text-white/50">•</span>

        <div className="text-[#FCD34D] flex items-center gap-2">
          <span>⚡</span>
          <span className="hidden sm:inline">FOUNDER'S DEAL ENDING IN</span>
          <span className="sm:hidden">DEAL ENDS</span>
          <span className="font-black tabular-nums">
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </span>
        </div>
      </div>
    </motion.div>
  );
}
