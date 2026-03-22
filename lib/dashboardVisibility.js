/**
 * Progressive reveal system for dashboard sections.
 * Sections unlock based on user level and activity milestones.
 */
export function getDashboardSections(profile) {
  const level = profile?.level || 1;
  const questsCompleted = profile?.quests_completed || 0;
  const hasStory = !!(profile?.current_story_thread || (profile?.story_progress?.threads_completed?.length > 0));

  return {
    // Always visible (Level 1+)
    characterCard: true,
    questInput: true,
    activeQuests: true,
    minimalNav: true,

    // Level 3+ OR 5+ quests
    dailyBonusSimple: level >= 3 || questsCompleted >= 5,
    companion: level >= 3 || questsCompleted >= 5,

    // Level 5+ OR 15+ quests completed
    unlockedSkills: level >= 5 || questsCompleted >= 15,
    historyNav: level >= 5 || questsCompleted >= 15,
    achievementsEarned: level >= 5 || questsCompleted >= 15,

    // Level 7+ OR has story
    yourStory: level >= 7 || hasStory,
    journeyNav: level >= 7 || hasStory,

    // Level 10+
    fullDailyBonus: level >= 10,
    recurringTab: level >= 10,
    templatesTab: level >= 10,
    equipmentTab: level >= 10,
    journalTab: level >= 10,
    eventsTab: level >= 10,
    switchArchetype: level >= 10,
    skillTree: level >= 10,
    tabBar: level >= 10,

    // REMOVED from dashboard entirely
    aiUsage: false,
    shareHabitQuest: false,
  };
}

/**
 * Check which sections were just unlocked (for toast notifications).
 * Compares current visibility against what's been shown before.
 */
export function getNewUnlocks(sections, userId) {
  if (typeof window === 'undefined') return [];

  const storageKey = `unlocks_shown_${userId}`;
  const shownUnlocks = JSON.parse(localStorage.getItem(storageKey) || '{}');

  const unlockMessages = {
    dailyBonusSimple: { title: 'Daily Bonus', description: 'Complete quests to earn bonus gold every day!', icon: '🎁' },
    companion: { title: 'Companion Creature', description: 'A companion has joined your adventure!', icon: '🐉' },
    unlockedSkills: { title: 'Skills', description: 'You can now see your unlocked skills!', icon: '⚡' },
    historyNav: { title: 'Quest History', description: 'View your completed quest history!', icon: '📜' },
    achievementsEarned: { title: 'Achievements', description: 'Track your earned badges and achievements!', icon: '🏆' },
    yourStory: { title: 'Your Story', description: 'Your epic narrative unfolds!', icon: '📖' },
    journeyNav: { title: 'My Journey', description: 'Explore your full adventure timeline!', icon: '🗺️' },
    tabBar: { title: 'Full Dashboard', description: 'All features unlocked! Recurring quests, templates, equipment, journal, and events!', icon: '🔓' },
  };

  const newUnlocks = [];

  for (const [key, message] of Object.entries(unlockMessages)) {
    if (sections[key] && !shownUnlocks[key]) {
      newUnlocks.push({ key, ...message });
      shownUnlocks[key] = true;
    }
  }

  if (newUnlocks.length > 0) {
    localStorage.setItem(storageKey, JSON.stringify(shownUnlocks));
  }

  return newUnlocks;
}
