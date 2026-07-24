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
          className="kq-card border-2 border-stone rounded-candy p-7 max-w-md w-full shadow-candy-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-4xl mb-3 text-center">&#x2728;</div>
          <h2 className="kq-display text-2xl font-black text-hero-blue text-center mb-2">
            Quick reflection, hero?
          </h2>
          <p className="text-navy/70 text-center text-sm mb-5">
            One sentence: how does this milestone actually feel?{' '}
            <span className="text-navy/50">(This goes in your journal either way.)</span>
          </p>

          <div className="relative mb-4">
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value.slice(0, MAX_QUOTE_LENGTH))}
              maxLength={MAX_QUOTE_LENGTH}
              rows={3}
              autoFocus
              placeholder="It feels like&hellip;"
              className="kq-input w-full resize-none"
              style={{ fontSize: '16px' }}
            />
            <div className="absolute right-3 bottom-2 text-xs text-navy/40">
              {quote.length}/{MAX_QUOTE_LENGTH}
            </div>
          </div>

          {/* Opt-in consent — unchecked by default, plainly worded. */}
          <label className="flex items-start gap-3 mb-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-hero-blue cursor-pointer"
            />
            <span className="text-sm text-navy/70 leading-snug">
              HabitQuest can share this quote publicly, with my first name, last
              initial, level, and archetype.
            </span>
          </label>

          {/* Name is editable, and only matters if they opted in. */}
          {consent && (
            <div className="mb-4 pl-8">
              <label className="kq-label block mb-1">Shown publicly as</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
                maxLength={60}
                className="kq-input w-full text-sm"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-navy/50 mt-1">
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
              className="kq-btn kq-btn-ghost disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`kq-btn ${
                canSave
                  ? 'kq-btn-blue'
                  : 'bg-navy/10 text-navy/40 cursor-not-allowed'
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
