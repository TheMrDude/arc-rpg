'use client';

import { useState, useEffect } from 'react';

export default function SimpleDailyBonus({ profile, onClaim }) {
  const [canClaim, setCanClaim] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(0);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Check if user can claim today's bonus
    const lastClaim = profile.last_daily_bonus ? new Date(profile.last_daily_bonus) : null;
    const now = new Date();

    if (!lastClaim) {
      setCanClaim(true);
      return;
    }

    // Check if last claim was before today (UTC)
    const lastClaimDay = new Date(lastClaim.toISOString().split('T')[0]);
    const today = new Date(now.toISOString().split('T')[0]);

    if (lastClaimDay < today) {
      setCanClaim(true);
    } else {
      setCanClaim(false);
      // Calculate hours until next day
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const msLeft = tomorrow.getTime() - now.getTime();
      setHoursLeft(Math.ceil(msLeft / (1000 * 60 * 60)));
    }
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="kq-card border-2 border-gold/40 px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <span className="text-xl">🎁</span>
        <span className="text-sm font-bold text-navy">
          {canClaim ? (
            <span className="text-gold">Daily bonus ready!</span>
          ) : (
            <>Come back in <span className="text-gold">{hoursLeft}h</span></>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {profile.current_streak > 0 && (
          <span className="text-xs text-coral font-black">
            🔥 {profile.current_streak} days in a row
          </span>
        )}
      </div>
    </div>
  );
}
