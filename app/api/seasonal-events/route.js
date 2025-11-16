import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
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

    // Get active seasonal event
    const { data: event, error: eventError } = await supabase
      .from('seasonal_events')
      .select('*')
      .eq('is_active', true)
      .single();

    if (eventError || !event) {
      return NextResponse.json({
        active: false,
        message: 'No active seasonal event'
      });
    }

    // Get challenges for this event
    const { data: challenges, error: challengesError } = await supabase
      .from('seasonal_challenges')
      .select('*')
      .eq('event_id', event.id)
      .order('points', { ascending: false });

    if (challengesError) {
      console.error('Error fetching challenges:', challengesError);
    }

    // Get user progress
    const { data: userProgress, error: progressError } = await supabase
      .from('user_seasonal_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', event.id)
      .single();

    // Get user challenge progress
    const { data: challengeProgress, error: challengeProgressError } = await supabase
      .from('user_seasonal_challenge_progress')
      .select('*')
      .eq('user_id', user.id);

    if (challengeProgressError) {
      console.error('Error fetching challenge progress:', challengeProgressError);
    }

    // Get available rewards
    const { data: rewards, error: rewardsError } = await supabase
      .from('seasonal_rewards')
      .select('*')
      .eq('event_id', event.id)
      .order('cost_event_points', { ascending: true });

    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError);
    }

    return NextResponse.json({
      active: true,
      event,
      challenges: challenges || [],
      userProgress: userProgress || {
        event_points: 0,
        challenges_completed: 0,
        rewards_claimed: []
      },
      challengeProgress: challengeProgress || [],
      rewards: rewards || []
    });

  } catch (error) {
    console.error('Seasonal events API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
