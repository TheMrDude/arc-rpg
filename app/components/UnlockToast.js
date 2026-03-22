'use client';

import { useState, useEffect } from 'react';

export default function UnlockToast({ unlocks }) {
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!unlocks || unlocks.length === 0) return;

    // Show first unlock immediately
    setIsVisible(true);

    // Cycle through unlocks
    const timer = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setVisibleIndex(prev => {
          const next = prev + 1;
          if (next >= unlocks.length) {
            clearInterval(timer);
            return prev;
          }
          setIsVisible(true);
          return next;
        });
      }, 400);
    }, 4000);

    // Hide last one after 4 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, unlocks.length * 4000);

    return () => {
      clearInterval(timer);
      clearTimeout(hideTimer);
    };
  }, [unlocks]);

  if (!unlocks || unlocks.length === 0 || visibleIndex >= unlocks.length) return null;

  const unlock = unlocks[visibleIndex];

  return (
    <div
      className={`fixed top-4 right-4 z-[80] max-w-sm transition-all duration-400 ${
        isVisible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-[#1A1A2E] border-2 border-[#00D4FF] rounded-lg p-4 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{unlock.icon}</span>
          <div>
            <p className="text-[#00D4FF] font-black uppercase text-sm tracking-wide">
              🔓 New Unlocked: {unlock.title}!
            </p>
            <p className="text-[#E2E8F0] text-xs mt-1">{unlock.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
