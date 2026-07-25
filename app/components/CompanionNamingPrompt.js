'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const MAX = 20;

/**
 * The companion's arrival moment: the one point where a creature first shows up
 * and the child gets to name it. Deliberately not in settings -- that moment is
 * the entire reason the feature exists.
 *
 * Built for a four-year-old: one field, one big button. The field is prefilled
 * with the species name, so a child who cannot type yet can simply tap the
 * button and keep the default. Skipping does the same thing.
 *
 * The name is rendered as text by React everywhere, never through
 * dangerouslySetInnerHTML, and the server sanitises and caps it as well.
 */
export default function CompanionNamingPrompt({
  show,
  emoji,
  speciesName,
  onSave,
  onSkip,
}) {
  const [name, setName] = useState(speciesName || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) setName(speciesName || '');
  }, [show, speciesName]);

  // Escape closes it the same way Skip does, so this can never be a dead end.
  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') onSkip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show, onSkip]);

  if (!show) return null;
  if (typeof document === 'undefined') return null;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(name.trim());
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy/70 backdrop-blur-sm"
        style={{ touchAction: 'manipulation' }}
        onClick={onSkip}
        aria-hidden="true"
      />
      <div
        className="kq-card relative border-2 border-emerald p-6 max-w-sm w-full text-center shadow-candy-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-naming-title"
      >
        <div className="text-6xl mb-3" aria-hidden="true">{emoji}</div>

        <h2 id="companion-naming-title" className="kq-display text-2xl text-navy mb-2">
          A friend found you!
        </h2>
        <p className="text-navy/60 font-semibold mb-5">What will you call them?</p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, MAX))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          maxLength={MAX}
          aria-label="Your companion's name"
          autoFocus
          className="kq-input w-full text-center text-lg mb-4"
          style={{ fontSize: '16px' }}
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ minHeight: 44, touchAction: 'manipulation' }}
          className="kq-btn kq-btn-emerald w-full text-lg mb-2 disabled:opacity-50"
        >
          {saving ? 'Saving…' : "That's their name!"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          style={{ minHeight: 44, touchAction: 'manipulation' }}
          className="w-full text-navy/50 hover:text-navy text-sm font-bold"
        >
          Maybe later
        </button>
      </div>
    </div>,
    document.body
  );
}
