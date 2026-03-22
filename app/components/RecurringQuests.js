'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';

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
        <div className="bg-[#1A1A2E] rounded-2xl shadow-[0_0_40px_rgba(0,212,255,0.3)] w-full max-h-[90vh] overflow-y-auto border-2 border-[#00D4FF]">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] p-5 border-b border-[#00D4FF]/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔄</span>
                <h2 className="text-xl font-black text-[#00D4FF] uppercase tracking-wide">
                  New Recurring Quest
                </h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Quest Text */}
            <div>
              <label className="block text-white font-bold mb-2 text-sm">What habit do you want to build?</label>
              <input
                type="text"
                value={questText}
                onChange={(e) => { setQuestText(e.target.value); setError(''); }}
                placeholder='e.g. "Read for 20 minutes" or "Go for a run"'
                maxLength={200}
                className="w-full px-4 py-3 bg-[#0F3460] text-white border-2 border-[#00D4FF]/30 rounded-lg focus:border-[#00D4FF] focus:outline-none placeholder-gray-500"
                autoFocus
              />
            </div>

            {/* Recurrence Type */}
            <div>
              <label className="block text-white font-bold mb-2 text-sm">How often?</label>
              <div className="grid grid-cols-3 gap-3">
                {RECURRENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRecurrenceType(option.value)}
                    className={
                      'py-3 px-4 rounded-lg font-bold text-sm border-2 transition-all text-center ' +
                      (recurrenceType === option.value
                        ? 'bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]'
                        : 'bg-[#0F3460] border-[#1A1A2E] text-gray-400 hover:border-[#22d3ee]/50')
                    }
                  >
                    <div className="text-xl mb-1">{option.icon}</div>
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Custom: Interval Input */}
              {recurrenceType === 'custom' && (
                <div className="mt-3 bg-[#0F3460] p-4 rounded-lg border border-[#00D4FF]/20">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-sm">Every</span>
                    <input
                      type="number"
                      min="2"
                      max="30"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Math.max(2, Math.min(30, parseInt(e.target.value) || 2)))}
                      className="w-16 px-3 py-2 bg-[#1A1A2E] text-white border-2 border-[#00D4FF]/30 rounded font-bold text-center focus:outline-none focus:border-[#00D4FF]"
                    />
                    <span className="text-white font-bold text-sm">days</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info text */}
            <p className="text-gray-500 text-xs">
              💡 The AI will transform your habit into an epic quest and auto-assign difficulty.
              A new quest instance generates on your chosen schedule.
            </p>

            {error && (
              <p className="text-[#f43f5e] font-bold text-sm">⚠️ {error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !questText.trim()}
              className={
                'w-full py-3 px-6 rounded-lg font-black uppercase text-sm tracking-wide transition-all ' +
                (isSubmitting || !questText.trim()
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-[#22d3ee] hover:bg-[#06b6d4] text-[#0f172a] hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]')
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
    easy: 'text-green-400',
    medium: 'text-[#22d3ee]',
    hard: 'text-[#f43f5e]',
  };

  return (
    <div className={
      'bg-slate-800/50 rounded-lg p-4 border transition-all ' +
      (quest.is_active
        ? 'border-cyan-500/20 hover:border-cyan-500/40'
        : 'border-gray-700/50 opacity-60')
    }>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-white font-bold text-sm truncate">{quest.original_text}</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-[#22d3ee] border border-cyan-500/20 whitespace-nowrap">
              {getRecurrenceLabel()}
            </span>
            {!quest.is_active && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PAUSED
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs italic truncate mb-2">{quest.transformed_text}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className={`font-bold uppercase ${difficultyColors[quest.difficulty] || 'text-gray-400'}`}>
              {quest.difficulty} · {quest.xp_value} XP
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggle(quest.id, !quest.is_active)}
            className={
              'px-3 py-1.5 rounded text-xs font-bold border transition-all ' +
              (quest.is_active
                ? 'bg-transparent border-gray-600 text-gray-400 hover:border-amber-500 hover:text-amber-400'
                : 'bg-transparent border-green-600/50 text-green-400 hover:border-green-500')
            }
          >
            {quest.is_active ? '⏸' : '▶'}
          </button>

          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={() => { onDelete(quest.id); setConfirmDelete(false); }}
                className="px-2 py-1.5 rounded text-xs font-bold bg-red-600 text-white"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1.5 rounded text-xs font-bold bg-gray-700 text-gray-300"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 rounded text-xs font-bold border border-gray-700 text-gray-500 hover:border-red-500 hover:text-red-400 transition-all"
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
  const [questLimit, setQuestLimit] = useState(3);
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
        <p className="text-gray-400 text-sm">Loading recurring quests...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-[#22d3ee] uppercase tracking-wide">
              🔄 Recurring Quests
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">Habits that auto-generate on schedule</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!canCreate}
            className={
              'px-4 py-2 rounded-lg font-black uppercase text-xs tracking-wide transition-all ' +
              (canCreate
                ? 'bg-[#22d3ee] hover:bg-[#06b6d4] text-[#0f172a]'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed')
            }
          >
            + New
          </button>
        </div>

        {/* Quest list or empty state */}
        {quests.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-cyan-500/10">
            <div className="text-5xl mb-3">🔄</div>
            <h3 className="text-lg font-black text-[#22d3ee] mb-2">No Recurring Quests Yet</h3>
            <p className="text-gray-400 text-sm mb-4 max-w-xs mx-auto">
              Turn your daily habits into auto-generating quests.
              Set it once, and your quest log fills itself.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 bg-[#22d3ee] hover:bg-[#06b6d4] text-[#0f172a] rounded-lg font-black uppercase text-xs tracking-wide transition-all"
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
          <div className="text-center text-xs text-gray-500 pt-2">
            {activeCount} of {questLimit} recurring quests used (Free tier)
            {!canCreate && (
              <span className="block mt-1 text-[#22d3ee]">
                <a href="/pricing" className="underline hover:text-[#06b6d4]">Upgrade to Pro</a> for unlimited
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
