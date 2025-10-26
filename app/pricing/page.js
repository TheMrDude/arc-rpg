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
          .select('*')
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
        .eq('is_premium', true);
      
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
      // SECURE: No need to send userId - API gets it from session
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session. Please try again.');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-8 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
        >
          ← Back to Dashboard
        </button>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">🔥 Founder's Sale 🔥</h1>
          <p className="text-gray-300 text-lg mb-2">
            Start free forever. Or grab <span className="text-yellow-400 font-bold">LIFETIME access</span> for a one-time payment.
          </p>
          <p className="text-red-400 font-bold text-xl">
            Only {lifetimeSpotsLeft} of 25 spots remaining!
          </p>
          <p className="text-gray-400 text-sm mt-2">
            After 25 founders join, this deal disappears forever.
          </p>
        </div>

        {profile?.is_premium && (
          <div className="bg-green-600/20 border border-green-500 rounded-lg p-4 mb-8 text-center">
            <p className="text-green-300 text-lg font-semibold">
              🎉 You're a Founder! Lifetime access unlocked.
            </p>
          </div>
        )}

        {!profile?.is_premium && lifetimeSpotsLeft > 0 && (
          <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 mb-8 text-center">
            <p className="text-red-300 text-lg font-semibold">
              🔥 Only {lifetimeSpotsLeft} of 25 Founder spots remaining!
            </p>
          </div>
        )}

        {!profile?.is_premium && lifetimeSpotsLeft === 0 && (
          <div className="bg-gray-600/20 border border-gray-500 rounded-lg p-4 mb-8 text-center">
            <p className="text-gray-300 text-lg font-semibold">
              All 25 Founder spots claimed. Subscription plans coming soon!
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-2">Free Adventurer</h2>
            <p className="text-gray-400 mb-6">Forever free, always</p>
            <div className="text-4xl font-bold mb-8">
              $0<span className="text-xl text-gray-400">/forever</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Choose your archetype</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Add and complete quests</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>AI-powered quest transformation</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Level up and unlock skills</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Track streaks and XP</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Boss battles and companions</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span><strong>Weekly AI story generation</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-2">✗</span>
                <span className="text-gray-500">No recurring quests</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-2">✗</span>
                <span className="text-gray-500">No archetype switching</span>
              </li>
            </ul>

            <button
              onClick={() => router.push('/signup')}
              className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition"
            >
              Start Free
            </button>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-2 border-yellow-500 rounded-2xl p-8 backdrop-blur-sm relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full text-sm font-bold">
              {lifetimeSpotsLeft > 0 ? `${lifetimeSpotsLeft}/25 LEFT` : 'SOLD OUT'}
            </div>

            <h2 className="text-3xl font-bold mb-2">⚡ Founder Access</h2>
            <p className="text-gray-300 mb-6">Lifetime. No subscriptions. Ever.</p>
            <div className="text-4xl font-bold mb-2">
              $47<span className="text-xl text-gray-400"> one-time</span>
            </div>
            <p className="text-sm text-red-400 font-bold mb-2">⚠️ Limited to first 25 people only</p>
            <p className="text-xs text-gray-400 mb-6">Regular price will be $15/month after launch</p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">★</span>
                <span className="font-semibold">Everything in Free, plus:</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span><strong>Recurring quests</strong> (daily/weekly/custom)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span><strong>Switch archetypes</strong> anytime</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span><strong>Priority support</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span><strong>Early access</strong> to all new features</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span><strong>Founder badge</strong> in-app</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span><strong>Lifetime access</strong> - pay once, own forever</span>
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading || profile?.is_premium || lifetimeSpotsLeft === 0}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                profile?.is_premium
                  ? 'bg-gray-600 cursor-not-allowed'
                  : lifetimeSpotsLeft === 0
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black'
              }`}
            >
              {checkoutLoading 
                ? 'Loading...' 
                : profile?.is_premium 
                ? "You're a Founder!" 
                : lifetimeSpotsLeft === 0
                ? 'Sold Out'
                : 'Claim Founder Access'}
            </button>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>💳 Secure payment powered by Stripe</p>
          <p className="mt-2">One-time payment. No subscriptions. No hidden fees.</p>
          <p className="mt-2 text-xs">Subscription plans coming in ~3 months for those who miss the founder deal.</p>
        </div>
      </div>
    </div>
  );
}