export function checkBossEncounter(quests) {
  const incomplete = quests.filter(q => !q.completed);
  
  if (incomplete.length >= 3) {
    return {
      type: 'procrastination_dragon',
      name: 'Procrastination Dragon',
      description: 'A fearsome beast that grows stronger with each incomplete quest',
      emoji: '🐉',
    };
  }

  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  const recentCompletions = quests.filter(q => 
    q.completed && new Date(q.completed_at) > threeDaysAgo
  );

  if (recentCompletions.length >= 3) {
    return {
      type: 'momentum_phoenix',
      name: 'Momentum Phoenix',
      description: 'Born from your streak of productivity',
      emoji: '🔥',
    };
  }

  return null;
}

export function calculateStreak(lastQuestDate, currentStreak) {
  if (!lastQuestDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastDate = new Date(lastQuestDate);
  lastDate.setHours(0, 0, 0, 0);

  const diffTime = today - lastDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return currentStreak;
  if (diffDays === 1) return currentStreak + 1;
  return 0;
}

export function checkComebackBonus(lastQuestDate) {
  if (!lastQuestDate) return false;

  const today = new Date();
  const lastDate = new Date(lastQuestDate);
  const diffTime = today - lastDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays >= 3;
}

export function getCreatureCompanion(quests, lastQuestDate) {
  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);

  const recentCompletions = quests.filter(q =>
    q.completed && new Date(q.completed_at) > threeDaysAgo
  ).length;

  if (recentCompletions >= 3) {
    return {
      name: 'Phoenix',
      emoji: '🔥',
      image: '/images/companions/phoenix.png',
      description: 'Hot streak companion - Born from completing 3+ quests in 3 days!'
    };
  }

  if (lastQuestDate) {
    const daysSinceQuest = (today - new Date(lastQuestDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceQuest >= 3) {
      return {
        name: 'Wyrm',
        emoji: '🐛',
        image: '/images/companions/wyrm.png',
        description: 'Procrastination Wyrm - Appears after 3+ days of inactivity'
      };
    }
  }

  const incomplete = quests.filter(q => !q.completed).length;
  if (incomplete >= 3) {
    return {
      name: 'Golem',
      emoji: '🗿',
      image: '/images/companions/golem.png',
      description: 'Guilt Golem - Carries the weight of 3+ incomplete quests'
    };
  }

  return {
    name: 'Sprite',
    emoji: '✨',
    image: null, // No image yet, use emoji
    description: 'Default companion - Your starting companion'
  };
}
