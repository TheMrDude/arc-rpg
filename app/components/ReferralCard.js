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
    const text = 'Transform your to-do list into an epic RPG adventure! Join me on ARC RPG:';

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
    <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-2 border-purple-500 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1">🎁 Refer Friends, Get Rewards!</h3>
          <p className="text-sm text-gray-300">
            Share ARC RPG and earn premium perks when friends join
          </p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Your Referral Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={getReferralLink()}
            readOnly
            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-mono"
          />
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-yellow-400 hover:bg-yellow-500 text-black'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Social Share Buttons */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Share On</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleShare('twitter')}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition"
          >
            Twitter
          </button>
          <button
            onClick={() => handleShare('facebook')}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
          >
            Facebook
          </button>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold">Referral Progress</span>
          <span className="text-sm text-gray-400">{referralCount} / 3 referrals</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden mb-3">
          <div
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-500"
            style={{ width: `${rewardProgress * 100}%` }}
          />
        </div>
        {referralCount < 3 ? (
          <p className="text-xs text-gray-400">
            🎯 Refer {3 - referralCount} more {referralCount === 2 ? 'friend' : 'friends'} to earn 1 month of Premium FREE!
          </p>
        ) : (
          <div className="text-center">
            <p className="text-yellow-400 font-bold mb-2">
              🎉 Congratulations! You've earned {rewardsEarned} month{rewardsEarned > 1 ? 's' : ''} of Premium!
            </p>
            <p className="text-xs text-gray-400">
              Contact support to claim your reward
            </p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <details className="mt-4">
        <summary className="text-sm text-gray-400 cursor-pointer hover:text-white">
          How does it work?
        </summary>
        <div className="mt-2 text-xs text-gray-400 space-y-1">
          <p>1. Share your unique referral link with friends</p>
          <p>2. When they sign up and complete 5 quests, you both win!</p>
          <p>3. Every 3 referrals = 1 month of Premium FREE</p>
          <p>4. No limit on referrals - help friends & earn rewards!</p>
        </div>
      </details>
    </div>
  );
}
