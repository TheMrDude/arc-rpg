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

function JournalEntryCard({ entry, index, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(entry.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#1A1A2E] border-2 border-[#00D4FF] border-opacity-30 rounded-lg p-5 hover:border-opacity-100 transition-all hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]"
    >
      {/* Header with date, mood, and delete button */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-black text-[#FFD93D]" style={{ fontFamily: 'VT323, monospace' }}>
            {formattedDate}
          </h3>
          <p className="text-xs text-[#00D4FF] font-bold">{formattedTime}</p>
        </div>
        <div className="flex items-center gap-3">
          {entry.mood && (
            <div className="text-4xl" title={`Mood: ${entry.mood}/5`}>
              {MOOD_EMOJIS[entry.mood]}
            </div>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[#FF6B6B] hover:text-red-400 transition-colors p-1"
            title="Delete entry"
            disabled={isDeleting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black text-[#FF6B6B] mb-4" style={{ fontFamily: 'VT323, monospace' }}>
                DELETE ENTRY?
              </h3>
              <p className="text-white mb-6">
                Are you sure you want to delete this journal entry? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={
                    'flex-1 py-2 px-4 rounded-lg font-bold uppercase border-2 transition-all ' +
                    (isDeleting
                      ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-[#FF6B6B] border-red-700 text-white hover:bg-red-600')
                  }
                >
                  {isDeleting ? 'DELETING...' : 'DELETE'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-4 rounded-lg font-bold uppercase border-2 bg-[#00D4FF] border-[#0F3460] text-[#0F3460] hover:bg-[#00BFFF] transition-all"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function JournalTimeline({ entries, isLoading, onLoadMore, hasMore, onDelete }) {
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
        <JournalEntryCard key={entry.id} entry={entry} index={index} onDelete={onDelete} />
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
