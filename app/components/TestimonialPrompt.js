'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { MAX_QUOTE_LENGTH } from '@/lib/testimonials';

// The milestone reflection prompt. Appears at a moment of earned pride, once.
// Brand law: no guilt, no nagging. Skip is equally prominent and frictionless;
// consent is opt-in and unchecked by default. Whatever the user writes is saved
// to their journal server-side regardless of consent.
export default function TestimonialPrompt({ milestone, suggestion, onClose }) {
  const [quote, setQuote] = useState('');
  const [consent, setConsent] = useState(false); // UNCHECKED by default
  const [displayName, setDisplayName] = useState(suggestion?.display_name || '');
  const [saving, setSaving] = useState(false);

  const level = suggestion?.level ?? null;
  const archetype = suggestion?.archetype ?? null;
  const trimmed = quote.trim();
  const canSave = trimmed.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch('/api/testimonials/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            milestone,
            quote: trimmed,
            consent,
            display_name: displayName,
          }),
        });
      }
    } catch {
      // Silent — never let the reflection prompt break the celebration flow.
    } finally {
      setSaving(false);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-3 border-[#00D4FF] rounded-2xl p-7 max-w-md w-full shadow-[0_0_40px_rgba(0,212,255,0.25)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-4xl mb-3 text-center">&#x2728;</div>
          <h2 className="text-2xl font-black text-[#00D4FF] text-center mb-2">
            Quick reflection, hero?
          </h2>
          <p className="text-gray-300 text-center text-sm mb-5">
            One sentence: how does this milestone actually feel?{' '}
            <span className="text-gray-400">(This goes in your journal either way.)</span>
          </p>

          <div className="relative mb-4">
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value.slice(0, MAX_QUOTE_LENGTH))}
              maxLength={MAX_QUOTE_LENGTH}
              rows={3}
              autoFocus
              placeholder="It feels like&hellip;"
              className="w-full px-4 py-3 bg-[#0F172A] border-2 border-[#00D4FF]/40 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00D4FF] resize-none"
              style={{ fontSize: '16px' }}
            />
            <div className="absolute right-3 bottom-2 text-xs text-gray-500">
              {quote.length}/{MAX_QUOTE_LENGTH}
            </div>
          </div>

          {/* Opt-in consent — unchecked by default, plainly worded. */}
          <label className="flex items-start gap-3 mb-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#00D4FF] cursor-pointer"
            />
            <span className="text-sm text-gray-300 leading-snug">
              HabitQuest can share this quote publicly, with my first name, last
              initial, level, and archetype.
            </span>
          </label>

          {/* Name is editable, and only matters if they opted in. */}
          {consent && (
            <div className="mb-4 pl-8">
              <label className="block text-xs text-gray-400 mb-1">Shown publicly as</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
                maxLength={60}
                className="w-full px-3 py-2 bg-[#0F172A] border-2 border-[#00D4FF]/30 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D4FF]"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {displayName || 'A quester'}
                {level != null ? ` · LVL ${level}` : ''}
                {archetype ? ` · ${archetype}` : ''}
              </p>
            </div>
          )}

          {/* Save and Skip are equally prominent. */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-3 bg-[#16213E] border-2 border-gray-600 hover:border-gray-400 text-gray-200 rounded-xl font-bold uppercase tracking-wide transition-all disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`px-5 py-3 rounded-xl font-black uppercase tracking-wide transition-all ${
                canSave
                  ? 'bg-[#00D4FF] hover:bg-[#00b8dd] text-[#0F172A]'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
