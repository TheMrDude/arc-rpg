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
        colors: ['#FF6B6B', '#00D4FF', '#FFD93D', '#E8B44C']
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
          className="absolute inset-0 bg-[#0F3460] bg-opacity-90 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          className="relative bg-[#1A1A2E] rounded-2xl shadow-[0_0_40px_rgba(0,212,255,0.3)] max-w-3xl w-full overflow-hidden border-3 border-[#00D4FF]"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {showSuccess ? (
            <div className="p-16 text-center">
              <div className="text-9xl mb-6">📖</div>
              <h3 className="text-4xl font-black text-[#FFD93D] mb-4" style={{ fontFamily: 'VT323, monospace' }}>
                MEMORY SAVED!
              </h3>
              <p className="text-[#00D4FF] text-xl font-bold">Your journey continues...</p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] p-6 text-center border-b-3 border-[#00D4FF]">
                <div className="text-6xl mb-3">📜</div>
                <h2 className="text-3xl font-black text-[#FFD93D] mb-2" style={{ fontFamily: 'VT323, monospace' }}>
                  HERO'S JOURNAL
                </h2>
                <p className="text-[#00D4FF] font-bold text-sm">
                  Write about your day, your struggles, your victories...
                </p>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Mood Selector */}
                <div className="mb-6">
                  <p className="text-lg font-bold text-white mb-3 text-center">
                    How do you feel today?
                  </p>
                  <div className="flex justify-center gap-3 mb-2">
                    {MOOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMood(option.value)}
                        className={
                          'p-3 rounded-lg border-3 transition-all hover:scale-110 ' +
                          (mood === option.value
                            ? 'bg-[#00D4FF] bg-opacity-20 border-[#00D4FF] scale-110 shadow-[0_0_15px_rgba(0,212,255,0.5)]'
                            : 'bg-[#0F3460] border-[#0F3460] hover:border-[#00D4FF]')
                        }
                      >
                        <span className="text-4xl">{option.emoji}</span>
                      </button>
                    ))}
                  </div>
                  {mood && (
                    <p className="text-center text-sm font-bold text-[#FFD93D]">
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
                    className="w-full p-5 rounded-lg bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-30 focus:border-[#00D4FF] focus:border-opacity-100 focus:outline-none focus:shadow-[0_0_20px_rgba(0,212,255,0.3)] resize-none text-white text-base leading-relaxed"
                    style={{ fontFamily: 'system-ui, sans-serif' }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p
                      className={
                        'text-sm font-bold ' +
                        (charCount < minChars
                          ? 'text-gray-400'
                          : charCount > maxChars - 100
                          ? 'text-[#FF6B6B]'
                          : 'text-[#00D4FF]')
                      }
                    >
                      {charCount}/{maxChars} characters
                      {charCount < minChars && ` (${minChars - charCount} more needed)`}
                    </p>
                    {error && <p className="text-sm text-[#FF6B6B] font-bold">{error}</p>}
                  </div>
                </div>

                {/* Transformed Narrative Display */}
                {showTransformed && transformedNarrative && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 p-5 bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] rounded-lg border-2 border-[#FFD93D] shadow-[0_0_20px_rgba(255,217,61,0.2)]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">✨</span>
                      <h3 className="text-xl font-black text-[#FFD93D]">EPIC TRANSFORMATION</h3>
                    </div>
                    <p className="text-white text-base leading-relaxed italic">
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
                      'w-full py-4 px-6 rounded-lg font-black text-lg uppercase border-3 transition-all ' +
                      (isSubmitting || isTransforming || !isValidLength
                        ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#FF6B6B] border-[#0F3460] text-white hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_5px_0_#0F3460]')
                    }
                  >
                    {isTransforming ? '⏳ Transforming to Epic...' : '✨ Transform to Epic'}
                  </button>

                  <button
                    onClick={handleSavePrivate}
                    disabled={isSubmitting || isTransforming || !isValidLength}
                    className={
                      'w-full py-4 px-6 rounded-lg font-black text-lg uppercase border-3 transition-all ' +
                      (isSubmitting || isTransforming || !isValidLength
                        ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#00D4FF] border-[#0F3460] text-[#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_5px_0_#0F3460]')
                    }
                  >
                    {isSubmitting ? '⏳ Saving...' : '💾 Save as Private Memory'}
                  </button>

                  <button
                    onClick={onClose}
                    disabled={isSubmitting || isTransforming}
                    className="w-full py-3 px-6 rounded-lg bg-transparent border-2 border-gray-500 hover:border-gray-400 text-gray-400 hover:text-gray-300 font-bold transition-colors disabled:opacity-50"
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
