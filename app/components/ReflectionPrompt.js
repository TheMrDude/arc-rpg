'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😔', label: 'Struggling' },
  { value: 2, emoji: '😐', label: 'Okay' },
  { value: 3, emoji: '🙂', label: 'Good' },
  { value: 4, emoji: '😊', label: 'Great' },
  { value: 5, emoji: '🤩', label: 'Amazing' }
];

export default function ReflectionPrompt({ show, onClose, questId, questTitle, onSubmit }) {
  const [reflection, setReflection] = useState('');
  const [mood, setMood] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const charCount = reflection.length;
  const maxChars = 500;

  useEffect(() => {
    if (show) {
      setReflection('');
      setMood(3);
      setError('');
      setShowSuccess(false);
    }
  }, [show]);

  const handleSubmit = async () => {
    const trimmedReflection = reflection.trim();

    if (!trimmedReflection) {
      setError('Please write a brief reflection');
      return;
    }

    if (trimmedReflection.length > maxChars) {
      setError('Reflection must be ' + maxChars + ' characters or less');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(trimmedReflection, mood);
      setShowSuccess(true);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reflection');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  // Lock body scroll when open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [show]);

  if (!show) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[55] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleSkip}
        />

        <motion.div
          className="relative max-w-lg w-full max-h-[90vh]"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          <div className="kq-card w-full max-h-[90vh] overflow-y-auto">
          {showSuccess ? (
            <div className="p-12 text-center">
              <div className="text-8xl mb-4">✨</div>
              <h3 className="kq-display text-3xl text-emerald mb-2">+10 XP Earned!</h3>
              <p className="text-navy/60 text-lg">Thank you for reflecting</p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-coral to-gold p-6 text-center rounded-t-candy">
                <div className="text-6xl mb-3">🎉</div>
                <h2 className="kq-display text-2xl text-white mb-1">Quest Complete!</h2>
                <p className="text-white/90 font-semibold">{questTitle}</p>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-xl font-bold text-navy mb-2 text-center">
                    How do you feel about this victory?
                  </p>
                  <p className="text-sm text-navy/60 text-center">
                    Optional • Earn +10 XP bonus for reflecting
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex justify-center gap-2 mb-2">
                    {MOOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMood(option.value)}
                        className={'p-3 rounded-xl border-2 transition-all ' + (mood === option.value ? 'bg-gold/20 border-gold scale-110' : 'bg-cream border-stone hover:border-gold')}
                      >
                        <span className="text-3xl">{option.emoji}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-sm font-semibold text-navy/70">
                    {MOOD_OPTIONS.find(o => o.value === mood)?.label}
                  </p>
                </div>

                <div className="mb-4">
                  <textarea
                    value={reflection}
                    onChange={(e) => { setReflection(e.target.value); setError(''); }}
                    placeholder="I feel accomplished because..."
                    maxLength={maxChars}
                    rows={4}
                    className="kq-input resize-none"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={'text-xs ' + (charCount > maxChars - 50 ? 'text-coral' : 'text-navy/50')}>
                      {charCount}/{maxChars} characters
                    </p>
                    {error && <p className="text-xs text-coral font-semibold">{error}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={'kq-btn kq-btn-gold w-full py-4 px-6 text-lg ' + (isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}
                  >
                    {isSubmitting ? '⏳ Saving...' : '✨ Save Reflection (+10 XP)'}
                  </button>

                  <button
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="kq-btn kq-btn-ghost w-full py-3 px-6 disabled:opacity-50"
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
