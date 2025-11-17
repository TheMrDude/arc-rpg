'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function CharacterBackstory({ profile }) {
  const [backstory, setBackstory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadBackstory();
  }, []);

  const loadBackstory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/backstory', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (data.backstory) {
        setBackstory(data.backstory);
      }
    } catch (err) {
      console.error('Failed to load backstory:', err);
    }
  };

  const generateBackstory = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/backstory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setBackstory(data.backstory);
        setShowModal(true);
      }
    } catch (err) {
      console.error('Failed to generate backstory:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-lg border-3 border-purple-500 p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-black text-purple-200 mb-2">📜 Your Legend</h2>
            <p className="text-purple-300 text-sm">The tale of your epic journey</p>
          </div>
          <button
            onClick={generateBackstory}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white border-2 border-purple-900 rounded-lg font-black uppercase tracking-wide shadow-lg disabled:opacity-50 transition-all hover:scale-105"
          >
            {loading ? '✍️ Writing...' : backstory ? '🔄 Rewrite' : '✨ Generate'}
          </button>
        </div>

        {backstory ? (
          <div className="bg-black/30 rounded-lg p-6 border-2 border-purple-500/30">
            <div className="text-purple-100 leading-relaxed whitespace-pre-wrap font-serif text-lg">
              {backstory}
            </div>
            <div className="mt-4 pt-4 border-t border-purple-500/30 text-center">
              <p className="text-purple-400 text-sm italic">
                Level {profile.level} {profile.archetype} • {profile.xp} XP Earned
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-purple-300">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-xl mb-2">Your story awaits...</p>
            <p className="text-sm opacity-75">Generate an epic backstory based on your journey!</p>
          </div>
        )}
      </div>

      {/* Backstory Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 rounded-lg border-3 border-yellow-500 p-8 max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚔️</div>
              <h2 className="text-3xl font-black text-yellow-400 mb-2">Your Legend is Written!</h2>
              <p className="text-purple-200">The bards shall sing of your deeds...</p>
            </div>

            <div className="bg-black/40 rounded-lg p-6 border-2 border-purple-500/50 mb-6">
              <div className="text-purple-100 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                {backstory}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black border-3 border-purple-900 rounded-lg font-black uppercase tracking-wide shadow-lg hover:scale-105 transition-all"
              >
                Epic! ⚔️
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
