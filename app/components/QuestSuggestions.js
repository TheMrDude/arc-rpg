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
      case 'easy': return 'bg-emerald';
      case 'medium': return 'bg-gold';
      case 'hard': return 'bg-coral';
      default: return 'bg-navy/40';
    }
  };

  return (
    <div className="kq-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="kq-display text-2xl text-navy">✨ AI Quest Suggestions</h2>
        <button
          onClick={loadSuggestions}
          disabled={loading}
          className="kq-btn kq-btn-blue disabled:opacity-50"
        >
          {loading ? '🔮 Thinking...' : '🎲 Get Ideas'}
        </button>
      </div>

      {error && (
        <div className="bg-coral/12 border-2 border-coral rounded-candy p-4 mb-4">
          <p className="text-coral">{error}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="bg-cream border-2 border-stone rounded-candy p-4 flex items-center justify-between hover:border-hero-blue transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 ${getDifficultyColor(suggestion.difficulty)} text-white text-xs font-bold rounded-full capitalize`}>
                    {suggestion.difficulty}
                  </span>
                  <span className="text-gold font-bold text-sm">
                    +{suggestion.xp_value} XP
                  </span>
                </div>
                <p className="text-navy font-bold">{suggestion.text}</p>
              </div>
              <button
                onClick={() => addQuest(suggestion)}
                className="kq-btn kq-btn-gold ml-4"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-navy/50">
          <p className="text-xl mb-2">🎯</p>
          <p>Click "Get Ideas" to discover quests tailored to your journey!</p>
        </div>
      )}
    </div>
  );
}
