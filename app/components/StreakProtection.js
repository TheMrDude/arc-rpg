'use client';

import { useState, useEffect } from 'react';

export default function StreakProtection({ streak, lastActivityDate, isPremium, onProtect }) {
  const [showWarning, setShowWarning] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(24);

  useEffect(() => {
    if (!lastActivityDate) return;

    const checkStreak = () => {
      const lastActivity = new Date(lastActivityDate);
      const now = new Date();
      const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
      const hoursRemaining = Math.max(0, 24 - hoursSinceActivity);

      setHoursLeft(Math.floor(hoursRemaining));

      // Show warning if streak is in danger (less than 6 hours left) and streak > 3
      if (hoursRemaining < 6 && hoursRemaining > 0 && streak > 3) {
        setShowWarning(true);
      }
    };

    checkStreak();
    const interval = setInterval(checkStreak, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [lastActivityDate, streak]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-6 right-6 max-w-sm z-50 animate-slide-in-up">
      <div className="card-retro border-red-500 p-6 shadow-2xl animate-pulse">
        <div className="flex items-start gap-4">
          <div className="text-5xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-red-400 mb-2">
              YOUR {streak}-DAY STREAK IS IN DANGER!
            </h3>
            <p className="text-gray-300 mb-4">
              Only <span className="text-red-400 font-black">{hoursLeft} hours</span> left to complete a quest!
              Don't let {streak} days of progress vanish.
            </p>

            {!isPremium && (
              <div className="bg-[#0F172A] border-2 border-[#7C3AED] rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🛡️</span>
                  <div className="font-black text-[#7C3AED]">PREMIUM: STREAK PROTECTION</div>
                </div>
                <p className="text-sm text-gray-300 mb-3">
                  Founders get 1 "streak freeze" per week. Never lose your progress again.
                </p>
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full btn-retro btn-secondary text-sm py-2"
                >
                  Upgrade to Protect Your Streak
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 btn-retro bg-gray-600 hover:bg-gray-500 border-gray-700 text-white py-2 text-sm"
              >
                Remind Me Later
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  // Scroll to quest input
                  document.querySelector('input[placeholder="Enter your task..."]')?.focus();
                }}
                className="flex-1 btn-retro btn-success py-2 text-sm"
              >
                Add Quest Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
