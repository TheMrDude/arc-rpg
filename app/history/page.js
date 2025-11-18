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
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center">
        <div className="text-white text-xl font-black uppercase tracking-wide">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black uppercase tracking-wide text-[#FF6B6B]">Quest History</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
          <div className="space-y-4">
            {quests.map((quest) => (
              <div key={quest.id} className="bg-[#0F3460] p-4 rounded-lg border-2 border-[#1A1A2E]">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-black text-lg text-[#00D4FF]">{quest.transformed_text}</div>
                    <div className="text-sm text-[#E2E8F0] mt-1">{quest.original_text}</div>
                    <div className="text-xs text-[#FFD93D] mt-2 font-bold uppercase">
                      {quest.difficulty} | {quest.xp_value} XP | Completed: {new Date(quest.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-[#48BB78] text-2xl">✓</span>
                </div>
              </div>
            ))}
            {quests.length === 0 && (
              <p className="text-[#00D4FF] text-center py-8 font-bold">No completed quests yet. Get started on your dashboard!</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[#00D4FF] font-bold text-lg">Total Completed: {quests.length} quests</p>
          <p className="text-[#FFD93D] font-black text-lg">Total XP Earned: {quests.reduce((sum, q) => sum + q.xp_value, 0)} XP</p>
        </div>
      <GlobalFooter />
      </div>
    </div>
  );
}
