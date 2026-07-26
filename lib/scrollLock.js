/**
 * Body scroll lock, reference counted.
 *
 * Three components used to do this independently, all with the same shape:
 *
 *   document.body.style.overflow = 'hidden';
 *   return () => { document.body.style.overflow = ''; };
 *
 * Restoring to '' unconditionally is the bug. Two overlays open, the inner one
 * unmounts, and the page starts scrolling underneath the outer one -- which is
 * half of "scroll was broken and no close control was reachable". The other half
 * was a modal with no max-height, handled in the shell.
 *
 * So: a depth counter, and the FIRST locker captures whatever inline value was
 * already there so the LAST unlocker can put it back exactly. Nothing here reads
 * or writes anything else, so it cannot fight with a component that sets its own
 * styles for other reasons.
 */

let depth = 0;
let saved = null;

function isBrowser() {
  return typeof document !== 'undefined';
}

/** Capture-and-lock. Safe to call repeatedly; only the first call touches the DOM. */
export function lockScroll() {
  if (!isBrowser()) return;
  depth += 1;
  if (depth > 1) return;

  const body = document.body;
  saved = {
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
    touchAction: body.style.touchAction,
  };

  // Compensate for the scrollbar the lock removes, or the page visibly jumps
  // sideways the moment any overlay opens. Zero on touch devices, which is where
  // the target user is.
  const gap = window.innerWidth - document.documentElement.clientWidth;
  if (gap > 0) {
    const existing = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${existing + gap}px`;
  }

  body.style.overflow = 'hidden';
  // Silk and iOS Safari will still rubber-band the document behind a fixed
  // overlay with overflow:hidden alone.
  body.style.touchAction = 'none';
}

/** Release one lock. Only the last release restores, and it restores the captured value. */
export function unlockScroll() {
  if (!isBrowser()) return;
  if (depth === 0) return;
  depth -= 1;
  if (depth > 0) return;

  const body = document.body;
  if (saved) {
    body.style.overflow = saved.overflow;
    body.style.paddingRight = saved.paddingRight;
    body.style.touchAction = saved.touchAction;
    saved = null;
  } else {
    body.style.overflow = '';
    body.style.paddingRight = '';
    body.style.touchAction = '';
  }
}

/**
 * Escape hatch for the case the counter cannot see: a crash between lock and
 * unlock, or a bug that leaks a lock. Called by the shell's error path and worth
 * calling from an error boundary. Being trapped unable to scroll is worse than
 * any scroll position we might lose here.
 */
export function forceUnlockScroll() {
  if (!isBrowser()) return;
  depth = 0;
  saved = null;
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.body.style.touchAction = '';
}

/** Test-only view of the counter. */
export function scrollLockDepth() {
  return depth;
}

if (isBrowser()) {
  // A bfcache restore or a hard navigation can bring the page back with a stale
  // inline overflow. Cheap insurance against arriving unable to scroll.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && depth === 0) forceUnlockScroll();
  });
}
