'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingExitIntentProps {
  onStay: () => void;
  onGetEmail?: (email: string) => void;
}

export default function PricingExitIntent({ onStay, onGetEmail }: PricingExitIntentProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [email, setEmail] = useState('');
  const [emailCaptured, setEmailCaptured] = useState(false);

  useEffect(() => {
    if (hasShown || typeof window === 'undefined') return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10 && !hasShown) {
        setShowPopup(true);
        setHasShown(true);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 10000); // Wait 10 seconds (pricing page, user needs more time)

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email && email.includes('@')) {
      // Send email to API
      try {
        await fetch('/api/email-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            source: 'pricing_exit_intent',
            tags: ['founder_deal_interest', 'price_sensitive']
          })
        });

        setEmailCaptured(true);
        if (onGetEmail) {
          onGetEmail(email);
        }

        // Close after 3 seconds
        setTimeout(() => {
          setShowPopup(false);
        }, 3000);
      } catch (error) {
        console.error('Email capture failed:', error);
      }
    }
  };

  const handleClose = () => {
    setShowPopup(false);
    if (onStay) {
      onStay();
    }
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
          onClick={handleClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        />

        {/* Popup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative w-full max-w-lg bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-4 border-[#FFD93D] rounded-2xl p-8 text-center shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#16213E] hover:bg-[#0F3460] border-2 border-[#FFD93D] text-[#FFD93D] text-xl font-bold transition-colors"
          >
            ×
          </button>

          {emailCaptured ? (
            /* Success State */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-7xl mb-4">🎉</div>
              <h2 className="text-3xl font-black text-[#10B981] uppercase mb-4">
                Awesome! We'll Keep You Posted
              </h2>
              <p className="text-gray-300 mb-4">
                We'll send you exclusive founder updates and let you know before spots run out!
              </p>
              <p className="text-sm text-gray-400">
                Closing in 3 seconds...
              </p>
            </motion.div>
          ) : (
            /* Main Content */
            <>
              <div className="text-6xl mb-4">⏰</div>

              <h2 className="text-3xl sm:text-4xl font-black text-[#FFD93D] uppercase tracking-wide mb-4">
                Wait! Special Offer
              </h2>

              <p className="text-xl text-white mb-6">
                Before you go, let me sweeten the deal...
              </p>

              {/* Value Props */}
              <div className="bg-[#0F3460]/50 border-2 border-[#FFD93D] rounded-lg p-6 mb-6 text-left">
                <h3 className="text-lg font-black text-[#FFD93D] mb-4 text-center">
                  🔥 Founder's Lifetime Deal - Only $47
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[#10B981] text-xl flex-shrink-0">✓</span>
                    <span className="text-sm text-white">
                      <strong>Pay once, own forever</strong> - No subscriptions, ever
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[#10B981] text-xl flex-shrink-0">✓</span>
                    <span className="text-sm text-white">
                      <strong>All future features FREE</strong> - New archetypes, power-ups, everything
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[#10B981] text-xl flex-shrink-0">✓</span>
                    <span className="text-sm text-white">
                      <strong>Founder badge & perks</strong> - Exclusive recognition + early access
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[#FFD93D] text-xl flex-shrink-0">⚡</span>
                    <span className="text-sm text-[#FFD93D] font-bold">
                      Only 23 of 25 spots remaining!
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Capture */}
              <div className="mb-6">
                <p className="text-sm text-gray-300 mb-4">
                  Not ready yet? Get notified before spots run out:
                </p>
                <form onSubmit={handleEmailSubmit} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="flex-1 px-4 py-3 bg-[#0F3460] text-white placeholder-gray-400 border-2 border-[#FFD93D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD93D]/50"
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#FFD93D] hover:bg-[#FFC700] text-[#1A1A2E] rounded-lg font-black uppercase text-sm transition-all"
                  >
                    Notify Me
                  </button>
                </form>
              </div>

              {/* OR divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-600"></div>
                <span className="text-gray-400 text-sm font-bold">OR</span>
                <div className="flex-1 h-px bg-gray-600"></div>
              </div>

              {/* CTA */}
              <button
                onClick={handleClose}
                className="w-full py-4 bg-gradient-to-r from-[#FFD93D] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB600] text-[#1A1A2E] border-3 border-[#0F3460] rounded-xl font-black text-xl uppercase tracking-wide shadow-lg transition-all"
              >
                💎 Claim My Founder Spot - $47
              </button>

              <p className="text-xs text-gray-500 mt-4">
                30-day money-back guarantee • Secure payment via Stripe
              </p>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
