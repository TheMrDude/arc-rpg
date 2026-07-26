'use client';

import { useState, useEffect } from 'react';
import Overlay from './Overlay';
import { useOverlaySlot, OVERLAY_PRIORITY } from '@/lib/overlayQueue';

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

  // Priority-2 blocking: outranks rewards and narrative in the queue. It waits
  // its turn behind nothing lower and never stacks under confetti.
  const visible = useOverlaySlot('companion-naming', OVERLAY_PRIORITY.BLOCKING, show);

  useEffect(() => {
    if (visible) setName(speciesName || '');
  }, [visible, speciesName]);

  useEffect(() => {
    if (!visible) return undefined;
    if (!isHatch || reducedMotion) {
      setRevealed(true);
      return undefined;
    }
    setRevealed(false);
    const timer = setTimeout(() => setRevealed(true), 1100);
    return () => clearTimeout(timer);
  }, [visible, isHatch, reducedMotion]);

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

  // The shell owns the backdrop, the three close paths (Escape/✕/backdrop all
  // skip, the same as "I'll decide later" -- this is never a dead end), the
  // scroll lock and the z-index. It also restores the `.kidquest` scope on the
  // portal root, which is what the input's colour fix used to carry alone: the
  // field inherited `body { color:#FFFFFF }` outside that scope and a child typed
  // white on white. The inline colours below stay as belt-and-braces anyway.
  return (
    <Overlay
      open={visible}
      onClose={onSkip}
      tone="light"
      title={isHatch ? 'Your egg hatched!' : 'Change their name'}
      hideTitle
      closeLabel="I'll decide later"
    >
      <div
        className="text-center"
        role="group"
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
            placeholder="Type a name"
            disabled={!revealed}
            className="companion-name-input kq-input w-full text-center text-lg"
            style={{
              // Belt and braces on top of the shell's `.kidquest` root: stated
              // outright so this field cannot go invisible again if the class is
              // ever dropped, if a UA forces a dark palette on form controls
              // (Silk on Fire tablets does), or if color-mix is unsupported.
              // colorScheme pins the control to a light rendering so the browser
              // does not invert the background out from under the text.
              fontSize: '16px',
              color: '#2b2b3a',
              backgroundColor: '#ffffff',
              caretColor: '#2b2b3a',
              colorScheme: 'light',
              WebkitTextFillColor: '#2b2b3a',
              opacity: 1,
            }}
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
          /* Stated as a solid colour, not color-mix: globals.css derives the
             placeholder with color-mix(), which older Silk builds drop, and a
             dropped declaration falls back to the inherited white. */
          /* -webkit-text-fill-color has to be restated here: the inline style
             sets it on the input to stop a UA dark palette bleaching the value,
             and in Blink that wins over the placeholder color, which rendered
             the placeholder at full text darkness -- indistinguishable from a
             name already typed in. */
          /* Two classes, deliberately: globals.css has
             .kidquest .kq-input::placeholder at specificity (0,2,1), and a
             single-class rule here loses to it. That rule computes the colour
             with color-mix at 40% alpha, which measures 2.31:1 against white --
             below the 3:1 floor for placeholder text. Matching its specificity
             and adding the styled-jsx class puts this one ahead. */
          .companion-name-input.kq-input::placeholder {
            color: #6b6b7a;
            -webkit-text-fill-color: #6b6b7a;
            opacity: 1;
          }
          .companion-name-input:disabled {
            color: #2b2b3a;
            -webkit-text-fill-color: #2b2b3a;
            opacity: 1;
          }
          @keyframes companionHatchPop {
            0% { transform: scale(0.3) rotate(-12deg); opacity: 0; }
            55% { transform: scale(1.18) rotate(4deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
        `}</style>
      </div>
    </Overlay>
  );
}
