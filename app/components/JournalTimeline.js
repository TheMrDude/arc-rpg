'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOOD_EMOJIS = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
};

function JournalEntryCard({ entry, index }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const date = new Date(entry.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#1A1A2E] border-2 border-[#00D4FF] border-opacity-30 rounded-lg p-5 hover:border-opacity-100 transition-all hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]"
    >
      {/* Header with date and mood */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-black text-[#FFD93D]" style={{ fontFamily: 'VT323, monospace' }}>
            {formattedDate}
          </h3>
          <p className="text-xs text-[#00D4FF] font-bold">{formattedTime}</p>
        </div>
        {entry.mood && (
          <div className="text-4xl" title={`Mood: ${entry.mood}/5`}>
            {MOOD_EMOJIS[entry.mood]}
          </div>
        )}
      </div>

      {/* Transformed Narrative (if available) */}
      {entry.transformed_narrative ? (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✨</span>
            <h4 className="text-sm font-bold text-[#FF6B6B] uppercase">Epic Tale</h4>
          </div>
          <p className="text-white text-sm leading-relaxed italic">
            {entry.transformed_narrative}
          </p>
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-white text-sm leading-relaxed">
            {entry.entry_text.length > 200 && !isExpanded
              ? entry.entry_text.substring(0, 200) + '...'
              : entry.entry_text}
          </p>
        </div>
      )}

      {/* Toggle to show/hide original entry */}
      {entry.transformed_narrative && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[#00D4FF] hover:text-[#FFD93D] font-bold transition-colors"
        >
          {isExpanded ? '▲ Hide Original Entry' : '▼ Show Original Entry'}
        </button>
      )}

      {/* Expanded original entry */}
      <AnimatePresence>
        {isExpanded && entry.transformed_narrative && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-[#00D4FF] border-opacity-30"
          >
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Original Entry</h4>
            <p className="text-gray-300 text-sm leading-relaxed">{entry.entry_text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function JournalTimeline({ entries, isLoading, onLoadMore, hasMore }) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[#1A1A2E] border-2 border-[#00D4FF] border-opacity-30 rounded-lg p-5 animate-pulse"
          >
            <div className="h-4 bg-[#00D4FF] bg-opacity-20 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-[#00D4FF] bg-opacity-20 rounded w-1/6 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-[#00D4FF] bg-opacity-20 rounded"></div>
              <div className="h-3 bg-[#00D4FF] bg-opacity-20 rounded w-5/6"></div>
              <div className="h-3 bg-[#00D4FF] bg-opacity-20 rounded w-4/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-7xl mb-4">📖</div>
        <h3 className="text-2xl font-black text-[#FFD93D] mb-2" style={{ fontFamily: 'VT323, monospace' }}>
          YOUR JOURNAL AWAITS
        </h3>
        <p className="text-[#00D4FF] font-bold">
          Write your first entry to begin documenting your hero's journey.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <JournalEntryCard key={entry.id} entry={entry} index={index} />
      ))}

      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className={
              'py-3 px-8 rounded-lg font-black uppercase border-3 transition-all ' +
              (isLoading
                ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-[#00D4FF] border-[#0F3460] text-[#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_3px_0_#0F3460]')
            }
          >
            {isLoading ? 'Loading...' : 'Load More Entries'}
          </button>
        </div>
      )}
    </div>
  );
}
