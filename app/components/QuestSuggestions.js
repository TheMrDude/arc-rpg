'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function QuestSuggestions({ userSession, onQuestAdded }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const supabase = createClient();

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/quest-suggestions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load suggestions');
      }

      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addQuest = async (suggestion) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          text: suggestion.text,
          difficulty: suggestion.difficulty,
          xp_value: suggestion.xp_value
        })
      });

      if (response.ok) {
        // Remove from suggestions
        setSuggestions(prev => prev.filter(s => s !== suggestion));
        if (onQuestAdded) onQuestAdded();
      }
    } catch (err) {
      console.error('Failed to add quest:', err);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-600';
      case 'medium': return 'bg-yellow-600';
      case 'hard': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213e] rounded-lg border-3 border-[#00D4FF] p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black text-[#00D4FF]">✨ AI Quest Suggestions</h2>
        <button
          onClick={loadSuggestions}
          disabled={loading}
          className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00BFEA] text-[#0F3460] border-2 border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-lg disabled:opacity-50 transition-all"
        >
          {loading ? '🔮 Thinking...' : '🎲 Get Ideas'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border-2 border-red-600 rounded-lg p-4 mb-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="bg-[#0F3460]/50 border-2 border-[#00D4FF]/30 rounded-lg p-4 flex items-center justify-between hover:border-[#00D4FF] transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 ${getDifficultyColor(suggestion.difficulty)} text-white text-xs font-black rounded-full uppercase`}>
                    {suggestion.difficulty}
                  </span>
                  <span className="text-[#FFD93D] font-bold text-sm">
                    +{suggestion.xp_value} XP
                  </span>
                </div>
                <p className="text-white font-bold">{suggestion.text}</p>
              </div>
              <button
                onClick={() => addQuest(suggestion)}
                className="ml-4 px-4 py-2 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-2 border-[#0F3460] rounded-lg font-black shadow-lg hover:scale-105 transition-all"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-xl mb-2">🎯</p>
          <p>Click "Get Ideas" to discover quests tailored to your journey!</p>
        </div>
      )}
    </div>
  );
}
