import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { advanceWelcomeChain } from '@/lib/quest-chain';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    // SECURE: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No bearer token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to create a reflection' },
        { status: 401 }
      );
    }

    // Parse request body
    const { questId, reflectionText, mood } = await request.json();

    // Validate inputs
    if (!questId) {
      return NextResponse.json(
        { error: 'Missing quest ID', message: 'Quest ID is required' },
        { status: 400 }
      );
    }

    if (!reflectionText || reflectionText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty reflection', message: 'Reflection text cannot be empty' },
        { status: 400 }
      );
    }

    if (reflectionText.length > 500) {
      return NextResponse.json(
        { error: 'Reflection too long', message: 'Reflection must be 500 characters or less' },
        { status: 400 }
      );
    }

    if (!mood || mood < 1 || mood > 5) {
      return NextResponse.json(
        { error: 'Invalid mood', message: 'Mood must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify quest belongs to user
    const { data: quest, error: questError } = await supabaseAdmin
      .from('quests')
      .select('id, user_id')
      .eq('id', questId)
      .eq('status', 'active')
      .single();

    if (questError || !quest) {
      return NextResponse.json(
        { error: 'Quest not found', message: 'The specified quest does not exist' },
        { status: 404 }
      );
    }

    if (quest.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You do not have permission to reflect on this quest' },
        { status: 403 }
      );
    }

    // Check if reflection already exists for this quest
    const { data: existingReflection } = await supabaseAdmin
      .from('quest_reflections')
      .select('id')
      .eq('quest_id', questId)
      .eq('user_id', user.id)
      .single();

    if (existingReflection) {
      return NextResponse.json(
        { error: 'Reflection exists', message: 'You have already reflected on this quest' },
        { status: 409 }
      );
    }

    // Insert reflection
    const { data: reflection, error: reflectionError } = await supabaseAdmin
      .from('quest_reflections')
      .insert({
        quest_id: questId,
        user_id: user.id,
        reflection_text: reflectionText.trim(),
        mood: mood
      })
      .select()
      .single();

    if (reflectionError) {
      console.error('Error creating reflection:', reflectionError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to save reflection' },
        { status: 500 }
      );
    }

    // Award +10 XP bonus.
    //
    // This used to call an increment_xp RPC that does not exist in the schema
    // and never has. The call failed every time, the error was swallowed
    // because the reflection itself had already saved, and the route then read
    // XP straight back and reported the unchanged value as `newXP` -- so it
    // returned 200 while awarding nothing.
    //
    // Done inline rather than by writing the missing function, because that is
    // how every other XP award in this codebase works, and because a bare
    // increment would not touch `level`: complete-quest recomputes level from
    // XP on the same update, and a reflection that pushed a user past a 100 XP
    // boundary would otherwise leave them at the old level. Same formula as
    // complete-quest, deliberately.
    const xpBonus = 10;
    let newXP = null;
    let newLevel = null;

    const { data: current } = await supabaseAdmin
      .from('profiles')
      .select('xp, level')
      .eq('id', user.id)
      .single();

    if (current) {
      newXP = (current.xp || 0) + xpBonus;
      newLevel = Math.floor(newXP / 100) + 1;

      const { error: xpError } = await supabaseAdmin
        .from('profiles')
        .update({ xp: newXP, level: newLevel })
        .eq('id', user.id);

      if (xpError) {
        console.error('Error awarding XP bonus:', xpError);
        // Reflection was saved, so still return success -- but report the XP
        // the user actually has, not the value we hoped to write.
        newXP = current.xp || 0;
        newLevel = current.level || 1;
      }
    }

    // Welcome Quest chain: first reflection satisfies step 6. Never throws.
    const welcomeChain = await advanceWelcomeChain(user.id, 'reflection_created');

    return NextResponse.json({
      success: true,
      reflection,
      xpBonus,
      newXP: newXP ?? 0,
      newLevel: newLevel ?? 1,
      welcome_chain: welcomeChain,
      message: 'Reflection saved successfully!'
    });

  } catch (error) {
    console.error('Unexpected error creating reflection:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
