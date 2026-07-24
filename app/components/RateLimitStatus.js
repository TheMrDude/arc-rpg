'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Rate Limit Status Component
 *
 * Displays current usage for AI-powered features
 * Shows upgrade prompt for free users approaching limits
 *
 * Props:
 * - userId: Current user ID
 * - isPremium: Whether user has premium
 * - onUpgradeClick: Callback when upgrade button clicked
 */

export default function RateLimitStatus({ userId, isPremium, onUpgradeClick }) {
  const [limits, setLimits] = useState({
    questTransforms: { current: 0, limit: isPremium ? 200 : 20, resetAt: null },
    journalTransforms: { current: 0, limit: isPremium ? 20 : 5, resetAt: null },
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (userId) {
      loadRateLimitStatus();
      // Refresh every 5 minutes
      const interval = setInterval(loadRateLimitStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  async function loadRateLimitStatus() {
    try {
      const response = await fetch('/api/rate-limits/status', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLimits(data.limits || limits);
      }
    } catch (error) {
      console.error('Failed to load rate limit status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function getAuthToken() {
    // Get token from Supabase
    const { createClient } = await import('@/lib/supabase-client');
    const supabase = (await import('@/lib/supabase-client')).supabase;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  const questPercentage = (limits.questTransforms.current / limits.questTransforms.limit) * 100;
  const journalPercentage = (limits.journalTransforms.current / limits.journalTransforms.limit) * 100;

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return '#FF7B6B'; // Coral - almost at limit
    if (percentage >= 70) return '#FFC83D'; // Gold - getting close
    return '#4CAF7D'; // Emerald - plenty left
  };

  const formatResetTime = (resetAt) => {
    if (!resetAt) return 'Unknown';
    const date = new Date(resetAt);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return 'Resetting soon...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Resets in ${hours}h ${minutes}m`;
    }
    return `Resets in ${minutes}m`;
  };

  if (loading) {
    return null; // Don't show until loaded
  }

  const questRemaining = limits.questTransforms.limit - limits.questTransforms.current;
  const journalRemaining = limits.journalTransforms.limit - limits.journalTransforms.current;
  const showWarning = !isPremium && (questRemaining <= 5 || journalRemaining <= 1);

  return (
    <div className="kq-card p-4 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h3 className="font-bold text-hero-blue text-sm kq-display">AI Usage</h3>
            <p className="text-xs text-navy/60">
              {isPremium ? 'Premium - High Limits' : 'Free Tier - Daily Limits'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="kq-btn kq-btn-ghost px-3 py-1 text-sm"
        >
          {expanded ? '▲ Hide' : '▼ Details'}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {/* Quest Transforms */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-navy/70">Quest Transforms</span>
                  <span className="text-sm font-bold text-hero-blue">
                    {questRemaining} / {limits.questTransforms.limit} left
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-cream rounded-full overflow-hidden border-2 border-stone">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${questPercentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: getStatusColor(questPercentage) }}
                  />
                </div>

                <p className="text-xs text-navy/50 mt-1">
                  {formatResetTime(limits.questTransforms.resetAt)}
                </p>
              </div>

              {/* Journal Transforms */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-navy/70">Journal Transforms</span>
                  <span className="text-sm font-bold text-gold">
                    {journalRemaining} / {limits.journalTransforms.limit} left
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-cream rounded-full overflow-hidden border-2 border-stone">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${journalPercentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: getStatusColor(journalPercentage) }}
                  />
                </div>

                <p className="text-xs text-navy/50 mt-1">
                  {formatResetTime(limits.journalTransforms.resetAt)}
                </p>
              </div>

              {/* Warning for users approaching limit */}
              {showWarning && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gold/15 border-2 border-gold rounded-candy p-3 mt-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-navy">
                        Running low on transforms!
                      </p>
                      <p className="text-xs text-navy/60">
                        Upgrade to get {isPremium ? 'unlimited' : '10x more'} AI transforms
                      </p>
                    </div>
                    {!isPremium && onUpgradeClick && (
                      <button
                        onClick={onUpgradeClick}
                        className="kq-btn kq-btn-gold px-4 py-2 text-xs"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Premium Upsell */}
              {!isPremium && (
                <div className="border-t-2 border-stone pt-3 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-navy/70">Want more?</p>
                      <p className="text-xs text-navy/50">
                        Premium: 200 quests + 20 journals per day
                      </p>
                    </div>
                    {onUpgradeClick && (
                      <button
                        onClick={onUpgradeClick}
                        className="kq-btn kq-btn-blue px-3 py-1 text-xs"
                      >
                        🌟 Go Pro
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact view when collapsed */}
      {!expanded && (
        <div className="mt-3 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor(questPercentage) }}
            />
            <span className="text-navy/60">
              Quests: <span className="font-bold text-navy">{questRemaining}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor(journalPercentage) }}
            />
            <span className="text-navy/60">
              Journal: <span className="font-bold text-navy">{journalRemaining}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
