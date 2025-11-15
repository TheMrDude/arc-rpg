import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // SECURE: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Journal list: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Journal list: Unauthorized access attempt', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeText = searchParams.get('include_text') === 'true';

    // Validate limits
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
    }

    if (offset < 0) {
      return NextResponse.json({ error: 'Offset must be non-negative' }, { status: 400 });
    }

    // Build query
    let selectFields = 'id, created_at, mood, word_count, transformation_type, is_milestone, transformed_narrative';
    if (includeText) {
      selectFields += ', entry_text';
    }

    // Get entries (RLS automatically filters expired entries)
    const { data: entries, error: fetchError } = await supabaseAdmin
      .from('journal_entries')
      .select(selectFields)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('Failed to fetch journal entries:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch journal entries' },
        { status: 500 }
      );
    }

    // Get total count
    const { count: totalCount } = await supabaseAdmin
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      entries: entries || [],
      total: totalCount || 0,
      limit,
      offset,
      has_more: (offset + limit) < (totalCount || 0)
    });

  } catch (error) {
    console.error('Journal list error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}
