'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PlayerCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [party, setParty] = useState([]);
  const [recentQuests, setRecentQuests] = useState([]);
  const [latestSession, setLatestSession] = useState(null);

  useEffect(() => {
    document.title = 'My Campaign — HabitQuest';
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/login'); return; }
      setUser(authUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profileData?.active_campaign_id) {
        router.push('/campaign/setup');
        return;
      }
      if (profileData.campaign_role === 'dm') {
        router.push('/campaign/dm');
        return;
      }
      setProfile(profileData);

      // Load campaign
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', profileData.active_campaign_id)
        .single();
      setCampaign(campaignData);

      // Load party membership (my character)
      const { data: myMembership } = await supabase
        .from('party_members')
        .select('*')
        .eq('campaign_id', profileData.active_campaign_id)
        .eq('user_id', authUser.id)
        .single();
      setMembership(myMembership);

      // Load recent completed quests (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: questsData } = await supabase
        .from('quests')
        .select('id, transformed_text, completed_at, xp_value')
        .eq('user_id', authUser.id)
        .eq('completed', true)
        .gte('completed_at', sevenDaysAgo)
        .order('completed_at', { ascending: false });
      setRecentQuests(questsData || []);

      // Load latest session log
      const { data: sessionData } = await supabase
        .from('session_logs')
        .select('*')
        .eq('campaign_id', profileData.active_campaign_id)
        .order('session_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatestSession(sessionData);

      // Load all party members
      const { data: { session } } = await supabase.auth.getSession();
      const partyRes = await fetch(`/api/campaign/${profileData.active_campaign_id}/party`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (partyRes.ok) {
        const partyData = await partyRes.json();
        setParty(partyData.party || []);
      }
    } catch (err) {
      console.error('Error loading player data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-[#22d3ee] text-xl font-bold animate-pulse">Entering the realm...</div>
      </div>
    );
  }

  const archetype = profile?.archetype || 'adventurer';
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpInLevel = xp % 100;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top nav */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Dashboard
          </button>
          <span className="text-[#22d3ee] font-black text-xs uppercase tracking-widest">Player View</span>
        </div>

        {/* Character Header */}
        <div className="bg-[#1e293b] border border-[#22d3ee]/20 rounded-xl p-6">
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              <img
                src={`/images/archetypes/${archetype}.png`}
                alt={archetype}
                className="w-20 h-20 object-cover rounded-lg border-2 border-[#f4c553]/50"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-black uppercase tracking-wide text-[#f43f5e]">
                  {membership?.character_name || 'Adventurer'}
                </h1>
                <span className="text-[#22d3ee] font-black text-sm">Lv.{level}</span>
              </div>
              <p className="text-gray-400 text-sm capitalize font-bold">{archetype}</p>
              {campaign && (
                <p className="text-gray-500 text-xs mt-1">
                  {campaign.name} · {campaign.world_name} · {party.length} adventurer{party.length !== 1 ? 's' : ''}
                </p>
              )}
              {/* XP bar */}
              <div className="mt-2">
                <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${xpInLevel}%`,
                      background: 'linear-gradient(90deg, #22d3ee, #f43f5e)',
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{xpInLevel}/100 XP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Downtime This Week */}
        <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#f4c553] mb-1">
            Your Downtime This Week
          </h2>
          <p className="text-gray-500 text-xs mb-4">
            Your quests become your character's actions between sessions.
          </p>

          {recentQuests.length > 0 ? (
            <ul className="space-y-2">
              {recentQuests.map(q => (
                <li key={q.id} className="flex items-start gap-2">
                  <span className="text-[#22d3ee] mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-gray-200 text-sm italic">
                    "{q.transformed_text || 'Quest completed'}"
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 text-sm mb-1">○ No activity logged this week yet.</p>
              <p className="text-gray-500 text-xs">Complete quests to build your downtime narrative.</p>
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 w-full py-2 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] font-black text-sm uppercase tracking-wide rounded-lg transition-colors"
          >
            Go to Quest Dashboard →
          </button>
        </div>

        {/* Latest Session Recap */}
        {latestSession && (
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#f4c553]">
                Latest Session Recap
              </h2>
              <span className="text-gray-500 text-xs">
                Session {toRoman(latestSession.session_number)}
              </span>
            </div>
            <h3 className="text-white font-black mb-3">{latestSession.title}</h3>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {latestSession.ai_narrative || latestSession.dm_notes || 'No narrative yet.'}
            </div>
          </div>
        )}

        {/* Party */}
        {party.length > 0 && (
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#f4c553] mb-4">
              The Party
            </h2>
            <div className="flex flex-wrap gap-4">
              {party.map(member => (
                <div key={member.user_id} className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-700">
                    <img
                      src={`/images/archetypes/${member.profile?.archetype || 'warrior'}.png`}
                      alt={member.character_name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 font-bold text-center max-w-[60px] truncate">
                    {member.character_name}
                  </span>
                  {member.active_this_week && (
                    <span className="text-[10px] text-green-400">✓ Active</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function toRoman(num) {
  if (!num || num < 1) return 'I';
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}
