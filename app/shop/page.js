'use client';
import GlobalFooter from '@/app/components/GlobalFooter';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GoldShop from '@/app/components/GoldShop';
import EquipmentShop from '@/app/components/EquipmentShop';
import { isPremium as resolveIsPremium } from '@/lib/premium';

export default function ShopPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isPremium = resolveIsPremium(profile);

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

      // Welcome Quest chain step 4: the dashboard equipment tab is level-gated,
      // so the always-reachable /shop page counts as the shop visit
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          fetch('/api/onboarding/shop-visited', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
        }
      } catch {
        // best-effort
      }

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

  if (loading) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-hero-blue text-2xl font-bold kq-display">
          ⏳ Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Current Gold Display */}
        <div className="kq-card p-6 mb-8">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">🪙</span>
            <div className="text-center">
              <p className="text-sm text-hero-blue font-bold">Current Balance</p>
              <p className="text-4xl font-bold text-gold kq-display">
                {profile?.gold || 0} Gold
              </p>
            </div>
          </div>
        </div>

        {/* Gold Shop Component */}
        <GoldShop onClose={() => router.push('/dashboard')} />

        {/* How to Earn Gold (Free) */}
        <div className="mt-8 kq-card p-6">
          <h2 className="text-3xl font-bold text-gold mb-4 text-center kq-display">
            💎 Earn Gold for Free
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-5xl mb-3">⚔️</div>
              <h3 className="font-bold text-hero-blue mb-2 kq-display">
                Complete Quests
              </h3>
              <p className="text-sm text-navy/60">
                Easy: 10g • Medium: 25g • Hard: 50g per quest
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-3">🎯</div>
              <h3 className="font-bold text-hero-blue mb-2 kq-display">
                Daily Bonuses
              </h3>
              <p className="text-sm text-navy/60">
                Complete quests daily to earn bonus gold rewards
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="font-bold text-hero-blue mb-2 kq-display">
                Level Up
              </h3>
              <p className="text-sm text-navy/60">
                Unlock bigger quests with better gold rewards
              </p>
            </div>
          </div>
        </div>

        {/* Equipment shop, rendered here rather than linked.
            The only other way in is the dashboard equipment tab, which needs
            level 10, so a Pro subscriber below level 10 could not reach gear
            they were paying for -- including the six catalogue items marked
            required_level = 1. The button that used to sit here pointed at
            that same level-gated tab, so for anyone under level 10 it led to a
            page that renders nothing.

            EquipmentShop returns null for free users; equipment is a Pro
            feature and that gate is deliberately left alone. Free users see
            the gold shop above, exactly as before. */}
        <div className="mt-8">
          <EquipmentShop
            isPremium={isPremium}
            gold={profile?.gold || 0}
            onGoldChange={(newGold) => setProfile((p) => (p ? { ...p, gold: newGold } : p))}
            onEquipmentChange={() => {}}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="kq-btn kq-btn-ghost"
          >
            ⬅️ Dashboard
          </button>
        </div>
      <GlobalFooter />
      </div>
    </div>
  );
}
