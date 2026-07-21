import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  TESTIMONIAL_MILESTONES,
  PROMPT_COOLDOWN_DAYS,
  suggestDisplayName,
} from '@/lib/testimonials';

export const dynamic = 'force-dynamic';

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Decides whether to show the milestone testimonial prompt.
// Enforces: capture feature flag on, milestone valid, NEVER twice per milestone,
// and at most one prompt per PROMPT_COOLDOWN_DAYS globally per user. On a "show"
// decision it records the prompt immediately, so closing the tab still counts as
// shown (no re-nag). Fails closed (show:false) on any error — brand law is no
// nagging, so silence is the safe default.
export async function POST(request) {
  try {
    // Capture prompt is feature-flagged.
    if (process.env.NEXT_PUBLIC_TESTIMONIALS_ENABLED !== 'true') {
      return NextResponse.json({ show: false });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ show: false });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ show: false });
    }

    const { milestone } = await request.json();
    if (!TESTIMONIAL_MILESTONES.includes(milestone)) {
      return NextResponse.json({ show: false });
    }

    // Already prompted for THIS milestone? Never again.
    const { data: existingForMilestone } = await supabaseAdmin
      .from('testimonial_prompt_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('milestone', milestone)
      .maybeSingle();
    if (existingForMilestone) {
      return NextResponse.json({ show: false });
    }

    // Any prompt within the cooldown window? Respect the global rate limit.
    const cutoff = new Date(
      Date.now() - PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: recentPrompts } = await supabaseAdmin
      .from('testimonial_prompt_log')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', cutoff)
      .limit(1);
    if (recentPrompts && recentPrompts.length > 0) {
      return NextResponse.json({ show: false });
    }

    // Record the prompt now (idempotent on the unique (user_id, milestone)).
    const { error: insertError } = await supabaseAdmin
      .from('testimonial_prompt_log')
      .insert({ user_id: user.id, milestone });
    if (insertError) {
      // Unique violation => a concurrent request already claimed it; don't show.
      return NextResponse.json({ show: false });
    }

    // Build the editable display-name suggestion from the profile.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('character_name, level, archetype')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      show: true,
      suggestion: {
        display_name: suggestDisplayName(profile?.character_name, user.email),
        level: profile?.level ?? null,
        archetype: profile?.archetype ?? null,
      },
    });
  } catch (error) {
    console.error('[testimonials/prompt-check]', error?.message);
    return NextResponse.json({ show: false });
  }
}
