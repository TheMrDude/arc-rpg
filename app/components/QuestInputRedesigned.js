'use client';

import { useState, useEffect, useRef } from 'react';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', xp: 10, color: '#48BB78' },
  { value: 'medium', label: 'Medium', xp: 25, color: '#00D4FF' },
  { value: 'hard', label: 'Hard', xp: 50, color: '#FF6B6B' },
];

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

export default function QuestInputRedesigned({ onAddQuest, adding, questText, setQuestText, difficulty, setDifficulty }) {
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

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={questText}
        onChange={(e) => setQuestText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !adding && questText.trim()) onAddQuest(); }}
        placeholder="Enter your task..."
        className="w-full px-4 py-3 bg-[#0F3460] text-white border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.2)] transition-all mb-4 text-base"
        style={{ fontSize: '16px' }}
      />

      {/* Difficulty pills + Add button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDifficulty(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wide border-2 transition-all ${
                difficulty === opt.value
                  ? 'text-white shadow-[0_0_12px_rgba(0,0,0,0.3)]'
                  : 'bg-[#0F3460] border-[#1A1A2E] text-gray-400 hover:text-white hover:border-gray-500'
              }`}
              style={
                difficulty === opt.value
                  ? { backgroundColor: opt.color, borderColor: opt.color }
                  : {}
              }
            >
              {opt.label} <span className="text-xs opacity-75">({opt.xp} XP)</span>
            </button>
          ))}
        </div>

        <button
          onClick={onAddQuest}
          disabled={adding || isEmpty}
          className="px-6 py-2.5 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-[0_4px_0_#0F3460] hover:shadow-[0_6px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_#0F3460]"
        >
          {adding ? '⏳ Adding...' : '⚡ Add Quest'}
        </button>
      </div>

      {/* Rotating hint */}
      <p className="text-xs text-[#94a3b8] mt-3 transition-opacity duration-300">
        💡 Try: {HINT_EXAMPLES[hintIndex]}
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
