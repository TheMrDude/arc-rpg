'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// localStorage keys
// hq_tomorrow_quest = { text, forDate: 'YYYY-MM-DD' (local), createdAt: ISO }
// hq_tomorrow_hook_shown = 'YYYY-MM-DD' (local) - suggestion card once per day
const QUEST_KEY = 'hq_tomorrow_quest';
const SHOWN_KEY = 'hq_tomorrow_hook_shown';

const DEFAULT_SUGGESTIONS = [
  'Drink a glass of water',
  'Take a 5-minute walk',
  'Tidy one small space',
];

const ARCHETYPE_SUGGESTIONS = {
  warrior: ['Do 10 push-ups', 'Take a brisk 5-minute walk', 'Stretch for 2 minutes'],
  builder: ['Fix one small annoyance', 'Sketch one idea on paper', 'Tidy one small space'],
  sage: ['Read one page of a book', 'Write down one thing you learned', 'Drink a glass of water'],
  shadow: ["Plan tomorrow's top task", 'Take 5 slow breaths', 'Tidy one small space'],
  seeker: ['Take a 5-minute walk somewhere new', 'Listen to one song you have never heard', 'Drink a glass of water'],
};

function toLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readStoredQuest() {
  try {
    const raw = localStorage.getItem(QUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.text || !parsed?.forDate) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

/**
 * Two small surfaces in one component:
 *
 * 1. Banner (on dashboard load): if a stored tomorrow-quest is due today or
 *    earlier, offer to begin it via the normal quest-creation flow.
 * 2. Suggestion card (after a completion celebration closes, at most once
 *    per day): pick tomorrow's quest with one tap or free text. The choice
 *    is only stored, not created; it becomes a quest via the banner.
 */
export default function TomorrowQuestHook({ showSuggest, archetype, onPick, creating }) {
  const [pending, setPending] = useState(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [savedText, setSavedText] = useState(null);
  const [customText, setCustomText] = useState('');
  const [beginning, setBeginning] = useState(false);

  // Banner: check for a due quest on mount
  useEffect(() => {
    const stored = readStoredQuest();
    if (stored && stored.forDate <= toLocalYMD(new Date())) {
      setPending(stored);
    }
  }, []);

  // Suggestion card: gate on once-per-day + no quest already planned ahead
  useEffect(() => {
    if (!showSuggest || suggestOpen || savedText) return;
    try {
      const today = toLocalYMD(new Date());
      if (localStorage.getItem(SHOWN_KEY) === today) return;

      const stored = readStoredQuest();
      if (stored && stored.forDate > today) return; // tomorrow already planned

      localStorage.setItem(SHOWN_KEY, today);
      setSuggestOpen(true);
    } catch (e) {
      // localStorage unavailable: skip quietly
    }
  }, [showSuggest]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveTomorrow(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      localStorage.setItem(
        QUEST_KEY,
        JSON.stringify({
          text: trimmed,
          forDate: toLocalYMD(tomorrow),
          createdAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      // Best effort only
    }
    setSavedText(trimmed);
    setTimeout(() => setSuggestOpen(false), 3500);
  }

  function beginPending() {
    if (!pending || beginning || creating) return;
    setBeginning(true);
    const text = pending.text;
    try {
      localStorage.removeItem(QUEST_KEY);
    } catch (e) {
      // Best effort only
    }
    setPending(null);
    onPick(text);
  }

  function dismissPending() {
    try {
      localStorage.removeItem(QUEST_KEY);
    } catch (e) {
      // Best effort only
    }
    setPending(null);
  }

  const suggestions = ARCHETYPE_SUGGESTIONS[archetype] || DEFAULT_SUGGESTIONS;

  return (
    <>
      {/* Banner: yesterday's choice is due today */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="kq-card border-2 border-gold p-4 mb-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gold mb-0.5">
                  📜 A quest awaits
                </p>
                <p className="text-sm text-navy/70">
                  Yesterday you chose today&apos;s quest:{' '}
                  <span className="font-black text-navy">{pending.text}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={beginPending}
                  disabled={creating || beginning}
                  className="kq-btn kq-btn-emerald text-xs disabled:opacity-60 disabled:cursor-wait"
                >
                  {beginning || creating ? 'Starting...' : 'Begin'}
                </button>
                <button
                  onClick={dismissPending}
                  className="px-2 py-2 text-xs font-bold text-navy/50 hover:text-navy transition-colors"
                >
                  Not today
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestion card: choose tomorrow's quest after a completion */}
      <AnimatePresence>
        {suggestOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="kq-card border-2 border-aqua/60 p-4 mb-4"
          >
            {savedText ? (
              <p className="text-sm text-emerald font-bold text-center py-1">
                ✨ Locked in for tomorrow: {savedText}. It will be waiting for you.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-hero-blue kq-display">
                    🌙 Choose tomorrow&apos;s quest
                  </h4>
                  <button
                    onClick={() => setSuggestOpen(false)}
                    className="text-navy/40 hover:text-navy text-sm leading-none"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-navy/60 mb-3">
                  Tomorrow starts easier when the first move is already picked.
                </p>
                <div className="grid sm:grid-cols-3 gap-2 mb-3">
                  {suggestions.map((text) => (
                    <button
                      key={text}
                      onClick={() => saveTomorrow(text)}
                      className="p-2.5 rounded-candy border-2 border-stone bg-cream hover:border-hero-blue text-left text-xs font-bold text-navy leading-snug transition-all"
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveTomorrow(customText);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Or write your own..."
                    maxLength={120}
                    className="kq-input flex-1 min-w-0 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!customText.trim()}
                    className="kq-btn kq-btn-blue text-xs disabled:opacity-40"
                  >
                    Set
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
