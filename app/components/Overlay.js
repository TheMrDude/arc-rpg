'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';

// NOTE: forceUnlockScroll is deliberately NOT wired into this component. It was,
// as an effect with [open] deps -- which meant its cleanup ran on every
// open -> close transition with the stale `open === true`, force-resetting the
// counter to zero and unlocking the page while an OUTER overlay was still up.
// The reference counter already handles normal unmount correctly. forceUnlock is
// for an error boundary to call, and nothing else.

/**
 * The one shell every blocking overlay renders inside.
 *
 * It exists because five bugs in two days had three root causes between them,
 * and all three are structural rather than per-component:
 *
 * 1. COLOUR. Every kq-* rule in globals.css is scoped under `.kidquest`, which
 *    lives on a div inside each page. A modal that portals to document.body
 *    leaves that scope, so kq-card's BACKGROUND dies -- while Tailwind's text
 *    utilities, being global, survive. You get text with no background, and
 *    which way it fails depends on which colour survived:
 *      - CompanionNamingPrompt: background gone, input inherited
 *        body { color: #FFFFFF } -> white on white.
 *      - DiceRoll: background gone, text-navy/60 now sits on bg-black/85
 *        -> about 1.2:1, "barely visible".
 *    So the shell puts `kidquest` on its own root AND states colour and
 *    background outright. There is no way to express "text with no background".
 *
 * 2. ESCAPE ROUTES. 3 of 36 overlays handled Escape. MilestoneCelebration gated
 *    both its button and its backdrop behind a `canClose` timer, so for the first
 *    seconds there was genuinely no way out, and its card was `overflow-hidden`
 *    with no max-height so on a 600x960 tablet the button was below the fold and
 *    unreachable. The shell gives three independent paths, any one sufficient,
 *    and no caller can gate them.
 *
 * 3. Z-INDEX. 36 components each picked their own, across seven levels, one of
 *    them inline so it did not even grep. The shell owns one. Callers own none.
 *
 * Usage:
 *   <Overlay open={visible} onClose={close} title="Your egg hatched!">
 *     ...content...
 *   </Overlay>
 */

// The single band. Nothing else in the app may set a z-index above 8999.
const Z_BACKDROP = 9000;
const Z_SURFACE = 9001;
/** Toasts and particle effects: non-blocking, allowed to coexist with a modal. */
export const Z_TOAST = 9100;

const TONES = {
  // Both pairs are pre-measured against each other. Cream/navy is 11.9:1,
  // navy/cream is the same pair inverted. A caller picks a tone, never a colour.
  light: { surface: '#FFF9F1', text: '#2b2b3a', muted: '#55556a', border: '#ECE7DD' },
  dark: { surface: '#243B5A', text: '#FFF9F1', muted: '#D8DEE8', border: '#3A5478' },
};

