'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';
import { FREE_TIER_QUEST_LIMIT } from '@/lib/quest-limits';

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '📆' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
];

function CreateRecurringQuestModal({ show, onClose, onSubmit }) {
  const [questText, setQuestText] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setQuestText('');
      setRecurrenceType('daily');
      setRecurrenceInterval(3);
      setError('');
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [show]);

  const handleSubmit = async () => {
    if (!questText.trim()) {
      setError('Please enter your habit');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        original_text: questText.trim(),
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceType === 'custom' ? recurrenceInterval : 1,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create recurring quest');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-w-lg w-full max-h-[90vh]">
        <div className="kq-card w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-5 border-b border-stone">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔄</span>
                <h2 className="text-xl font-black text-navy kq-display">
                  New Recurring Quest
                </h2>
              </div>
              <button onClick={onClose} className="text-navy/40 hover:text-navy text-2xl">✕</button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Quest Text */}
            <div>
              <label className="kq-label">What habit do you want to build?</label>
              <input
                type="text"
                value={questText}
                onChange={(e) => { setQuestText(e.target.value); setError(''); }}
                placeholder='e.g. "Read for 20 minutes" or "Go for a run"'
                maxLength={200}
                className="kq-input"
                autoFocus
              />
            </div>

            {/* Recurrence Type */}
            <div>
              <label className="kq-label">How often?</label>
              <div className="grid grid-cols-3 gap-3">
                {RECURRENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRecurrenceType(option.value)}
                    className={
                      'py-3 px-4 rounded-candy font-bold text-sm border-2 transition-all text-center ' +
                      (recurrenceType === option.value
                        ? 'bg-aqua/20 border-aqua text-hero-blue'
                        : 'bg-cream border-stone text-navy/60 hover:border-aqua/50')
                    }
                  >
                    <div className="text-xl mb-1">{option.icon}</div>
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Custom: Interval Input */}
              {recurrenceType === 'custom' && (
                <div className="mt-3 bg-cream p-4 rounded-candy border-2 border-stone">
                  <div className="flex items-center gap-3">
                    <span className="text-navy font-bold text-sm">Every</span>
                    <input
                      type="number"
                      min="2"
                      max="30"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Math.max(2, Math.min(30, parseInt(e.target.value) || 2)))}
                      className="kq-input w-16 text-center px-2"
                    />
                    <span className="text-navy font-bold text-sm">days</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info text */}
            <p className="text-navy/50 text-xs">
              💡 The AI will transform your habit into an epic quest and auto-assign difficulty.
              A new quest instance generates on your chosen schedule.
            </p>

            {error && (
              <p className="bg-coral/12 border-2 border-coral text-coral font-bold text-sm rounded-candy px-3 py-2">⚠️ {error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !questText.trim()}
              className={
                'kq-btn w-full ' +
                (isSubmitting || !questText.trim()
                  ? 'opacity-50 cursor-not-allowed bg-navy/10 text-navy/40'
                  : 'kq-btn-blue')
              }
            >
              {isSubmitting ? '⏳ Creating...' : '⚡ Create Recurring Quest'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function RecurringQuestCard({ quest, onToggle, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const getRecurrenceLabel = () => {
    if (quest.recurrence_type === 'daily') return 'DAILY';
    if (quest.recurrence_type === 'weekly') return 'WEEKLY';
    return `EVERY ${quest.recurrence_interval} DAYS`;
  };

  const difficultyColors = {
    easy: 'text-emerald',
    medium: 'text-hero-blue',
    hard: 'text-coral',
  };

  return (
    <div className={
      'kq-card p-4 transition-all ' +
      (quest.is_active
        ? 'border-2 border-aqua/20 hover:border-aqua/40'
        : 'border-2 border-stone opacity-60')
    }>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-navy font-bold text-sm truncate">{quest.original_text}</h3>
            <span className="kq-chip bg-aqua/10 text-hero-blue border border-aqua/20 whitespace-nowrap text-[10px] font-black">
              {getRecurrenceLabel()}
            </span>
            {!quest.is_active && (
              <span className="kq-chip bg-gold/10 text-gold border border-gold/20 text-[10px] font-black">
                PAUSED
              </span>
            )}
          </div>
          <p className="text-navy/50 text-xs italic truncate mb-2">{quest.transformed_text}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className={`font-bold uppercase ${difficultyColors[quest.difficulty] || 'text-navy/50'}`}>
              {quest.difficulty} · {quest.xp_value} XP
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggle(quest.id, !quest.is_active)}
            className={
              'px-3 py-1.5 rounded-candy text-xs font-bold border-2 transition-all ' +
              (quest.is_active
                ? 'bg-transparent border-stone text-navy/50 hover:border-gold hover:text-gold'
                : 'bg-transparent border-emerald/50 text-emerald hover:border-emerald')
            }
          >
            {quest.is_active ? '⏸' : '▶'}
          </button>

          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={() => { onDelete(quest.id); setConfirmDelete(false); }}
                className="px-2 py-1.5 rounded-candy text-xs font-bold bg-coral text-white"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1.5 rounded-candy text-xs font-bold bg-navy/10 text-navy/60"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 rounded-candy text-xs font-bold border-2 border-stone text-navy/40 hover:border-coral hover:text-coral transition-all"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecurringQuests({ isPremium, archetype, onQuestCreated }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [questLimit, setQuestLimit] = useState(FREE_TIER_QUEST_LIMIT);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    loadRecurringQuests();
  }, []);

  const loadRecurringQuests = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/recurring-quests/list', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setQuests(data.recurring_quests || []);
        setActiveCount(data.count || 0);
        setQuestLimit(data.limit);
      }
    } catch (error) {
      console.error('Error loading recurring quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (questData) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('/api/recurring-quests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(questData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create');
    }

    await loadRecurringQuests();
    // Notify parent to refresh quest list (first instance was generated)
    if (onQuestCreated) onQuestCreated();
  };

  const handleToggle = async (questId, isActive) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/recurring-quests/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ quest_id: questId, is_active: isActive }),
      });

      if (response.ok) await loadRecurringQuests();
    } catch (error) {
      console.error('Error toggling recurring quest:', error);
    }
  };

  const handleDelete = async (questId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/recurring-quests/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ quest_id: questId }),
      });

      if (response.ok) await loadRecurringQuests();
    } catch (error) {
      console.error('Error deleting recurring quest:', error);
    }
  };

  const canCreate = !questLimit || activeCount < questLimit;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin text-3xl mb-2">⚙️</div>
        <p className="text-navy/50 text-sm">Loading recurring quests...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-navy kq-display">
              🔄 Recurring Quests
            </h2>
            <p className="text-navy/50 text-xs mt-0.5">Habits that auto-generate on schedule</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!canCreate}
            className={
              'kq-btn text-xs ' +
              (canCreate
                ? 'kq-btn-blue'
                : 'opacity-50 cursor-not-allowed bg-navy/10 text-navy/40')
            }
          >
            + New
          </button>
        </div>

        {/* Quest list or empty state */}
        {quests.length === 0 ? (
          <div className="text-center py-12 kq-card border-2 border-aqua/10">
            <div className="text-5xl mb-3">🔄</div>
            <h3 className="text-lg font-black text-navy kq-display mb-2">No Recurring Quests Yet</h3>
            <p className="text-navy/60 text-sm mb-4 max-w-xs mx-auto">
              Turn your daily habits into auto-generating quests.
              Set it once, and your quest log fills itself.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="kq-btn kq-btn-gold"
            >
              + Create Your First Recurring Quest
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {quests.map((quest) => (
              <RecurringQuestCard
                key={quest.id}
                quest={quest}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Free tier limit indicator */}
        {questLimit && (
          <div className="text-center text-xs text-navy/50 pt-2">
            {activeCount} of {questLimit} recurring quests used (Free tier)
            {!canCreate && (
              <span className="block mt-1 text-hero-blue">
                <a href="/pricing" className="underline hover:text-gold">Upgrade to Pro</a> for unlimited
              </span>
            )}
          </div>
        )}
      </div>

      <CreateRecurringQuestModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
