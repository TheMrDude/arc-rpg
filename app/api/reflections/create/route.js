import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Award +10 XP bonus
    const xpBonus = 10;
    const { error: xpError } = await supabaseAdmin.rpc('increment_xp', {
      user_id: user.id,
      xp_amount: xpBonus
    });

    if (xpError) {
      console.error('Error awarding XP bonus:', xpError);
      // Reflection was saved, so still return success
    }

    // Get updated XP
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      reflection,
      xpBonus,
      newXP: profile?.xp || 0,
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
