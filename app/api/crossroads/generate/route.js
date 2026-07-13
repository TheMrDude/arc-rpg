import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from '@/lib/api-auth';
import { crossroadsMilestone, pickScenario } from '@/lib/crossroads';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ARCHETYPE_FLAVOR = {
  warrior: 'a Warrior who charges at problems head-on',
  builder: 'a Builder who lays one brick at a time',
  sage: 'a Sage who thinks before acting',
  shadow: 'a Shadow who works quietly and alone',
  seeker: 'a Seeker who is curious about everything',
};

const ICON_POOL = ['🌉', '🏮', '🗝️', '🌙', '⚔️', '🦉', '🏕️', '🌊', '🕯️', '🧭', '🍂', '🏔️'];

/**
 * Validate + normalise an AI-generated scenario into the exact shape the
 * resolver trusts. Returns null if the shape is wrong (caller then falls
 * back to the hand-authored pool). Choice ids/styles are FORCED to
 * bold/careful so the server's tierForRoll odds stay correct regardless
 * of what the model returned.
 */
function normaliseScenario(raw, milestone) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.title !== 'string' || typeof raw.setup !== 'string') return null;
  if (!Array.isArray(raw.choices) || raw.choices.length !== 2) return null;

  const tiers = ['crit', 'great', 'success', 'complication'];
  const styles = ['bold', 'careful'];
  const choices = [];

  for (let i = 0; i < 2; i++) {
    const c = raw.choices[i];
    if (!c || typeof c.label !== 'string' || !c.outcomes) return null;
    const outcomes = {};
    for (const t of tiers) {
      if (typeof c.outcomes[t] !== 'string' || !c.outcomes[t].trim()) return null;
      outcomes[t] = c.outcomes[t].trim().slice(0, 240);
    }
    choices.push({
      id: styles[i],
      style: styles[i],
      label: c.label.trim().slice(0, 120),
      outcomes,
    });
  }

  const icon =
    typeof raw.icon === 'string' && raw.icon.trim() ? raw.icon.trim().slice(0, 4) : '🧭';

  return {
    id: `ai_${milestone}`,
    icon,
    title: raw.title.trim().slice(0, 80),
    setup: raw.setup.trim().slice(0, 400),
    choices,
    source: 'ai',
  };
}

/**
 * POST /api/crossroads/generate — produce (or return the cached) scenario
 * for the player's current crossroads milestone. The scenario is written
 * by Claude, personalised to the player's archetype, recent quests, and
 * story so far, then stored in story_progress.pending_crossroads so the
 * d20 resolver validates the choice against a locked scenario.
 *
 * Idempotent: if a scenario is already pending for this milestone it is
 * returned unchanged (a refresh never rerolls the fork). Any generation
 * failure falls back to the hand-authored pool — the crossroads always
 * appears, AI or not.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('quests_completed, story_progress, archetype, level')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const milestone = crossroadsMilestone(profile.quests_completed);
    const storyProgress = profile.story_progress || {};
    const claimed = storyProgress.crossroads_claimed || 0;

    if (milestone < 5 || claimed >= milestone) {
      return NextResponse.json({ eligible: false });
    }

    // Already generated for this milestone? Return it unchanged.
    const pending = storyProgress.pending_crossroads;
    if (pending && pending.milestone === milestone && pending.scenario) {
      return NextResponse.json({
        eligible: true,
        milestone,
        scenario: pending.scenario,
        source: pending.scenario.source || 'ai',
      });
    }

    // Build the personalisation context
    const { data: recentQuests } = await supabaseAdmin
      .from('quests')
      .select('transformed_text, original_text')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(5);

    const questList = (recentQuests || [])
      .map((q) => q.transformed_text || q.original_text)
      .filter(Boolean)
      .slice(0, 5);

    const archetype = profile.archetype || 'seeker';
    const archetypeFlavor = ARCHETYPE_FLAVOR[archetype] || ARCHETYPE_FLAVOR.seeker;
    const recentThread = storyProgress.recent_events?.[0] || null;

    let scenario = null;

    try {
      const systemPrompt = `You are the Dungeon Master of HabitQuest, a cozy productivity RPG. You write a single "Crossroads" — a short fork in the road the hero meets on their travels.

HARD RULES (never break these):
- This is a warm, guilt-free world. NEVER reference streaks, missed days, failure, laziness, or shame. There is no "bad" outcome — a complication is a funny or interesting turn, never a punishment.
- Both choices ALWAYS lead somewhere good. The worst case is a charming inconvenience.
- Keep it whimsical and grounded, like a friendly tabletop DM. No violence beyond cartoon scuffles.

Return ONLY valid JSON, no prose, in exactly this shape:
{
  "icon": "<single emoji>",
  "title": "<3-6 word scene title>",
  "setup": "<2-3 sentence scene the hero walks into>",
  "choices": [
    { "label": "<a BOLD, high-swing action, 6-12 words>",
      "outcomes": {
        "crit": "<amazing result, 1-2 sentences>",
        "great": "<very good result>",
        "success": "<solid, pleasant result>",
        "complication": "<a charming/funny snag that still ends fine>" } },
    { "label": "<a CAREFUL, steady action, 6-12 words>",
      "outcomes": {
        "crit": "<amazing result>",
        "great": "<very good result>",
        "success": "<solid, pleasant result>",
        "complication": "<a charming/funny snag that still ends fine>" } }
  ]
}
The first choice must be the bold/risky option; the second must be the careful/steady option.`;

      const userPrompt = `The hero is ${archetypeFlavor}. They are level ${profile.level || 1} and have completed ${profile.quests_completed || 0} quests.
Recent real quests they finished:
${questList.length ? questList.map((q) => `- ${q}`).join('\n') : '- (nothing notable yet)'}
${recentThread ? `Most recent story beat: ${recentThread}` : ''}

Write one Crossroads that feels like a natural detour on the road, ideally nodding at what they have been up to. Return only the JSON.`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' },
        max_tokens: 900,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text = message.content?.[0]?.text || '';
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        const parsed = JSON.parse(text.slice(start, end + 1));
        // Give the AI scene an icon from our pool if it omitted one
        if (!parsed.icon) parsed.icon = ICON_POOL[milestone % ICON_POOL.length];
        scenario = normaliseScenario(parsed, milestone);
      }
    } catch (aiErr) {
      console.error('Crossroads AI generation failed, falling back:', aiErr);
    }

    // Fallback: hand-authored pool (deterministic per user+milestone)
    let source = 'ai';
    if (!scenario) {
      const fallback = pickScenario(user.id, milestone);
      scenario = { ...fallback, source: 'authored' };
      source = 'authored';
    }

    // Store the locked scenario so the resolver validates against it
    await supabaseAdmin
      .from('profiles')
      .update({
        story_progress: {
          ...storyProgress,
          pending_crossroads: { milestone, scenario },
        },
      })
      .eq('id', user.id);

    return NextResponse.json({ eligible: true, milestone, scenario, source });
  } catch (error) {
    console.error('Crossroads generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
