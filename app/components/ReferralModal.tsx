'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReferralStats, generateReferralLink } from '@/lib/referrals';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';

interface ReferralModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReferralModal({ userId, isOpen, onClose }: ReferralModalProps) {
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalXpEarned: 0,
    code: '',
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadReferralStats();
    }
  }, [isOpen, userId]);

  const loadReferralStats = async () => {
    setLoading(true);
    const data = await getReferralStats(userId, supabase);
    setStats(data);
    setLoading(false);
  };

  const referralLink = generateReferralLink(stats.code);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      trackEvent('referral_link_copied', { code: stats.code });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin') => {
    const shareText = `Join me on HabitQuest and turn your life into an epic RPG! 🎮⚔️ Use my referral code: ${stats.code}`;
    const encodedLink = encodeURIComponent(referralLink);

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodedLink}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodeURIComponent(shareText)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
    trackEvent('referral_shared', { platform, code: stats.code });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-4 border-[#00D4FF] rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,212,255,0.3)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black uppercase text-[#FFD93D]">
                🎁 Invite Friends
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-[#00D4FF] border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading referral stats...</p>
              </div>
            ) : (
              <>
                {/* Reward Info */}
                <div className="bg-[#0F3460] border-2 border-[#FFD93D] rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">🎖️</div>
                    <div>
                      <h3 className="text-xl font-black text-[#FFD93D] mb-2">
                        Earn 100 XP Per Friend!
                      </h3>
                      <p className="text-gray-300 text-sm mb-2">
                        When your friends sign up and complete their first quest, you both get rewarded!
                      </p>
                      <ul className="text-sm text-[#00D4FF] space-y-1">
                        <li>✓ You get 100 XP</li>
                        <li>✓ They get a warm welcome</li>
                        <li>✓ Everyone levels up faster</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#0F3460] rounded-lg p-4 text-center border-2 border-[#00D4FF]/30">
                    <div className="text-3xl font-black text-[#00D4FF]">
                      {stats.totalReferrals}
                    </div>
                    <div className="text-xs text-gray-400 uppercase font-bold mt-1">
                      Total
                    </div>
                  </div>
                  <div className="bg-[#0F3460] rounded-lg p-4 text-center border-2 border-[#10B981]/30">
                    <div className="text-3xl font-black text-[#10B981]">
                      {stats.completedReferrals}
                    </div>
                    <div className="text-xs text-gray-400 uppercase font-bold mt-1">
                      Completed
                    </div>
                  </div>
                  <div className="bg-[#0F3460] rounded-lg p-4 text-center border-2 border-[#F59E0B]/30">
                    <div className="text-3xl font-black text-[#F59E0B]">
                      {stats.pendingReferrals}
                    </div>
                    <div className="text-xs text-gray-400 uppercase font-bold mt-1">
                      Pending
                    </div>
                  </div>
                  <div className="bg-[#0F3460] rounded-lg p-4 text-center border-2 border-[#7C3AED]/30">
                    <div className="text-3xl font-black text-[#7C3AED]">
                      {stats.totalXpEarned}
                    </div>
                    <div className="text-xs text-gray-400 uppercase font-bold mt-1">
                      XP Earned
                    </div>
                  </div>
                </div>

                {/* Referral Code */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">
                    Your Referral Code
                  </label>
                  <div className="bg-[#0F3460] border-2 border-[#00D4FF] rounded-lg p-4 flex items-center justify-between">
                    <span className="text-2xl md:text-3xl font-black text-[#00D4FF] tracking-wider">
                      {stats.code}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#1A1A2E] rounded-lg font-black uppercase text-sm transition-colors"
                    >
                      {copied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-400 mb-3 uppercase">
                    Share on Social Media
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleShare('twitter')}
                      className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                      Twitter
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="bg-[#4267B2] hover:bg-[#365899] text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </button>
                    <button
                      onClick={() => handleShare('linkedin')}
                      className="bg-[#0077B5] hover:bg-[#006399] text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </button>
                  </div>
                </div>

                {/* Referral Link Display */}
                <div className="bg-[#0F3460]/50 border border-[#00D4FF]/30 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2 uppercase font-bold">
                    Your Referral Link
                  </p>
                  <p className="text-sm text-[#00D4FF] break-all font-mono">
                    {referralLink}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
