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
      className={`bg-[#1A1A2E] border-3 rounded-lg p-6 mb-6 transition-all duration-300 ${
        isEmpty
          ? 'border-[#00D4FF] shadow-[0_0_25px_rgba(0,212,255,0.4)] animate-subtle-glow'
          : 'border-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.3)]'
      }`}
    >
      <h3 className="text-lg font-black uppercase tracking-wide text-[#00D4FF] mb-4">
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
          className="flex-1 px-4 py-3 bg-[#0F3460] text-white border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.2)] transition-all text-base"
          style={{ fontSize: '16px' }}
        />
        <button
          onClick={onAddQuest}
          disabled={adding || isEmpty}
          className="px-6 py-3 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-[0_4px_0_#0F3460] hover:shadow-[0_6px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_#0F3460] whitespace-nowrap"
        >
          {adding ? '⏳ Adding...' : '⚡ Add Quest'}
        </button>
      </div>

      {/* Hint + AI difficulty note */}
      <p className="text-xs text-[#94a3b8] mt-3">
        💡 Try: {HINT_EXAMPLES[hintIndex]}
      </p>
      <p className="text-[10px] text-[#64748b] mt-1">
        Difficulty &amp; XP are assigned automatically by AI based on task complexity
      </p>

      <style jsx>{`
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.3); }
          50% { box-shadow: 0 0 30px rgba(0, 212, 255, 0.5); }
        }
        .animate-subtle-glow {
          animation: subtleGlow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
