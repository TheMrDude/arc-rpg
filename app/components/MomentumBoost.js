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

    // Gate on real activity. "Behind on momentum" only means something to
    // someone who has started: a brand-new, zero-quest account is at 0 active
    // days and was being told, late every week, that it was falling behind on a
    // week it never began. Only prompt once at least one day has been earned.
    const hasStarted = activeDays > 0;

    setShowPrompt(hasStarted && isLateInWeek && activeDays < MOMENTUM_GOAL_DAYS && !boostAlreadyUsed);
  }, [quests, profile, dismissed]);

  // Close path 3 of 3: Escape key. Deliberately self-contained -- it sets both
  // pieces of state itself rather than going through a shared handler, so it
  // still works even if the button or backdrop path is broken.
  useEffect(() => {
    if (!showPrompt) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        setDismissed(true);
        setShowPrompt(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPrompt]);

  if (!showPrompt) return null;

  // THE BUG: dismissing only called setDismissed(true). `dismissed` gates the
  // first effect via its `if (!profile || dismissed) return;` -- and that early
  // return happens *before* setShowPrompt, so `showPrompt` stayed true and the
  // card kept rendering. The tap registered and did nothing. handleUseBoost
  // worked only because it calls setShowPrompt(false) explicitly.
  // Every close path must clear showPrompt itself.
  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

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
    <>
      {/* Close path 2 of 3: tap outside the card. Intentionally transparent so
          the card's appearance is unchanged -- this only captures taps. Sits at
          z-40, below the card's z-50, so it never covers the buttons. Both
          onClick and onTouchEnd are wired because older Chromium/Silk builds
          are unreliable about synthesising click on non-button elements;
          dismissing twice is idempotent, so a double-fire is harmless. */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'transparent', touchAction: 'manipulation' }}
        onClick={handleDismiss}
        onTouchEnd={handleDismiss}
        aria-hidden="true"
      />
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
                    {/* Close path 1 of 3: a real <button> with an accessible
                        label and a >=44px hit area. */}
                    <button
                      type="button"
                      onClick={handleDismiss}
                      aria-label="Close this Momentum Boost message"
                      style={{ minHeight: 44, touchAction: 'manipulation' }}
                      className="flex-1 kq-btn kq-btn-ghost py-2 text-sm"
                    >
                      Not Now
                    </button>
                    <button
                      type="button"
                      onClick={handleUseBoost}
                      disabled={using}
                      style={{ minHeight: 44, touchAction: 'manipulation' }}
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
                    type="button"
                    onClick={() => window.location.href = '/pricing'}
                    style={{ minHeight: 44, touchAction: 'manipulation' }}
                    className="w-full kq-btn kq-btn-blue text-sm py-2 mb-2"
                  >
                    Upgrade for Momentum Boost
                  </button>
                  {/* Close path 1 of 3: a real <button> with an accessible label.
                      py-3 plus minHeight/minWidth give it a >=44px hit area. It
                      previously had no padding at all, so on a tablet the
                      tappable strip was only ~16px tall and sat directly above
                      the fixed BottomNav. Text, colour and size are unchanged. */}
                  <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Close this Momentum Boost message"
                    style={{ minHeight: 44, minWidth: 44, touchAction: 'manipulation' }}
                    className="w-full py-3 text-navy/50 hover:text-navy text-xs font-bold"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
