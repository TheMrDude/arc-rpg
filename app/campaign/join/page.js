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
    document.title = 'Join Campaign — HabitQuest';
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-[#22d3ee] text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1e293b] border-2 border-[#f43f5e]/40 rounded-xl p-8">
        <div className="text-4xl mb-4">🛡️</div>
        <h1 className="text-2xl font-black uppercase tracking-wide text-[#f43f5e] mb-2">
          Join Campaign
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Enter the invite code your DM shared with you.
        </p>

        {error && (
          <div className="bg-[#f43f5e]/10 border border-[#f43f5e] text-[#f43f5e] rounded-lg p-3 mb-4 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
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

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/campaign/setup')}
            className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-[#22d3ee] text-xl font-bold animate-pulse">Loading...</div>
      </div>
    }>
      <JoinCampaignForm />
    </Suspense>
  );
}
