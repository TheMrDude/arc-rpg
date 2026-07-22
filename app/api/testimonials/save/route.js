import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TESTIMONIAL_MILESTONES, MAX_QUOTE_LENGTH } from '@/lib/testimonials';

export const dynamic = 'force-dynamic';

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Saves a milestone reflection. TWO things happen, in this order of importance:
//   1. The text is ALWAYS saved to the user's journal (quest_reflections), so
//      the prompt has genuine value even with zero consent.
//   2. A testimonials row is created, carrying the consent flag exactly as the
//      user set it. level_at_time + archetype are read server-side from the
//      profile (never trusted from the client). Status starts 'pending'.
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

    const body = await request.json();
    const milestone = body?.milestone;
    const consent = body?.consent === true;
    const rawQuote = typeof body?.quote === 'string' ? body.quote : '';
    const rawName = typeof body?.display_name === 'string' ? body.display_name : '';

    if (!TESTIMONIAL_MILESTONES.includes(milestone)) {
      return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 });
    }

    // Sanitize + bound the quote. Empty quote => nothing to save.
    const quote = rawQuote.replace(/[<>]/g, '').trim();
    if (quote.length === 0) {
      return NextResponse.json({ error: 'Empty quote' }, { status: 400 });
    }
    if (quote.length > MAX_QUOTE_LENGTH) {
      return NextResponse.json({ error: 'Quote too long' }, { status: 400 });
    }

    const displayName = rawName.replace(/[<>]/g, '').trim().slice(0, 60) || null;

    // 1) Journal save — always, regardless of consent. Best-effort: a failure
    //    here must not block the testimonial, and vice versa.
    let journalSaved = false;
    try {
      const { error: reflErr } = await supabaseAdmin
        .from('quest_reflections')
        .insert({
          user_id: user.id,
          quest_id: null,
          reflection_text: quote.slice(0, 500),
          mood: null,
        });
      journalSaved = !reflErr;
      if (reflErr) console.error('[testimonials/save] journal insert', reflErr.message);
    } catch (e) {
      console.error('[testimonials/save] journal exception', e?.message);
    }

    // Capture level + archetype from the profile at save time.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('level, archetype')
      .eq('id', user.id)
      .maybeSingle();

    // 2) Testimonial row — consent flag exactly as set; starts pending.
    const { error: tErr } = await supabaseAdmin
      .from('testimonials')
      .insert({
        user_id: user.id,
        milestone,
        quote,
        consented_public: consent,
        display_name: displayName,
        level_at_time: profile?.level ?? null,
        archetype: profile?.archetype ?? null,
        status: 'pending',
      });

    if (tErr) {
      console.error('[testimonials/save] testimonial insert', tErr.message);
      // Journal may still have succeeded — report partial success honestly.
      return NextResponse.json(
        { success: journalSaved, journalSaved, testimonialSaved: false },
        { status: journalSaved ? 200 : 500 }
      );
    }

    return NextResponse.json({ success: true, journalSaved, testimonialSaved: true });
  } catch (error) {
    console.error('[testimonials/save]', error?.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
