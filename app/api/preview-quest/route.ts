import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkAnonRateLimit, minutesUntilReset } from '@/lib/anonRateLimit';
import { NARRATION_FLOOR } from '@/lib/narrationConstraints';
import { parseQuestLine } from '@/lib/questTextSafety';
import { calculateXP, calculateDifficulty } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * The landing-page quest demo.
 *
 * This route is the first thing a parent evaluating HabitQuest touches, and for
 * a long time it was the only quest generator with NO narration floor and NO
 * output checking -- `message.content[0].text` went straight to the page. The
 * narration audit covered the nine authenticated routes and missed this one,
 * which is the one with no login in front of it.
 *
 * It now shares three things with app/api/transform-quest so the two cannot
 * drift again:
 *   - NARRATION_FLOOR, placed EARLY in the prompt, before anything can pull the
 *     voice off course.
 *   - The same word bound, and the format instruction plus examples LAST,
 *     immediately before the model's turn.
 *   - parseQuestLine from lib/questTextSafety, so raw model output can never
 *     reach the page: the only outcomes are a checked string or the visitor's own
 *     text back.
 */
export async function POST(request: Request) {
  try {
    // ── Rate limit ────────────────────────────────────────────────────────────
    // Unauthenticated + paid API = the one route where a stranger spends money.
    // Durable per-IP counter plus a global hourly ceiling, and it fails CLOSED.
    // See lib/anonRateLimit.js for the two bypasses this replaces.
    const rateLimit = await checkAnonRateLimit(request, 'preview-quest');

    if (!rateLimit.allowed) {
      const resetIn = minutesUntilReset(rateLimit.resetAt);
      // Deliberately the same shape and tone for every scope. A visitor who hit
      // the global ceiling should not be told the service is globally saturated,
      // and an abuser should not learn which limit they tripped.
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Whoa there, hero! Too many quests. Try again in ${resetIn} minute${resetIn === 1 ? '' : 's'}.`,
          resetAt: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(resetIn * 60),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // ── Input ─────────────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Tell us your quest first!' },
        { status: 400 }
      );
    }

    const task = (body as { task?: unknown })?.task;

    if (!task || typeof task !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Tell us your quest first!' },
        { status: 400 }
      );
    }
    if (task.length > 100) {
      return NextResponse.json(
        { error: 'Task too long', message: 'Keep it under 100 characters!' },
        { status: 400 }
      );
    }
    if (task.trim().length < 3) {
      return NextResponse.json(
        { error: 'Task too short', message: 'Give us a bit more detail!' },
        { status: 400 }
      );
    }

    // Strip anything that reads as an instruction boundary before the text is
    // interpolated into the prompt. This is a public box on a marketing page, so
    // it will be prompt-injected; the floor is early and the task is quoted, but
    // there is no reason to pass control characters or fences through.
    const sanitizedTask = task
      // Backticks and braces are how a code fence or a JSON block starts.
      .replace(/[`{}]/g, ' ')
      // Control characters are how you smuggle a fake newline-delimited section
      // header past a single-line length check. Written as escapes, never as raw
      // bytes: literal control characters in source are invisible in review.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // ── Prompt ────────────────────────────────────────────────────────────────
    // Same ordering as transform-quest: floor EARLY, format and examples LAST.
    const prompt = `You are the storyteller for HabitQuest, a children's adventure game. You turn a
real task someone typed into a short, exciting quest.

${NARRATION_FLOOR}

THE TASK TO TRANSFORM
Original task: "${sanitizedTask}"

LENGTH
Write ONE sentence of 12 to 22 words. Two short sentences are fine if it reads
better, but never more than 30 words in total.

OUTPUT FORMAT -- reply with EXACTLY one line and nothing else. No preamble, no
JSON, no code fences, no commentary:

QUEST: [your 12-22 word quest]

Examples of the transformation, showing what was typed and what it became:

TASK: read 3 chapters
QUEST: Slip into the quiet corner of the library and read three more chapters before the lamps go out.

TASK: tidy my room
QUEST: Face the mountain of clutter in your room and win back the floor, one armful at a time.

TASK: help my friend with homework
QUEST: Sit with your friend and untangle the homework that has been beating them all week.

Now transform the task above:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      // 12-22 words needs nowhere near 200. A tighter ceiling makes a run-on
      // structurally harder, and this is the cheapest lever on an unauthenticated
      // route's cost per call.
      max_tokens: 140,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';

    // ── Fallback hardening ────────────────────────────────────────────────────
    // parseQuestLine returns a bounded, marker-checked string or null. On null we
    // show the visitor their OWN words back, which is always safe because they
    // wrote them. There is no branch where unchecked model output is rendered.
    const parsed: string | null = parseQuestLine(raw);
    if (!parsed) {
      console.warn(
        `preview-quest: unusable model response (${raw.length} chars), returning the visitor's own text`
      );
    }
    const transformedText = parsed || sanitizedTask;

    return NextResponse.json(
      {
        original: task,
        transformed: transformedText,
        xp: calculateXP(sanitizedTask),
        difficulty: calculateDifficulty(sanitizedTask),
        remaining: Math.max(0, (rateLimit.limit ?? 0) - (rateLimit.current ?? 0)),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('Error in preview-quest:', error);

    if (error?.status === 429) {
      return NextResponse.json(
        {
          error: 'API rate limit',
          message: 'The quest oracle is overwhelmed. Try again in a moment.',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Transformation failed',
        message: 'The quest oracle is temporarily unavailable. Try again?',
      },
      { status: 500 }
    );
  }
}
