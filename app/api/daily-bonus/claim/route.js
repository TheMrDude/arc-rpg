import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Daily bonus rewards (increases with consecutive days)
const DAILY_BONUSES = {
  1: { gold: 50, xp: 20, emoji: '📅' },
  2: { gold: 75, xp: 30, emoji: '🔥' },
  3: { gold: 100, xp: 50, emoji: '⭐' },
  4: { gold: 150, xp: 75, emoji: '💫' },
  5: { gold: 200, xp: 100, emoji: '🌟' },
  6: { gold: 250, xp: 125, emoji: '✨' },
  7: { gold: 500, xp: 250, emoji: '🏆' }, // Big reward on day 7
};

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('last_daily_bonus_at, daily_bonus_streak, xp, level, skill_points, total_skill_points_earned')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json({
        error: 'Failed to fetch profile',
        details: profileError.message
      }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user already claimed bonus today
    const lastBonusDate = profile.last_daily_bonus_at ? new Date(profile.last_daily_bonus_at) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (lastBonusDate) {
      const lastBonusDay = new Date(lastBonusDate.getFullYear(), lastBonusDate.getMonth(), lastBonusDate.getDate());

      if (lastBonusDay.getTime() === today.getTime()) {
        return NextResponse.json({
          error: 'Already claimed',
          message: 'You have already claimed your daily bonus today',
          next_bonus_in_hours: 24 - now.getHours(),
        }, { status: 400 });
      }
    }

    // Calculate streak
    let newStreak = 1;
    if (lastBonusDate) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastDay = new Date(lastBonusDate.getFullYear(), lastBonusDate.getMonth(), lastBonusDate.getDate());

      if (lastDay.getTime() === yesterday.getTime()) {
        // Consecutive day
        newStreak = (profile.daily_bonus_streak || 0) + 1;
      }
      // else: streak broken, reset to 1
    }

    // Cap streak at 7 days (then it cycles)
    const streakDay = ((newStreak - 1) % 7) + 1;
    const bonus = DAILY_BONUSES[streakDay];

    // Award gold
    const { data: goldData, error: goldError } = await supabaseAdmin.rpc('process_gold_transaction', {
      p_user_id: user.id,
      p_amount: bonus.gold,
      p_transaction_type: 'daily_bonus',
      p_reference_id: `day_${newStreak}`,
      p_metadata: {
        streak_day: streakDay,
        total_streak: newStreak,
      }
    });

    if (goldError) {
      console.error('Failed to award daily bonus gold:', {
        error: goldError,
        message: goldError.message,
        details: goldError.details,
        hint: goldError.hint,
      });
      return NextResponse.json({
        error: 'Failed to award bonus',
        details: goldError.message,
        hint: 'Make sure the process_gold_transaction RPC function exists in your database'
      }, { status: 500 });
    }

    // Award XP
    const newXP = profile.xp + bonus.xp;
    const newLevel = Math.floor(newXP / 100) + 1;
    const leveledUp = newLevel > profile.level;

    // Calculate skill points: Award 1 skill point every 5 levels
    const oldLevel = profile.level;
    const skillPointsEarned = Math.floor(newLevel / 5) - Math.floor(oldLevel / 5);
    const newSkillPoints = (profile.skill_points || 0) + skillPointsEarned;
    const newTotalSkillPoints = (profile.total_skill_points_earned || 0) + skillPointsEarned;

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        last_daily_bonus_at: now.toISOString(),
        daily_bonus_streak: newStreak,
        xp: newXP,
        level: newLevel,
        skill_points: newSkillPoints,
        total_skill_points_earned: newTotalSkillPoints,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return NextResponse.json({
        error: 'Failed to update profile',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('Daily bonus claimed:', {
      userId: user.id,
      streak: newStreak,
      streakDay,
      gold: bonus.gold,
      xp: bonus.xp,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      bonus: {
        ...bonus,
        streak_day: streakDay,
        total_streak: newStreak,
        skill_points_earned: skillPointsEarned,
      },
      profile: {
        xp: newXP,
        level: newLevel,
        leveled_up: leveledUp,
        skill_points: newSkillPoints,
      },
    });

  } catch (error) {
    console.error('Daily bonus error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
