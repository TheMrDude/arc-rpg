import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';
import { calculateFinalXP, checkDoubleFriday } from '@/lib/skill-effects';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Gold rewards by difficulty
const GOLD_REWARDS = {
  easy: 50,
  medium: 150,
  hard: 350,
};

export async function POST(request) {
  try {
    // SECURITY: Authenticate using hybrid auth (supports Bearer tokens + Cookies)
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
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

    // SECURITY FIX: Mark quest as completed ATOMICALLY to prevent race conditions
    // This prevents duplicate completions even with simultaneous requests
    const { data: updatedQuest, error: updateError } = await supabaseAdmin
      .from('quests')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', quest_id)
      .eq('user_id', user.id)
      .eq('completed', false)  // CRITICAL: Only update if not already completed
      .select()
      .single();

    if (updateError || !updatedQuest) {
      // Quest was already completed by another request (race condition detected)
      console.warn('Quest already completed or not found (race condition):', {
        questId: quest_id,
        userId: user.id,
        error: updateError,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        error: 'Already completed',
        message: 'This quest has already been completed'
      }, { status: 400 });
    }

    // Quest is now locked as completed - safe to award rewards

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
    const comebackBonusXP = comebackBonus ? 20 : 0;

    // SKILL EFFECTS: Calculate XP with skill bonuses
    const baseXP = quest.xp_value;
    const skillEffects = await calculateFinalXP(
      user.id,
      quest.difficulty,
      baseXP,
      profile.current_streak || 0
    );

    // Apply equipment multiplier to skill-boosted XP
    let totalXP = Math.floor(skillEffects.finalXP * xpMultiplier) + comebackBonusXP;

    // SKILL EFFECT: Double XP Fridays (Efficiency 5: Time Lord)
    const doubleFriday = await checkDoubleFriday(user.id);
    if (doubleFriday) {
      totalXP *= 2;
    }

    const equipmentBonus = Math.floor(skillEffects.finalXP * (xpMultiplier - 1.0));
    const skillBonus = skillEffects.skillBonusXP + skillEffects.streakBonusXP;

    // Calculate new level and streak
    const newXP = profile.xp + totalXP;
    const newLevel = Math.floor(newXP / 100) + 1;
    const newStreak = calculateStreak(profile.last_quest_date, profile.current_streak);

    // Calculate skill points: Award 1 skill point every 5 levels
    const oldLevel = profile.level;
    const skillPointsEarned = Math.floor(newLevel / 5) - Math.floor(oldLevel / 5);
    const newSkillPoints = (profile.skill_points || 0) + skillPointsEarned;
    const newTotalSkillPoints = (profile.total_skill_points_earned || 0) + skillPointsEarned;

    // Calculate gold reward (server-side only!)
    const goldReward = GOLD_REWARDS[quest.difficulty] || 50;

    // STORY CONTINUITY: Update story progress based on completed quest
    const storyUpdates = await updateStoryProgress(profile, quest);

    // Quest already marked as completed above (atomic operation)
    // Update profile with new XP, level, streak, skill points, AND story progress
    await supabaseAdmin
      .from('profiles')
      .update({
        xp: newXP,
        level: newLevel,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, profile.longest_streak || 0),
        last_quest_date: new Date().toISOString(),
        current_story_thread: storyUpdates.currentThread,
        story_progress: storyUpdates.storyProgress,
        skill_points: newSkillPoints,
        total_skill_points_earned: newTotalSkillPoints,
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
      skillBonus,
      luckyProc: skillEffects.luckyProc,
      doubleFriday,
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
        skill_bonus_xp: skillBonus,
        comeback_bonus: comebackBonus,
        comeback_bonus_xp: comebackBonusXP,
        lucky_proc: skillEffects.luckyProc,
        double_friday: doubleFriday,
        gold: goldReward,
        new_level: newLevel,
        level_up: newLevel > profile.level,
        skill_points_earned: skillPointsEarned,
      },
      profile: {
        xp: newXP,
        level: newLevel,
        gold: newGoldBalance,
        current_streak: newStreak,
        skill_points: newSkillPoints,
      },
      story: {
        current_thread: storyUpdates.currentThread,
        thread_completion: storyUpdates.storyProgress.thread_completion,
        story_completed: storyUpdates.storyProgress.thread_completion === 0 && profile.current_story_thread !== null,
        new_story_started: storyUpdates.currentThread && storyUpdates.currentThread !== profile.current_story_thread,
      },
      skill_effects: {
        applied: skillEffects.breakdown.appliedSkills,
        lucky_proc: skillEffects.luckyProc,
        double_friday: doubleFriday,
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

// STORY CONTINUITY: Update story progress when quest is completed
async function updateStoryProgress(profile, quest) {
  // Initialize story progress if needed
  const storyProgress = profile.story_progress || {
    recent_events: [],
    ongoing_conflicts: [],
    npcs_met: [],
    thread_completion: 0,
    threads_completed: []
  };

  const currentThread = profile.current_story_thread || null;
  const questThread = quest.story_thread || null;
  const narrativeImpact = quest.narrative_impact?.description || null;

  // Add quest completion to recent events
  const questEvent = `Completed: ${quest.transformed_text.substring(0, 80)}${quest.transformed_text.length > 80 ? '...' : ''}`;
  storyProgress.recent_events = storyProgress.recent_events || [];
  storyProgress.recent_events.unshift(questEvent);
  storyProgress.recent_events = storyProgress.recent_events.slice(0, 10); // Keep last 10 events

  // Handle story thread progression
  let newCurrentThread = currentThread;

  if (questThread && narrativeImpact) {
    // Quest contributes to a story thread

    if (currentThread === questThread) {
      // Advancing current thread
      storyProgress.thread_completion = Math.min((storyProgress.thread_completion || 0) + 15, 100);

      // Add narrative impact to recent events
      if (narrativeImpact) {
        storyProgress.recent_events.unshift(`⚡ ${narrativeImpact}`);
        storyProgress.recent_events = storyProgress.recent_events.slice(0, 10);
      }

      // Check if thread completed
      if (storyProgress.thread_completion >= 100) {
        // Thread completed! Archive it and reset
        storyProgress.threads_completed = storyProgress.threads_completed || [];
        storyProgress.threads_completed.push({
          thread: currentThread,
          completed_at: new Date().toISOString(),
          final_event: narrativeImpact
        });

        // Keep last 5 completed threads
        storyProgress.threads_completed = storyProgress.threads_completed.slice(-5);

        // Reset for new thread
        newCurrentThread = null;
        storyProgress.thread_completion = 0;
        storyProgress.ongoing_conflicts = [];
        storyProgress.recent_events.unshift(`🏆 STORY COMPLETED: "${currentThread}"`);
        storyProgress.recent_events = storyProgress.recent_events.slice(0, 10);
      }
    } else if (!currentThread || storyProgress.thread_completion === 0) {
      // Start new thread
      newCurrentThread = questThread;
      storyProgress.thread_completion = 15;
      storyProgress.recent_events.unshift(`📖 NEW STORY: "${questThread}"`);
      storyProgress.recent_events = storyProgress.recent_events.slice(0, 10);
    }
    // else: different thread while one is active - ignore for now (could be side quest)
  }

  // Extract NPCs and conflicts from narrative impact
  if (narrativeImpact) {
    // Simple heuristics to detect NPCs (names often capitalized, mentioned with "with" or "met")
    const npcPatterns = /(?:met|encountered|aided|helped|fought)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    let match;
    while ((match = npcPatterns.exec(narrativeImpact)) !== null) {
      const npc = match[1];
      if (!storyProgress.npcs_met.includes(npc) && storyProgress.npcs_met.length < 20) {
        storyProgress.npcs_met.push(npc);
      }
    }

    // Detect conflicts (keywords like "defeat", "destroy", "weaken", "against")
    const conflictPatterns = /(?:defeat|destroy|weaken|against|battle|fight)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    while ((match = conflictPatterns.exec(narrativeImpact)) !== null) {
      const conflict = match[1];
      if (!storyProgress.ongoing_conflicts.includes(conflict) && storyProgress.ongoing_conflicts.length < 10) {
        storyProgress.ongoing_conflicts.push(conflict);
      }
    }
  }

  return {
    currentThread: newCurrentThread,
    storyProgress: storyProgress
  };
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
