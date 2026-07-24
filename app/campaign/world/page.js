'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import WorldMap from '@/app/components/WorldMap';
import { getJourneyState, traveledRegions } from '@/lib/journeys';

export default function WorldMapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState(null);
  const [isDM, setIsDM] = useState(false);
  const [characterName, setCharacterName] = useState('Adventurer');

  useEffect(() => {
    document.title = 'World Map | HabitQuest: The Campaign';
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
        .select('level, current_streak, longest_streak, quests_completed, archetype, character_name, active_campaign_id, campaign_role, story_progress')
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

      const profileLike = {
        quests_completed: completedCount || profile?.quests_completed || 0,
        story_progress: profile?.story_progress || {},
      };

      setPlayerData({
        totalCheckins: completedCount || profile?.quests_completed || 0,
        longestStreak: profile?.longest_streak || profile?.current_streak || 0,
        level: profile?.level || 1,
        characterName: profile?.character_name || 'Adventurer',
        traveled: traveledRegions(profileLike),
        journeyState: getJourneyState(profileLike),
      });
    } catch (err) {
      console.error('WorldMapPage load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-gold text-lg font-black animate-pulse">
          Unrolling the map…
        </div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream text-navy">
      {/* Top nav bar */}
      <div className="bg-white border-b border-stone px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.back()}
            className="text-navy/50 hover:text-navy text-sm transition-colors"
          >
            ←
          </button>
          <div className="h-4 w-px bg-stone" />
          <span className="font-black text-navy text-sm">World Map</span>
          {isDM && (
            <>
              <div className="h-4 w-px bg-stone" />
              <span className="kq-chip text-xs font-black" style={{ background: 'rgba(255,200,61,0.15)', color: '#B8860B' }}>
                DM
              </span>
            </>
          )}
          <div className="ml-auto">
            <span className="text-navy/50 text-xs">{characterName}</span>
          </div>
        </div>
      </div>

      {/* Page body */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="kq-display text-2xl sm:text-3xl font-black text-navy">
            🌍 World of HabitQuest
          </h1>
          <p className="text-navy/60 text-sm mt-1">
            Your journey, mapped across the realm. Build habits to unlock new territories.
          </p>
        </div>

        <WorldMap playerData={playerData} isDM={isDM} onJourneyChange={loadData} />
      </div>
    </div>
  );
}
