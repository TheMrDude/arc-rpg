'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ShopPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Gold packages matching the API
  const GOLD_PACKAGES = [
    { id: 'starter', gold: 1000, price: 1.99, name: 'Starter Pack', badge: null },
    { id: 'bronze', gold: 3500, price: 4.99, name: 'Bronze Pack', badge: null },
    { id: 'silver', gold: 8000, price: 9.99, name: 'Silver Pack', badge: 'BEST VALUE' },
    { id: 'gold', gold: 20000, price: 19.99, name: 'Gold Pack', badge: null },
    { id: 'platinum', gold: 50000, price: 39.99, name: 'Platinum Pack', badge: 'MEGA' },
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function purchaseGold(packageId) {
    if (purchasing) return;

    setPurchasing(true);
    try {
      const response = await fetch('/api/purchase-gold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ package_id: packageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to create checkout:', data.error);
        alert(data.message || 'Failed to create checkout session');
        return;
      }

      // Redirect to Stripe checkout
      window.location.href = data.session_url;
    } catch (error) {
      console.error('Error purchasing gold:', error);
      alert('Failed to start purchase');
    } finally {
      setPurchasing(false);
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Gold Shop</h1>
          <p className="text-xl text-gray-300 mb-6">Purchase gold to unlock equipment faster</p>
          <div className="flex items-center justify-center gap-3 text-2xl">
            <span>💰</span>
            <span className="text-yellow-400 font-bold">{profile?.gold || 0} Gold</span>
          </div>
        </div>

        {/* How Gold Works */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-12">
          <h2 className="text-2xl font-bold mb-4">How Gold Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">⚔️</div>
              <h3 className="font-bold mb-2">Complete Quests</h3>
              <p className="text-sm text-gray-400">Earn 50-350 gold per quest based on difficulty</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🛡️</div>
              <h3 className="font-bold mb-2">Purchase Equipment</h3>
              <p className="text-sm text-gray-400">Spend gold to unlock powerful gear that boosts XP</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="font-bold mb-2">Speed Up Progress</h3>
              <p className="text-sm text-gray-400">Buy gold packs to unlock equipment faster (optional!)</p>
            </div>
          </div>
        </div>

        {/* Gold Packages */}
        <h2 className="text-3xl font-bold text-center mb-8">Gold Packages</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {GOLD_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative border-2 rounded-xl p-6 ${
                pkg.badge
                  ? 'border-yellow-500 bg-gradient-to-br from-yellow-900/30 to-orange-900/30'
                  : 'border-gray-600 bg-gray-800/50'
              }`}
            >
              {pkg.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-4 py-1 rounded-full text-xs font-bold">
                  {pkg.badge}
                </div>
              )}

              <div className="text-center mb-4">
                <div className="text-6xl mb-3">💰</div>
                <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                <div className="text-4xl font-bold text-yellow-400 mb-2">
                  {pkg.gold.toLocaleString()}
                </div>
                <div className="text-gray-400">Gold Coins</div>
              </div>

              <div className="border-t border-gray-600 pt-4 mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">${pkg.price}</div>
                  <div className="text-sm text-gray-400">
                    {(pkg.gold / (pkg.price * 100)).toFixed(0)} gold per cent
                  </div>
                </div>
              </div>

              <button
                onClick={() => purchaseGold(pkg.id)}
                disabled={purchasing}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                  pkg.badge
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                } ${purchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {purchasing ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          ))}
        </div>

        {/* Fair Pricing Promise */}
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Fair Pricing Promise</h2>
          <div className="grid md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-2">✅ You can earn all gold for FREE</h3>
              <p className="text-sm">Every item can be unlocked by completing quests. No paywalls!</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">✅ 3-5x more generous than mobile games</h3>
              <p className="text-sm">Our gold packs give you much better value than typical mobile RPGs.</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">✅ No pay-to-win mechanics</h3>
              <p className="text-sm">Gold only speeds up progression, doesn't give unfair advantages.</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">✅ Support indie development</h3>
              <p className="text-sm">Your purchase helps us keep building awesome features!</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push('/equipment')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
          >
            View Equipment Shop
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
