'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
      cta: 'Upgrade to Founder - $47',
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
        'Never lose progress with Streak Protection'
      ],
      cta: 'Unlock Full Power - $47',
      delay: 1000
    },
    streak_milestone: {
      title: 'Amazing Streak!',
      subtitle: `${profile?.current_streak || 0} days and counting!`,
      message: 'You\'ve built incredible momentum. Protect your progress with Founder benefits.',
      benefits: [
        'Streak Freeze: 1 free pass per week',
        'Recurring Quests keep your streak alive automatically',
        'Equipment Shop boosts make daily quests easier',
        'Lifetime access means your progress never expires'
      ],
      cta: 'Protect Your Streak - $47',
      delay: 1500
    },
    skill_tree_locked: {
      title: 'Skill Points Available!',
      subtitle: '💎 You have skill points ready to spend',
      message: 'Unlock the Skill Tree to gain powerful passive abilities that boost every quest.',
      benefits: [
        'Passive XP bonuses on every quest',
        'Gold multipliers for faster progression',
        'Special abilities unique to your archetype',
        'Unlock new skill tiers as you level up'
      ],
      cta: 'Unlock Skill Tree - $47',
      delay: 1000
    }
  };

  useEffect(() => {
    if (!trigger || dismissed) return;
    if (profile?.is_premium || profile?.subscription_status === 'active') return;

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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card-retro-primary max-w-2xl w-full p-8 animate-slide-in-up relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚀</div>
          <h2 className="text-3xl sm:text-4xl font-black mb-2 bg-gradient-to-r from-[#FF5733] to-[#7C3AED] bg-clip-text text-transparent">
            {prompt.title}
          </h2>
          <p className="text-xl text-[#F59E0B] font-bold">{prompt.subtitle}</p>
        </div>

        {/* Message */}
        <p className="text-lg text-gray-300 text-center mb-6">
          {prompt.message}
        </p>

        {/* Benefits */}
        <div className="bg-[#0F172A] rounded-lg p-6 mb-6">
          <h3 className="text-xl font-black mb-4 text-center text-[#10B981]">
            UNLOCK WITH FOUNDER STATUS:
          </h3>
          <div className="space-y-3">
            {prompt.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-[#10B981] text-xl font-black flex-shrink-0">✓</span>
                <span className="text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center mb-6 p-4 bg-gradient-to-r from-[#7C3AED]/20 to-[#FF5733]/20 rounded-lg border border-[#FF5733]">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-5xl font-black text-[#FF5733]">$47</span>
            <span className="text-gray-400 line-through text-2xl">$297</span>
          </div>
          <div className="text-[#10B981] font-bold mb-1">ONE-TIME PAYMENT • LIFETIME ACCESS</div>
          <div className="text-sm text-gray-400">⏰ Limited-time Founder's Deal • All future features FREE forever</div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleDismiss}
            className="flex-1 btn-retro bg-gray-600 hover:bg-gray-500 border-gray-700 text-white py-3"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 btn-retro btn-primary py-3 text-lg animate-pulse"
          >
            {prompt.cta}
          </button>
        </div>

        {/* Trust signals */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-bold text-[#10B981]">1,200+</div>
              <div className="text-gray-400">Happy Founders</div>
            </div>
            <div>
              <div className="font-bold text-[#10B981]">100%</div>
              <div className="text-gray-400">Secure Payment</div>
            </div>
            <div>
              <div className="font-bold text-[#10B981]">Lifetime</div>
              <div className="text-gray-400">All Updates FREE</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
