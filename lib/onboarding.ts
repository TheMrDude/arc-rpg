import { SupabaseClient } from '@supabase/supabase-js';

export interface PreviewQuest {
  original: string;
  transformed: string;
  xp: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function calculateXP(taskText: string): number {
  const wordCount = taskText.split(' ').filter(w => w.length > 0).length;

  // Longer, more complex tasks = more XP
  if (wordCount > 10) return 50;
  if (wordCount > 5) return 35;
  return 25;
}

export function calculateDifficulty(taskText: string): 'easy' | 'medium' | 'hard' {
  const wordCount = taskText.split(' ').filter(w => w.length > 0).length;

  if (wordCount > 10) return 'hard';
  if (wordCount > 5) return 'medium';
  return 'easy';
}

export async function handleFirstQuestCompletion(
  userId: string,
  previewQuest: PreviewQuest,
  supabase: SupabaseClient
): Promise<{ success: boolean; newXP: number; newLevel: number }> {
  try {
    // 1. Get current user profile (may not exist yet due to trigger timing)
    let profile = null;
    let retries = 3;

    while (retries > 0) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileError && data) {
        profile = data;
        break;
      }

      // Profile doesn't exist yet, wait and retry
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // If profile still doesn't exist after retries, return gracefully
    if (!profile) {
      console.warn('Profile not found for user after retries:', userId);
      return { success: false, newXP: 0, newLevel: 1 };
    }

    const currentXP = profile.xp || 0;
    const currentLevel = profile.level || 1;
    const newXP = currentXP + previewQuest.xp;

    // Simple level calculation (100 XP per level)
    const newLevel = Math.floor(newXP / 100) + 1;

    // 2. Insert the quest as completed
    const { error: questError } = await supabase
      .from('quests')
      .insert({
        user_id: userId,
        original_task: previewQuest.original,
        epic_task: previewQuest.transformed,
        difficulty: previewQuest.difficulty,
        xp_reward: previewQuest.xp,
        completed: true,
        completed_at: new Date().toISOString()
      });

    if (questError) throw questError;

    // 3. Update user profile with new XP and level
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        xp: newXP,
        level: newLevel,
        total_quests_completed: (profile.total_quests_completed || 0) + 1
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true, newXP, newLevel };
  } catch (error) {
    console.error('Error in handleFirstQuestCompletion:', error);
    return { success: false, newXP: 0, newLevel: 1 };
  }
}

// Store preview quest in localStorage before signup
export function storePreviewQuest(quest: PreviewQuest): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('habitquest_preview_quest', JSON.stringify(quest));
  }
}

// Retrieve preview quest after signup
export function getStoredPreviewQuest(): PreviewQuest | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('habitquest_preview_quest');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Clear stored preview quest
export function clearStoredPreviewQuest(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('habitquest_preview_quest');
  }
}
