import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reward_id } = body;

    if (!reward_id) {
      return NextResponse.json({ error: 'Missing reward_id' }, { status: 400 });
    }

    // Call the database function to claim reward
    const { data, error } = await supabase
      .rpc('claim_seasonal_reward', {
        p_user_id: user.id,
        p_reward_id: reward_id
      });

    if (error) {
      console.error('Error claiming reward:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // The function returns a JSONB object
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reward_name: data.reward_name,
      reward_type: data.reward_type
    });

  } catch (error) {
    console.error('Claim reward API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
