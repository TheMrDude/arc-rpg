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
          className="relative w-full max-w-md bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-4 border-[#FF6B6B] rounded-2xl p-8 text-center shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleStay}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#16213E] hover:bg-[#0F3460] border-2 border-[#FF6B6B] text-[#FF6B6B] text-xl font-bold transition-colors"
          >
            ×
          </button>

          {/* Content */}
          <div className="text-6xl mb-4">⚔️</div>

          <h2 className="text-3xl font-black text-[#FF6B6B] uppercase tracking-wide mb-4">
            Wait! Don't Leave Yet
          </h2>

          <p className="text-lg text-white mb-2">
            See the magic <span className="text-[#00D4FF] font-black">before you go!</span>
          </p>

          <p className="text-gray-300 mb-8">
            Try transforming one task into an epic quest.
            Takes 3 seconds. No signup required.
          </p>

          {/* Benefits */}
          <div className="bg-[#0F3460]/50 border-2 border-[#00D4FF] rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[#10B981] text-xl">✓</span>
              <span className="text-sm text-white">See AI transform your task instantly</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[#10B981] text-xl">✓</span>
              <span className="text-sm text-white">Preview XP rewards & difficulty</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#10B981] text-xl">✓</span>
              <span className="text-sm text-white">No credit card or signup needed</span>
            </div>
          </div>

          {/* CTAs */}
          <button
            onClick={handleTryPreview}
            className="w-full mb-3 py-4 bg-gradient-to-r from-[#FF6B4A] to-[#FF5733] hover:from-[#FF5733] hover:to-[#E74C3C] text-white border-3 border-[#0F3460] rounded-xl font-black text-lg uppercase tracking-wide shadow-lg transition-all"
          >
            ⚡ Try One Quest Preview
          </button>

          <button
            onClick={handleStay}
            className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            No thanks, I'll leave
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
