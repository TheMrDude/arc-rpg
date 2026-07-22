import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// "Stop sharing this" — frictionless, no confirmation, no guilt. Sets
// consent_revoked_at on the caller's own row; the quote leaves the public view
// on its next (<=24h) fetch. Idempotent and strictly ownership-scoped.
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('testimonials')
      .update({ consent_revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)          // ownership enforced here
      .is('consent_revoked_at', null); // idempotent

    if (error) {
      console.error('[testimonials/revoke]', error.message);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[testimonials/revoke]', error?.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
