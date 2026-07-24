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

export default function QuestInputRedesigned({ onAddQuest, adding, questText, setQuestText }) {
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
