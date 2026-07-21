import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/api-auth';
import { FUNNEL_EVENTS } from '@/lib/track';

// First-party funnel event ingest. The ONLY write path into funnel_events.
// - Enforces the event allowlist server-side (authoritative).
// - Derives user_id from the session server-side (never trusts the client).
// - Sanitizes properties so no PII / large payloads can be stored.
// - Never throws: analytics must never break UX, so it always 200s.
export const dynamic = 'force-dynamic';

const ALLOWED = new Set<string>(FUNNEL_EVENTS as readonly string[]);
const MAX_PROP_KEYS = 10;
const MAX_STRING_LEN = 64;

// Keep only small scalar properties. Drops objects/arrays and long strings so
// raw user text can never slip through.
function sanitizeProperties(input: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  let count = 0;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (count >= MAX_PROP_KEYS) break;
    if (typeof key !== 'string' || key.length > 40) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
      count++;
    } else if (typeof value === 'boolean') {
      out[key] = value;
      count++;
    } else if (typeof value === 'string' && value.length <= MAX_STRING_LEN) {
      out[key] = value;
      count++;
    }
    // Everything else (objects, arrays, long strings, null) is dropped.
  }
  return out;
}

// Accept only a v4-shaped uuid for the anonymous session id.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    let payload: unknown = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const { event, session_id, properties } = payload as {
      event?: unknown;
      session_id?: unknown;
      properties?: unknown;
    };

    // Allowlist (authoritative).
    if (typeof event !== 'string' || !ALLOWED.has(event)) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const sessionId =
      typeof session_id === 'string' && UUID_RE.test(session_id)
        ? session_id
        : null;

    // Attribute to a user only if authenticated — derived server-side, never
    // taken from the request body.
    let userId: string | null = null;
    try {
      const { user } = await authenticateRequest(request);
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    const supabase = getSupabaseAdminClient();
    await supabase.rpc('record_funnel_event', {
      p_event_name: event,
      p_session_id: sessionId,
      p_user_id: userId,
      p_properties: sanitizeProperties(properties),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // Swallow everything — a Supabase outage must not surface in the UI.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
