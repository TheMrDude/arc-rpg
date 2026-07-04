import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ALLOWED_ORIGINS = new Set([
  'https://lawn-legend.vercel.app',
  'http://localhost:8765',
  'http://localhost:3000',
]);

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://lawn-legend.vercel.app';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  };
}

function clean(s: unknown, max = 100): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>"'`\\\x00-\x1f\x7f]/g, '').trim().slice(0, max);
}

function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

// Very simple in-memory rate limiter (per function instance)
const BUCKET = new Map<string, number[]>();
function rateLimited(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) { BUCKET.set(ip, arr); return true; }
  arr.push(now); BUCKET.set(ip, arr);
  // Opportunistic cleanup
  if (BUCKET.size > 1000) for (const [k, v] of BUCKET) if (v.every(t => now - t > windowMs)) BUCKET.delete(k);
  return false;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(origin) };

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }); }

  const email = clean(body?.email, 254).toLowerCase();
  if (!validEmail(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400, headers });
  }
  const playerName = clean(body?.playerName, 50) || 'Anonymous';
  const dayReached = Math.max(0, Math.min(9999, Number(body?.dayReached) | 0));
  const valuation = Math.max(0, Math.min(9_999_999_999, Number(body?.valuation) | 0));
  const source = clean(body?.source, 50) || 'unknown';
  const userAgent = clean(req.headers.get('user-agent') || '', 500);
  const referrer = clean(req.headers.get('referer') || '', 500);

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers });
  }
  const supabase = createClient(url, key);

  const { error } = await supabase.from('lawn_legend_email_subscribers').upsert({
    email,
    player_name: playerName,
    day_reached: dayReached,
    valuation,
    trigger_source: source,
    user_agent: userAgent,
    referrer: referrer,
    signup_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email' });

  if (error) {
    console.error('db error:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers });
  }

  // Optional: forward to Make.com / Substack webhook if configured
  const makeUrl = Deno.env.get('LAWN_LEGEND_MAKE_WEBHOOK');
  if (makeUrl) {
    fetch(makeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, playerName, source, dayReached, valuation, ts: new Date().toISOString() }),
    }).catch(e => console.error('webhook err:', e));
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
});
