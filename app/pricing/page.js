'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
    if (!user) {
      router.push('/login');
      return;
    }

    if (lifetimeSpotsLeft <= 0) {
      alert('Sorry, all 25 lifetime spots have been claimed!');
      return;
    }

    setCheckoutLoading(true);

    try {
      // Get session token for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.access_token) {
        console.error('Session error:', sessionError);
        alert('Session expired. Please log in again.');
        router.push('/login');
        setCheckoutLoading(false);
        return;
      }

      // Send userId to create checkout
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout failed:', data);
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

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-8 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
            <h2 className="text-3xl font-black mb-2 uppercase tracking-wide text-[#00D4FF]">Free Adventurer</h2>
            <p className="text-[#E2E8F0] mb-6 font-bold">Forever free, always</p>
            <div className="text-4xl font-black mb-8 text-[#FFD93D]">
              $0<span className="text-xl text-[#00D4FF]">/forever</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]">Choose your archetype</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]">Add and complete quests</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]">AI-powered quest transformation</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]">Level up and unlock skills</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]">Track streaks and XP</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]">Boss battles and companions</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]"><strong>Weekly AI story generation</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-[#FF6B6B] mr-2 font-black">✗</span>
                <span className="text-[#0F3460]">No recurring quests</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#FF6B6B] mr-2 font-black">✗</span>
                <span className="text-[#0F3460]">No archetype switching</span>
              </li>
            </ul>

            <button
              onClick={() => router.push('/signup')}
              className="w-full py-3 bg-[#0F3460] hover:bg-[#1a4a7a] text-white border-3 border-[#1A1A2E] rounded-lg font-black uppercase tracking-wide transition-all"
            >
              Start Free
            </button>
          </div>

          <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-8 shadow-[0_0_30px_rgba(255,217,61,0.5)] relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#FFD93D] text-[#1A1A2E] px-4 py-1 rounded-full text-sm font-black uppercase">
              {lifetimeSpotsLeft > 0 ? `${lifetimeSpotsLeft}/25 LEFT` : 'SOLD OUT'}
            </div>

            <h2 className="text-3xl font-black mb-2 uppercase tracking-wide text-[#FFD93D]">⚡ Founder Access</h2>
            <p className="text-[#E2E8F0] mb-6 font-bold">Lifetime. No subscriptions. Ever.</p>
            <div className="text-4xl font-black mb-2 text-[#FFD93D]">
              $47<span className="text-xl text-[#00D4FF]"> one-time</span>
            </div>
            <p className="text-sm text-[#FF6B6B] font-black mb-2 uppercase">⚠️ Limited to first 25 people only</p>
            <p className="text-xs text-[#00D4FF] mb-6 font-bold">Regular price will be $15/month after launch</p>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-[#FFD93D] mr-2 font-black">★</span>
                <span className="font-black text-[#FFD93D] uppercase">Everything in Free, plus:</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]"><strong>Recurring quests</strong> (daily/weekly/custom)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]"><strong>Switch archetypes</strong> anytime</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]"><strong>Priority support</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]"><strong>Early access</strong> to all new features</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]"><strong>Founder badge</strong> in-app</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#48BB78] mr-2 font-black">✓</span>
                <span className="text-[#E2E8F0]"><strong>Lifetime access</strong> - pay once, own forever</span>
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={
                checkoutLoading || profile?.subscription_status === 'active' || lifetimeSpotsLeft === 0
              }
              className={`w-full py-3 rounded-lg font-black uppercase tracking-wide transition-all ${
                profile?.subscription_status === 'active' || lifetimeSpotsLeft === 0
                  ? 'bg-[#0F3460] cursor-not-allowed border-3 border-[#1A1A2E] text-white'
                  : 'bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1'
              }`}
            >
              {checkoutLoading
                ? 'Loading...'
                : profile?.subscription_status === 'active'
                ? "You're a Founder!"
                : lifetimeSpotsLeft === 0
                ? 'Sold Out'
                : 'Claim Founder Access'}
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#00D4FF] font-bold">💳 Secure payment powered by Stripe</p>
          <p className="mt-2 text-[#E2E8F0] font-bold">One-time payment. No subscriptions. No hidden fees.</p>
          <p className="mt-2 text-xs text-[#00D4FF]">Subscription plans coming in ~3 months for those who miss the founder deal.</p>
        </div>
      </div>
    </div>
  );
}
