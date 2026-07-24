'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';

const MOOD_EMOJIS = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
};

export default function OnThisDay() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOnThisDayEntries();
  }, []);

  const fetchOnThisDayEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/journals/on-this-day', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch entries');
      }

      setEntries(data.entries || []);
    } catch (err) {
      console.error('Error fetching On This Day entries:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="kq-card border-2 border-gold/40 p-6 animate-pulse">
        <div className="h-6 bg-gold/20 rounded-full w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gold/20 rounded-full"></div>
          <div className="h-4 bg-gold/20 rounded-full w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Silently fail - this is an optional widget
  }

  if (entries.length === 0) {
    return null; // Don't show the widget if there are no entries
  }

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="kq-card border-2 border-gold/40 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">🕰️</span>
        <div>
          <h3 className="kq-display text-xl text-navy">
            On This Day
          </h3>
          <p className="text-xs text-hero-blue font-bold">{formattedDate}</p>
        </div>
      </div>

      <div className="space-y-4">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-cream rounded-candy p-4 border border-gold/30"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏳</span>
                <p className="text-sm font-black text-gold">
                  {entry.years_ago} {entry.years_ago === 1 ? 'year' : 'years'} ago
                </p>
              </div>
              {entry.mood && (
                <div className="text-2xl" title={`Mood: ${entry.mood}/5`}>
                  {MOOD_EMOJIS[entry.mood]}
                </div>
              )}
            </div>

            {entry.transformed_narrative ? (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-sm">✨</span>
                  <p className="text-xs font-bold text-coral">Your Epic Tale</p>
                </div>
                <p className="text-navy text-sm leading-relaxed italic">
                  {entry.transformed_narrative.length > 250
                    ? entry.transformed_narrative.substring(0, 250) + '...'
                    : entry.transformed_narrative}
                </p>
              </div>
            ) : (
              <p className="text-navy/60 text-sm leading-relaxed">
                {entry.entry_text.length > 200
                  ? entry.entry_text.substring(0, 200) + '...'
                  : entry.entry_text}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gold/30">
        <p className="text-xs text-hero-blue italic text-center">
          "Every reflection is part of your story."
        </p>
      </div>
    </motion.div>
  );
}
