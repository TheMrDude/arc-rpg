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
      className={`relative kq-card kq-card-hover p-6 transition-all ${
        pkg.highlight
          ? 'border-2 border-gold'
          : 'border-2 border-stone'
      }`}
    >
      {/* Best Value Badge */}
      {pkg.highlight && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gold text-navy px-4 py-1 rounded-full font-bold text-xs kq-chip">
          ⭐ Best Value ⭐
        </div>
      )}

      {/* Package Icon */}
      <div className="text-center mb-4">
        <div className="text-6xl mb-2">{pkg.emoji}</div>
        <h3 className="kq-display text-2xl font-bold text-navy mb-1">
          {pkg.name}
        </h3>
        <p className="text-sm text-hero-blue font-bold">{pkg.description}</p>
      </div>

      {/* Gold Amount */}
      <div className="bg-cream rounded-candy p-4 mb-4 border-2 border-stone">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl">🪙</span>
          <span className="kq-display text-4xl font-bold text-gold">
            {pkg.gold.toLocaleString()}
          </span>
          <span className="text-lg text-navy/60 font-bold">GOLD</span>
        </div>
      </div>

      {/* Comparison */}
      <div className="text-center mb-4">
        <p className="text-xs text-navy/50 italic">{pkg.comparison}</p>
      </div>

      {/* Price & Purchase Button */}
      <div className="space-y-3">
        <div className="text-center">
          <span className="kq-display text-3xl font-bold text-navy">
            ${pkg.price.toFixed(2)}
          </span>
        </div>
        <button
          onClick={() => onPurchase(pkg.id)}
          disabled={isPurchasing}
          className={
            'kq-btn w-full ' +
            (isPurchasing
              ? 'bg-navy/20 text-navy/40 cursor-not-allowed'
              : pkg.highlight
              ? 'kq-btn-gold'
              : 'kq-btn-blue')
          }
        >
          {isPurchasing ? '⏳ Processing...' : '💳 Purchase'}
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
    <div className="kq-card p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="kq-display text-4xl font-bold text-navy mb-2">
            🪙 Gold Shop
          </h2>
          <p className="text-hero-blue font-bold">
            Support development & speed up your adventure
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-navy/50 hover:text-coral transition-colors text-3xl font-bold"
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-coral/12 border-2 border-coral rounded-candy p-4 mb-6">
          <p className="text-coral font-bold">⚠️ {error}</p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-cream border-2 border-stone rounded-candy p-4 mb-6">
        <p className="text-navy text-sm text-center">
          💡 <strong className="text-gold">Fair Play:</strong> Gold helps you progress
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
        <p className="text-xs text-navy/50">
          Secure payment powered by Stripe • All purchases are final • Gold is granted
          immediately after payment
        </p>
      </div>
    </div>
  );
}
