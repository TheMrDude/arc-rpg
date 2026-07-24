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
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-hero-blue text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">⚔️</div>
          <h1 className="kq-display text-3xl sm:text-4xl text-hero-blue mb-2">
            The Campaign
          </h1>
          <p className="text-navy/60 font-bold">
            Turn your habits into a living D&amp;D adventure.
          </p>
        </div>

        {error && (
          <div className="bg-coral/12 border-2 border-coral text-coral rounded-candy p-3 mb-6 text-center font-bold text-sm">
            {error}
          </div>
        )}

        {/* Role picker or active form */}
        {!mode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* DM Card */}
            <button
              onClick={() => setMode('dm')}
              className="kq-card kq-card-hover border-2 border-hero-blue/30 hover:border-hero-blue rounded-candy p-8 text-left transition-all duration-200 group"
            >
              <div className="text-5xl mb-4">🎲</div>
              <h2 className="kq-display text-xl text-hero-blue mb-2">
                I'm a Dungeon Master
              </h2>
              <p className="text-navy/60 text-sm">
                Create a campaign, invite your party, and weave their real-life habits into an epic narrative.
              </p>
              <div className="mt-4 text-hero-blue text-sm font-bold">Create Campaign →</div>
            </button>

            {/* Player Card */}
            <button
              onClick={() => setMode('player')}
              className="kq-card kq-card-hover border-2 border-coral/30 hover:border-coral rounded-candy p-8 text-left transition-all duration-200 group"
            >
              <div className="text-5xl mb-4">🛡️</div>
              <h2 className="kq-display text-xl text-coral mb-2">
                I'm a Player
              </h2>
              <p className="text-navy/60 text-sm">
                Join your DM's campaign with an invite code. Your daily quests become your character's downtime actions.
              </p>
              <div className="mt-4 text-coral text-sm font-bold">Join Campaign →</div>
            </button>
          </div>
        ) : mode === 'dm' ? (
          /* DM Form */
          <div className="max-w-lg mx-auto kq-card border-2 border-hero-blue/30 rounded-candy p-8">
            <button
              onClick={() => { setMode(null); setError(''); }}
              className="text-navy/50 hover:text-navy text-sm mb-6 flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="text-4xl mb-4">🎲</div>
            <h2 className="kq-display text-xl text-hero-blue mb-6">
              Create Your Campaign
            </h2>
            <form onSubmit={handleDMCreate} className="space-y-4">
              <div>
                <label className="kq-label">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="The Shattered Realm"
                  required
                  className="kq-input"
                />
              </div>
              <div>
                <label className="kq-label">
                  World Name *
                </label>
                <input
                  type="text"
                  value={worldName}
                  onChange={e => setWorldName(e.target.value)}
                  placeholder="Azerothia"
                  required
                  className="kq-input"
                />
              </div>
              <div>
                <label className="kq-label">
                  Description <span className="text-navy/40 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="A brief overview of your campaign..."
                  rows={3}
                  className="kq-input resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="kq-btn kq-btn-blue w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Campaign & Get Invite Link'}
              </button>
            </form>
          </div>
        ) : (
          /* Player Form */
          <div className="max-w-lg mx-auto kq-card border-2 border-coral/30 rounded-candy p-8">
            <button
              onClick={() => { setMode(null); setError(''); }}
              className="text-navy/50 hover:text-navy text-sm mb-6 flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="text-4xl mb-4">🛡️</div>
            <h2 className="kq-display text-xl text-coral mb-6">
              Join a Campaign
            </h2>
            <form onSubmit={handlePlayerJoin} className="space-y-4">
              <div>
                <label className="kq-label">
                  Invite Code *
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC12345"
                  maxLength={8}
                  required
                  className="kq-input font-mono text-lg tracking-widest"
                />
              </div>
              <div>
                <label className="kq-label">
                  Character Name *
                </label>
                <input
                  type="text"
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  placeholder="Aldric the Bold"
                  required
                  className="kq-input"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="kq-btn kq-btn-gold w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Joining...' : 'Join Campaign'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-navy/40 hover:text-navy/70 text-sm transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
