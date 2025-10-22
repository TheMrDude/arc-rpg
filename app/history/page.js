'use client';

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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Quest History</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="space-y-4">
            {quests.map((quest) => (
              <div key={quest.id} className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{quest.transformed_text}</div>
                    <div className="text-sm text-gray-400 mt-1">{quest.original_text}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {quest.difficulty.toUpperCase()} | {quest.xp_value} XP | Completed: {new Date(quest.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-green-400 text-2xl">✓</span>
                </div>
              </div>
            ))}
            {quests.length === 0 && (
              <p className="text-gray-400 text-center py-8">No completed quests yet. Get started on your dashboard!</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400">
          <p>Total Completed: {quests.length} quests</p>
          <p>Total XP Earned: {quests.reduce((sum, q) => sum + q.xp_value, 0)} XP</p>
        </div>
      </div>
    </div>
  );
}
