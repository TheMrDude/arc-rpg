'use client';
import GlobalFooter from '@/app/components/GlobalFooter';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HistoryPage() {
  const router = useRouter();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: questsData } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .eq('status', 'active')
        .order('completed_at', { ascending: false });

      setQuests(questsData || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl font-bold kq-display">Loading...</div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl kq-display text-coral">Quest History</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="kq-btn kq-btn-blue"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="kq-card p-6">
          <div className="space-y-4">
            {quests.map((quest) => (
              <div key={quest.id} className="bg-cream p-4 rounded-candy border-2 border-stone">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold text-lg text-hero-blue">{quest.transformed_text}</div>
                    <div className="text-sm text-navy/60 mt-1">{quest.original_text}</div>
                    <div className="text-xs text-gold mt-2 font-bold">
                      {quest.difficulty} | {quest.xp_value} XP | Completed: {new Date(quest.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-emerald text-2xl">✓</span>
                </div>
              </div>
            ))}
            {quests.length === 0 && (
              <p className="text-hero-blue text-center py-8 font-bold">No completed quests yet. Get started on your dashboard!</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-hero-blue font-bold text-lg">Total Completed: {quests.length} quests</p>
          <p className="text-gold font-bold text-lg">Total XP Earned: {quests.reduce((sum, q) => sum + q.xp_value, 0)} XP</p>
        </div>
      <GlobalFooter />
      </div>
    </div>
  );
}
