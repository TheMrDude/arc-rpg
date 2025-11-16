'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllAchievements, getUserAchievements, getTierColors, getCategoryInfo, calculateCompletionPercentage } from '@/lib/achievements';

export default function AchievementsDisplay({ userId }) {
  const [allAchievements, setAllAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  async function loadAchievements() {
    try {
      const [all, user] = await Promise.all([
        getAllAchievements(),
        getUserAchievements(userId)
      ]);

      setAllAchievements(all);
      setUserAchievements(user);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  }

  const unlockedIds = userAchievements.map(ua => ua.achievement_id);
  const completionPercentage = calculateCompletionPercentage(userAchievements, allAchievements);

  const categories = ['all', 'quest_master', 'level_up', 'streak', 'wealth', 'exploration', 'wisdom', 'special'];

  const filteredAchievements = selectedCategory === 'all'
    ? allAchievements
    : allAchievements.filter(a => a.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#FFD93D] text-lg">Loading achievements...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-2xl font-black text-[#FFD93D]">{userAchievements.length}</div>
          <div className="text-sm text-[#E2E8F0] uppercase tracking-wide">Unlocked</div>
        </div>

        <div className="bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-2xl font-black text-[#00D4FF]">{completionPercentage}%</div>
          <div className="text-sm text-[#E2E8F0] uppercase tracking-wide">Complete</div>
        </div>

        <div className="bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] border-3 border-[#48BB78] rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">⭐</div>
          <div className="text-2xl font-black text-[#48BB78]">{allAchievements.length}</div>
          <div className="text-sm text-[#E2E8F0] uppercase tracking-wide">Total</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => {
          const info = category === 'all' ? { icon: '🏆', name: 'All' } : getCategoryInfo(category);
          const isActive = selectedCategory === category;

          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wide border-2 transition-all ${
                isActive
                  ? 'bg-[#FFD93D] border-[#0F3460] text-[#0F3460] shadow-[0_3px_0_#0F3460]'
                  : 'bg-[#0F3460] border-[#1A1A2E] text-[#E2E8F0] hover:border-[#FFD93D]'
              }`}
            >
              {info.icon} {info.name}
            </button>
          );
        })}
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement, index) => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          const tierColors = getTierColors(achievement.tier);
          const categoryInfo = getCategoryInfo(achievement.category);

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative ${
                isUnlocked ? tierColors.bg : 'bg-[#0F3460] opacity-60'
              } border-3 ${
                isUnlocked ? tierColors.border : 'border-[#1A1A2E]'
              } rounded-lg p-6 ${isUnlocked ? tierColors.glow : ''} transition-all hover:scale-105`}
            >
              {/* Locked Overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex items-center justify-center z-10">
                  <span className="text-6xl">🔒</span>
                </div>
              )}

              <div className="relative z-0">
                {/* Category Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                    isUnlocked
                      ? `${tierColors.border} ${tierColors.text} bg-black bg-opacity-20`
                      : 'bg-[#1A1A2E] text-[#E2E8F0]'
                  }`}>
                    {categoryInfo.icon} {achievement.tier}
                  </span>
                </div>

                {/* Icon */}
                <div className="text-5xl mb-3 text-center">{achievement.icon}</div>

                {/* Name */}
                <h3 className={`text-lg font-black uppercase text-center mb-2 ${
                  isUnlocked ? tierColors.text : 'text-[#E2E8F0]'
                }`}>
                  {achievement.name}
                </h3>

                {/* Description */}
                <p className={`text-sm text-center mb-4 ${
                  isUnlocked ? tierColors.text + ' opacity-90' : 'text-[#E2E8F0] opacity-75'
                }`}>
                  {achievement.description}
                </p>

                {/* Rewards */}
                <div className="flex justify-center gap-3 text-sm">
                  {achievement.xp_reward > 0 && (
                    <div className={`flex items-center gap-1 ${
                      isUnlocked ? tierColors.text : 'text-[#FFD93D]'
                    }`}>
                      <span>⚡</span>
                      <span className="font-bold">+{achievement.xp_reward}</span>
                    </div>
                  )}
                  {achievement.gold_reward > 0 && (
                    <div className={`flex items-center gap-1 ${
                      isUnlocked ? tierColors.text : 'text-[#FFD93D]'
                    }`}>
                      <span>💰</span>
                      <span className="font-bold">+{achievement.gold_reward}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-[#E2E8F0] text-lg">No achievements in this category yet.</div>
        </div>
      )}
    </div>
  );
}
