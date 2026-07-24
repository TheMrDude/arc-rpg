'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Terrible' },
  { value: 2, emoji: '😕', label: 'Struggling' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Amazing' }
];

export default function JournalEntry({ show, onClose, onSubmit, archetype }) {
  const [entryText, setEntryText] = useState('');
  const [mood, setMood] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [transformedNarrative, setTransformedNarrative] = useState('');
  const [showTransformed, setShowTransformed] = useState(false);

  const charCount = entryText.length;
  const minChars = 50;
  const maxChars = 2000;
  const isValidLength = charCount >= minChars && charCount <= maxChars;

  useEffect(() => {
    if (show) {
      setEntryText('');
      setMood(null);
      setError('');
      setShowSuccess(false);
      setTransformedNarrative('');
      setShowTransformed(false);
    }
  }, [show]);

  const handleTransformToEpic = async () => {
    const trimmedEntry = entryText.trim();

    if (!isValidLength) {
      setError(`Entry must be between ${minChars} and ${maxChars} characters`);
      return;
    }

    setIsTransforming(true);
    setError('');

    try {
      // Get Supabase session for auth token
      const { getSupabaseClient } = await import('@/lib/supabase-client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please log in to transform journal entries');
      }

      const response = await fetch('/api/transform-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          entry_text: trimmedEntry,
          mood: mood,
          archetype: archetype
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transform entry');
      }

      setTransformedNarrative(data.transformed_narrative);
      setShowTransformed(true);
      setIsTransforming(false);

      // Auto-save with transformation
      await saveEntry(trimmedEntry, data.transformed_narrative);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transform entry');
      setIsTransforming(false);

      // Save anyway without transformation
      await saveEntry(trimmedEntry, null);
    }
  };

  const handleSavePrivate = async () => {
    const trimmedEntry = entryText.trim();

    if (!isValidLength) {
      setError(`Entry must be between ${minChars} and ${maxChars} characters`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    await saveEntry(trimmedEntry, null);
  };

  const saveEntry = async (text, narrative) => {
    try {
      await onSubmit({
        entry_text: text,
        transformed_narrative: narrative,
        mood: mood
      });

      setShowSuccess(true);

      // Confetti celebration
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF7B6B', '#57D7F5', '#FFC83D', '#4F7DF3']
      });

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save journal entry');
      setIsSubmitting(false);
      setIsTransforming(false);
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-navy bg-opacity-60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          className="relative kq-card max-w-3xl w-full overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {showSuccess ? (
            <div className="p-16 text-center">
              <div className="text-9xl mb-6">📖</div>
              <h3 className="kq-display text-4xl font-black text-navy mb-4">
                Memory Saved!
              </h3>
              <p className="text-hero-blue text-xl font-bold">Your journey continues...</p>
            </div>
          ) : (
            <>
              <div className="kq-navy p-6 text-center">
                <div className="text-6xl mb-3">📜</div>
                <h2 className="kq-display text-3xl font-black text-gold mb-2">
                  Hero's Journal
                </h2>
                <p className="text-cream/90 font-bold text-sm">
                  Write about your day, your struggles, your victories...
                </p>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Mood Selector */}
                <div className="mb-6">
                  <p className="text-lg font-bold text-navy mb-3 text-center">
                    How do you feel today?
                  </p>
                  <div className="flex justify-center gap-3 mb-2">
                    {MOOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMood(option.value)}
                        className={
                          'p-3 rounded-2xl border-2 transition-all hover:scale-110 ' +
                          (mood === option.value
                            ? 'bg-hero-blue/10 border-hero-blue scale-110 shadow-candy'
                            : 'bg-cream border-stone hover:border-hero-blue')
                        }
                      >
                        <span className="text-4xl">{option.emoji}</span>
                      </button>
                    ))}
                  </div>
                  {mood && (
                    <p className="text-center text-sm font-bold text-gold">
                      {MOOD_OPTIONS.find(o => o.value === mood)?.label}
                    </p>
                  )}
                </div>

                {/* Journal Entry Textarea */}
                <div className="mb-4">
                  <textarea
                    value={entryText}
                    onChange={(e) => {
                      setEntryText(e.target.value);
                      setError('');
                    }}
                    placeholder="Write about your day, your struggles, your victories... The AI will weave it into your hero's journey."
                    maxLength={maxChars}
                    rows={12}
                    className="kq-input w-full resize-none text-base leading-relaxed"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p
                      className={
                        'text-sm font-bold ' +
                        (charCount < minChars
                          ? 'text-navy/50'
                          : charCount > maxChars - 100
                          ? 'text-coral'
                          : 'text-hero-blue')
                      }
                    >
                      {charCount}/{maxChars} characters
                      {charCount < minChars && ` (${minChars - charCount} more needed)`}
                    </p>
                    {error && <p className="text-sm text-coral font-bold">{error}</p>}
                  </div>
                </div>

                {/* Transformed Narrative Display */}
                {showTransformed && transformedNarrative && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 p-5 bg-gold/10 rounded-candy border-2 border-gold"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">✨</span>
                      <h3 className="kq-display text-xl font-black text-navy">Epic Transformation</h3>
                    </div>
                    <p className="text-navy text-base leading-relaxed italic">
                      {transformedNarrative}
                    </p>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleTransformToEpic}
                    disabled={isSubmitting || isTransforming || !isValidLength}
                    className={
                      'kq-btn w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed ' +
                      (isSubmitting || isTransforming || !isValidLength
                        ? 'kq-btn-ghost'
                        : 'kq-btn-gold')
                    }
                  >
                    {isTransforming ? '⏳ Transforming to Epic...' : '✨ Transform to Epic'}
                  </button>

                  <button
                    onClick={handleSavePrivate}
                    disabled={isSubmitting || isTransforming || !isValidLength}
                    className={
                      'kq-btn w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed ' +
                      (isSubmitting || isTransforming || !isValidLength
                        ? 'kq-btn-ghost'
                        : 'kq-btn-blue')
                    }
                  >
                    {isSubmitting ? '⏳ Saving...' : '💾 Save as Private Memory'}
                  </button>

                  <button
                    onClick={onClose}
                    disabled={isSubmitting || isTransforming}
                    className="kq-btn kq-btn-ghost w-full disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
