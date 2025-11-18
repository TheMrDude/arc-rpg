'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import PricingSection from '@/components/PricingSection';
import PricingExitIntent from '../components/PricingExitIntent';

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lifetimeSpotsLeft, setLifetimeSpotsLeft] = useState(25);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, subscription_status, is_premium, stripe_session_id, premium_since')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    }

    async function checkLifetimeSpots() {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      const spotsRemaining = Math.max(0, 25 - (count || 0));
      setLifetimeSpotsLeft(spotsRemaining);
    }

    loadUser();
    checkLifetimeSpots();
  }, []);

  async function handleUpgrade() {
    console.log('=== HANDLE UPGRADE STARTED ===');
    console.log('User:', user);
    console.log('Lifetime spots left:', lifetimeSpotsLeft);

    if (!user) {
      console.log('No user found, redirecting to login');
      router.push('/login');
      return;
    }

    if (lifetimeSpotsLeft <= 0) {
      alert('Sorry, all 25 lifetime spots have been claimed!');
      return;
    }

    setCheckoutLoading(true);

    try {
      console.log('Calling /api/create-checkout with userId:', user.id);

      // Send userId to create checkout
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Response data:', data);

      if (data.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        window.location.href = data.url;
      } else {
        console.error('No URL in response. Full data:', data);
        alert(`Failed to create checkout: ${data.error || 'Unknown error'}. Please try again.`);
        setCheckoutLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-white text-xl font-black uppercase tracking-wide"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => router.push('/dashboard')}
          className="mb-6 lg:mb-8 px-4 py-2 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black uppercase text-xs sm:text-sm tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all duration-200"
        >
          ← Back to Dashboard
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8 lg:mb-12"
        >
          <motion.h1
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-4 uppercase tracking-wide text-[#FFD93D] drop-shadow-[0_0_15px_rgba(255,217,61,0.5)]"
          >
            🔥 Founder's Sale 🔥
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[#E2E8F0] text-base sm:text-lg lg:text-xl mb-4 font-bold max-w-3xl mx-auto px-4"
          >
            Start free forever. Or grab <span className="text-[#FFD93D] font-black">LIFETIME access</span> for a one-time payment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="inline-block mb-4"
          >
            <div className="bg-[#FF6B6B]/20 border-3 border-[#FF6B6B] rounded-xl px-6 py-4 shadow-[0_0_20px_rgba(255,107,107,0.4)]">
              <p className="text-[#FF6B6B] font-black text-xl sm:text-2xl uppercase">
                Only {lifetimeSpotsLeft} of 25 spots remaining!
              </p>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[#00D4FF] text-sm sm:text-base font-bold max-w-2xl mx-auto px-4"
          >
            After 25 founders join, this deal disappears forever. This is <span className="text-[#FFD93D]">your last chance</span> to lock in lifetime access at this price.
          </motion.p>
        </motion.div>

        {profile?.subscription_status === 'active' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-[#1A1A2E] border-3 border-[#48BB78] rounded-xl p-6 mb-8 text-center shadow-[0_0_25px_rgba(72,187,120,0.4)]"
          >
            <p className="text-[#48BB78] text-lg lg:text-xl font-black uppercase tracking-wide">
              🎉 You're a Founder! Lifetime access unlocked.
            </p>
          </motion.div>
        )}

        {profile?.subscription_status !== 'active' && lifetimeSpotsLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-xl p-6 mb-8 text-center shadow-[0_0_25px_rgba(255,107,107,0.4)] animate-pulse"
          >
            <p className="text-[#FF6B6B] text-lg lg:text-xl font-black uppercase tracking-wide">
              🔥 Only {lifetimeSpotsLeft} of 25 Founder spots remaining!
            </p>
          </motion.div>
        )}

        {profile?.subscription_status !== 'active' && lifetimeSpotsLeft === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-[#1A1A2E] border-3 border-[#0F3460] rounded-xl p-6 mb-8 text-center"
          >
            <p className="text-[#E2E8F0] text-lg lg:text-xl font-black uppercase tracking-wide">
              All 25 Founder spots claimed. Subscription plans coming soon!
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <PricingSection
            lifetimeSpotsLeft={lifetimeSpotsLeft}
            isFounder={profile?.subscription_status === 'active'}
            checkoutLoading={checkoutLoading}
            onStartFree={() => router.push('/signup')}
            onClaimFounder={handleUpgrade}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 lg:mt-16 text-center space-y-4"
        >
          <div className="flex flex-wrap justify-center items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-[#00D4FF]">
              <span className="text-2xl">🔒</span>
              <span className="font-bold">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 text-[#48BB78]">
              <span className="text-2xl">✓</span>
              <span className="font-bold">Instant Access</span>
            </div>
            <div className="flex items-center gap-2 text-[#FFD93D]">
              <span className="text-2xl">⚡</span>
              <span className="font-bold">No Recurring Fees</span>
            </div>
          </div>

          <div className="bg-[#1A1A2E]/50 border-2 border-[#00D4FF]/30 rounded-xl p-6 max-w-2xl mx-auto">
            <p className="text-[#00D4FF] font-bold text-base sm:text-lg mb-2">💳 Secure payment powered by Stripe</p>
            <p className="text-[#E2E8F0] font-bold mb-3">One-time payment. No subscriptions. No hidden fees.</p>
            <p className="text-sm text-[#00D4FF]/80">
              Subscription plans coming in ~3 months for those who miss the founder deal.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Exit-intent popup for pricing page */}
      <PricingExitIntent />
    </div>
  );
}
