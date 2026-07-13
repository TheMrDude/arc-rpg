import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';
import {
  CROSSROADS_REWARDS,
  crossroadsMilestone,
  pickScenario,
  tierForRoll,
} from '@/lib/crossroads';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/crossroads — resolve a crossroads choice with a server-rolled
 * d20. The server is the only dice authority: it validates eligibility,
 * rolls, pays gold, marks the milestone claimed, and writes the outcome
 * into story_progress so the choice genuinely alters the storyline.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { choice_id } = await request.json();
    if (!choice_id || typeof choice_id !== 'string') {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('quests_completed, story_progress, gold')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Eligibility: a milestone every 5 completed quests, each claimable once
    const milestone = crossroadsMilestone(profile.quests_completed);
    const storyProgress = profile.story_progress || {};
    const claimed = storyProgress.crossroads_claimed || 0;

    if (milestone < 5 || claimed >= milestone) {
      return NextResponse.json(
        { error: 'No crossroads waiting', message: 'The road runs straight for now. Keep questing.' },
        { status: 400 }
      );
    }

    // Prefer the AI-generated scenario locked in by /generate for this
    // milestone; fall back to the deterministic hand-authored pool. The
    // resolver is the dice authority either way — it only reads the
    // scenario, never trusts the client for outcome text.
    const pending = storyProgress.pending_crossroads;
    const scenario =
      pending && pending.milestone === milestone && pending.scenario
        ? pending.scenario
        : pickScenario(user.id, milestone);
    const choice = scenario.choices.find((c) => c.id === choice_id);
    if (!choice) {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }

    // THE ROLL. Server-side, one per milestone, no rerolls.
    const roll = Math.floor(Math.random() * 20) + 1;
    const tier = tierForRoll(roll, choice.style);
    const outcomeLine = choice.outcomes[tier];
    const gold = CROSSROADS_REWARDS[tier] || 0;

    // Claim the milestone atomically-ish: write claim before paying so a
    // double-submit cannot double-pay (second request fails eligibility).
    const newStoryProgress = {
      ...storyProgress,
      crossroads_claimed: milestone,
      pending_crossroads: null, // consumed — clear the locked scenario
      recent_events: [
        `🎲 [d20: ${roll}] ${scenario.title}: ${outcomeLine}`,
        ...(storyProgress.recent_events || []),
      ].slice(0, 10),
    };

    const { error: claimError } = await supabaseAdmin
      .from('profiles')
      .update({ story_progress: newStoryProgress })
      .eq('id', user.id);

    if (claimError) {
      console.error('Crossroads claim failed:', claimError);
      return NextResponse.json({ error: 'Failed to resolve crossroads' }, { status: 500 });
    }

    // Pay out (best-effort; the story outcome stands regardless)
    let newGoldBalance = (profile.gold || 0) + gold;
    try {
      const { data: goldTx, error: goldError } = await supabaseAdmin
        .rpc('process_gold_transaction', {
          p_user_id: user.id,
          p_amount: gold,
          p_transaction_type: 'crossroads_reward',
          p_reference_id: null,
          p_metadata: {
            scenario_id: scenario.id,
            choice_id: choice.id,
            roll,
            tier,
            milestone,
          },
        });
      if (goldError) {
        console.error('Crossroads gold failed:', goldError);
      } else {
        newGoldBalance = goldTx?.[0]?.new_balance ?? newGoldBalance;
      }
    } catch (goldErr) {
      console.error('Crossroads gold threw:', goldErr);
    }

    return NextResponse.json({
      success: true,
      roll,
      tier,
      outcome: outcomeLine,
      gold,
      new_gold_balance: newGoldBalance,
      scenario_id: scenario.id,
      choice_id: choice.id,
      milestone,
    });
  } catch (error) {
    console.error('Crossroads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
