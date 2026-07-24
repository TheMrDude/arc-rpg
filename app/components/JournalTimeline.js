'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';

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
      className="kq-card kq-card-hover p-5"
    >
      {/* Header with date, mood, and delete button */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-navy kq-display">
            {formattedDate}
          </h3>
          <p className="text-xs text-hero-blue font-bold">{formattedTime}</p>
        </div>
        <div className="flex items-center gap-3">
          {entry.mood && (
            <div className="text-4xl" title={`Mood: ${entry.mood}/5`}>
              {MOOD_EMOJIS[entry.mood]}
            </div>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-coral hover:text-coral/70 transition-colors p-1"
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
            <h4 className="text-sm font-bold text-coral">Epic Tale</h4>
          </div>
          <p className="text-navy text-sm leading-relaxed italic">
            {entry.transformed_narrative}
          </p>
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-navy text-sm leading-relaxed">
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
          className="text-xs text-hero-blue hover:text-gold font-bold transition-colors"
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
            className="mt-3 pt-3 border-t border-stone"
          >
            <h4 className="text-xs font-bold text-navy/50 mb-2">Original Entry</h4>
            <p className="text-navy/70 text-sm leading-relaxed">{entry.entry_text}</p>
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
              className="kq-card border-2 border-coral p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-coral mb-4 kq-display">
                Delete this entry?
              </h3>
              <p className="text-navy mb-6">
                Are you sure you want to delete this journal entry? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={
                    'kq-btn flex-1 ' +
                    (isDeleting
                      ? 'bg-navy/20 text-navy/50 cursor-not-allowed'
                      : 'bg-coral text-white hover:bg-coral/90')
                  }
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="kq-btn kq-btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function JournalTimeline({ entries, isLoading, onLoadMore, hasMore, onDelete, onNewEntry }) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="kq-card p-5 animate-pulse"
          >
            <div className="h-4 bg-hero-blue/15 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-hero-blue/15 rounded w-1/6 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-hero-blue/15 rounded"></div>
              <div className="h-3 bg-hero-blue/15 rounded w-5/6"></div>
              <div className="h-3 bg-hero-blue/15 rounded w-4/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="📖"
        title="Your journal awaits"
        description="Blank pages don't write themselves. Log your first entry and start documenting your hero's journey."
        actionLabel={onNewEntry ? 'Write an Entry' : undefined}
        onAction={onNewEntry}
      />
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
              'kq-btn ' +
              (isLoading
                ? 'bg-navy/20 text-navy/50 cursor-not-allowed'
                : 'kq-btn-blue')
            }
          >
            {isLoading ? 'Loading…' : 'Load More Entries'}
          </button>
        </div>
      )}
    </div>
  );
}
