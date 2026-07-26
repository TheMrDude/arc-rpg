import crypto from 'crypto';
import { getSupabaseAdminClient } from './supabase-server';

/**
 * Rate limiting for endpoints with no login in front of them.
 *
 * /api/preview-quest is the only one: the landing-page demo, unauthenticated,
 * calling a paid Anthropic API. It is the single place a stranger can spend
 * money, so it is worth being precise about what the old implementation did and
 * did not do.
 *
 * The old version was `checkRateLimit(getClientIP(req), 3, 5 * 60 * 1000)` over a
 * module-scope Map. Two independent bypasses, either sufficient on its own:
 *
 *  1. IN-MEMORY COUNTER ON SERVERLESS. Each instance has its own Map, and Vercel
 *     spins up instances on demand -- under precisely the concurrent burst the
 *     limit exists to stop. N parallel requests get N cold instances, each
 *     allowing 3. Instances also recycle constantly, resetting the count.
 *
 *  2. CLIENT-CONTROLLED KEY. getClientIP read `x-forwarded-for` and took
 *     entry [0]. A client can send that header itself; the platform appends
 *     rather than replaces, so entry [0] is the value the CALLER chose. Rotating
 *     a fake value per request gives a fresh bucket every time -- unlimited, with
 *     no concurrency needed at all.
 *
 * Fixed here by keying on a header the platform sets (below) and counting in
 * Postgres, plus a global ceiling that does not depend on identifying the caller
 * at all -- because no per-IP limit can stop a distributed caller, and the thing
 * actually being protected is a bill.
 */

/**
 * The client IP, from headers the PLATFORM sets rather than ones the caller can.
 *
 * Order matters and is the whole fix:
 *  - x-vercel-forwarded-for is written by Vercel's edge and overwritten on every
 *    request, so a client cannot influence it.
 *  - x-real-ip is likewise set by the platform.
 *  - x-forwarded-for is used LAST, and the LAST entry rather than the first. The
 *    list reads client -> ...proxies -> us, so the final entry is the one added
 *    by the hop closest to us (trusted); the first is whatever the caller
 *    injected.
 *
 * Returns null when no trusted header is present. Callers must treat that as
 * "cannot identify" -- not as a shared 'unknown' bucket, which would let one
 * abuser exhaust every anonymous visitor's allowance at once.
 */
export function getTrustedClientIP(request) {
  const h = request.headers;

  const vercel = h.get('x-vercel-forwarded-for');
  if (vercel) {
    const first = vercel.split(',')[0].trim();
    if (first) return first;
  }

  const realIP = h.get('x-real-ip');
  if (realIP && realIP.trim()) return realIP.trim();

  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  return null;
}

/**
 * Bucket key for an IP: a salted SHA-256, never the address.
 *
 * The visitors being counted are parents evaluating a children's app. Enforcing
 * a counter does not require keeping a log of their addresses, and a table of
 * raw IPs is a liability with no upside. The salt makes the digest useless
 * outside this deployment; it falls back to a fixed string so a missing env var
 * degrades privacy rather than breaking the limit.
 */
export function ipBucketKey(ip) {
  const salt = process.env.RATE_LIMIT_SALT || 'habitquest-anon-rate-limit';
  return `ip:${crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)}`;
}

/** Per-IP and global ceilings for each unauthenticated endpoint. */
export const ANON_LIMITS = {
  'preview-quest': {
    // Roughly the old intent (3 per 5 min), but now actually enforced.
    perIp: { limit: 5, windowMinutes: 10 },
    // The backstop that matters. No per-IP rule can stop a distributed caller,
    // so this caps total spend regardless of who is asking. Sized for a landing
    // page with two real users and room to be linked somewhere busy -- raise it
    // deliberately, having looked at the Anthropic bill, not reflexively because
    // it tripped once.
    global: { limit: 500, windowMinutes: 60 },
  },
};

/**
 * Increment and test one bucket. Returns { allowed, current, limit, resetAt }.
 *
 * FAILS CLOSED. If the database is unreachable this denies the request, which is
 * the opposite of lib/rate-limiter.js's authenticated path (that one fails open,
 * correctly: locking out a paying signed-in user because of a transient database
 * error is worse than letting a metered request through). Here the caller is
 * anonymous and the downside is an unbounded bill, so the trade runs the other
 * way -- and "the rate limiter is down" must never be the cheapest way to get
 * unlimited AI calls.
 */
async function checkBucket(bucketKey, endpoint, limit, windowMinutes) {
  const supabaseAdmin = getSupabaseAdminClient();
  try {
    const { data, error } = await supabaseAdmin.rpc('check_anon_rate_limit', {
      p_bucket_key: bucketKey,
      p_endpoint: endpoint,
      p_limit: limit,
      p_window_minutes: windowMinutes,
    });
    if (error) {
      console.error('anon rate limit DB error, failing closed:', error.message);
      return { allowed: false, current: limit, limit, resetAt: null, failedClosed: true };
    }
    const row = data?.[0];
    if (!row) {
      console.error('anon rate limit returned no row, failing closed');
      return { allowed: false, current: limit, limit, resetAt: null, failedClosed: true };
    }
    return {
      allowed: row.allowed,
      current: row.current_count,
      limit: row.limit_value,
      resetAt: row.reset_at,
    };
  } catch (err) {
    console.error('anon rate limit exception, failing closed:', err.message);
    return { allowed: false, current: limit, limit, resetAt: null, failedClosed: true };
  }
}

/**
 * Check an unauthenticated request against both its per-IP and global ceilings.
 *
 * Global is checked FIRST and deliberately: it is one row that every request
 * touches, so a flood is rejected after a single cheap query rather than two.
 */
export async function checkAnonRateLimit(request, endpoint) {
  const config = ANON_LIMITS[endpoint];
  if (!config) throw new Error(`no anon rate limit configured for "${endpoint}"`);

  const global = await checkBucket(
    'global',
    endpoint,
    config.global.limit,
    config.global.windowMinutes
  );
  if (!global.allowed) {
    return { allowed: false, scope: 'global', ...global };
  }

  const ip = getTrustedClientIP(request);
  if (!ip) {
    // No trusted header. Rather than pooling these into one shared bucket -- where
    // a single abuser exhausts the allowance for everyone -- deny, and say so in
    // the log. In production behind Vercel this should never happen; if it starts
    // happening, the header names changed and that is worth knowing loudly.
    console.error(`anon rate limit: no trusted client IP header on ${endpoint}; denying`);
    return {
      allowed: false,
      scope: 'unidentified',
      current: 0,
      limit: config.perIp.limit,
      resetAt: null,
    };
  }

  const perIp = await checkBucket(
    ipBucketKey(ip),
    endpoint,
    config.perIp.limit,
    config.perIp.windowMinutes
  );
  return { allowed: perIp.allowed, scope: perIp.allowed ? 'ok' : 'ip', ...perIp };
}

/** Minutes until reset, for user-facing copy. Never negative, never NaN. */
export function minutesUntilReset(resetAt, fallback = 10) {
  if (!resetAt) return fallback;
  const ms = new Date(resetAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return fallback;
  return Math.max(1, Math.ceil(ms / 60000));
}
