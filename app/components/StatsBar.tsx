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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#7C3AED] to-[#FF5733] py-3 px-4 text-center font-bold text-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 text-[#FCD34D]">
          <span className="text-lg">🔥</span>
          <span className="hidden sm:inline">
            Only{' '}
            <motion.span
              key={stats?.founderSpotsRemaining ?? 23}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="font-black"
            >
              {Math.min(stats?.founderSpotsRemaining ?? 23, 23)}
            </motion.span>{' '}
            founder spots remaining
          </span>
          <span className="sm:hidden">
            <span className="font-black">{Math.min(stats?.founderSpotsRemaining ?? 23, 23)}</span> spots left
          </span>
        </div>

        <span className="text-white/50">•</span>

        <div className="flex items-center gap-2">
          <span>⚡</span>
          <span className="hidden sm:inline font-bold">Go Pro — $5/mo or $29/yr</span>
          <span className="sm:hidden font-bold">Pro $5/mo</span>
        </div>
      </div>
    </motion.div>
  );
}
