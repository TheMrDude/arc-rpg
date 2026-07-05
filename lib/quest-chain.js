import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Welcome Quest chain advancement.
 *
 * Every step condition is evaluated from persisted data (quests,
 * quest_reflections, onboarding_events), never from client claims, so
 * calling this repeatedly is safe and a user whose history already
 * satisfies several steps advances through all of them in one call.
 * Concurrency safety comes from the conditional current_step update:
 * of two racing requests, only one advances any given step.
 *
 * SERVER ONLY — uses the service role key. Never import from client code.
 */

const CHAIN_ID = 'welcome_quest';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// step_number → condition over the user's history.
// "Active days" are distinct UTC dates with a quest completion (same
// convention as the momentum meter) — deliberately not consecutive days.
const STEP_CONDITIONS = {
  1: (f) => f.completedCount >= 1,
  2: (f) => f.maxCompletionsInOneDay >= 2,
  3: (f) => f.activeDayCount >= 3,
  4: (f) => f.shopVisited,
  5: (f) => f.hardQuestCompleted,
  6: (f) => f.hasReflection,
  7: (f) => f.activeDayCount >= 7,
};

async function gatherFacts(userId) {
  const [questsRes, reflectionRes, shopRes] = await Promise.all([
    supabaseAdmin
      .from('quests')
      .select('completed_at, difficulty')
      .eq('user_id', userId)
      .eq('completed', true),
    supabaseAdmin
      .from('quest_reflections')
      .select('id')
      .eq('user_id', userId)
      .limit(1),
    supabaseAdmin
      .from('onboarding_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event', 'shop_visited')
      .limit(1),
  ]);

  const completed = questsRes.data || [];
  const perDay = {};
  for (const q of completed) {
    if (!q.completed_at) continue;
    const day = new Date(q.completed_at).toISOString().slice(0, 10);
    perDay[day] = (perDay[day] || 0) + 1;
  }

  return {
    completedCount: completed.length,
    activeDayCount: Object.keys(perDay).length,
    maxCompletionsInOneDay: Math.max(0, ...Object.values(perDay)),
    hardQuestCompleted: completed.some((q) =>
      ['hard', 'legendary'].includes(q.difficulty)
    ),
    hasReflection: (reflectionRes.data || []).length > 0,
    shopVisited: (shopRes.data || []).length > 0,
  };
}

async function awardStepRewards(userId, step) {
  if (step.reward_gold > 0) {
    const { error } = await supabaseAdmin.rpc('process_gold_transaction', {
      p_user_id: userId,
      p_amount: step.reward_gold,
      p_transaction_type: 'quest_chain_reward',
      p_reference_id: step.id,
      p_metadata: { chain_id: CHAIN_ID, step_number: step.step_number, step_title: step.title },
    });
    if (error) {
      console.error('Welcome chain gold award failed:', { userId, step: step.step_number, error });
    }
  }

  if (step.reward_xp > 0) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();
    if (profile) {
      const newXP = (profile.xp || 0) + step.reward_xp;
      await supabaseAdmin
        .from('profiles')
        .update({ xp: newXP, level: Math.floor(newXP / 100) + 1 })
        .eq('id', userId);
    }
  }
}

/**
 * Advance the user's Welcome Quest chain as far as their history allows.
 *
 * @param {string} userId
 * @param {string} event - what prompted the check: 'quest_completed',
 *   'reflection_created', 'shop_visited', 'backfill'. Informational only;
 *   conditions are always evaluated from the database.
 * @returns {Promise<null | {
 *   advanced: Array<{step_number: number, title: string, story_text: string, reward_gold: number, reward_xp: number}>,
 *   completed: boolean,
 *   current_step: number,
 * }>} null when not enrolled/already done/errored; otherwise the steps
 *   newly cleared by this call (possibly empty).
 */
export async function advanceWelcomeChain(userId, event) {
  try {
    const { data: progress } = await supabaseAdmin
      .from('user_quest_chain_progress')
      .select('current_step, status')
      .eq('user_id', userId)
      .eq('chain_id', CHAIN_ID)
      .single();

    if (!progress || progress.status !== 'in_progress') return null;

    const { data: steps } = await supabaseAdmin
      .from('quest_chain_steps')
      .select('id, step_number, title, story_text, reward_gold, reward_xp')
      .eq('chain_id', CHAIN_ID)
      .order('step_number');

    if (!steps?.length) return null;

    const lastStepNumber = steps[steps.length - 1].step_number;
    const facts = await gatherFacts(userId);

    const advanced = [];
    let currentStep = progress.current_step;
    let chainCompleted = false;

    while (currentStep <= lastStepNumber) {
      const condition = STEP_CONDITIONS[currentStep];
      if (!condition || !condition(facts)) break;

      const step = steps.find((s) => s.step_number === currentStep);
      const isLast = currentStep === lastStepNumber;
      const now = new Date().toISOString();

      // Conditional update is the idempotency/race guard: only one of any
      // concurrent requests can move the pointer off `currentStep`.
      const { data: updated } = await supabaseAdmin
        .from('user_quest_chain_progress')
        .update(
          isLast
            ? { status: 'completed', completed_at: now, last_step_completed_at: now }
            : { current_step: currentStep + 1, last_step_completed_at: now }
        )
        .eq('user_id', userId)
        .eq('chain_id', CHAIN_ID)
        .eq('current_step', currentStep)
        .eq('status', 'in_progress')
        .select('current_step')
        .single();

      if (!updated) break; // another request advanced this step already

      await awardStepRewards(userId, step);
      await supabaseAdmin.from('onboarding_events').upsert(
        { user_id: userId, event: `welcome_chain_step_${currentStep}` },
        { onConflict: 'user_id,event', ignoreDuplicates: true }
      );

      advanced.push({
        step_number: step.step_number,
        title: step.title,
        story_text: step.story_text,
        reward_gold: step.reward_gold,
        reward_xp: step.reward_xp,
      });

      if (isLast) {
        chainCompleted = true;
        break;
      }
      currentStep += 1;
    }

    return {
      advanced,
      completed: chainCompleted,
      current_step: chainCompleted ? lastStepNumber : currentStep,
    };
  } catch (error) {
    // Chain advancement is a bonus system — never break the calling route
    console.error('advanceWelcomeChain failed:', { userId, event, error: error.message });
    return null;
  }
}
