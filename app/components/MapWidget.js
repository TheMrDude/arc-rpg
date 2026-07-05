'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Map as MapIcon, Lock } from 'lucide-react';
import { WORLD_REGIONS, getUnlockStatus, getUnlockProgress } from '@/lib/world-regions';

/**
 * Compact world-map teaser for the dashboard: shows the player's current
 * region, a fogged preview of the next locked one, and progress toward
 * its unlock. Also detects newly unlocked regions since the last visit
 * and reports them upward so the dashboard can fire the same celebration
 * treatment as a level-up.
 */
export default function MapWidget({ profile, quests, userId, onRegionUnlocked }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const completedCount = (quests || []).filter((q) => q.completed).length;
  const playerData = {
    totalCheckins: completedCount || profile?.quests_completed || 0,
    longestStreak: profile?.longest_streak || profile?.current_streak || 0,
    level: profile?.level || 1,
  };

  const unlocked = WORLD_REGIONS.filter((r) => getUnlockStatus(r, playerData));
  const currentRegion = unlocked[unlocked.length - 1] || WORLD_REGIONS[0];
  const nextRegion = WORLD_REGIONS.find((r) => !getUnlockStatus(r, playerData)) || null;
  const progress = nextRegion ? getUnlockProgress(nextRegion, playerData) : null;
  const pct = progress ? Math.round((progress.current / progress.required) * 100) : 100;

  // Detect newly unlocked regions vs the last snapshot. Skips the very
  // first render for a user (no snapshot yet) so long-time players don't
  // get a celebration barrage on their next visit.
  useEffect(() => {
    if (!userId || checked) return;
    setChecked(true);

    const key = `regions_unlocked_${userId}`;
    const unlockedIds = unlocked.map((r) => r.id);
    const previous = localStorage.getItem(key);

    if (previous) {
      const previousIds = JSON.parse(previous);
      const fresh = unlocked.filter((r) => !previousIds.includes(r.id));
      if (fresh.length > 0) {
        onRegionUnlocked?.(fresh[0]);
      }
    }

    localStorage.setItem(key, JSON.stringify(unlockedIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, unlocked.length]);

  if (!profile) return null;

  return (
    <div className="bg-[#1A1A2E] border-2 border-[#c8a96e]/40 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#c8a96e] inline-flex items-center gap-1.5">
          <MapIcon size={14} /> World Map
        </h3>
        <button
          onClick={() => router.push('/campaign/world')}
          className="text-xs font-black uppercase text-[#00D4FF] hover:text-white transition-colors"
        >
          Explore →
        </button>
      </div>

      <div className="flex gap-3">
        {/* Current region */}
        <div
          className="flex-1 rounded-lg p-3 border"
          style={{ borderColor: `${currentRegion.color}66`, background: `${currentRegion.color}1a` }}
        >
          <p className="text-[10px] uppercase tracking-widest text-[#94a3b8] mb-0.5">You are in</p>
          <p className="text-sm font-black text-white leading-tight">
            {currentRegion.icon} {currentRegion.name}
          </p>
          <p className="text-[11px] italic mt-0.5" style={{ color: currentRegion.color }}>
            {currentRegion.subtitle}
          </p>
          {completedCount === 1 && (
            <p className="text-[11px] font-bold text-[#48BB78] mt-1.5">
              ✨ First quest complete. {currentRegion.name} is waking up.
            </p>
          )}
        </div>

        {/* Next locked region — fog preview */}
        {nextRegion ? (
          <div className="flex-1 rounded-lg p-3 border border-[#334155] bg-black/40 relative overflow-hidden">
            <p className="text-[10px] uppercase tracking-widest text-[#64748b] mb-0.5 inline-flex items-center gap-1">
              <Lock size={9} /> Next region
            </p>
            <p className="text-sm font-black text-[#94a3b8] leading-tight" style={{ filter: 'blur(0.5px)' }}>
              {nextRegion.name}
            </p>
            {progress && (
              <div className="mt-2">
                <div className="h-1.5 bg-[#0F3460] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #c8a96e, #f43f5e)' }}
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-[#94a3b8] mt-1">
                  {progress.required - progress.current} more {progress.label} to unlock
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 rounded-lg p-3 border border-[#48BB78]/40 bg-[#48BB78]/10 flex items-center justify-center">
            <p className="text-xs font-black text-[#48BB78] uppercase text-center">
              All regions charted
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
