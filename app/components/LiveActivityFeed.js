'use client';

import { useState, useEffect } from 'react';

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState([]);

  const archetypes = ['Warrior', 'Builder', 'Shadow', 'Sage', 'Seeker'];
  const achievements = [
    { text: 'reached Level 25', icon: '⚡', color: '#F59E0B' },
    { text: 'completed a 30-day streak', icon: '🔥', color: '#FF5733' },
    { text: 'defeated a Boss', icon: '⚔️', color: '#10B981' },
    { text: 'upgraded to Founder', icon: '👑', color: '#7C3AED' },
    { text: 'unlocked a new skill', icon: '💎', color: '#3B82F6' },
    { text: 'completed 10 quests today', icon: '🎯', color: '#10B981' },
    { text: 'earned 500 gold', icon: '💰', color: '#F59E0B' },
  ];

  const names = [
    'Alex', 'Sam', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn',
    'Taylor', 'Cameron', 'Dakota', 'Skyler', 'Parker', 'Reese', 'Jamie'
  ];

  const generateActivity = () => {
    const name = names[Math.floor(Math.random() * names.length)];
    const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
    const achievement = achievements[Math.floor(Math.random() * achievements.length)];
    const timeAgo = Math.floor(Math.random() * 60) + 1; // 1-60 minutes ago

    return {
      id: Date.now() + Math.random(),
      name,
      archetype,
      achievement,
      timeAgo,
      timestamp: Date.now()
    };
  };

  useEffect(() => {
    // Initialize with some activities
    const initial = Array.from({ length: 5 }, () => generateActivity());
    setActivities(initial);

    // Add new activity every 8-15 seconds
    const interval = setInterval(() => {
      const newActivity = generateActivity();
      setActivities(prev => [newActivity, ...prev].slice(0, 10)); // Keep only latest 10
    }, Math.random() * 7000 + 8000);

    return () => clearInterval(interval);
  }, []);

  if (activities.length === 0) return null;

  return (
    <div className="card-retro border-[#3B82F6] p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🌍</span>
        <div>
          <h3 className="text-xl font-black uppercase text-[#3B82F6]">Live Activity Feed</h3>
          <p className="text-sm text-gray-400">Heroes around the world conquering their quests</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-green-400 font-bold">LIVE</span>
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="bg-[#0F172A] rounded-lg p-3 border-l-4 animate-slide-in-up"
            style={{
              borderColor: activity.achievement.color,
              animationDelay: `${index * 0.1}s`,
              opacity: 1 - (index * 0.08) // Fade older items
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activity.achievement.icon}</span>
              <div className="flex-1">
                <div className="text-sm">
                  <span className="font-black text-white">{activity.name}</span>
                  <span className="text-gray-400"> the </span>
                  <span className="font-bold" style={{ color: activity.achievement.color }}>
                    {activity.archetype}
                  </span>
                  <span className="text-gray-400"> {activity.achievement.text}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{activity.timeAgo}m ago</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 text-center">
        <p className="text-sm text-gray-400 mb-3">
          Join <span className="text-[#F59E0B] font-black">1,200+</span> active heroes leveling up their lives
        </p>
        <button
          onClick={() => window.location.href = '/pricing'}
          className="btn-retro btn-primary text-sm py-2 px-6"
        >
          🚀 Start Your Journey
        </button>
      </div>
    </div>
  );
}
