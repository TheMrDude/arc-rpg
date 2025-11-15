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
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('last_daily_bonus_at, daily_bonus_streak, xp, level')
      .eq('id', user.id)
      .single();

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
    const { error: goldError } = await supabaseAdmin.rpc('process_gold_transaction', {
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
      console.error('Failed to award daily bonus gold:', goldError);
      return NextResponse.json({ error: 'Failed to award bonus' }, { status: 500 });
    }

    // Award XP
    const newXP = profile.xp + bonus.xp;
    const newLevel = Math.floor(newXP / 100) + 1;
    const leveledUp = newLevel > profile.level;

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({
        last_daily_bonus_at: now.toISOString(),
        daily_bonus_streak: newStreak,
        xp: newXP,
        level: newLevel,
      })
      .eq('id', user.id);

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
      },
      profile: {
        xp: newXP,
        level: newLevel,
        leveled_up: leveledUp,
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
