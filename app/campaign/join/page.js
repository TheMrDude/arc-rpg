'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function JoinCampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [characterName, setCharacterName] = useState('');

  useEffect(() => {
    document.title = 'Join Campaign | HabitQuest';
    initPage();
  }, []);

  async function initPage() {
    const codeFromUrl = searchParams.get('code') || '';

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Save code to localStorage and redirect to login
      if (codeFromUrl) {
        localStorage.setItem('pendingInviteCode', codeFromUrl);
      }
      router.push('/login');
      return;
    }

    // Check if user already has a campaign
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_campaign_id, campaign_role')
      .eq('id', user.id)
      .single();

    if (profile?.active_campaign_id) {
      router.push(profile.campaign_role === 'dm' ? '/campaign/dm' : '/campaign/player');
      return;
    }

    // Pre-fill invite code from URL or localStorage
    const pendingCode = localStorage.getItem('pendingInviteCode');
    const code = codeFromUrl || pendingCode || '';
    if (code) {
      setInviteCode(code.toUpperCase());
      localStorage.removeItem('pendingInviteCode');
    }

    setLoading(false);
  }

  async function handleJoin(e) {
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
        <div className="text-hero-blue text-xl font-bold animate-pulse kq-display">Loading...</div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full kq-card p-8">
        <div className="text-4xl mb-4">🛡️</div>
        <h1 className="kq-display text-2xl text-coral mb-2">
          Join Campaign
        </h1>
        <p className="text-navy/60 text-sm mb-6">
          Enter the invite code your DM shared with you.
        </p>

        {error && (
          <div className="bg-coral/12 border-2 border-coral text-coral rounded-candy p-3 mb-4 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
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
              className="kq-input text-lg tracking-widest"
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

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/campaign/setup')}
            className="text-navy/50 hover:text-navy/70 text-sm transition-colors"
          >
            Want to create a campaign instead? →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JoinCampaignPage() {
  return (
    <Suspense fallback={
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-hero-blue text-xl font-bold animate-pulse kq-display">Loading...</div>
      </div>
    }>
      <JoinCampaignForm />
    </Suspense>
  );
}
