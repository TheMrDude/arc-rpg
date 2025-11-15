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
    if (percentage >= 90) return '#FF6B6B'; // Red - almost at limit
    if (percentage >= 70) return '#FFD93D'; // Yellow - getting close
    return '#48BB78'; // Green - plenty left
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
    <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h3 className="font-black uppercase text-[#00D4FF] text-sm">AI Usage</h3>
            <p className="text-xs text-gray-400">
              {isPremium ? 'Premium - High Limits' : 'Free Tier - Daily Limits'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1 bg-[#0F3460] hover:bg-[#1a4a7a] text-white rounded border-2 border-[#1A1A2E] text-sm font-bold transition-all"
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
                  <span className="text-sm font-bold text-gray-300">Quest Transforms</span>
                  <span className="text-sm font-black text-[#00D4FF]">
                    {questRemaining} / {limits.questTransforms.limit} left
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-[#0F3460] rounded-full overflow-hidden border-2 border-[#1A1A2E]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${questPercentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: getStatusColor(questPercentage) }}
                  />
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  {formatResetTime(limits.questTransforms.resetAt)}
                </p>
              </div>

              {/* Journal Transforms */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-gray-300">Journal Transforms</span>
                  <span className="text-sm font-black text-[#FFD93D]">
                    {journalRemaining} / {limits.journalTransforms.limit} left
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-[#0F3460] rounded-full overflow-hidden border-2 border-[#1A1A2E]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${journalPercentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: getStatusColor(journalPercentage) }}
                  />
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  {formatResetTime(limits.journalTransforms.resetAt)}
                </p>
              </div>

              {/* Warning for users approaching limit */}
              {showWarning && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-[#FFD93D] bg-opacity-20 border-2 border-[#FFD93D] rounded-lg p-3 mt-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#FFD93D]">
                        Running low on transforms!
                      </p>
                      <p className="text-xs text-gray-300">
                        Upgrade to get {isPremium ? 'unlimited' : '10x more'} AI transforms
                      </p>
                    </div>
                    {!isPremium && onUpgradeClick && (
                      <button
                        onClick={onUpgradeClick}
                        className="px-4 py-2 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] rounded font-black text-xs uppercase shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Premium Upsell */}
              {!isPremium && (
                <div className="border-t-2 border-[#0F3460] pt-3 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-300">Want more?</p>
                      <p className="text-xs text-gray-400">
                        Premium: 200 quests + 20 journals per day
                      </p>
                    </div>
                    {onUpgradeClick && (
                      <button
                        onClick={onUpgradeClick}
                        className="px-3 py-1 bg-[#00D4FF] hover:bg-[#00BBE6] text-[#0F3460] rounded font-black text-xs uppercase border-2 border-[#0F3460] transition-all"
                      >
                        🔥 $47
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
            <span className="text-gray-400">
              Quests: <span className="font-bold text-white">{questRemaining}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor(journalPercentage) }}
            />
            <span className="text-gray-400">
              Journal: <span className="font-bold text-white">{journalRemaining}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
