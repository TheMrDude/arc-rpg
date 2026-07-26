'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isPremium as resolveIsPremium } from '@/lib/premium';

export default function UpgradePrompt({ trigger, profile }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const prompts = {
    level_10: {
      title: 'Congratulations on Level 10!',
      subtitle: '🎉 You\'re crushing it!',
      message: 'You\'ve proven you\'re serious about transformation. Ready to unlock your full potential?',
      benefits: [
        'Unlock the Skill Tree to gain powerful abilities',
        'Access Equipment Shop for 50% XP boosts',
        'Set up Recurring Quests to automate habits',
        'Join Seasonal Events for exclusive rewards'
      ],
      cta: 'Go Pro for $5/mo',
      delay: 2000
    },
    quest_limit: {
      title: 'You\'re on Fire! 🔥',
      subtitle: 'You\'ve completed 5 quests today',
      message: 'Imagine how much more you could accomplish with premium features...',
      benefits: [
        'Recurring Quests automate your daily routine',
        'Equipment boosts help you level up 50% faster',
        'Seasonal Events add fresh challenges weekly',
        'Momentum Boost covers a busy day each week'
      ],
      cta: 'Unlock Full Power for $5/mo',
      delay: 1000
    },
    streak_milestone: {
      title: 'Incredible Momentum!',
      subtitle: `${profile?.current_streak || 0} active days and counting!`,
      message: 'You\'ve built real momentum. Keep it rolling with Pro benefits.',
      benefits: [
        'Momentum Boost: cover one busy day each week',
        'Recurring Quests keep your routine running automatically',
        'Equipment Shop boosts make daily quests easier',
        'Pro access means your progress never expires'
      ],
      cta: 'Keep Your Momentum with Pro',
      delay: 1500
    },
    skill_tree_locked: {
      title: 'Skill Points Available!',
      subtitle: '\ud83d\udc8e You have skill points ready to spend',
      // Every benefit listed here used to describe a skill effect -- passive XP
      // bonuses, gold multipliers, archetype abilities. None of them are
      // implemented, so all four were claims the app does not back. The page
      // itself is real and stays behind Pro; what it promises now matches it.
      message: 'Spend your skill points in the Skill Tree, and get the rest of Pro with it.',
      benefits: [
        'Spend skill points across four skill trees',
        'Unlimited quests instead of 10',
        'The gear shop, quest templates and your journey history',
        'No ads, ever \u2014 Pro is what funds the app'
      ],
      cta: 'Get Pro',
      delay: 1000
    }
  };

  useEffect(() => {
    if (!trigger || dismissed) return;
    if (resolveIsPremium(profile)) return;

    // Check if this prompt was recently dismissed (don't show again for 24h)
    const dismissKey = `upgrade_dismissed_${trigger}`;
    const lastDismissed = localStorage.getItem(dismissKey);
    if (lastDismissed) {
      const hoursSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    const prompt = prompts[trigger];
    if (!prompt) return;

    setTimeout(() => setShow(true), prompt.delay);
  }, [trigger, dismissed, profile]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem(`upgrade_dismissed_${trigger}`, Date.now().toString());
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  if (!show || !trigger || !prompts[trigger]) return null;

  const prompt = prompts[trigger];

  return (
    <div className="fixed inset-0 bg-navy/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="kq-card max-w-2xl w-full p-8 animate-slide-in-up relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-navy/40 hover:text-navy text-2xl font-bold"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚀</div>
          <h2 className="kq-display text-3xl sm:text-4xl font-black mb-2 bg-gradient-to-r from-coral to-purple bg-clip-text text-transparent">
            {prompt.title}
          </h2>
          <p className="text-xl text-gold font-bold">{prompt.subtitle}</p>
        </div>

        {/* Message */}
        <p className="text-lg text-navy/70 text-center mb-6">
          {prompt.message}
        </p>

        {/* Benefits */}
        <div className="bg-cream rounded-candy p-6 mb-6 border-2 border-stone">
          <h3 className="kq-display text-xl font-black mb-4 text-center text-emerald">
            Unlock with Pro
          </h3>
          <div className="space-y-3">
            {prompt.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-emerald text-xl font-black flex-shrink-0">✓</span>
                <span className="text-navy/80">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center mb-6 p-4 bg-gradient-to-r from-purple/10 to-coral/10 rounded-candy border-2 border-coral/40">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-5xl font-black text-coral">$5<span className="text-xl text-navy/50">/mo</span></span>
            <span className="text-navy/50 text-lg"></span>
          </div>
          <div className="text-emerald font-bold mb-1">Pro Access</div>
          <div className="text-sm text-navy/50">or $29/yr, cancel anytime</div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleDismiss}
            className="flex-1 kq-btn kq-btn-ghost py-3"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 kq-btn kq-btn-gold py-3 text-lg animate-pulse"
          >
            {prompt.cta}
          </button>
        </div>

        {/* Trust signals */}
        <div className="mt-6 pt-6 border-t border-stone">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-bold text-emerald">🔒</div>
              <div className="text-navy/50">Secure via Stripe</div>
            </div>
            <div>
              <div className="font-bold text-emerald">💚</div>
              <div className="text-navy/50">No Guilt, Ever</div>
            </div>
            <div>
              <div className="font-bold text-emerald">♾️</div>
              <div className="text-navy/50">Cancel Anytime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