export default function Overlay({
  open,
  onClose,
  title,
  /** Visually hide the title but keep it for screen readers. */
  hideTitle = false,
  /**
   * Id of a heading the CALLER already renders visibly. When set, the dialog
   * takes its accessible name from that element and the shell renders no title
   * of its own -- so an overlay that shows its own "Your egg hatched!" heading
   * does not also carry a hidden duplicate (two matches for the same text, read
   * twice by a screen reader). The dialog's name then matches what is on screen,
   * which is the accessible-name-from-content best case.
   */
  labelledBy = null,
  tone = 'light',
  /** Label on the close button, for when "Close" is not the right word. */
  closeLabel = 'Close',
  /** Set false ONLY for a non-dismissable step; it still keeps every close path. */
  dismissOnBackdrop = true,
  reducedMotion = false,
  className = '',
  children,
}) {
  const surfaceRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const titleId = useId();
  const palette = TONES[tone] || TONES.light;

  const close = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  // ── Scroll lock ───────────────────────────────────────────────────────────
  // Reference counted in lib/scrollLock, so nesting is safe and the last
  // unlocker restores the value that was there before the first locker.
  useEffect(() => {
    if (!open) return undefined;
    lockScroll();
    return () => unlockScroll();
  }, [open]);

  // ── Escape: close path 1 of 3 ─────────────────────────────────────────────
  // On window, capture phase, so a child that stops propagation cannot swallow
  // the user's way out.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, close]);

  // ── Focus: move in on open, restore on close ──────────────────────────────
  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current =
      typeof document !== 'undefined' ? document.activeElement : null;

    // The close button, deliberately: the first thing reachable is the way out.
    const target =
      surfaceRef.current?.querySelector('[data-overlay-close]') || surfaceRef.current;
    target?.focus?.({ preventScroll: true });

    return () => {
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) {
        el.focus({ preventScroll: true });
      }
    };
  }, [open]);

  // ── Focus trap ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const root = surfaceRef.current;
      if (!root) return;
      const focusables = [
        ...root.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    // `kidquest` restores the design system inside the portal. The explicit
    // colours below mean it is not load-bearing -- if this class is ever dropped
    // the overlay still renders readable text on a real background.
    <div
      className="kidquest"
      data-overlay-root=""
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_BACKDROP,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Backdrop: close path 2 of 3. pointer-down rather than click so a drag
          that starts on the backdrop and ends on the card does not close it. */}
      <div
        data-overlay-backdrop=""
        aria-hidden="true"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget && dismissOnBackdrop) close();
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(36, 59, 90, 0.72)',
          backdropFilter: 'blur(2px)',
          touchAction: 'manipulation',
        }}
      />

      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        data-overlay-surface=""
        tabIndex={-1}
        className={className}
        style={{
          position: 'relative',
          zIndex: Z_SURFACE,
          width: '100%',
          maxWidth: '28rem',
          // svh, not vh: on Silk the toolbar retracts and vh overshoots, which is
          // how a close button ends up just off the bottom of a Fire tablet.
          maxHeight: 'min(88svh, 88vh)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          border: `2px solid ${palette.border}`,
          // Stated, not inherited. This is fault 1 above, fixed once.
          background: palette.surface,
          color: palette.text,
          colorScheme: 'light',
          boxShadow: '0 18px 50px rgba(36,59,90,0.35)',
          overflow: 'hidden',
          animation: reducedMotion ? undefined : 'hqOverlayIn 220ms ease-out',
        }}
      >
        {/* Header is sticky and OUTSIDE the scrolling body, so the close button
            cannot scroll out of reach no matter how tall the content is. That is
            the MilestoneCelebration trap, structurally prevented. */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem 1rem 0.5rem',
            background: palette.surface,
          }}
        >
          {/* When the caller names the dialog with its own visible heading
              (labelledBy), the shell renders no title -- just a spacer so the
              close button stays right-aligned -- and adds no hidden duplicate. */}
          {labelledBy ? (
            <div style={{ flex: 1 }} aria-hidden="true" />
          ) : (
            <h2
              id={titleId}
              className="kq-display"
              style={{
                flex: 1,
                minWidth: 0,
                margin: 0,
                fontSize: '1.25rem',
                lineHeight: 1.2,
                color: palette.text,
                ...(hideTitle
                  ? {
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      overflow: 'hidden',
                      clip: 'rect(0 0 0 0)',
                      whiteSpace: 'nowrap',
                    }
                  : null),
              }}
            >
              {title}
            </h2>
          )}

          {/* Close path 3 of 3: a real button, 44px, always visible. */}
          <button
            type="button"
            data-overlay-close=""
            onClick={close}
            aria-label={closeLabel}
            style={{
              flex: '0 0 auto',
              boxSizing: 'border-box',
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              border: `2px solid ${palette.border}`,
              background: palette.surface,
              color: palette.text,
              fontSize: 20,
              lineHeight: 1,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* The only scrolling region. overscroll-behavior stops a flick here from
            chaining to the document behind. */}
        <div
          data-overlay-body=""
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '0 1rem 1rem',
            color: palette.text,
          }}
        >
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes hqOverlayIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-overlay-surface] { animation: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}

/** Exposed so the muted colour is a token rather than each caller guessing. */
export function overlayTone(tone = 'light') {
  return TONES[tone] || TONES.light;
}
