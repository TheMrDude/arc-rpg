'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';
import { getIsoWeekKey, getDayKey } from '@/lib/date-utils';

export default function ChroniclePanel({ profile, userId }) {
  const [dailyDismissed, setDailyDismissed] = useState(true);
  const [weeklyCard, setWeeklyCard] = useState(null);
  const [weeklyDismissed, setWeeklyDismissed] = useState(true);

  const recentEvent = profile?.story_progress?.recent_events?.[0] || null;

  // "Previously, on your quest..." — once per calendar day
  useEffect(() => {
    if (!userId || !recentEvent) return;
    const key = `chronicle_seen_${userId}_${getDayKey()}`;
    if (!localStorage.getItem(key)) {
      setDailyDismissed(false);
      localStorage.setItem(key, 'true');
    }
  }, [userId, recentEvent]);

  // Weekly "Chapter Complete" card — once per ISO week
  useEffect(() => {
    if (!userId) return;
    const key = `chronicle_weekly_seen_${userId}_${getIsoWeekKey()}`;
    if (localStorage.getItem(key)) return;

    async function loadWeeklySummary() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch('/api/weekly-summary', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();

        if (res.ok && data.summary?.quests_completed > 0) {
          setWeeklyCard(data.summary);
          setWeeklyDismissed(false);
          localStorage.setItem(key, 'true');
        }
      } catch (err) {
        // Non-critical, fail quietly
      }
    }

    loadWeeklySummary();
  }, [userId]);

  if (!recentEvent && weeklyDismissed) return null;

  return (
    <div className="mb-6 space-y-3">
      {/* Ambient chronicle line — always visible when there's history */}
      {recentEvent && (
        <div className="bg-[#0F3460]/60 border-2 border-[#00D4FF]/30 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-xl">📖</span>
          <p className="text-sm text-[#E2E8F0] italic">{recentEvent}</p>
        </div>
      )}

      {/* Daily "Previously, on your quest..." recap */}
      <AnimatePresence>
        {!dailyDismissed && recentEvent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-[#1A1A2E] to-[#0F3460] border-2 border-[#FFD93D]/40 rounded-lg p-4 flex items-center justify-between gap-4"
          >
            <p className="text-sm text-[#FFD93D] font-bold">
              Previously, on your quest... <span className="text-[#E2E8F0] font-normal italic">{recentEvent}</span>
            </p>
            <button
              onClick={() => setDailyDismissed(true)}
              className="text-[#94a3b8] hover:text-white text-xs font-black uppercase flex-shrink-0"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly Chapter Complete card */}
      <AnimatePresence>
        {!weeklyDismissed && weeklyCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-gradient-to-br from-[#1A1A2E] to-[#16213e] border-3 border-[#FFD93D] rounded-lg p-5 shadow-[0_0_20px_rgba(255,217,61,0.3)]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-[#FFD93D] uppercase tracking-wide">Chapter Complete</h3>
              <button
                onClick={() => setWeeklyDismissed(true)}
                className="text-[#94a3b8] hover:text-white text-xs font-black uppercase"
              >
                Dismiss
              </button>
            </div>
            <div className="flex gap-6 mb-3 text-sm">
              <span className="text-[#00D4FF] font-bold">{weeklyCard.quests_completed} quests done</span>
              <span className="text-[#FFD93D] font-bold">{weeklyCard.xp_gained} XP earned</span>
            </div>
            <p className="text-sm text-[#E2E8F0] leading-relaxed whitespace-pre-line">{weeklyCard.summary_text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
