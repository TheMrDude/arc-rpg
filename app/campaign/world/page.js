'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import WorldMap from '@/app/components/WorldMap';

export default function WorldMapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState(null);
  const [isDM, setIsDM] = useState(false);
  const [characterName, setCharacterName] = useState('Adventurer');

  useEffect(() => {
    document.title = 'World Map — HabitQuest: The Campaign';
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Profile: level, streak, quests_completed, archetype
      const { data: profile } = await supabase
        .from('profiles')
        .select('level, current_streak, quests_completed, archetype, character_name, active_campaign_id, campaign_role')
        .eq('id', user.id)
        .single();

      if (!profile?.archetype) {
        router.push('/select-archetype');
        return;
      }

      // Also count completed quests directly for a reliable totalCheckins
      const { count: completedCount } = await supabase
        .from('quests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      // Check if user is a DM of any campaign
      const { data: dmCampaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('dm_user_id', user.id)
        .limit(1)
        .maybeSingle();

      setIsDM(!!dmCampaign);
      setCharacterName(profile?.character_name || 'Adventurer');

      setPlayerData({
        totalCheckins: completedCount || profile?.quests_completed || 0,
        longestStreak: profile?.current_streak || 0,
        level: profile?.level || 1,
        characterName: profile?.character_name || 'Adventurer',
      });
    } catch (err) {
      console.error('WorldMapPage load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-[#f4c553] text-lg font-black animate-pulse uppercase tracking-widest">
          Unrolling the map…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Top nav bar */}
      <div className="bg-[#1e293b] border-b border-gray-700/50 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ←
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <span className="font-black text-white text-sm">World Map</span>
          {isDM && (
            <>
              <div className="h-4 w-px bg-gray-700" />
              <span
                className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(244,197,83,0.1)', color: '#f4c553', border: '1px solid rgba(244,197,83,0.2)' }}
              >
                DM
              </span>
            </>
          )}
          <div className="ml-auto">
            <span className="text-gray-500 text-xs">{characterName}</span>
          </div>
        </div>
      </div>

      {/* Page body */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: '#f4c553' }}>
            🌍 World of HabitQuest
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Your journey, mapped across the realm. Build habits to unlock new territories.
          </p>
        </div>

        <WorldMap playerData={playerData} isDM={isDM} />
      </div>
    </div>
  );
}
