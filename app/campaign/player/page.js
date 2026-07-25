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
    document.title = 'My Campaign | HabitQuest';
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
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-hero-blue text-xl font-bold animate-pulse">Entering the realm...</div>
      </div>
    );
  }

  const archetype = profile?.archetype || 'adventurer';
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpInLevel = xp % 100;

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top nav */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-navy/60 hover:text-navy text-sm font-bold transition-colors"
          >
            ← Dashboard
          </button>
          <button
            onClick={() => router.push('/campaign/world')}
            className="text-navy/60 hover:text-gold text-xs font-bold transition-colors"
          >
            🗺️ World Map
          </button>
          <span className="kq-chip text-hero-blue font-black text-xs ml-auto">Player View</span>
        </div>

        {/* Character Header */}
        <div className="kq-card p-6">
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              <img
                src={`/images/archetypes/${archetype}.png`}
                alt={archetype}
                className="w-20 h-20 object-cover rounded-candy border-2 border-gold/50"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="kq-display text-2xl text-coral">
                  {membership?.character_name || 'Adventurer'}
                </h1>
                <span className="text-hero-blue font-black text-sm">Lv.{level}</span>
              </div>
              <p className="text-navy/60 text-sm capitalize font-bold">{archetype}</p>
              {campaign && (
                <p className="text-navy/50 text-xs mt-1">
                  {campaign.name} · {campaign.world_name} · {party.length} adventurer{party.length !== 1 ? 's' : ''}
                </p>
              )}
              {/* XP bar */}
              <div className="mt-2">
                <div className="h-2 bg-cream rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${xpInLevel}%`,
                      background: 'linear-gradient(90deg, #57D7F5, #FF7B6B)',
                    }}
                  />
                </div>
                <p className="text-xs text-navy/50 mt-0.5">{xpInLevel}/100 XP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Downtime This Week */}
        <div className="kq-card p-6">
          <h2 className="kq-display text-sm text-gold mb-1">
            Your Downtime This Week
          </h2>
          <p className="text-navy/50 text-xs mb-4">
            Your quests become your character's actions between sessions.
          </p>

          {recentQuests.length > 0 ? (
            <ul className="space-y-2">
              {recentQuests.map(q => (
                <li key={q.id} className="flex items-start gap-2">
                  <span className="text-emerald mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-navy/80 text-sm italic">
                    "{q.transformed_text || 'Quest completed'}"
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
              <p className="text-navy/50 text-sm mb-1">○ No activity logged this week yet.</p>
              <p className="text-navy/40 text-xs">Complete quests to build your downtime narrative.</p>
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="kq-btn kq-btn-blue mt-4 w-full"
          >
            Go to Quest Dashboard →
          </button>
        </div>

        {/* Latest Session Recap */}
        {latestSession && (
          <div className="kq-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="kq-display text-sm text-gold">
                Latest Session Recap
              </h2>
              <span className="text-navy/50 text-xs">
                Session {toRoman(latestSession.session_number)}
              </span>
            </div>
            <h3 className="text-navy font-black mb-3">{latestSession.title}</h3>
            <div className="text-navy/70 text-sm leading-relaxed whitespace-pre-wrap">
              {latestSession.ai_narrative || latestSession.dm_notes || 'No narrative yet.'}
            </div>
          </div>
        )}

        {/* Party */}
        {party.length > 0 && (
          <div className="kq-card p-6">
            <h2 className="kq-display text-sm text-gold mb-4">
              The Party
            </h2>
            <div className="flex flex-wrap gap-4">
              {party.map(member => (
                <div key={member.user_id} className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-candy overflow-hidden border-2 border-stone">
                    <img
                      src={`/images/archetypes/${member.profile?.archetype || 'warrior'}.png`}
                      alt={member.character_name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <span className="text-xs text-navy/70 font-bold text-center max-w-[60px] truncate">
                    {member.character_name}
                  </span>
                  {member.active_this_week && (
                    <span className="text-[10px] text-emerald">✓ Active</span>
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
