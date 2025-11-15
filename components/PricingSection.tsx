'use client';

import { motion } from 'framer-motion';

/**
 * PricingSection Component
 *
 * A redesigned pricing comparison that fixes visibility issues and improves
 * conversion psychology by showing positive benefits instead of limitations.
 *
 * Visual Hierarchy:
 * 1. Two-card layout (Free vs Founder)
 * 2. Founder card has premium styling with glowing border and gradient background
 * 3. All text meets WCAG AA contrast ratios
 * 4. Responsive design with mobile-first approach
 */

interface FeatureItemProps {
  icon: string;
  label: string;
  subtext?: string;
  premium?: boolean;
  muted?: boolean;
}

interface PricingSectionProps {
  // Optional props for integration with existing page logic
  lifetimeSpotsLeft?: number;
  isFounder?: boolean;
  checkoutLoading?: boolean;
  onStartFree?: () => void;
  onClaimFounder?: () => void;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  icon,
  label,
  subtext,
  premium = false,
  muted = false
}) => (
  <li className="flex items-start gap-3">
    <span className={`text-xl flex-shrink-0 ${premium ? 'text-yellow-400' : 'text-green-400'}`}>
      {icon}
    </span>
    <div className="flex-1">
      <span className={`${muted ? 'text-gray-400 text-sm' : premium ? 'text-white font-semibold' : 'text-white'}`}>
        {label}
      </span>
      {subtext && (
        <p className="text-sm text-gray-400 mt-0.5">{subtext}</p>
      )}
    </div>
  </li>
);

export default function PricingSection({
  lifetimeSpotsLeft = 25,
  isFounder = false,
  checkoutLoading = false,
  onStartFree,
  onClaimFounder
}: PricingSectionProps) {
  const TOTAL_SPOTS = 25;
  const isSoldOut = lifetimeSpotsLeft <= 0;

  return (
    <section className="px-4 py-12 max-w-6xl mx-auto">
      {/* Mobile: Founder card first for urgency, Desktop: Free card first for comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* FREE TIER CARD */}
        <div className="order-2 lg:order-1 bg-slate-900 border-2 border-gray-700 rounded-lg p-6">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white mb-1">START FREE</h3>
            <p className="text-sm text-gray-400">Try HabitQuest</p>
          </div>

          {/* Features - Positive framing */}
          <ul className="space-y-3 mb-6">
            <FeatureItem
              icon="✓"
              label="Core quest system"
            />
            <FeatureItem
              icon="✓"
              label="AI quest transformation"
            />
            <FeatureItem
              icon="✓"
              label="Level up system (1-30)"
            />
            <FeatureItem
              icon="✓"
              label="XP and streaks"
            />
            <FeatureItem
              icon="✓"
              label="Boss battles"
            />
            <FeatureItem
              icon="✓"
              label="Companion creatures"
            />
            <FeatureItem
              icon="✓"
              label="Basic weekly story"
            />
          </ul>

          {/* Subtle limitation - readable and neutral */}
          <div className="mb-6 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">10 quests per month</p>
          </div>

          {/* CTA Button */}
          <button
            onClick={onStartFree}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
          >
            START FREE
          </button>
        </div>

        {/* FOUNDER ACCESS CARD */}
        <div className="order-1 lg:order-2 relative bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-2 border-yellow-500/50 rounded-lg p-6 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
          {/* Spots remaining badge */}
          <div className="absolute -top-3 right-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold"
            >
              {lifetimeSpotsLeft}/{TOTAL_SPOTS} LEFT
            </motion.div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-yellow-400 mb-1">
              <span className="mr-2">⚡</span>
              FOUNDER ACCESS
            </h3>
            <div className="text-4xl font-bold text-white mb-2">$47</div>
            <p className="text-sm text-gray-300">Lifetime. No subscriptions. Ever.</p>
          </div>

          {/* Features - Everything from free + premium features */}
          <ul className="space-y-3 mb-6">
            {/* All free features (muted) */}
            <FeatureItem
              icon="✓"
              label="Everything in Free tier"
              muted={true}
            />

            {/* Premium features with star icons and detailed subtexts */}
            <FeatureItem
              icon="⭐"
              label="Unlimited quests"
              subtext="Free tier: 10/month"
              premium={true}
            />
            <FeatureItem
              icon="⭐"
              label="Recurring daily/weekly quests"
              subtext="Build habits that repeat automatically"
              premium={true}
            />
            <FeatureItem
              icon="⭐"
              label="Switch archetypes anytime"
              subtext="Adapt your playstyle as you grow"
              premium={true}
            />
            <FeatureItem
              icon="⭐"
              label="Deep story chapters"
              subtext="Enhanced AI narrative with your choices"
              premium={true}
            />
            <FeatureItem
              icon="🏅"
              label="Founder badge"
              subtext="Exclusive badge + early access"
              premium={true}
            />
            <FeatureItem
              icon="⭐"
              label="Priority support"
              premium={true}
            />
          </ul>

          {/* CTA Button with animation */}
          <motion.button
            whileHover={!isFounder && !isSoldOut && !checkoutLoading ? { scale: 1.05 } : {}}
            whileTap={!isFounder && !isSoldOut && !checkoutLoading ? { scale: 0.98 } : {}}
            onClick={onClaimFounder}
            disabled={isFounder || isSoldOut || checkoutLoading}
            className={`w-full py-4 rounded-lg font-bold transition-all ${
              isFounder
                ? 'bg-green-600 text-white cursor-not-allowed'
                : isSoldOut
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : checkoutLoading
                ? 'bg-yellow-600 text-black cursor-wait'
                : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg'
            }`}
          >
            {checkoutLoading
              ? 'Loading...'
              : isFounder
              ? "✓ YOU'RE A FOUNDER!"
              : isSoldOut
              ? 'SOLD OUT'
              : 'CLAIM FOUNDER ACCESS'}
          </motion.button>
        </div>
      </div>
    </section>
  );
}
