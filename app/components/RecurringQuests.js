'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Every Day', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '📆' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

function CreateRecurringQuestModal({ show, onClose, onSubmit, archetype }) {
  const [questText, setQuestText] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday default
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedText, setTransformedText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      // Reset form
      setQuestText('');
      setDifficulty('medium');
      setRecurrenceType('daily');
      setRecurrenceInterval(1);
      setDayOfWeek(1);
      setTransformedText('');
      setError('');
    }
  }, [show]);

  const handleTransform = async () => {
    if (!questText.trim()) {
      setError('Please enter quest text first');
      return;
    }

    setIsTransforming(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/transform-quest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          questText,
          archetype,
          difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transform quest');
      }

      setTransformedText(data.transformedText);
    } catch (err) {
      setError(err.message || 'Failed to transform quest');
    } finally {
      setIsTransforming(false);
    }
  };

  const handleSubmit = async () => {
    if (!questText.trim()) {
      setError('Please enter quest text');
      return;
    }

    const xpValues = { easy: 10, medium: 25, hard: 50 };

    await onSubmit({
      original_text: questText.trim(),
      transformed_text: transformedText || questText.trim(),
      difficulty,
      xp_value: xpValues[difficulty],
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceType === 'custom' ? recurrenceInterval : 1,
      recurrence_day_of_week: recurrenceType === 'weekly' ? dayOfWeek : null,
      is_active: true,
    });
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative bg-[#1A1A2E] rounded-2xl shadow-[0_0_40px_rgba(0,212,255,0.3)] max-w-2xl w-full overflow-hidden border-3 border-[#00D4FF]"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] p-6 border-b-3 border-[#00D4FF]">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-5xl">🔄</span>
              <h2 className="text-3xl font-black text-[#00D4FF]" style={{ fontFamily: 'VT323, monospace' }}>
                CREATE RECURRING QUEST
              </h2>
            </div>
            <p className="text-gray-300 text-sm">Build habits that repeat automatically</p>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Quest Text */}
            <div className="mb-4">
              <label className="block text-white font-bold mb-2">Quest Text</label>
              <input
                type="text"
                value={questText}
                onChange={(e) => {
                  setQuestText(e.target.value);
                  setError('');
                }}
                placeholder="Exercise for 30 minutes"
                maxLength={200}
                className="w-full px-4 py-3 bg-[#0F3460] text-white border-2 border-[#00D4FF] border-opacity-30 rounded-lg focus:border-opacity-100 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">{questText.length}/200 characters</p>
            </div>

            {/* Difficulty */}
            <div className="mb-4">
              <label className="block text-white font-bold mb-2">Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={
                      'py-3 px-4 rounded-lg font-black uppercase border-3 transition-all ' +
                      (difficulty === diff
                        ? 'bg-[#00D4FF] border-[#0F3460] text-[#0F3460] shadow-[0_4px_0_#0F3460]'
                        : 'bg-[#0F3460] border-[#1A1A2E] text-gray-300 hover:border-[#00D4FF]')
                    }
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Recurrence Type */}
            <div className="mb-4">
              <label className="block text-white font-bold mb-2">Repeats</label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {RECURRENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRecurrenceType(option.value)}
                    className={
                      'py-3 px-4 rounded-lg font-bold border-3 transition-all ' +
                      (recurrenceType === option.value
                        ? 'bg-[#FFD93D] border-[#0F3460] text-[#0F3460] shadow-[0_4px_0_#0F3460]'
                        : 'bg-[#0F3460] border-[#1A1A2E] text-gray-300 hover:border-[#FFD93D]')
                    }
                  >
                    <div className="text-2xl mb-1">{option.icon}</div>
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Weekly: Day Selector */}
              {recurrenceType === 'weekly' && (
                <div className="bg-[#0F3460] p-4 rounded-lg border-2 border-[#00D4FF] border-opacity-30">
                  <label className="block text-white font-bold mb-2 text-sm">Select Day</label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => setDayOfWeek(day.value)}
                        className={
                          'py-2 px-3 rounded font-bold text-sm transition-all ' +
                          (dayOfWeek === day.value
                            ? 'bg-[#00D4FF] text-[#0F3460]'
                            : 'bg-[#1A1A2E] text-gray-400 hover:bg-[#00D4FF] hover:text-[#0F3460]')
                        }
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom: Interval Input */}
              {recurrenceType === 'custom' && (
                <div className="bg-[#0F3460] p-4 rounded-lg border-2 border-[#00D4FF] border-opacity-30">
                  <label className="block text-white font-bold mb-2 text-sm">Repeat Every</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-[#1A1A2E] text-white border-2 border-[#00D4FF] rounded font-bold text-center focus:outline-none"
                    />
                    <span className="text-white font-bold">day(s)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Transform Button */}
            <button
              onClick={handleTransform}
              disabled={isTransforming || !questText.trim()}
              className={
                'w-full py-3 px-6 rounded-lg font-black uppercase border-3 transition-all mb-4 ' +
                (isTransforming || !questText.trim()
                  ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-[#FF6B6B] border-[#0F3460] text-white hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_3px_0_#0F3460]')
              }
            >
              {isTransforming ? '⏳ Transforming...' : '✨ Transform to Epic'}
            </button>

            {/* Transformed Preview */}
            {transformedText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 p-4 bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] rounded-lg border-2 border-[#FFD93D]"
              >
                <p className="text-xs text-[#FFD93D] font-bold mb-2">EPIC VERSION:</p>
                <p className="text-white italic">{transformedText}</p>
              </motion.div>
            )}

            {error && (
              <p className="text-[#FF6B6B] font-bold text-sm mb-4">⚠️ {error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-[#0F3460] border-t-3 border-[#1A1A2E] flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-transparent border-2 border-gray-500 hover:border-gray-400 text-gray-400 hover:text-gray-300 font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!questText.trim()}
              className={
                'flex-1 py-3 px-6 rounded-lg font-black uppercase border-3 transition-all ' +
                (!questText.trim()
                  ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-[#48BB78] border-[#0F3460] text-white hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_3px_0_#0F3460]')
              }
            >
              Create Recurring Quest
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function RecurringQuestCard({ quest, onToggle, onEdit, onDelete }) {
  const getRecurrenceText = () => {
    if (quest.recurrence_type === 'daily') {
      return 'Every day';
    } else if (quest.recurrence_type === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[quest.recurrence_day_of_week]}`;
    } else {
      return `Every ${quest.recurrence_interval} day${quest.recurrence_interval > 1 ? 's' : ''}`;
    }
  };

  const getNextOccurrence = () => {
    const now = new Date();
    let next = new Date();

    if (quest.last_generated_at) {
      next = new Date(quest.last_generated_at);
    }

    if (quest.recurrence_type === 'daily') {
      next.setDate(next.getDate() + 1);
    } else if (quest.recurrence_type === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + quest.recurrence_interval);
    }

    return next > now ? next.toLocaleDateString() : 'Today';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        'bg-[#0F3460] p-5 rounded-lg border-2 transition-all ' +
        (quest.is_active
          ? 'border-[#00D4FF] border-opacity-50 hover:border-opacity-100'
          : 'border-gray-600 opacity-60')
      }
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">
              {quest.recurrence_type === 'daily' ? '📅' : quest.recurrence_type === 'weekly' ? '📆' : '⚙️'}
            </span>
            <h3 className="text-lg font-black text-[#00D4FF]">{quest.transformed_text}</h3>
          </div>
          <p className="text-sm text-gray-300 mb-2">{quest.original_text}</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#FFD93D] font-bold uppercase">{quest.difficulty} | {quest.xp_value} XP</span>
            <span className="text-gray-400">{getRecurrenceText()}</span>
            <span className="text-[#48BB78]">Next: {getNextOccurrence()}</span>
          </div>
        </div>

        {/* Active/Paused Toggle */}
        <button
          onClick={() => onToggle(quest.id, !quest.is_active)}
          className={
            'ml-4 px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ' +
            (quest.is_active
              ? 'bg-[#48BB78] border-[#0F3460] text-white'
              : 'bg-gray-600 border-gray-700 text-gray-300')
          }
        >
          {quest.is_active ? '✓ Active' : '⏸ Paused'}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
        <button
          onClick={() => onDelete(quest.id)}
          className="px-3 py-1 text-xs bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white rounded font-bold transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
    </motion.div>
  );
}

export default function RecurringQuests({ isPremium, archetype }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (isPremium) {
      loadRecurringQuests();
    }
  }, [isPremium]);

  const loadRecurringQuests = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/recurring-quests/list', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setQuests(data.quests || []);
      }
    } catch (error) {
      console.error('Error loading recurring quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (questData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/recurring-quests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(questData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        loadRecurringQuests();
      }
    } catch (error) {
      console.error('Error creating recurring quest:', error);
    }
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

      if (response.ok) {
        loadRecurringQuests();
      }
    } catch (error) {
      console.error('Error toggling recurring quest:', error);
    }
  };

  const handleDelete = async (questId) => {
    if (!confirm('Are you sure you want to delete this recurring quest?')) return;

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

      if (response.ok) {
        loadRecurringQuests();
      }
    } catch (error) {
      console.error('Error deleting recurring quest:', error);
    }
  };

  if (!isPremium) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-8 text-center">
        <p className="text-white font-bold">Loading recurring quests...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-[#00D4FF] uppercase tracking-wide">
              🔄 Recurring Quests
            </h2>
            <p className="text-gray-300 text-sm mt-1">Habits that repeat automatically</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#00D4FF] hover:bg-[#00BBE6] text-[#0F3460] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
          >
            + New Recurring Quest
          </button>
        </div>

        {quests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-7xl mb-4">🔄</div>
            <h3 className="text-2xl font-black text-[#FFD93D] mb-2">
              No recurring quests yet
            </h3>
            <p className="text-gray-300 mb-6">
              Build habits that repeat automatically. Create your first recurring quest!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
      </div>

      <CreateRecurringQuestModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        archetype={archetype}
      />
    </>
  );
}
