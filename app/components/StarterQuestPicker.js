'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const STARTER_QUESTS = [
  { emoji: '💧', text: 'Drink a glass of water', time: '1 min' },
  { emoji: '🚶', text: 'Take a 5-minute walk', time: '5 min' },
  { emoji: '🧹', text: 'Clear one surface', time: '2 min' },
];

// Starter quests matched to the archetype quiz result (localStorage 'hq_quiz_result').
// Same shape as STARTER_QUESTS; text flows through the normal AI quest transformation.
const QUIZ_STARTER_QUESTS = {
  warrior: [
    { emoji: '💪', text: 'Do 10 push-ups', time: '2 min' },
    { emoji: '🚶', text: 'Take a 5-minute walk', time: '5 min' },
    { emoji: '💧', text: 'Drink a glass of water', time: '1 min' },
  ],
  builder: [
    { emoji: '🛠️', text: 'Fix one small annoyance', time: '5 min' },
    { emoji: '🧹', text: 'Clear one surface', time: '2 min' },
    { emoji: '📝', text: 'Sketch one idea on paper', time: '2 min' },
  ],
  sage: [
    { emoji: '📖', text: 'Read one page of a book', time: '2 min' },
    { emoji: '✍️', text: 'Write down one thing you learned today', time: '2 min' },
    { emoji: '💧', text: 'Drink a glass of water', time: '1 min' },
  ],
  shadow: [
    { emoji: '📋', text: 'Plan tomorrow\'s top task', time: '2 min' },
    { emoji: '🧹', text: 'Clear one surface', time: '2 min' },
    { emoji: '🧘', text: 'Take 5 slow breaths', time: '1 min' },
  ],
  seeker: [
    { emoji: '🚶', text: 'Take a 5-minute walk somewhere new', time: '5 min' },
    { emoji: '🎵', text: 'Listen to one song you\'ve never heard', time: '3 min' },
    { emoji: '💧', text: 'Drink a glass of water', time: '1 min' },
  ],
};

/**
 * First-win fast path: shown on the first dashboard visit (no quests yet).
 * One tap creates the quest via the normal AI transformation, so the user
 * goes signup → archetype → completed first quest in under two minutes.
 */
export default function StarterQuestPicker({ onPick, creating }) {
  const [pickedText, setPickedText] = useState(null);
  const [quizArchetype, setQuizArchetype] = useState(null);

  // Read the quiz result after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hq_quiz_result');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.archetype && QUIZ_STARTER_QUESTS[parsed.archetype]) {
          setQuizArchetype(parsed.archetype);
        }
      }
    } catch (e) {
      // Bad or missing data - fall back to the default starter quests
    }
  }, []);

  const quests = quizArchetype ? QUIZ_STARTER_QUESTS[quizArchetype] : STARTER_QUESTS;

  function handlePick(text) {
    if (creating) return;
    setPickedText(text);
    onPick(text);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="kq-card border-2 border-stone p-6 mb-6"
    >
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">⚡</div>
        <h2 className="kq-display text-2xl text-navy mb-1">
          Claim Your First Win
        </h2>
        {quizArchetype && (
          <p className="text-xs font-bold text-gold mb-1">
            ✨ Built from your quiz answers
          </p>
        )}
        <p className="text-sm text-navy/70">
          Pick one. Do it. Watch it become a quest. Your campaign starts with a single victory.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {quests.map((quest) => {
          const isPicked = pickedText === quest.text;
          return (
            <motion.button
              key={quest.text}
              onClick={() => handlePick(quest.text)}
              disabled={creating}
              whileTap={creating ? {} : { scale: 0.95 }}
              className={`p-4 rounded-candy border-2 text-center transition-all ${
                isPicked && creating
                  ? 'border-gold bg-gold/10 animate-pulse'
                  : 'border-stone bg-cream hover:border-hero-blue hover:-translate-y-0.5'
              } disabled:cursor-wait`}
            >
              <div className="text-3xl mb-2">{quest.emoji}</div>
              <div className="font-bold text-navy text-sm leading-snug mb-1">
                {isPicked && creating ? 'Forging your quest...' : quest.text}
              </div>
              <div className="text-[10px] text-navy/50 font-bold">
                {isPicked && creating ? '⚒️ The AI is at work' : `~${quest.time}`}
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="text-center text-xs text-navy/50 mt-4">
        Or type your own habit below — any small task works.
      </p>
    </motion.div>
  );
}
