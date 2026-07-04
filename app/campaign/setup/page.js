'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CampaignSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // 'dm' | 'player' | null
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // DM form
  const [campaignName, setCampaignName] = useState('');
  const [worldName, setWorldName] = useState('');
  const [description, setDescription] = useState('');

  // Player form
  const [inviteCode, setInviteCode] = useState('');
  const [characterName, setCharacterName] = useState('');

  useEffect(() => {
    document.title = 'Join a Campaign | HabitQuest';
    checkExistingCampaign();
  }, []);

  async function checkExistingCampaign() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_campaign_id, campaign_role')
      .eq('id', user.id)
      .single();

    if (profile?.active_campaign_id) {
      router.push(profile.campaign_role === 'dm' ? '/campaign/dm' : '/campaign/player');
      return;
    }

    setLoading(false);
  }

  async function handleDMCreate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const res = await fetch('/api/campaign/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: campaignName, world_name: worldName, description }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create campaign'); return; }

      router.push('/campaign/dm');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePlayerJoin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const res = await fetch('/api/campaign/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invite_code: inviteCode, character_name: characterName }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to join campaign'); return; }

      router.push('/campaign/player');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-[#22d3ee] text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">⚔️</div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-widest text-[#22d3ee] mb-2">
            The Campaign
          </h1>
          <p className="text-gray-400 font-bold">
            Turn your habits into a living D&amp;D adventure.
          </p>
        </div>

        {error && (
          <div className="bg-[#f43f5e]/10 border border-[#f43f5e] text-[#f43f5e] rounded-lg p-3 mb-6 text-center font-bold text-sm">
            {error}
          </div>
        )}

        {/* Role picker or active form */}
        {!mode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* DM Card */}
            <button
              onClick={() => setMode('dm')}
              className="bg-[#1e293b] border-2 border-[#22d3ee]/40 hover:border-[#22d3ee] rounded-xl p-8 text-left transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] group"
            >
              <div className="text-5xl mb-4">🎲</div>
              <h2 className="text-xl font-black uppercase tracking-wide text-[#22d3ee] mb-2 group-hover:text-white transition-colors">
                I'm a Dungeon Master
              </h2>
              <p className="text-gray-400 text-sm">
                Create a campaign, invite your party, and weave their real-life habits into an epic narrative.
              </p>
              <div className="mt-4 text-[#22d3ee] text-sm font-bold">Create Campaign →</div>
            </button>

            {/* Player Card */}
            <button
              onClick={() => setMode('player')}
              className="bg-[#1e293b] border-2 border-[#f43f5e]/40 hover:border-[#f43f5e] rounded-xl p-8 text-left transition-all duration-200 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] group"
            >
              <div className="text-5xl mb-4">🛡️</div>
              <h2 className="text-xl font-black uppercase tracking-wide text-[#f43f5e] mb-2 group-hover:text-white transition-colors">
                I'm a Player
              </h2>
              <p className="text-gray-400 text-sm">
                Join your DM's campaign with an invite code. Your daily quests become your character's downtime actions.
              </p>
              <div className="mt-4 text-[#f43f5e] text-sm font-bold">Join Campaign →</div>
            </button>
          </div>
        ) : mode === 'dm' ? (
          /* DM Form */
          <div className="max-w-lg mx-auto bg-[#1e293b] border-2 border-[#22d3ee]/40 rounded-xl p-8">
            <button
              onClick={() => { setMode(null); setError(''); }}
              className="text-gray-500 hover:text-gray-300 text-sm mb-6 flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="text-4xl mb-4">🎲</div>
            <h2 className="text-xl font-black uppercase tracking-wide text-[#22d3ee] mb-6">
              Create Your Campaign
            </h2>
            <form onSubmit={handleDMCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="The Shattered Realm"
                  required
                  className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#22d3ee] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                  World Name *
                </label>
                <input
                  type="text"
                  value={worldName}
                  onChange={e => setWorldName(e.target.value)}
                  placeholder="Azerothia"
                  required
                  className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#22d3ee] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                  Description <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="A brief overview of your campaign..."
                  rows={3}
                  className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#22d3ee] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 outline-none transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#22d3ee] hover:bg-[#06b6d4] text-[#0f172a] font-black uppercase tracking-wide rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Campaign & Get Invite Link'}
              </button>
            </form>
          </div>
        ) : (
          /* Player Form */
          <div className="max-w-lg mx-auto bg-[#1e293b] border-2 border-[#f43f5e]/40 rounded-xl p-8">
            <button
              onClick={() => { setMode(null); setError(''); }}
              className="text-gray-500 hover:text-gray-300 text-sm mb-6 flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="text-4xl mb-4">🛡️</div>
            <h2 className="text-xl font-black uppercase tracking-wide text-[#f43f5e] mb-6">
              Join a Campaign
            </h2>
            <form onSubmit={handlePlayerJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                  Invite Code *
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC12345"
                  maxLength={8}
                  required
                  className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#f43f5e] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 outline-none transition-colors font-mono text-lg tracking-widest"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                  Character Name *
                </label>
                <input
                  type="text"
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  placeholder="Aldric the Bold"
                  required
                  className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#f43f5e] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-black uppercase tracking-wide rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Joining...' : 'Join Campaign'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
