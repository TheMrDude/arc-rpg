'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { trackGoldPurchaseViewed, trackGoldPurchaseInitiated } from '@/lib/analytics';

const GOLD_PACKAGES = {
  starter: {
    id: 'starter',
    name: 'Starter Pack',
    gold: 500,
    price: 2.99,
    emoji: '💰',
    description: 'Perfect for beginners',
    comparison: 'Skip ~2 days of grinding',
    highlight: false,
  },
  adventurer: {
    id: 'adventurer',
    name: 'Adventurer Pack',
    gold: 1000,
    price: 4.99,
    emoji: '⚔️',
    description: 'Get a head start',
    comparison: 'Skip ~4 days of grinding',
    highlight: false,
  },
  hero: {
    id: 'hero',
    name: 'Hero Pack',
    gold: 2500,
    price: 9.99,
    emoji: '🛡️',
    description: 'Best value!',
    comparison: 'Skip ~10 days of grinding',
    highlight: true,
  },
  legend: {
    id: 'legend',
    name: 'Legend Pack',
    gold: 6000,
    price: 19.99,
    emoji: '👑',
    description: 'For true champions',
    comparison: 'Skip ~24 days of grinding',
    highlight: false,
  },
};

function GoldPackageCard({ pkg, onPurchase, isPurchasing }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative bg-[#1A1A2E] rounded-lg p-6 border-3 transition-all ${
        pkg.highlight
          ? 'border-[#FFD93D] shadow-[0_0_20px_rgba(255,217,61,0.3)]'
          : 'border-[#00D4FF] border-opacity-30 hover:border-opacity-100'
      } ${isHovered && !pkg.highlight ? 'shadow-[0_0_15px_rgba(0,212,255,0.2)]' : ''}`}
    >
      {/* Best Value Badge */}
      {pkg.highlight && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#FFD93D] text-[#1A1A2E] px-4 py-1 rounded-full font-black text-xs uppercase border-2 border-[#1A1A2E]">
          ⭐ Best Value ⭐
        </div>
      )}

      {/* Package Icon */}
      <div className="text-center mb-4">
        <div className="text-6xl mb-2">{pkg.emoji}</div>
        <h3
          className="text-2xl font-black text-[#FFD93D] mb-1"
          style={{ fontFamily: 'VT323, monospace' }}
        >
          {pkg.name}
        </h3>
        <p className="text-sm text-[#00D4FF] font-bold">{pkg.description}</p>
      </div>

      {/* Gold Amount */}
      <div className="bg-[#0F3460] rounded-lg p-4 mb-4 border-2 border-[#00D4FF] border-opacity-30">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl">🪙</span>
          <span
            className="text-4xl font-black text-[#FFD93D]"
            style={{ fontFamily: 'VT323, monospace' }}
          >
            {pkg.gold.toLocaleString()}
          </span>
          <span className="text-lg text-[#00D4FF] font-bold">GOLD</span>
        </div>
      </div>

      {/* Comparison */}
      <div className="text-center mb-4">
        <p className="text-xs text-gray-400 italic">{pkg.comparison}</p>
      </div>

      {/* Price & Purchase Button */}
      <div className="space-y-3">
        <div className="text-center">
          <span
            className="text-3xl font-black text-white"
            style={{ fontFamily: 'VT323, monospace' }}
          >
            ${pkg.price.toFixed(2)}
          </span>
        </div>
        <button
          onClick={() => onPurchase(pkg.id)}
          disabled={isPurchasing}
          className={
            'w-full py-3 px-6 rounded-lg font-black uppercase border-3 transition-all ' +
            (isPurchasing
              ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
              : pkg.highlight
              ? 'bg-[#FFD93D] border-[#FF6B6B] text-[#1A1A2E] hover:shadow-[0_5px_0_#FF6B6B] hover:-translate-y-0.5 active:shadow-[0_1px_0_#FF6B6B] active:translate-y-1 shadow-[0_3px_0_#FF6B6B]'
              : 'bg-[#00D4FF] border-[#0F3460] text-[#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_3px_0_#0F3460]')
          }
          style={{ fontFamily: 'VT323, monospace' }}
        >
          {isPurchasing ? '⏳ PROCESSING...' : '💳 PURCHASE'}
        </button>
      </div>
    </motion.div>
  );
}

export default function GoldShop({ onClose }) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState(null);

  // Track when gold shop is viewed
  useEffect(() => {
    trackGoldPurchaseViewed();
  }, []);

  const handlePurchase = async (packageType) => {
    setIsPurchasing(true);
    setError(null);

    // Get package details for tracking
    const pkg = GOLD_PACKAGES[packageType];
    if (pkg) {
      trackGoldPurchaseInitiated(packageType, pkg.price);
    }

    try {
      const { getSupabaseClient } = await import('@/lib/supabase-client');
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('Please log in to purchase gold');
        setIsPurchasing(false);
        return;
      }

      const response = await fetch('/api/gold/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ package_type: packageType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create purchase session');
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message || 'Failed to start purchase. Please try again.');
      setIsPurchasing(false);
    }
  };

  return (
    <div className="bg-[#0F3460] rounded-lg p-8 border-3 border-[#00D4FF]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-4xl font-black text-[#FFD93D] mb-2"
            style={{ fontFamily: 'VT323, monospace' }}
          >
            🪙 GOLD SHOP
          </h2>
          <p className="text-[#00D4FF] font-bold">
            Support development & speed up your adventure
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#00D4FF] hover:text-[#FFD93D] transition-colors text-3xl font-bold"
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#FF6B6B] bg-opacity-20 border-2 border-[#FF6B6B] rounded-lg p-4 mb-6">
          <p className="text-[#FF6B6B] font-bold">⚠️ {error}</p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-[#1A1A2E] border-2 border-[#00D4FF] border-opacity-30 rounded-lg p-4 mb-6">
        <p className="text-white text-sm text-center">
          💡 <strong className="text-[#FFD93D]">Fair Play:</strong> Gold helps you progress
          faster, but all content is accessible to free players through daily quests. Your
          purchase supports ongoing development!
        </p>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.values(GOLD_PACKAGES).map((pkg) => (
          <GoldPackageCard
            key={pkg.id}
            pkg={pkg}
            onPurchase={handlePurchase}
            isPurchasing={isPurchasing}
          />
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          Secure payment powered by Stripe • All purchases are final • Gold is granted
          immediately after payment
        </p>
      </div>
    </div>
  );
}
