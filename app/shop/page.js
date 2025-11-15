'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GoldShop from '@/app/components/GoldShop';

export default function ShopPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F3460] flex items-center justify-center">
        <div className="text-[#00D4FF] text-2xl font-black" style={{ fontFamily: 'VT323, monospace' }}>
          ⏳ LOADING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F3460] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Current Gold Display */}
        <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">🪙</span>
            <div className="text-center">
              <p className="text-sm text-[#00D4FF] font-bold">CURRENT BALANCE</p>
              <p className="text-4xl font-black text-[#FFD93D]" style={{ fontFamily: 'VT323, monospace' }}>
                {profile?.gold || 0} GOLD
              </p>
            </div>
          </div>
        </div>

        {/* Gold Shop Component */}
        <GoldShop onClose={() => router.push('/dashboard')} />

        {/* How to Earn Gold (Free) */}
        <div className="mt-8 bg-[#1A1A2E] border-2 border-[#00D4FF] border-opacity-30 rounded-lg p-6">
          <h2 className="text-3xl font-black text-[#FFD93D] mb-4 text-center" style={{ fontFamily: 'VT323, monospace' }}>
            💎 EARN GOLD FOR FREE
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-5xl mb-3">⚔️</div>
              <h3 className="font-black text-[#00D4FF] mb-2" style={{ fontFamily: 'VT323, monospace' }}>
                COMPLETE QUESTS
              </h3>
              <p className="text-sm text-gray-300">
                Easy: 10g • Medium: 25g • Hard: 50g per quest
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-3">🎯</div>
              <h3 className="font-black text-[#00D4FF] mb-2" style={{ fontFamily: 'VT323, monospace' }}>
                DAILY STREAKS
              </h3>
              <p className="text-sm text-gray-300">
                Complete quests daily to earn bonus gold rewards
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="font-black text-[#00D4FF] mb-2" style={{ fontFamily: 'VT323, monospace' }}>
                LEVEL UP
              </h3>
              <p className="text-sm text-gray-300">
                Unlock bigger quests with better gold rewards
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => router.push('/equipment')}
            className="px-6 py-3 rounded-lg font-black uppercase border-3 bg-[#00D4FF] border-[#0F3460] text-[#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_3px_0_#0F3460] transition-all"
            style={{ fontFamily: 'VT323, monospace' }}
          >
            ⚔️ EQUIPMENT SHOP
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 rounded-lg font-black uppercase border-3 bg-[#FF6B6B] border-[#8B0000] text-white hover:shadow-[0_5px_0_#8B0000] hover:-translate-y-0.5 active:shadow-[0_1px_0_#8B0000] active:translate-y-1 shadow-[0_3px_0_#8B0000] transition-all"
            style={{ fontFamily: 'VT323, monospace' }}
          >
            ⬅️ DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
}
