'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MILESTONE_LABELS } from '@/lib/testimonials';

// Account-settings panel: lists the user's submitted quotes and lets them stop
// sharing any of them. Revocation is one tap, no confirmation, no guilt copy.
export default function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError(true);
        setLoading(false);
        return;
      }
      const res = await fetch('/api/testimonials/mine', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setQuotes(Array.isArray(data?.quotes) ? data.quotes : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(id) {
    setRevoking(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/testimonials/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setQuotes((qs) =>
          qs.map((q) =>
            q.id === id ? { ...q, consent_revoked_at: new Date().toISOString() } : q
          )
        );
      }
    } catch {
      /* leave state as-is; user can retry */
    } finally {
      setRevoking(null);
    }
  }

  const sharingLabel = (q) => {
    if (!q.consented_public) return { text: 'Private (not shared)', color: 'text-gray-400' };
    if (q.consent_revoked_at) return { text: 'Sharing stopped', color: 'text-gray-400' };
    if (q.status === 'live') return { text: 'Live on the site', color: 'text-[#10B981]' };
    return { text: 'Shared — pending review', color: 'text-[#F59E0B]' };
  };

  return (
    <div className="bg-[#16213E]/60 border-2 border-[#00D4FF]/20 rounded-xl p-6">
      <h2 className="text-xl font-black text-white mb-1">My quotes</h2>
      <p className="text-sm text-gray-400 mb-5">
        Reflections you&apos;ve shared from milestone moments. Stop sharing any of
        them at any time &mdash; no questions asked.
      </p>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!loading && error && (
        <p className="text-gray-400 text-sm">
          Couldn&apos;t load your quotes right now.{' '}
          <button onClick={load} className="text-[#00D4FF] underline">
            Try again
          </button>
          .
        </p>
      )}

      {!loading && !error && quotes.length === 0 && (
        <p className="text-gray-400 text-sm">
          You haven&apos;t shared any quotes yet. They show up here after you hit a
          milestone and choose to share a reflection.
        </p>
      )}

      {!loading && !error && quotes.length > 0 && (
        <ul className="space-y-4">
          {quotes.map((q) => {
            const label = sharingLabel(q);
            const canRevoke = q.consented_public && !q.consent_revoked_at;
            return (
              <li
                key={q.id}
                className="border border-[#00D4FF]/10 rounded-lg p-4 bg-[#0F172A]/50"
              >
                <p className="text-gray-200 italic mb-2">&ldquo;{q.quote}&rdquo;</p>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-gray-500">
                    <span>{MILESTONE_LABELS[q.milestone] || q.milestone}</span>
                    <span className="mx-2">·</span>
                    <span className={label.color}>{label.text}</span>
                  </div>
                  {canRevoke && (
                    <button
                      onClick={() => revoke(q.id)}
                      disabled={revoking === q.id}
                      className="text-sm font-bold text-[#FF6B6B] hover:text-[#ff8a8a] transition-colors disabled:opacity-50"
                    >
                      {revoking === q.id ? 'Stopping…' : 'Stop sharing this'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
