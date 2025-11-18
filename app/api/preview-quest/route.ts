import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { calculateXP, calculateDifficulty } from '@/lib/onboarding';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check rate limit (3 requests per 5 minutes)
    const rateLimit = checkRateLimit(clientIP, 3, 5 * 60 * 1000);

    if (!rateLimit.allowed) {
      const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000 / 60);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Whoa there, hero! Too many quests. Try again in ${resetIn} minutes.`,
          resetAt: rateLimit.resetAt
        },
        { status: 429 }
      );
    }

    // Parse request body
    const { task } = await request.json();

    if (!task || typeof task !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Tell us your quest first!' },
        { status: 400 }
      );
    }

    // Validate task length
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

    // Call Claude API to transform the task
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      temperature: 0.8,
      system: "You are a creative RPG quest writer. Transform mundane tasks into epic quests. Keep it under 40 words. Use vivid language but stay grounded in what the task actually is. Make it feel heroic without being cringe. Return ONLY the transformed quest text, nothing else.",
      messages: [
        {
          role: 'user',
          content: `Transform this task into an RPG quest: ${task}`
        }
      ]
    });

    // Extract the transformed text
    const transformedText = message.content[0].type === 'text'
      ? message.content[0].text
      : task;

    // Calculate XP and difficulty
    const xp = calculateXP(task);
    const difficulty = calculateDifficulty(task);

    return NextResponse.json({
      original: task,
      transformed: transformedText,
      xp,
      difficulty,
      remaining: rateLimit.remaining
    });

  } catch (error: any) {
    console.error('Error in preview-quest:', error);

    // Handle specific API errors
    if (error?.status === 429) {
      return NextResponse.json(
        {
          error: 'API rate limit',
          message: 'The quest oracle is overwhelmed. Try again in a moment.'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Transformation failed',
        message: 'The quest oracle is temporarily unavailable. Try again?'
      },
      { status: 500 }
    );
  }
}
