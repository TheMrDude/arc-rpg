import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple admin key check â set ADMIN_API_KEY in your Vercel env vars
function authenticateAdmin(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  return token === process.env.ADMIN_API_KEY;
}

export async function POST(request) {
  try {
    // Admin-only endpoint
    if (!authenticateAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, slug, content, tone } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }

    const blogUrl = slug
      ? `https://habitquest.dev/blog/${slug}`
      : 'https://habitquest.dev/blog';

    const prompt = `You are a content repurposing engine for HabitQuest, a gamified habit-tracking app. You take a blog post and generate ready-to-publish content for multiple platforms.

BRAND VOICE: Confident, helpful operator. Clear, tactical, conversational â never academic. Lean into personal storytelling: what I'm testing, what's working, lessons learned. For HabitQuest blog content, lean slightly more educational and science-backed but keep it accessible. Avoid corporate jargon.

TONE: ${tone || 'default â tactical and relatable, like talking to a friend who happens to be a productivity nerd'}

---

SOURCE BLOG POST:
Title: ${title}
URL: ${blogUrl}

${content}

---

Generate ALL of the following. Output as JSON with these exact keys:

{
  "substack": {
    "subject_line": "Email subject line â curiosity-driven, under 60 chars",
    "preview_text": "Preview text for email, under 100 chars",
    "body": "Full Substack newsletter post (600-900 words). Open with a hook/story, reference the blog post content but rewrite it for email format â more personal, more conversational. Add a clear CTA at the end driving readers to HabitQuest. Use markdown formatting. End with a P.S. line."
  },
  "pinterest_pins": [
    {
      "title": "Pinterest pin title â curiosity-driven, under 100 chars",
      "description": "Pinterest description with hashtags, under 500 chars. Hook + value prop + 6-8 relevant hashtags.",
      "destination_url": "${blogUrl}"
    },
    {
      "title": "Second angle on the same topic",
      "description": "Different hook, different hashtags mix",
      "destination_url": "${blogUrl}"
    },
    {
      "title": "Third angle â most clickbait-y but still honest",
      "description": "Most curiosity-driven version",
      "destination_url": "${blogUrl}"
    }
  ],
  "social_snippets": [
    {
      "platform": "twitter",
      "text": "Tweet-length post (under 280 chars). Hook + insight + CTA to blog post. No hashtags in tweet."
    },
    {
      "platform": "twitter_thread_hook",
      "text": "Opening tweet for a thread version (under 280 chars). End with 'Thread ð§µ'"
    },
    {
      "platform": "linkedin",
      "text": "LinkedIn post (150-300 words). Professional but personal. Open with a bold statement or question. Use line breaks for readability. End with a question to drive comments."
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown code fences. No explanation before or after.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text.trim();

    // Parse the JSON response
    let repurposed;
    try {
      repurposed = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        repurposed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response', raw: responseText },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      source: {
        title,
        slug,
        url: blogUrl,
      },
      repurposed,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Repurpose content error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
