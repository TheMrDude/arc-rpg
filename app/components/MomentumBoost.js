'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { computeActiveDays, MOMENTUM_GOAL_DAYS } from '@/lib/momentum';
import { getIsoWeekKey } from '@/lib/date-utils';

export default function MomentumBoost({ quests, profile, isPremium, onBoostUsed }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [using, setUsing] = useState(false);

  useEffect(() => {
    if (!profile || dismissed) return;

    const dayOfWeek = new Date().getDay(); // 0 = Sunday .. 6 = Saturday
    const isLateInWeek = dayOfWeek === 0 || dayOfWeek >= 4; // Thu, Fri, Sat, Sun
    const activeDays = computeActiveDays(quests || [], profile.momentum_boost_week);
    const boostAlreadyUsed = profile.momentum_boost_week === getIsoWeekKey();

    setShowPrompt(isLateInWeek && activeDays < MOMENTUM_GOAL_DAYS && !boostAlreadyUsed);
  }, [quests, profile, dismissed]);

  if (!showPrompt) return null;

  const handleUseBoost = async () => {
    setUsing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/momentum/boost', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setShowPrompt(false);
        onBoostUsed?.();
      } else {
        const data = await res.json();
        alert(data.message || 'Could not use Momentum Boost');
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setUsing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 max-w-sm z-50 animate-slide-in-up">
      <div className="kq-card border-2 border-emerald p-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl">🌊</div>
          <div className="flex-1">
            <h3 className="kq-display text-xl text-emerald mb-2">
              Behind on Momentum this week?
            </h3>

            {isPremium ? (
              <>
                <p className="text-navy/60 mb-4">
                  Use your weekly Momentum Boost to count today, no quest needed.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDismissed(true)}
                    className="flex-1 kq-btn kq-btn-ghost py-2 text-sm"
                  >
                    Not Now
                  </button>
                  <button
                    onClick={handleUseBoost}
                    disabled={using}
                    className="flex-1 kq-btn kq-btn-emerald py-2 text-sm disabled:opacity-50"
                  >
                    {using ? 'Using...' : 'Use Boost'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-cream border-2 border-purple rounded-candy p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌊</span>
                  <div className="kq-display text-purple">Premium: Momentum Boost</div>
                </div>
                <p className="text-sm text-navy/60 mb-3">
                  Pro members get 1 Momentum Boost per week. Cover a busy day without losing progress.
                </p>
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full kq-btn kq-btn-blue text-sm py-2 mb-2"
                >
                  Upgrade for Momentum Boost
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="w-full text-navy/50 hover:text-navy text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
