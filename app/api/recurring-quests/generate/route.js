import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// The single source of truth for how often a rule fires. Previously this
// predicate existed in three places -- a Postgres function that was never
// written, a fallback branch in this file, and lib/recurring.js (which nothing
// imported). Two of the three disagreed about day boundaries. There is now one.
//
// 'custom' is intentionally absent: recurrence is being narrowed to
// once/daily/weekly, and 'once' never becomes a recurring_quests row at all.
const PERIOD_DAYS = {
  daily: 1,
  weekly: 7,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight UTC for a given instant. last_generated_at is a DATE column written
 *  as a UTC calendar day, and the cron fires at 00:00 UTC, so every comparison
 *  is done in UTC. Mixing in local time is what made the old fallback drift. */
function utcMidnight(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// Not exported: Next.js route modules may only export route handlers and a
// fixed set of config fields, so this stays module-private.
/** Whether a rule is due to generate an instance today. */
function isRuleDue(rule, now = new Date()) {
  if (!rule?.is_active) return false;

  const periodDays = PERIOD_DAYS[rule.recurrence_type];
  if (!periodDays) return false; // unknown/retired recurrence type: never fires

  // Never generated: due immediately. This is also how "resume" works -- the
  // update route clears last_generated_at when a paused rule is reactivated.
  if (!rule.last_generated_at) return true;

  // The DATE column arrives as 'YYYY-MM-DD'. Pin it to UTC explicitly rather
  // than letting the runtime guess a timezone.
  const last = Date.parse(`${rule.last_generated_at}T00:00:00Z`);
  if (Number.isNaN(last)) return false;

  return (utcMidnight(now) - last) / MS_PER_DAY >= periodDays;
}

export async function POST(request) {
  try {
    // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when the env var
    // is set on the project. Fail closed if it is missing or doesn't match.
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: activeRules, error: fetchError } = await supabaseAdmin
      .from('recurring_quests')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching recurring quests:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch recurring quests' }, { status: 500 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dueRules = (activeRules || []).filter((rule) => isRuleDue(rule, now));

    let generated = 0;
    let superseded = 0;
    const errors = [];

    for (const rule of dueRules) {
      try {
        // Insert BEFORE superseding, then supersede everything except the row
        // just created. The other order is not safe: if the insert failed after
        // the supersede, the user would be left with no active instance at all.
        // This way a failed insert supersedes nothing, and a failed supersede
        // leaves a duplicate that the next run cleans up. Both degrade to
        // "harmless", which the old unconditional insert never did.
        const { data: fresh, error: insertError } = await supabaseAdmin
          .from('quests')
          .insert({
            user_id: rule.user_id,
            original_text: rule.original_text,
            transformed_text: rule.transformed_text,
            difficulty: rule.difficulty,
            xp_value: rule.xp_value,
            completed: false,
            status: 'active',
            recurring_quest_id: rule.id,
          })
          .select('id')
          .single();

        if (insertError || !fresh) {
          errors.push({ rule_id: rule.id, stage: 'insert', error: insertError?.message });
          continue;
        }

        // Rule (A): the previous instance is replaced, not stacked on top of.
        // Archived, never hard-deleted, and `completed` rows are excluded so
        // real history and its paid-out XP/gold are untouched.
        //
        // Scoped by provenance only. Legacy instances predating the
        // recurring_quest_id column carry NULL and are deliberately left alone:
        // matching them by text instead would sweep in quests the user typed by
        // hand. Those legacy rows were already archived in the Phase 0 backfill.
        const { data: replaced, error: supersedeError } = await supabaseAdmin
          .from('quests')
          .update({ status: 'superseded' })
          .eq('recurring_quest_id', rule.id)
          .eq('completed', false)
          .eq('status', 'active')
          .neq('id', fresh.id)
          .select('id');

        if (supersedeError) {
          // Non-fatal: the fresh instance exists and the stale one is still
          // active. Next run supersedes both stale rows. Logged, not thrown.
          errors.push({ rule_id: rule.id, stage: 'supersede', error: supersedeError.message });
        } else {
          superseded += replaced?.length || 0;
        }

        await supabaseAdmin
          .from('recurring_quests')
          .update({ last_generated_at: today })
          .eq('id', rule.id);

        generated++;
      } catch (err) {
        errors.push({ rule_id: rule.id, stage: 'unexpected', error: err.message });
      }
    }

    console.log('Recurring quest generation complete:', {
      active_rules: (activeRules || []).length,
      total_due: dueRules.length,
      generated,
      superseded,
      errors: errors.length,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      generated,
      superseded,
      total_due: dueRules.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Recurring quest generation error:', error);
    return NextResponse.json({ error: 'Failed to generate recurring quests' }, { status: 500 });
  }
}

// Also support GET for Vercel Cron (Vercel crons use GET by default)
export async function GET(request) {
  return POST(request);
}
