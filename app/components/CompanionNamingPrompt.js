'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const MAX = 20;

/**
 * The hatch: the egg on the dashboard has been counting down for three quests,
 * and this is what it was counting down to. The creature is revealed first and
 * the naming field arrives a beat later, because naming something you have not
 * met yet is hollow -- that beat is the entire reason this prompt is here and
 * not on the signup flow.
 *
 * Also serves as the rename dialog from the companion card, in which case the
 * hatch framing is dropped and the field is there immediately.
 *
 * Built to be answerable by a child who cannot type: the field is prefilled with
 * the species name, so tapping the button keeps it. Skipping does the same.
 *
 * The name is rendered as text by React everywhere, never through
 * dangerouslySetInnerHTML, and the server sanitises and caps it as well.
 */
export default function CompanionNamingPrompt({
  show,
  emoji,
  speciesName,
  species,
  lore,
  mode = 'hatch',
  reducedMotion = false,
  onSave,
  onSkip,
}) {
  const isHatch = mode === 'hatch';
  const [name, setName] = useState(speciesName || '');
  const [saving, setSaving] = useState(false);
  // The reveal beat. Renaming skips it, and so does reduced motion -- someone
  // who has asked for less movement should not be made to wait for a flourish.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (show) setName(speciesName || '');
  }, [show, speciesName]);

  useEffect(() => {
    if (!show) return;
    if (!isHatch || reducedMotion) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const timer = setTimeout(() => setRevealed(true), 1100);
    return () => clearTimeout(timer);
  }, [show, isHatch, reducedMotion]);

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

  // No character counter until it actually matters. A counter sitting under the
  // field the whole time reads as a rule to obey; one that appears at 20 reads
  // as an explanation for why typing stopped.
  const atCap = name.length >= MAX;

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
        {/* What hatched, before anything is asked of her. */}
        <div
          className="text-7xl mb-2 select-none"
          style={reducedMotion ? undefined : { animation: 'companionHatchPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          aria-hidden="true"
        >
          {emoji}
        </div>

        <h2 id="companion-naming-title" className="kq-display text-2xl text-navy mb-2">
          {isHatch ? 'Your egg hatched!' : 'Change their name'}
        </h2>

        {/* The badge is the species -- the thing this baby grows into. It is real
            data and it earns its place by telling her something the name does
            not. Companions have no rarity tier in this game (rarity exists on
            equipment and encounters, not creatures) and every archetype's
            companion is equally available, so nothing here claims one.
            Suppressed when it would just repeat the name below it. */}
        {species && species !== speciesName && (
          <span className="kq-chip inline-block text-[11px] font-bold tracking-wide text-emerald bg-emerald/10 border border-emerald/40 mb-2">
            {species}
          </span>
        )}

        <p className="text-lg font-bold text-navy">{speciesName}</p>
        {lore && <p className="text-sm text-navy/60 italic mt-1 mb-5">{lore}</p>}

        <div
          className={revealed ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          style={reducedMotion ? undefined : { transition: 'opacity 400ms ease' }}
          aria-hidden={!revealed}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            maxLength={MAX}
            aria-label="Your companion's name"
            disabled={!revealed}
            className="kq-input w-full text-center text-lg"
            style={{ fontSize: '16px' }}
          />
          <p className="text-xs text-navy/40 mt-1 mb-3 h-4" aria-live="polite">
            {atCap ? `${MAX} letters is the most a name can be` : ''}
          </p>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !revealed}
            style={{ minHeight: 44, touchAction: 'manipulation' }}
            className="kq-btn kq-btn-emerald w-full text-lg mb-2 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Name them'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={!revealed}
            style={{ minHeight: 44, touchAction: 'manipulation' }}
            className="w-full text-navy/50 hover:text-navy text-sm font-bold"
          >
            I&apos;ll decide later
          </button>
        </div>

        <style jsx>{`
          @keyframes companionHatchPop {
            0% { transform: scale(0.3) rotate(-12deg); opacity: 0; }
            55% { transform: scale(1.18) rotate(4deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}
