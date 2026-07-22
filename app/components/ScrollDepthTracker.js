'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

// Fires scroll_50 / scroll_90 exactly once per visit (session) as the visitor
// scrolls past 50% / 90% of page depth. Purely observational — renders nothing,
// never affects layout or UX. Per-session de-dupe is backed by sessionStorage
// so each depth fires at most once per visit even across remounts.
//
// Uses a passive scroll listener (rAF-throttled) computing real page depth,
// which is reliable across this page's long, dynamic layout. Depth events only
// fire in response to an actual scroll, so a short/non-scrollable page produces
// none (accurate — the visitor never scrolled).
const DEPTHS = [
  { key: 'scroll_50', pct: 50, flag: 'hq_scroll_50' },
  { key: 'scroll_90', pct: 90, flag: 'hq_scroll_90' },
];

export default function ScrollDepthTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fired = (flag) => {
      try {
        return sessionStorage.getItem(flag) === '1';
      } catch {
        return false;
      }
    };
    const markFired = (flag) => {
      try {
        sessionStorage.setItem(flag, '1');
      } catch {
        /* ignore */
      }
    };

    // Nothing left to watch if both already fired this session.
    let pending = DEPTHS.filter((d) => !fired(d.flag));
    if (pending.length === 0) return;

    let ticking = false;

    const evaluate = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return; // page fits on screen; no depth to report
      const depth = ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;

      pending = pending.filter((d) => {
        if (depth >= d.pct && !fired(d.flag)) {
          markFired(d.flag);
          track(d.key);
          return false; // done with this depth
        }
        return true;
      });

      if (pending.length === 0) {
        window.removeEventListener('scroll', onScroll);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
