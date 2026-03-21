'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const STRIPE_LINK_PRO_MONTHLY = 'https://buy.stripe.com/fZubJ02TX5SngCc6dadZ602';
const STRIPE_LINK_PRO_YEARLY = 'https://buy.stripe.com/dRm7sK6695Sn85GgROdZ601';

function stripeLink(baseUrl, email) {
  if (!email) return baseUrl;
  return `${baseUrl}?prefilled_email=${encodeURIComponent(email)}`;
}

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, subscription_status, is_premium, subscription_tier')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const isPro = profile?.subscription_tier === 'pro' && profile?.subscription_status === 'active';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex items-center justify-center">
        <div className="text-white text-xl font-black uppercase tracking-wide">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push(user ? '/dashboard' : '/')}
          className="mb-8 px-4 py-2 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0F172A] rounded-lg font-black uppercase text-sm tracking-wide transition-all hover:-translate-y-0.5"
        >
          ← {user ? 'Dashboard' : 'Home'}
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-[#FF6B35] to-[#F59E0B] bg-clip-text text-transparent">
              Pick Your Plan
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready for the full RPG experience.
          </p>
        </motion.div>

        {isPro && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#16213E] border-3 border-[#10B981] rounded-xl p-6 mb-8 text-center"
          >
            <p className="text-[#10B981] text-lg font-black uppercase">
              You&apos;re a Pro member! Full access unlocked.
            </p>
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Free Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#16213E] border-2 border-[#1E293B] rounded-2xl p-8 flex flex-col"
          >
            <h3 className="text-xl font-black text-white mb-1">Free</h3>
            <div className="text-4xl font-black text-[#00D4FF] mb-1">$0</div>
            <p className="text-gray-500 text-sm mb-6">Free forever</p>

            <ul className="space-y-3 text-gray-300 text-sm mb-8 flex-1">
              <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> 3 habits</li>
              <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Basic XP &amp; leveling</li>
              <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Archetype selection</li>
              <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> AI quest transformation</li>
              <li className="flex items-start gap-2"><span className="text-gray-600">—</span> <span className="text-gray-600">Boss battles</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-600">—</span> <span className="text-gray-600">Equipment shop</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-600">—</span> <span className="text-gray-600">Quest chains</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-600">—</span> <span className="text-gray-600">Journal &amp; reflections</span></li>
            </ul>

            <button
              onClick={() => router.push('/signup')}
              className="w-full px-6 py-3 bg-[#1E293B] hover:bg-[#2D3B4F] text-white border-2 border-[#00D4FF]/30 rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:scale-105"
            >
              Start Free →
            </button>
          </motion.div>

          {/* Pro Monthly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#16213E] to-[#0F3460] border-4 border-[#FF6B35] rounded-2xl p-8 flex flex-col relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF6B35] text-white text-xs font-black px-4 py-1 rounded-full uppercase">
              Most Popular
            </div>
            <h3 className="text-xl font-black text-white mb-1">Pro</h3>
            <div className="text-4xl font-black text-[#F59E0B] mb-1">
              $5<span className="text-lg text-gray-400">/mo</span>
            </div>
            <p className="text-gray-500 text-sm mb-6">or $39/year (save 35%)</p>

            <ul className="space-y-3 text-gray-300 text-sm mb-8 flex-1">
              <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> <strong className="text-white">Unlimited</strong> habits</li>
              <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Boss battles</li>
              <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Equipment shop</li>
              <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Quest chains</li>
              <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Journal &amp; reflections</li>
              <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Weekly digest emails</li>
              <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Priority support</li>
            </ul>

            {isPro ? (
              <div className="w-full px-6 py-3 bg-[#FF6B35]/50 text-white rounded-xl font-black text-lg uppercase tracking-wide text-center opacity-50 cursor-not-allowed">
                Current Plan
              </div>
            ) : (
              <a
                href={stripeLink(STRIPE_LINK_PRO_MONTHLY, user?.email)}
                className="block w-full px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:scale-105 text-center"
              >
                Go Pro — $5/mo
              </a>
            )}
          </motion.div>

          {/* Early Bird Annual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#16213E] border-2 border-[#F59E0B]/50 rounded-2xl p-8 flex flex-col relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-[#0F172A] text-xs font-black px-4 py-1 rounded-full uppercase">
              Best Value
            </div>
            <h3 className="text-xl font-black text-white mb-1">Early Bird</h3>
            <div className="text-4xl font-black text-[#10B981] mb-1">
              $29<span className="text-lg text-gray-400">/year</span>
            </div>
            <p className="text-gray-500 text-sm mb-6">Limited-time launch price</p>

            <ul className="space-y-3 text-gray-300 text-sm mb-8 flex-1">
              <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Everything in Pro</li>
              <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Save 50% vs monthly</li>
              <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Lock in launch pricing</li>
              <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> <strong className="text-white">$2.42/mo</strong> effective</li>
            </ul>

            {isPro ? (
              <div className="w-full px-6 py-3 bg-[#10B981]/50 text-white rounded-xl font-black text-lg uppercase tracking-wide text-center opacity-50 cursor-not-allowed">
                Current Plan
              </div>
            ) : (
              <a
                href={stripeLink(STRIPE_LINK_PRO_YEARLY, user?.email)}
                className="block w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:scale-105 text-center"
              >
                Get Early Bird — $29/yr
              </a>
            )}
          </motion.div>
        </div>

        {/* Comparison: Anti-guilt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8 text-[#00D4FF]">
            The Anti-Guilt Habit Tracker
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-900/20 border-2 border-red-500/30 rounded-xl p-6">
              <h3 className="text-xl font-black text-red-400 mb-4">Other Habit Apps</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Shame you when you break streaks</li>
                <li>• Penalize missed days with lost progress</li>
                <li>• Compare you to other users</li>
                <li>• Make productivity feel like punishment</li>
              </ul>
            </div>

            <div className="bg-green-900/20 border-2 border-green-500/30 rounded-xl p-6">
              <h3 className="text-xl font-black text-green-400 mb-4">HabitQuest</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>No streak penalties</strong> — ever</li>
                <li>• Miss a day? Your story continues</li>
                <li>• Solo journey — no leaderboards</li>
                <li>• Tasks become adventures you want to do</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Reassurances */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center space-y-4 pb-12"
        >
          <div className="flex flex-wrap justify-center items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-[#00D4FF]">
              <span className="text-2xl">🔒</span>
              <span className="font-bold">Secure via Stripe</span>
            </div>
            <div className="flex items-center gap-2 text-[#10B981]">
              <span className="text-2xl">✓</span>
              <span className="font-bold">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-[#F59E0B]">
              <span className="text-2xl">♾️</span>
              <span className="font-bold">Free tier forever</span>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Built by a solo dev who got tired of apps that make you feel bad.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
