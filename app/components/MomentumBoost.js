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
      <div className="card-retro border-[#48BB78] p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="text-5xl">🌊</div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-[#48BB78] mb-2">
              Behind on Momentum this week?
            </h3>

            {isPremium ? (
              <>
                <p className="text-gray-300 mb-4">
                  Use your weekly Momentum Boost to count today, no quest needed.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDismissed(true)}
                    className="flex-1 btn-retro bg-gray-600 hover:bg-gray-500 border-gray-700 text-white py-2 text-sm"
                  >
                    Not Now
                  </button>
                  <button
                    onClick={handleUseBoost}
                    disabled={using}
                    className="flex-1 btn-retro btn-success py-2 text-sm disabled:opacity-50"
                  >
                    {using ? 'Using...' : 'Use Boost'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-[#0F172A] border-2 border-[#7C3AED] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌊</span>
                  <div className="font-black text-[#7C3AED]">PREMIUM: MOMENTUM BOOST</div>
                </div>
                <p className="text-sm text-gray-300 mb-3">
                  Pro members get 1 Momentum Boost per week. Cover a busy day without losing progress.
                </p>
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full btn-retro btn-secondary text-sm py-2 mb-2"
                >
                  Upgrade for Momentum Boost
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="w-full text-gray-400 hover:text-white text-xs font-bold uppercase"
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
