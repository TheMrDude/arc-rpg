'use client';

import { useState, useEffect } from 'react';

export default function ReferralCard({ userId, profile }) {
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userId) {
      // Generate a simple referral code from user ID
      const code = generateReferralCode(userId);
      setReferralCode(code);

      // Get referral count from localStorage (simple tracking)
      const count = parseInt(localStorage.getItem(`referral_count_${userId}`) || '0');
      setReferralCount(count);
    }
  }, [userId]);

  const generateReferralCode = (uid) => {
    // Create a short, readable code from UUID
    // Take first 8 chars of UUID and make uppercase
    return uid.substring(0, 8).toUpperCase();
  };

  const getReferralLink = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/signup?ref=${referralCode}`;
    }
    return '';
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = (platform) => {
    const link = getReferralLink();
    const text = 'Transform your to-do list into an epic RPG adventure! Join me on HabitQuest:';

    let shareUrl = '';
    if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
    } else if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const rewardProgress = Math.min(referralCount / 3, 1);
  const rewardsEarned = Math.floor(referralCount / 3);

  return (
    <div className="kq-card p-6 border-2 border-purple/30">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="kq-display text-xl font-bold mb-1 text-navy">🎁 Refer Friends, Get Rewards!</h3>
          <p className="text-sm text-navy/60">
            Share HabitQuest and earn premium perks when friends join
          </p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-4">
        <label className="kq-label mb-2 block">Your Referral Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={getReferralLink()}
            readOnly
            className="kq-input flex-1 text-sm"
          />
          <button
            onClick={handleCopy}
            className={`kq-btn ${copied ? 'kq-btn-emerald' : 'kq-btn-gold'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Social Share Buttons */}
      <div className="mb-4">
        <label className="kq-label mb-2 block">Share On</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleShare('twitter')}
            className="kq-btn kq-btn-blue flex-1 text-sm"
          >
            Twitter
          </button>
          <button
            onClick={() => handleShare('facebook')}
            className="kq-btn kq-btn-blue flex-1 text-sm"
          >
            Facebook
          </button>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-cream rounded-candy p-4 border-2 border-stone">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-navy">Referral Progress</span>
          <span className="text-sm text-navy/60">{referralCount} / 3 referrals</span>
        </div>
        <div className="w-full bg-stone rounded-full h-3 overflow-hidden mb-3">
          <div
            className="bg-gradient-to-r from-gold to-coral h-full transition-all duration-500"
            style={{ width: `${rewardProgress * 100}%` }}
          />
        </div>
        {referralCount < 3 ? (
          <p className="text-xs text-navy/60">
            🎯 Refer {3 - referralCount} more {referralCount === 2 ? 'friend' : 'friends'} to earn 1 month of Premium FREE!
          </p>
        ) : (
          <div className="text-center">
            <p className="text-gold font-bold mb-2">
              🎉 Congratulations! You've earned {rewardsEarned} month{rewardsEarned > 1 ? 's' : ''} of Premium!
            </p>
            <p className="text-xs text-navy/60">
              Contact support to claim your reward
            </p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <details className="mt-4">
        <summary className="text-sm text-navy/60 cursor-pointer hover:text-navy">
          How does it work?
        </summary>
        <div className="mt-2 text-xs text-navy/60 space-y-1">
          <p>1. Share your unique referral link with friends</p>
          <p>2. When they sign up and complete 5 quests, you both win!</p>
          <p>3. Every 3 referrals = 1 month of Premium FREE</p>
          <p>4. No limit on referrals - help friends & earn rewards!</p>
        </div>
      </details>
    </div>
  );
}
