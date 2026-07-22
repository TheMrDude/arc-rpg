// ============================================================================
// Funnel measurement — client helper
// ============================================================================
// track(eventName, properties?) — fire-and-forget, first-party funnel events.
//
// Hard rules (see the measurement-layer spec):
//   * Analytics must NEVER break UX — every call is wrapped and fails silently.
//   * No-ops entirely in development.
//   * Respects Do Not Track (no-ops when DNT is on).
//   * Anonymous, per-visit session id (uuid in sessionStorage) — NOT persistent.
//   * NEVER send raw user text or PII in properties. Keep properties tiny
//     (e.g. { input_length: 12 }).
//
// Kept intentionally tiny (well under ~2KB gzipped): no imports, no deps.
// ============================================================================

// v1 allowlist — mirrors the server-side allowlist in the migration + route.
// Client-side check just avoids pointless network calls; the server is
// authoritative.
export const FUNNEL_EVENTS = [
  'landing_view',
  'scroll_50',
  'scroll_90',
  'demo_transform_submitted',
  'demo_transform_result_viewed',
  'signup_started',
  'signup_completed',
  'first_habit_created',
  'first_quest_completed',
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

const SESSION_KEY = 'hq_funnel_session_id';

function doNotTrackEnabled(): boolean {
  try {
    const nav = navigator as unknown as {
      doNotTrack?: string;
      msDoNotTrack?: string;
    };
    const win = window as unknown as { doNotTrack?: string };
    const dnt = nav.doNotTrack || win.doNotTrack || nav.msDoNotTrack;
    return dnt === '1' || dnt === 'yes';
  } catch {
    return false;
  }
}

function getSessionId(): string | null {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : // Fallback uuid-ish; only used on ancient browsers.
            '00000000-0000-4000-8000-' +
            Math.floor(Math.random() * 1e12)
              .toString(16)
              .padStart(12, '0')
              .slice(0, 12);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (private mode / SSR) — send without a session.
    return null;
  }
}

/**
 * Record a funnel event. Fire-and-forget: never awaited, never throws.
 */
export function track(
  eventName: FunnelEvent,
  properties?: Record<string, string | number | boolean>
): void {
  try {
    // Server-side / non-browser: no-op.
    if (typeof window === 'undefined') return;

    // Dev: produce zero events.
    if (process.env.NODE_ENV === 'development') return;

    // Respect Do Not Track.
    if (doNotTrackEnabled()) return;

    // Client-side allowlist guard (server re-checks authoritatively).
    if (!(FUNNEL_EVENTS as readonly string[]).includes(eventName)) return;

    const body = JSON.stringify({
      event: eventName,
      session_id: getSessionId(),
      properties: properties || {},
    });

    // Prefer sendBeacon so events survive page unloads / navigations.
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/measure', blob)) return;
    }

    fetch('/api/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      // Same-origin cookies let the route attribute user_id post-auth.
      credentials: 'same-origin',
    }).catch(() => {
      /* silent — analytics must never break UX */
    });
  } catch {
    /* silent — analytics must never break UX */
  }
}
