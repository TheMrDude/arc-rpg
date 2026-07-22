import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public feed for the landing page. Reads ONLY the live_testimonials view, which
// exposes just approved + consented + non-revoked rows. Cached at the edge for up
// to 24h so a revoked quote drops out within the required window on next fetch.
export const dynamic = 'force-dynamic';

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MAX_QUOTES = 12;

export async function GET() {
  try {
    const { data, error } = await supabaseAnon
      .from('live_testimonials')
      .select('id, quote, display_name, level_at_time, archetype')
      .order('created_at', { ascending: false })
      .limit(MAX_QUOTES);

    if (error) {
      // Graceful empty state on any error — the landing page renders the honest
      // "we're early" framing rather than breaking.
      console.error('[testimonials/live]', error.message);
      return NextResponse.json(
        { quotes: [] },
        { headers: { 'Cache-Control': 'public, s-maxage=60' } }
      );
    }

    return NextResponse.json(
      { quotes: data || [] },
      {
        headers: {
          // Edge cache up to 24h; serve stale while revalidating.
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('[testimonials/live]', error?.message);
    return NextResponse.json({ quotes: [] });
  }
}
