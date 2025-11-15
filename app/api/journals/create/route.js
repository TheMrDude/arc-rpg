import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      console.error('Journal create: Authentication failed', {
        error: authError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { entry_text, transformed_narrative, mood } = await request.json();

    // Validate input
    if (!entry_text || typeof entry_text !== 'string') {
      return NextResponse.json({ error: 'Invalid entry text' }, { status: 400 });
    }

    const trimmedEntry = entry_text.trim();

    if (trimmedEntry.length < 50) {
      return NextResponse.json({ error: 'Entry must be at least 50 characters' }, { status: 400 });
    }

    if (trimmedEntry.length > 2000) {
      return NextResponse.json({ error: 'Entry text too long (max 2000 characters)' }, { status: 400 });
    }

    if (mood !== null && mood !== undefined && (mood < 1 || mood > 5)) {
      return NextResponse.json({ error: 'Mood must be between 1 and 5' }, { status: 400 });
    }

    // Sanitize input
    const sanitizedEntry = trimmedEntry.replace(/[<>]/g, '');
    const sanitizedNarrative = transformed_narrative
      ? transformed_narrative.replace(/[<>]/g, '').trim()
      : null;

    const supabaseAdmin = getSupabaseAdminClient();

    // Insert journal entry
    const { data: journalEntry, error: insertError } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        user_id: user.id,
        entry_text: sanitizedEntry,
        transformed_narrative: sanitizedNarrative,
        mood: mood || null,
        word_count: sanitizedEntry.split(/\s+/).length,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Journal create: Database error', {
        error: insertError.message,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 });
    }

    console.log('Journal entry created successfully', {
      userId: user.id,
      entryId: journalEntry.id,
      hasTransformation: !!transformed_narrative,
      mood: mood || 'none',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      entry: journalEntry,
    });
  } catch (error) {
    console.error('Journal create: Unexpected error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}
