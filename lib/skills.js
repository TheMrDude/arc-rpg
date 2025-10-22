export const skills = {
  warrior: [
    { level: 5, name: 'Battle Hardened', description: '+5 bonus XP on hard quests' },
    { level: 10, name: 'Unstoppable Force', description: '7-day streaks give double XP' },
    { level: 15, name: "Conquerer's Will", description: 'Comeback bonus increases to 30 XP' },
    { level: 20, name: 'Legendary Hero', description: 'All quests give +10 XP' },
  ],
  builder: [
    { level: 5, name: 'Master Craftsman', description: '+10% XP on all quests' },
    { level: 10, name: 'Foundation Expert', description: 'Complete 3 quests in a day for bonus 25 XP' },
    { level: 15, name: 'Architect Vision', description: 'Can plan tomorrow\'s quests' },
    { level: 20, name: 'Grand Constructor', description: 'Double XP on weekly stories' },
  ],
  shadow: [
    { level: 5, name: 'Quick Reflexes', description: 'Easy quests give 15 XP instead of 10' },
    { level: 10, name: 'Shadow Strike', description: 'Random quest each day gives 2x XP' },
    { level: 15, name: 'Master Infiltrator', description: 'Can steal XP from incomplete quests' },
    { level: 20, name: 'Phantom', description: 'Invisible quests - complete without tracking' },
  ],
  sage: [
    { level: 5, name: 'Ancient Knowledge', description: '+10% XP on all quests' },
    { level: 10, name: 'Wisdom Keeper', description: 'Weekly stories give 50 bonus XP' },
    { level: 15, name: 'Time Bender', description: 'Can complete yesterday\'s missed quests' },
    { level: 20, name: 'Enlightened One', description: 'Permanent 2x XP on all actions' },
  ],
  seeker: [
    { level: 5, name: 'Curious Mind', description: 'XP from exploration and discovery' },
    { level: 10, name: 'Pathfinder', description: 'New quest types unlock' },
    { level: 15, name: 'Horizon Walker', description: 'Completing quests boosts next quest XP by 25%' },
    { level: 20, name: 'Legend', description: 'All achievements legendary, permanent 2x XP' },
  ],
};

export function getUnlockedSkills(archetype, level) {
  return skills[archetype]?.filter(skill => level >= skill.level) || [];
}
