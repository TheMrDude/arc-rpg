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
      <div className="kq-card p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="kq-display text-2xl text-navy mb-2">📜 Your Story So Far</h2>
            <p className="text-navy/60 text-sm">The tale of your journey</p>
          </div>
          <button
            onClick={generateBackstory}
            disabled={loading}
            className="kq-btn kq-btn-gold disabled:opacity-50"
          >
            {loading ? '✍️ Writing...' : backstory ? '🔄 Rewrite' : '✨ Generate'}
          </button>
        </div>

        {backstory ? (
          <div className="bg-cream rounded-candy p-6 border-2 border-stone">
            <div className="text-navy leading-relaxed whitespace-pre-wrap text-lg">
              {backstory}
            </div>
            <div className="mt-4 pt-4 border-t border-stone text-center">
              <p className="text-navy/50 text-sm italic">
                Level {profile.level} {profile.archetype} • {profile.xp} XP Earned
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-navy/50">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-xl mb-2 text-navy">Your story awaits...</p>
            <p className="text-sm opacity-75">Generate a fun story based on your journey!</p>
          </div>
        )}
      </div>

      {/* Backstory Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="kq-card p-8 max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⭐</div>
              <h2 className="kq-display text-3xl text-navy mb-2">Your Story is Written!</h2>
              <p className="text-navy/60">Here's how your adventure looks so far...</p>
            </div>

            <div className="bg-cream rounded-candy p-6 border-2 border-stone mb-6">
              <div className="text-navy leading-relaxed whitespace-pre-wrap text-lg">
                {backstory}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowModal(false)}
                className="kq-btn kq-btn-emerald"
              >
                Awesome! ⭐
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
