import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Matches the CHECK constraint on profiles.companion_name. Kept deliberately
// small: this is a children's app and the name is free text.
const COMPANION_NAME_MAX = 20;

/**
 * Strip angle brackets and control characters, collapse whitespace, cap length.
 *
 * React escapes on render and this value is never passed to
 * dangerouslySetInnerHTML, so this is defence in depth rather than the only
 * protection. It is still worth storing clean: the name is written once and
 * read on every dashboard load.
 */
function sanitizeCompanionName(raw) {
  return raw
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, COMPANION_NAME_MAX);
}

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    const supabaseAdmin = getSupabaseAdminClient();

    // Any call marks the prompt answered, whether the child typed a name or
    // skipped. That flag lives on the profile rather than in localStorage so a
    // second device does not ask again.
    //
    // null / empty clears the name and restores the species default. This is
    // what both "skip" and a later "use the default again" do.
    if (name === null || name === undefined || String(name).trim() === '') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ companion_name: null, companion_name_prompted: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error clearing companion name:', error);
        return NextResponse.json({ error: 'Failed to save name' }, { status: 500 });
      }
      return NextResponse.json({ success: true, companion_name: null });
    }

    if (typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const cleaned = sanitizeCompanionName(name);
    if (!cleaned) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ companion_name: cleaned, companion_name_prompted: true })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving companion name:', error);
      return NextResponse.json({ error: 'Failed to save name' }, { status: 500 });
    }

    return NextResponse.json({ success: true, companion_name: cleaned });
  } catch (error) {
    console.error('Companion name error:', error);
    return NextResponse.json({ error: 'Failed to save name' }, { status: 500 });
  }
}
