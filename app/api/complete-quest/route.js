import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, checkPremiumStatus } from '@/lib/api-auth';
import { getOrCreateWeeklyBoss, getBossById, randomHitLine } from '@/lib/bosses';
import { rollForEncounter, getEncounterRewards } from '@/lib/encounterService';
import { getIsoWeekKey } from '@/lib/date-utils';
import { MOMENTUM_GOAL_DAYS } from '@/lib/momentum';
import { advanceWelcomeChain } from '@/lib/quest-chain';
import { getStoryBeat } from '@/lib/storyBeats';

const MOMENTUM_BONUS_XP = 25;

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

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Calculate XP multiplier from equipped items.
    // user_equipment.equipped is the source of truth for equip state
    // (the shop UI writes it); profiles.equipped_* columns are legacy
    // and no longer written by any flow.
    let xpMultiplier = 1.0;
    const { data: equippedGear } = await supabaseAdmin
      .from('user_equipment')
      .select('equipment:equipment_catalog(type, xp_multiplier, stat_bonus)')
      .eq('user_id', user.id)
      .eq('equipped', true);

    for (const row of equippedGear || []) {
      const item = row.equipment;
      if (!item || !['weapon', 'armor', 'accessory'].includes(item.type)) continue;
      // stat_bonus (JSONB) takes priority: the xp_multiplier column has a
      // 1.00 default, so it can't distinguish "no bonus" from "unset" for
      // items seeded with stat_bonus only.
      const itemMultiplier = parseFloat(
        item.stat_bonus?.xp_multiplier ?? item.xp_multiplier ?? 1.0
      );
      if (!Number.isNaN(itemMultiplier)) {
        xpMultiplier += itemMultiplier - 1.0;
      }
    }

    // Calculate comeback bonus
    const comebackBonus = checkComebackBonus(profile.last_quest_date);
    const bonusXP = comebackBonus ? 20 : 0;

    // Check for active effects (bonus_xp, double_xp from encounters)
    let effectBonusXP = 0;
    let effectMultiplier = 1;
    let effectsToConsume = [];
    try {
      const { data: activeEffects } = await supabaseAdmin
        .from('active_effects')
        .select('*')
        .eq('user_id', user.id)
        .gt('quests_remaining', 0);

      if (activeEffects && activeEffects.length > 0) {
        for (const effect of activeEffects) {
          if (effect.effect_type === 'bonus_xp') {
            effectBonusXP += effect.effect_value;
          } else if (effect.effect_type === 'double_xp') {
            effectMultiplier = Math.max(effectMultiplier, effect.effect_value);
          }
          effectsToConsume.push(effect);
        }
      }
    } catch (err) {
      // active_effects table may not exist yet — ignore
    }

    // Calculate total XP with equipment bonuses + active effects
    const baseXP = quest.xp_value + bonusXP + effectBonusXP;
    const totalXP = Math.floor(baseXP * xpMultiplier * effectMultiplier);
    const equipmentBonus = totalXP - baseXP;

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
    let newGoldBalance = result?.new_balance || profile.gold + goldReward;

    // Consume active effects (decrement quests_remaining, delete if 0)
    for (const effect of effectsToConsume) {
      try {
        const newRemaining = effect.quests_remaining - 1;
        if (newRemaining <= 0) {
          await supabaseAdmin.from('active_effects').delete().eq('id', effect.id);
        } else {
          await supabaseAdmin.from('active_effects').update({ quests_remaining: newRemaining }).eq('id', effect.id);
        }
      } catch (err) {
        console.error('Failed to consume effect:', err);
      }
    }

    // Increment quests_completed counter
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ quests_completed: (profile.quests_completed || 0) + 1 })
        .eq('id', user.id);
    } catch (err) {
      // Column may not exist yet — ignore
    }

    // D10 Random Encounter System (30% chance)
    let encounterResponse = null;
    const encounter = rollForEncounter();

    if (encounter) {
      const { goldChange, effectToCreate } = getEncounterRewards(encounter);

      // Apply encounter gold (positive or negative)
      if (goldChange !== 0) {
        try {
          const { data: encounterGoldTx } = await supabaseAdmin
            .rpc('process_gold_transaction', {
              p_user_id: user.id,
              p_amount: goldChange,
              p_transaction_type: 'encounter_reward',
              p_reference_id: quest_id,
              p_metadata: {
                encounter_name: encounter.name,
                encounter_roll: encounter.roll,
              }
            });
          const encounterResult = encounterGoldTx?.[0];
          if (encounterResult) {
            newGoldBalance = encounterResult.new_balance;
          } else {
            newGoldBalance = Math.max(0, newGoldBalance + goldChange);
          }
        } catch (err) {
          console.error('Failed to process encounter gold:', err);
          newGoldBalance = Math.max(0, newGoldBalance + goldChange);
        }
      }

      // Create active effect if encounter grants one
      if (effectToCreate) {
        try {
          await supabaseAdmin.from('active_effects').insert({
            user_id: user.id,
            ...effectToCreate,
          });
        } catch (err) {
          console.error('Failed to create encounter effect:', err);
        }
      }

      // Log the encounter
      try {
        await supabaseAdmin.from('encounter_log').insert({
          user_id: user.id,
          roll_value: encounter.roll,
          encounter_name: encounter.name,
          encounter_rarity: encounter.rarity,
          reward_type: encounter.rewardType,
          reward_value: encounter.rewardValue,
        });
      } catch (err) {
        // encounter_log table may not exist yet — ignore
      }

      encounterResponse = encounter;
    }

    // Chest drop: a small, always-positive bonus, mutually exclusive with
    // the D10 encounter above so a single quest completion only ever
    // triggers one surprise-reward moment (never both, never negative).
    let chestDrop = null;
    if (!encounter && Math.random() < 0.3) {
      const chestGold = Math.floor(Math.random() * 31) + 10; // 10-40 gold

      try {
        const { data: chestGoldTx } = await supabaseAdmin
          .rpc('process_gold_transaction', {
            p_user_id: user.id,
            p_amount: chestGold,
            p_transaction_type: 'chest_drop',
            p_reference_id: quest_id,
            p_metadata: { source: 'quest_completion' }
          });
        const chestResult = chestGoldTx?.[0];
        newGoldBalance = chestResult ? chestResult.new_balance : newGoldBalance + chestGold;
        chestDrop = { gold: chestGold };
      } catch (err) {
        console.error('Failed to process chest drop gold:', err);
      }
    }

    // Momentum meter weekly bonus: grant once per ISO week the first time
    // active days (real completions + any consumed Momentum Boost) hits
    // the 4-day goal. Never punitive, only ever adds.
    let momentumFilled = false;
    let momentumBonusXP = 0;
    let finalXP = newXP;
    let finalLevel = newLevel;
    const currentWeek = getIsoWeekKey();

    if (profile.momentum_week_claimed !== currentWeek) {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentQuests } = await supabaseAdmin
          .from('quests')
          .select('completed_at')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('completed_at', sevenDaysAgo);

        const activeDays = new Set(
          (recentQuests || []).map((q) => new Date(q.completed_at).toISOString().slice(0, 10))
        );
        let activeDayCount = activeDays.size;
        if (profile.momentum_boost_week === currentWeek) {
          activeDayCount += 1;
        }

        if (activeDayCount >= MOMENTUM_GOAL_DAYS) {
          momentumFilled = true;
          momentumBonusXP = MOMENTUM_BONUS_XP;
          finalXP = newXP + momentumBonusXP;
          finalLevel = Math.floor(finalXP / 100) + 1;

          await supabaseAdmin
            .from('profiles')
            .update({
              xp: finalXP,
              level: finalLevel,
              momentum_week_claimed: currentWeek,
            })
            .eq('id', user.id);
        }
      } catch (err) {
        console.error('Failed to evaluate momentum bonus:', err);
      }
    }

    // Welcome Quest chain: quest completions can satisfy steps 1, 2, 3, 5, 7
    // (and any later step already satisfied by history). Never throws.
    const welcomeChain = await advanceWelcomeChain(user.id, 'quest_completed');
    if (welcomeChain?.advanced?.length) {
      // Chain XP was added after finalXP was computed — reflect it in the response
      const chainXP = welcomeChain.advanced.reduce((sum, s) => sum + s.reward_xp, 0);
      const chainGold = welcomeChain.advanced.reduce((sum, s) => sum + s.reward_gold, 0);
      finalXP += chainXP;
      finalLevel = Math.floor(finalXP / 100) + 1;
      newGoldBalance += chainGold;
    }

    // Achievements: best-effort server-side check. The RPC returns setof text
    // (the newly unlocked achievement ids); we join them against the
    // achievements table for display data. Never blocks completion.
    let newlyUnlockedAchievements = [];
    try {
      const { data: unlockedIds, error: achievementError } = await supabaseAdmin
        .rpc('check_achievements_for_user', { p_user_id: user.id });

      if (achievementError) {
        console.error('Achievement check failed:', achievementError);
      } else if (Array.isArray(unlockedIds) && unlockedIds.length > 0) {
        // setof text usually arrives as ['id', ...] but some client versions
        // wrap rows as [{ check_achievements_for_user: 'id' }]
        const ids = unlockedIds
          .map((row) => (typeof row === 'string' ? row : Object.values(row || {})[0]))
          .filter(Boolean);

        if (ids.length > 0) {
          let { data: achievementRows, error: joinError } = await supabaseAdmin
            .from('achievements')
            .select('*')
            .in('id', ids);

          // Fallback: some achievement functions return keys rather than uuids
          if (joinError || !achievementRows || achievementRows.length === 0) {
            const { data: byKey } = await supabaseAdmin
              .from('achievements')
              .select('*')
              .in('key', ids);
            achievementRows = byKey;
          }

          newlyUnlockedAchievements = (achievementRows || []).map((a) => ({
            id: a.id,
            name: a.name || a.title,
            icon: a.icon,
            rarity: a.rarity,
            description: a.description,
            xp_reward: a.xp_reward || 0,
          }));
        }
      }
    } catch (err) {
      // Achievements are best-effort; completion always succeeds regardless
      console.error('Achievement check threw:', err);
    }

    // Weekly boss battle: every completed quest deals 1 damage. Best-effort
    // (try/catch, never blocks completion). Defeat pays out gold (and, for
    // Pro, a random unowned equipment drop). An unbeaten boss only ever
    // retreats at week's end — never damage to the player, never a loss.
    let bossResponse = null;
    try {
      const bossRow = await getOrCreateWeeklyBoss(
        supabaseAdmin,
        user.id,
        finalLevel,
        currentWeek
      );

      if (bossRow) {
        const bossDef = getBossById(bossRow.boss_id);
        bossResponse = {
          boss_name: bossRow.boss_name,
          boss_icon: bossRow.boss_icon,
          max_hp: bossRow.max_hp,
          damage_dealt: bossRow.damage_dealt,
          status: bossRow.status,
          just_hit: false,
          just_defeated: false,
          hit_line: null,
          defeat_line: bossDef?.defeatLine || null,
          reward: bossRow.reward || null,
        };

        if (bossRow.status === 'active' && bossRow.damage_dealt < bossRow.max_hp) {
          const newDamage = Math.min(bossRow.damage_dealt + 1, bossRow.max_hp);
          const isKillingBlow = newDamage >= bossRow.max_hp;

          // Claim the hit atomically: the status guard means a concurrent
          // completion can't double-count the killing blow or its rewards.
          const update = isKillingBlow
            ? { damage_dealt: newDamage, status: 'defeated', defeated_at: new Date().toISOString() }
            : { damage_dealt: newDamage };

          const { data: updatedBoss } = await supabaseAdmin
            .from('weekly_boss_battles')
            .update(update)
            .eq('id', bossRow.id)
            .eq('status', 'active')
            .eq('damage_dealt', bossRow.damage_dealt)
            .select()
            .single();

          if (updatedBoss) {
            bossResponse.damage_dealt = updatedBoss.damage_dealt;
            bossResponse.status = updatedBoss.status;
            bossResponse.just_hit = true;

            if (isKillingBlow) {
              bossResponse.just_defeated = true;

              // Rewards: base gold scales with boss HP
              const reward = {
                gold: 100 + 25 * (bossRow.max_hp - 5),
                equipment: null,
                bonus_gold: 0,
              };

              // Pro bonus: one random unowned equipment drop, or 150 bonus
              // gold if the armory is already complete
              try {
                const { isPremium } = await checkPremiumStatus(user.id);
                if (isPremium) {
                  const [{ data: catalog }, { data: owned }] = await Promise.all([
                    supabaseAdmin
                      .from('equipment_catalog')
                      .select('id, name, emoji, rarity')
                      .eq('is_active', true),
                    supabaseAdmin
                      .from('user_equipment')
                      .select('equipment_id')
                      .eq('user_id', user.id),
                  ]);

                  const ownedIds = new Set((owned || []).map((r) => r.equipment_id));
                  const unowned = (catalog || []).filter((item) => !ownedIds.has(item.id));

                  if (unowned.length > 0) {
                    const drop = unowned[Math.floor(Math.random() * unowned.length)];
                    const { error: dropError } = await supabaseAdmin
                      .from('user_equipment')
                      .insert({
                        user_id: user.id,
                        equipment_id: drop.id,
                        equipped: false,
                        acquired_at: new Date().toISOString(),
                      });
                    if (!dropError) {
                      reward.equipment = {
                        id: drop.id,
                        name: drop.name,
                        emoji: drop.emoji,
                        rarity: drop.rarity,
                      };
                    } else {
                      console.error('Boss equipment drop failed:', dropError);
                      reward.bonus_gold = 150;
                    }
                  } else {
                    reward.bonus_gold = 150;
                  }
                }
              } catch (proErr) {
                console.error('Boss Pro reward check failed:', proErr);
              }

              // Award the gold (base + any bonus) atomically
              const bossGold = reward.gold + reward.bonus_gold;
              try {
                const { data: bossGoldTx, error: bossGoldError } = await supabaseAdmin
                  .rpc('process_gold_transaction', {
                    p_user_id: user.id,
                    p_amount: bossGold,
                    p_transaction_type: 'boss_reward',
                    p_reference_id: bossRow.id,
                    p_metadata: {
                      boss_id: bossRow.boss_id,
                      boss_name: bossRow.boss_name,
                      week_key: currentWeek,
                    },
                  });
                if (bossGoldError) {
                  console.error('Boss gold award failed:', bossGoldError);
                  newGoldBalance += bossGold;
                } else {
                  const bossGoldResult = bossGoldTx?.[0];
                  newGoldBalance = bossGoldResult?.new_balance ?? newGoldBalance + bossGold;
                }
              } catch (goldErr) {
                console.error('Boss gold award threw:', goldErr);
                newGoldBalance += bossGold;
              }

              // Persist the reward summary on the battle row
              await supabaseAdmin
                .from('weekly_boss_battles')
                .update({ reward })
                .eq('id', bossRow.id);

              bossResponse.reward = reward;
            } else {
              bossResponse.hit_line = randomHitLine(bossRow.boss_id);
            }
          }
        }
      }
    } catch (bossErr) {
      // Boss battles are best-effort; completion always succeeds regardless
      console.error('Weekly boss damage failed:', bossErr);
      bossResponse = null;
    }

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
      encounter: encounter?.name || null,
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
        new_level: finalLevel,
        level_up: finalLevel > profile.level,
        skill_points_earned: skillPointsEarned,
        chest_drop: chestDrop,
        momentum_filled: momentumFilled,
        momentum_bonus_xp: momentumBonusXP,
      },
      profile: {
        xp: finalXP,
        level: finalLevel,
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
      encounter: encounterResponse,
      chest_drop: chestDrop,
      welcome_chain: welcomeChain,
      // One short flavor line, deterministic per quest (no AI call)
      story_beat: getStoryBeat(profile.archetype, quest_id),
      newly_unlocked_achievements: newlyUnlockedAchievements,
      // Weekly boss battle state (null if the boss step failed; best-effort)
      boss: bossResponse,
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
