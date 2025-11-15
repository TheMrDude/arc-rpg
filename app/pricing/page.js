'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PricingSection from '@/components/PricingSection';

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
        <div className="text-white text-xl font-black uppercase tracking-wide">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-8 px-4 py-2 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
        >
          ← Back to Dashboard
        </button>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 uppercase tracking-wide text-[#FFD93D]">🔥 Founder's Sale 🔥</h1>
          <p className="text-[#E2E8F0] text-lg mb-2 font-bold">
            Start free forever. Or grab <span className="text-[#FFD93D] font-black">LIFETIME access</span> for a one-time payment.
          </p>
          <p className="text-[#FF6B6B] font-black text-xl uppercase">
            Only {lifetimeSpotsLeft} of 25 spots remaining!
          </p>
          <p className="text-[#00D4FF] text-sm mt-2 font-bold">
            After 25 founders join, this deal disappears forever.
          </p>
        </div>

        {profile?.subscription_status === 'active' && (
          <div className="bg-[#1A1A2E] border-3 border-[#48BB78] rounded-lg p-4 mb-8 text-center shadow-[0_0_20px_rgba(72,187,120,0.3)]">
            <p className="text-[#48BB78] text-lg font-black uppercase tracking-wide">
              🎉 You're a Founder! Lifetime access unlocked.
            </p>
          </div>
        )}

        {profile?.subscription_status !== 'active' && lifetimeSpotsLeft > 0 && (
          <div className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-4 mb-8 text-center shadow-[0_0_20px_rgba(255,107,107,0.3)]">
            <p className="text-[#FF6B6B] text-lg font-black uppercase tracking-wide">
              🔥 Only {lifetimeSpotsLeft} of 25 Founder spots remaining!
            </p>
          </div>
        )}

        {profile?.subscription_status !== 'active' && lifetimeSpotsLeft === 0 && (
          <div className="bg-[#1A1A2E] border-3 border-[#0F3460] rounded-lg p-4 mb-8 text-center">
            <p className="text-[#E2E8F0] text-lg font-black uppercase tracking-wide">
              All 25 Founder spots claimed. Subscription plans coming soon!
            </p>
          </div>
        )}

        <PricingSection
          lifetimeSpotsLeft={lifetimeSpotsLeft}
          isFounder={profile?.subscription_status === 'active'}
          checkoutLoading={checkoutLoading}
          onStartFree={() => router.push('/signup')}
          onClaimFounder={handleUpgrade}
        />

        <div className="mt-12 text-center">
          <p className="text-[#00D4FF] font-bold">💳 Secure payment powered by Stripe</p>
          <p className="mt-2 text-[#E2E8F0] font-bold">One-time payment. No subscriptions. No hidden fees.</p>
          <p className="mt-2 text-xs text-[#00D4FF]">Subscription plans coming in ~3 months for those who miss the founder deal.</p>
        </div>
      </div>
    </div>
  );
}
