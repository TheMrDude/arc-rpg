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
      console.error('On This Day: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('On This Day: Unauthorized access attempt', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is premium (required for this feature)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.is_premium || profile?.subscription_status === 'active';

    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'Premium feature',
          message: 'On This Day is a premium feature. Upgrade to Founder Access to unlock.',
          upgrade_required: true
        },
        { status: 403 }
      );
    }

    // Use the database function to get "On This Day" entries
    const { data: entries, error: fetchError } = await supabaseAdmin
      .rpc('get_on_this_day_entries', {
        p_user_id: user.id
      });

    if (fetchError) {
      console.error('Failed to fetch On This Day entries:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch On This Day entries' },
        { status: 500 }
      );
    }

    console.log('On This Day fetched successfully', {
      userId: user.id,
      entriesFound: entries?.length || 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      entries: entries || [],
      count: entries?.length || 0,
      message: entries?.length > 0
        ? `Found ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} from this day in past years`
        : 'No entries found from this day in past years. Keep journaling to build your history!'
    });

  } catch (error) {
    console.error('On This Day error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch On This Day entries' },
      { status: 500 }
    );
  }
}
