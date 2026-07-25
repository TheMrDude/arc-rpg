'use client';

import { useState, useEffect } from 'react';

export default function UnlockToast({ unlocks }) {
  const [activeToast, setActiveToast] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!unlocks || unlocks.length === 0) return;

    let index = 0;

    function showNext() {
      if (index >= unlocks.length) return;

      setActiveToast(unlocks[index]);
      setIsVisible(true);

      // Auto-hide after 4 seconds
      setTimeout(() => {
        setIsVisible(false);

        // After fade-out animation (400ms), show next with 2s gap
        setTimeout(() => {
          index++;
          showNext();
        }, 2000);
      }, 4000);
    }

    // Start showing first toast after a brief delay
    const startTimer = setTimeout(showNext, 500);

    return () => clearTimeout(startTimer);
  }, [unlocks]);

  if (!activeToast) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-[80] max-w-sm transition-all duration-500 ${
        isVisible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
    >
      <div className="kq-card border-2 border-aqua/40 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{activeToast.icon}</span>
          <div>
            <p className="text-hero-blue font-bold text-sm">
              🔓 New unlock: {activeToast.title}!
            </p>
            <p className="text-navy/60 text-xs mt-1">{activeToast.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
