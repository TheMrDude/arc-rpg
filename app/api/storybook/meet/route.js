import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { VALID_MEET_SLUGS, ROSTER_SIZE, normalizeMet } from '@/lib/storybook';

export const dynamic = 'force-dynamic';

/**
 * Record that the player met a Storybook character.
 *
 * The slug must be one of the fixed roster (VALID_MEET_SLUGS) -- nothing
 * user-authored is ever stored. Appends are idempotent: recording a
 * character twice is a success no-op, because the overlay's four close
 * paths may race a slow network. The array is capped at the roster size,
 * so the column cannot grow without bound.
 *
 * Deliberately does NOT validate that the meet was "earned" against
 * quests_completed: this is cosmetic collection data with no economy, and
 * the earn-check lives client-side where the overlay is queued. Worst case
 * a tinkerer meets a friendly cartoon early.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await request.json();
    if (typeof slug !== 'string' || !VALID_MEET_SLUGS.has(slug)) {
      return NextResponse.json({ error: 'Unknown character' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { data: profile, error: readError } = await supabaseAdmin
      .from('profiles')
      .select('met_characters')
      .eq('id', user.id)
      .single();

    if (readError) {
      console.error('Storybook meet: profile read failed:', readError);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    const met = normalizeMet(profile?.met_characters);
    if (met.includes(slug)) {
      return NextResponse.json({ success: true, met_characters: met });
    }
    if (met.length >= ROSTER_SIZE) {
      return NextResponse.json({ success: true, met_characters: met });
    }

    const updated = [...met, slug];
    const { error: writeError } = await supabaseAdmin
      .from('profiles')
      .update({ met_characters: updated })
      .eq('id', user.id);

    if (writeError) {
      console.error('Storybook meet: profile write failed:', writeError);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true, met_characters: updated });
  } catch (error) {
    console.error('Storybook meet error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
