'use client';

import { useState, useEffect, useRef } from 'react';

const HINT_EXAMPLES = [
  '"Read for 20 minutes"',
  '"Clean the kitchen"',
  '"Exercise for 30 minutes"',
  '"Write 500 words"',
  '"Meditate for 10 minutes"',
  '"Practice guitar for 15 min"',
  '"Go for a walk"',
  '"Organize my desk"',
  '"Study for an hour"',
  '"Cook a healthy meal"',
];

// Daily is first and is the default. Most habits a child enters are things they
// mean to do again, and defaulting to a one-off would quietly make the app's
// main promise -- the quest comes back by itself -- opt-in.
const RECURRENCE_CHOICES = [
  { value: 'daily', icon: '☀️', label: 'Every day' },
  { value: 'weekly', icon: '📅', label: 'Every week' },
  { value: 'once', icon: '1️⃣', label: 'Just once' },
];

const RECURRENCE_BLURB = {
  daily: 'This quest comes back every day. You never have to add it again.',
  weekly: 'This quest comes back every week. You never have to add it again.',
  once: 'This quest happens one time.',
};

export default function QuestInputRedesigned({
  onAddQuest,
  adding,
  questText,
  setQuestText,
  recurrence = 'daily',
  setRecurrence,
}) {
  const [hintIndex, setHintIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex(prev => (prev + 1) % HINT_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const isEmpty = !questText.trim();

  return (
    <div
      className={`kq-card p-6 mb-6 transition-all duration-300 ${
        isEmpty
          ? 'border-2 border-hero-blue/40 animate-subtle-glow'
          : 'border-2 border-hero-blue/20'
      }`}
    >
      <h3 className="kq-display text-lg text-hero-blue mb-4">
        ⚔️ What&apos;s Your Next Quest?
      </h3>

      {/* Input + Add button */}
      <div className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={questText}
          onChange={(e) => setQuestText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !adding && questText.trim()) onAddQuest(); }}
          placeholder="Enter your task..."
          className="kq-input flex-1 text-base"
          style={{ fontSize: '16px' }}
        />
        <button
          onClick={onAddQuest}
          disabled={adding || isEmpty}
          className="kq-btn kq-btn-gold whitespace-nowrap disabled:opacity-50"
        >
          {adding ? '⏳ Adding...' : '⚡ Add Quest'}
        </button>
      </div>

      {/* How often? Daily is preselected, so a child who ignores this control
          entirely still gets a habit that returns on its own. */}
      {setRecurrence && (
        <div className="mt-4">
          <div className="kq-label mb-2" id="recurrence-label">How often?</div>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="recurrence-label">
            {RECURRENCE_CHOICES.map((choice) => {
              const selected = recurrence === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => setRecurrence(choice.value)}
                  aria-pressed={selected}
                  style={{ minHeight: 44, touchAction: 'manipulation' }}
                  className={
                    'flex-1 min-w-[104px] px-4 rounded-candy font-bold text-sm border-2 transition-all ' +
                    (selected
                      ? 'bg-aqua/20 border-aqua text-hero-blue'
                      : 'bg-cream border-stone text-navy/60 hover:border-aqua/50')
                  }
                >
                  <span aria-hidden="true">{choice.icon}</span> {choice.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-navy/60 mt-2">{RECURRENCE_BLURB[recurrence]}</p>
        </div>
      )}

      {/* Hint + AI difficulty note */}
      <p className="text-xs text-navy/60 mt-3">
        💡 Try: {HINT_EXAMPLES[hintIndex]}
      </p>
      <p className="text-[10px] text-navy/50 mt-1">
        Difficulty &amp; XP are assigned automatically by AI based on task complexity
      </p>

      <style jsx>{`
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 0 0px rgba(79, 125, 243, 0); }
          50% { box-shadow: 0 0 18px rgba(79, 125, 243, 0.25); }
        }
        .animate-subtle-glow {
          animation: subtleGlow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
