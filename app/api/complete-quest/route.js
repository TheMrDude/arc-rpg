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

// Gold rewards by difficulty
const GOLD_REWARDS = {
  easy: 50,
  medium: 150,
  hard: 350,
};

export async function POST(request) {
  try {
    // SECURITY: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Quest completion: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Quest completion: Unauthorized', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Validate input
    const { quest_id } = await request.json();

    if (!quest_id || typeof quest_id !== 'string') {
      return NextResponse.json({ error: 'Invalid quest ID' }, { status: 400 });
    }

    // SECURITY: Verify quest belongs to user and isn't already completed
    const { data: quest, error: questError } = await supabaseAdmin
      .from('quests')
      .select('*')
      .eq('id', quest_id)
      .eq('user_id', user.id)
      .single();

    if (questError || !quest) {
      console.error('Quest not found or access denied:', {
        questId: quest_id,
        userId: user.id,
        error: questError,
      });
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    if (quest.completed) {
      return NextResponse.json({
        error: 'Already completed',
        message: 'This quest has already been completed'
      }, { status: 400 });
    }

    // Get user profile with equipped items
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        equipped_weapon_item:equipment_catalog!profiles_equipped_weapon_fkey(*),
        equipped_armor_item:equipment_catalog!profiles_equipped_armor_fkey(*),
        equipped_accessory_item:equipment_catalog!profiles_equipped_accessory_fkey(*)
      `)
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Calculate XP multiplier from equipped items
    let xpMultiplier = 1.0;
    if (profile.equipped_weapon_item) {
      xpMultiplier += (parseFloat(profile.equipped_weapon_item.xp_multiplier) - 1.0);
    }
    if (profile.equipped_armor_item) {
      xpMultiplier += (parseFloat(profile.equipped_armor_item.xp_multiplier) - 1.0);
    }
    if (profile.equipped_accessory_item) {
      xpMultiplier += (parseFloat(profile.equipped_accessory_item.xp_multiplier) - 1.0);
    }

    // Calculate comeback bonus
    const comebackBonus = checkComebackBonus(profile.last_quest_date);
    const bonusXP = comebackBonus ? 20 : 0;

    // Calculate total XP with equipment bonuses
    const baseXP = quest.xp_value + bonusXP;
    const totalXP = Math.floor(baseXP * xpMultiplier);
    const equipmentBonus = totalXP - baseXP;

    // Calculate new level and streak
    const newXP = profile.xp + totalXP;
    const newLevel = Math.floor(newXP / 100) + 1;
    const newStreak = calculateStreak(profile.last_quest_date, profile.current_streak);

    // Calculate gold reward (server-side only!)
    const goldReward = GOLD_REWARDS[quest.difficulty] || 50;

    // Mark quest as completed
    await supabaseAdmin
      .from('quests')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', quest_id);

    // Update profile with new XP, level, and streak
    await supabaseAdmin
      .from('profiles')
      .update({
        xp: newXP,
        level: newLevel,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, profile.longest_streak || 0),
        last_quest_date: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Award gold using atomic transaction
    const { data: goldTransaction, error: goldError } = await supabaseAdmin
      .rpc('process_gold_transaction', {
        p_user_id: user.id,
        p_amount: goldReward,
        p_transaction_type: 'quest_reward',
        p_reference_id: quest_id,
        p_metadata: {
          quest_difficulty: quest.difficulty,
          quest_text: quest.transformed_text,
          xp_earned: totalXP,
        }
      });

    if (goldError) {
      console.error('Failed to award gold:', {
        error: goldError,
        userId: user.id,
        questId: quest_id,
        timestamp: new Date().toISOString(),
      });
      // Don't fail the quest completion if gold fails, just log it
    }

    const result = goldTransaction?.[0];
    const newGoldBalance = result?.new_balance || profile.gold + goldReward;

    console.log('Quest completed successfully', {
      userId: user.id,
      questId: quest_id,
      difficulty: quest.difficulty,
      baseXP,
      totalXP,
      equipmentBonus,
      xpMultiplier,
      goldReward,
      newLevel,
      newGoldBalance,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      rewards: {
        xp: totalXP,
        base_xp: baseXP,
        equipment_bonus_xp: equipmentBonus,
        comeback_bonus: comebackBonus,
        gold: goldReward,
        new_level: newLevel,
        level_up: newLevel > profile.level,
      },
      profile: {
        xp: newXP,
        level: newLevel,
        gold: newGoldBalance,
        current_streak: newStreak,
      }
    });

  } catch (error) {
    console.error('Quest completion error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to complete quest'
    }, { status: 500 });
  }
}

// Helper: Check if user gets comeback bonus
function checkComebackBonus(lastQuestDate) {
  if (!lastQuestDate) return false;

  const last = new Date(lastQuestDate);
  const now = new Date();
  const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));

  return daysSince >= 7; // 1+ weeks since last quest
}

// Helper: Calculate streak
function calculateStreak(lastQuestDate, currentStreak) {
  if (!lastQuestDate) return 1;

  const last = new Date(lastQuestDate);
  const now = new Date();
  const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));

  if (daysSince === 0 || daysSince === 1) {
    return (currentStreak || 0) + 1;
  }

  return 1; // Streak broken
}
