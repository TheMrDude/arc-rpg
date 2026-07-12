import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';
import { WORLD_REGIONS, getUnlockStatus } from '@/lib/world-regions';
import { journeyDistance, getJourneyState } from '@/lib/journeys';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/journey — set (or change) the player's heading.
 * Body: { destination_id } to set a course, or { destination_id: null }
 * to cancel. Any already-completed journey is persisted into
 * regions_traveled before the new course is written, so arrivals are
 * never lost when the player picks a new destination.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination_id } = await request.json();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('quests_completed, longest_streak, current_streak, level, story_progress')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const storyProgress = profile.story_progress || {};
    const traveled = storyProgress.regions_traveled || [];

    // Resolve any completed journey into the permanent record first
    const currentState = getJourneyState(profile);
    let newTraveled = traveled;
    if (currentState?.complete && !traveled.includes(currentState.destination)) {
      newTraveled = [...traveled, currentState.destination];
    }

    // Cancel course
    if (!destination_id) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          story_progress: {
            ...storyProgress,
            regions_traveled: newTraveled,
            journey: null,
          },
        })
        .eq('id', user.id);
      if (error) throw error;
      return NextResponse.json({ success: true, journey: null, regions_traveled: newTraveled });
    }

    // Validate destination
    const region = WORLD_REGIONS.find((r) => r.id === destination_id);
    const distance = journeyDistance(destination_id);
    if (!region || !distance) {
      return NextResponse.json({ error: 'Invalid destination' }, { status: 400 });
    }

    const playerData = {
      totalCheckins: profile.quests_completed || 0,
      longestStreak: profile.longest_streak || profile.current_streak || 0,
      level: profile.level || 1,
      traveled: newTraveled,
    };
    if (getUnlockStatus(region, playerData)) {
      return NextResponse.json(
        { error: 'Already unlocked', message: `${region.name} is already yours to roam.` },
        { status: 400 }
      );
    }

    const journey = {
      destination: destination_id,
      start_count: profile.quests_completed || 0,
      set_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        story_progress: {
          ...storyProgress,
          regions_traveled: newTraveled,
          journey,
        },
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      journey,
      distance,
      regions_traveled: newTraveled,
      message: `Course set for ${region.name}. ${distance} quests of travel ahead.`,
    });
  } catch (error) {
    console.error('Journey error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
