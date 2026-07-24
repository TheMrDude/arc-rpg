'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExitIntentPopupProps {
  onTryPreview: () => void;
}

export default function ExitIntentPopup({ onTryPreview }: ExitIntentPopupProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if we've already shown this session
    if (hasShown || typeof window === 'undefined') return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Detect when mouse leaves viewport from top (typical browser close/tab switch)
      if (e.clientY < 10 && !hasShown) {
        setShowPopup(true);
        setHasShown(true);
      }
    };

    // Add slight delay before activating to avoid false positives
    const timeoutId = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000); // Wait 5 seconds before activating

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);

  const handleTryPreview = () => {
    setShowPopup(false);
    onTryPreview();
  };

  const handleStay = () => {
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleStay}
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        />

        {/* Popup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative w-full max-w-md kq-card p-8 text-center"
        >
          {/* Close button */}
          <button
            onClick={handleStay}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-coral/12 hover:bg-coral/20 border-2 border-coral text-coral text-xl font-bold transition-colors"
          >
            ×
          </button>

          {/* Content */}
          <div className="text-6xl mb-4">⚔️</div>

          <h2 className="kq-display text-3xl text-coral mb-4">
            Wait! Don&apos;t Leave Yet
          </h2>

          <p className="text-lg text-navy mb-2">
            See the magic <span className="text-hero-blue font-black">before you go!</span>
          </p>

          <p className="text-navy/60 mb-8">
            Try transforming one task into an epic quest.
            Takes 3 seconds. No signup required.
          </p>

          {/* Benefits */}
          <div className="bg-hero-blue/10 border-2 border-hero-blue/40 rounded-candy p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-emerald text-xl">✓</span>
              <span className="text-sm text-navy">See AI transform your task instantly</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-emerald text-xl">✓</span>
              <span className="text-sm text-navy">Preview XP rewards & difficulty</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald text-xl">✓</span>
              <span className="text-sm text-navy">No credit card or signup needed</span>
            </div>
          </div>

          {/* CTAs */}
          <button
            onClick={handleTryPreview}
            className="kq-btn kq-btn-gold w-full mb-3 py-4 text-lg"
          >
            ⚡ Try One Quest Preview
          </button>

          <button
            onClick={handleStay}
            className="w-full py-2 text-navy/50 hover:text-navy text-sm transition-colors"
          >
            No thanks, I&apos;ll leave
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
