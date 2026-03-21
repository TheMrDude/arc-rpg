'use client';

import { useState, useEffect } from 'react';

export default function AchievementBadges({ profile, quests }) {
  const [unlockedBadges, setUnlockedBadges] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('habitquest_unlocked_badges');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(null);

  const badges = [
    {
      id: 'first_quest',
      name: 'First Steps',
      description: 'Complete your first quest',
      icon: '🎯',
      condition: (p, q) => q.filter(quest => quest.completed).length >= 1
    },
    {
      id: 'streak_7',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      condition: (p) => p.current_streak >= 7
    },
    {
      id: 'streak_30',
      name: 'Monthly Master',
      description: 'Maintain a 30-day streak',
      icon: '💪',
      condition: (p) => p.current_streak >= 30
    },
    {
      id: 'level_10',
      name: 'Rising Hero',
      description: 'Reach Level 10',
      icon: '⚡',
      condition: (p) => p.level >= 10
    },
    {
      id: 'level_25',
      name: 'Legendary Adventurer',
      description: 'Reach Level 25',
      icon: '👑',
      condition: (p) => p.level >= 25
    },
    {
      id: 'quests_100',
      name: 'Centurion',
      description: 'Complete 100 quests',
      icon: '💯',
      condition: (p, q) => q.filter(quest => quest.completed).length >= 100
    },
    {
      id: 'gold_1000',
      name: 'Wealthy',
      description: 'Accumulate 1,000 gold',
      icon: '💰',
      condition: (p) => p.gold >= 1000
    },
    {
      id: 'premium',
      name: 'Pro Member',
      description: 'Unlock Pro status',
      icon: '⭐',
      condition: (p) => p.is_premium || p.subscription_status === 'active'
    },
  ];

  useEffect(() => {
    if (!profile || !quests) return;

    // Always read from localStorage to avoid stale closure issues
    let alreadySeen = [];
    try {
      const stored = localStorage.getItem('habitquest_unlocked_badges');
      if (stored) alreadySeen = JSON.parse(stored);
    } catch {}
    const seenIds = new Set(alreadySeen.map(b => b.id));

    const newlyUnlocked = badges.filter(badge => {
      return badge.condition(profile, quests) && !seenIds.has(badge.id);
    });

    if (newlyUnlocked.length > 0) {
      const updated = [
        ...alreadySeen,
        ...newlyUnlocked.map(b => ({ id: b.id, unlockedAt: Date.now() }))
      ];
      setUnlockedBadges(updated);
      try { localStorage.setItem('habitquest_unlocked_badges', JSON.stringify(updated)); } catch {}

      // Show celebration for first newly unlocked badge
      setShowBadgeUnlock(newlyUnlocked[0]);
      setTimeout(() => setShowBadgeUnlock(null), 5000);
    } else {
      // Sync state with what's stored (no popup)
      setUnlockedBadges(alreadySeen);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.level, profile?.current_streak, profile?.gold, quests?.length]);

  const allBadges = badges.map(badge => {
    const isUnlocked = profile && quests ? badge.condition(profile, quests) : false;
    const unlockedData = unlockedBadges.find(b => b.id === badge.id);
    return { ...badge, isUnlocked, unlockedAt: unlockedData?.unlockedAt };
  });

  const unlockedCount = allBadges.filter(b => b.isUnlocked).length;
  const totalCount = allBadges.length;

  return (
    <>
      {/* Badge Unlock Celebration */}
      {showBadgeUnlock && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-up">
          <div className="card-retro-success p-6 shadow-2xl max-w-sm">
            <div className="text-center">
              <div className="text-6xl mb-3 animate-bounce">{showBadgeUnlock.icon}</div>
              <div className="text-2xl font-black text-[#10B981] mb-2">
                BADGE UNLOCKED!
              </div>
              <div className="text-xl font-bold mb-2">{showBadgeUnlock.name}</div>
              <div className="text-sm text-gray-300">{showBadgeUnlock.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Display */}
      <div className="card-retro border-[#F59E0B] p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h3 className="text-xl font-black uppercase text-[#F59E0B]">Achievements</h3>
              <p className="text-sm text-gray-400">
                {unlockedCount} / {totalCount} badges earned
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-32">
            <div className="progress-bar h-3">
              <div
                className="progress-fill"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {allBadges.map((badge) => (
            <div
              key={badge.id}
              className={`
                bg-[#0F172A] rounded-lg p-4 text-center border-2 transition-all
                ${badge.isUnlocked
                  ? 'border-[#F59E0B] transform hover:scale-105 cursor-pointer'
                  : 'border-gray-700 opacity-40 grayscale'
                }
              `}
              title={badge.description}
            >
              <div className={`text-4xl mb-2 ${badge.isUnlocked ? '' : 'blur-sm'}`}>
                {badge.isUnlocked ? badge.icon : '🔒'}
              </div>
              <div className={`text-sm font-black ${badge.isUnlocked ? 'text-white' : 'text-gray-600'}`}>
                {badge.name}
              </div>
              {!badge.isUnlocked && (
                <div className="text-xs text-gray-500 mt-1">{badge.description}</div>
              )}
            </div>
          ))}
        </div>

        {unlockedCount < totalCount && (
          <div className="mt-4 pt-4 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400">
              Unlock <span className="text-[#F59E0B] font-bold">{totalCount - unlockedCount} more badges</span> by completing quests and leveling up!
            </p>
          </div>
        )}
      </div>
    </>
  );
}
