'use client';
import GlobalFooter from '@/app/components/GlobalFooter';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Define skill trees
const SKILL_TREES = {
  power: {
    name: 'Power Tree',
    color: 'red',
    icon: '💪',
    skills: [
      { id: 'power_1', name: 'Strength I', description: '+5% XP on all quests', cost: 1, requires: [] },
      { id: 'power_2', name: 'Strength II', description: '+10% XP on all quests', cost: 1, requires: ['power_1'] },
      { id: 'power_3', name: 'Titan Force', description: '+20% XP on hard quests', cost: 2, requires: ['power_2'] },
      { id: 'power_4', name: 'Unstoppable', description: 'Streaks give bonus XP', cost: 2, requires: ['power_2'] },
      { id: 'power_5', name: 'Legendary Might', description: '+50% XP on boss battles', cost: 3, requires: ['power_3', 'power_4'] },
    ]
  },
  wisdom: {
    name: 'Wisdom Tree',
    color: 'blue',
    icon: '📚',
    skills: [
      { id: 'wisdom_1', name: 'Knowledge I', description: 'Weekly summaries more detailed', cost: 1, requires: [] },
      { id: 'wisdom_2', name: 'Knowledge II', description: 'AI narration enhanced', cost: 1, requires: ['wisdom_1'] },
      { id: 'wisdom_3', name: 'Deep Insight', description: 'Story context remembers more', cost: 2, requires: ['wisdom_2'] },
      { id: 'wisdom_4', name: 'Time Mastery', description: 'Templates generate at optimal times', cost: 2, requires: ['wisdom_2'] },
      { id: 'wisdom_5', name: 'Omniscient', description: 'Perfect AI personalization', cost: 3, requires: ['wisdom_3', 'wisdom_4'] },
    ]
  },
  efficiency: {
    name: 'Efficiency Tree',
    color: 'green',
    icon: '⚡',
    skills: [
      { id: 'efficiency_1', name: 'Speed I', description: 'Easy quests give +2 XP', cost: 1, requires: [] },
      { id: 'efficiency_2', name: 'Speed II', description: 'Easy quests give +5 XP', cost: 1, requires: ['efficiency_1'] },
      { id: 'efficiency_3', name: 'Multitasker', description: 'Complete 5 quests for bonus 50 XP', cost: 2, requires: ['efficiency_2'] },
      { id: 'efficiency_4', name: 'Automation', description: 'Templates auto-adjust difficulty', cost: 2, requires: ['efficiency_2'] },
      { id: 'efficiency_5', name: 'Time Lord', description: 'Double XP Fridays', cost: 3, requires: ['efficiency_3', 'efficiency_4'] },
    ]
  },
  fortune: {
    name: 'Fortune Tree',
    color: 'yellow',
    icon: '🍀',
    skills: [
      { id: 'fortune_1', name: 'Lucky I', description: '10% chance for double XP', cost: 1, requires: [] },
      { id: 'fortune_2', name: 'Lucky II', description: '20% chance for double XP', cost: 1, requires: ['fortune_1'] },
      { id: 'fortune_3', name: 'Treasure Hunter', description: 'Random bonus equipment drops', cost: 2, requires: ['fortune_2'] },
      { id: 'fortune_4', name: 'Comeback King', description: 'Longer breaks = bigger bonuses', cost: 2, requires: ['fortune_2'] },
      { id: 'fortune_5', name: 'Fates Chosen', description: 'All luck chances doubled', cost: 3, requires: ['fortune_3', 'fortune_4'] },
    ]
  },
};

export default function SkillsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [unlockedSkills, setUnlockedSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTree, setActiveTree] = useState('power');

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Check if user is premium (either via subscription or is_premium flag)
      if (profileData.subscription_status !== 'active' && !profileData.is_premium) {
        router.push('/dashboard');
        return;
      }

      // Load unlocked skills
      const { data: skills } = await supabase
        .from('unlocked_skills')
        .select('*')
        .eq('user_id', user.id);

      setUnlockedSkills(skills || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function isSkillUnlocked(skillId) {
    return unlockedSkills.some(s => s.skill_id === skillId);
  }

  function canUnlockSkill(skill) {
    // Check if user has enough skill points
    if (profile.skill_points < skill.cost) return false;

    // Check if skill is already unlocked
    if (isSkillUnlocked(skill.id)) return false;

    // Check if requirements are met
    if (skill.requires.length === 0) return true;

    return skill.requires.every(reqId => isSkillUnlocked(reqId));
  }

  async function unlockSkill(skill, treeName) {
    if (!canUnlockSkill(skill)) {
      alert('Cannot unlock this skill yet!');
      return;
    }

    if (!confirm(`Unlock "${skill.name}" for ${skill.cost} skill points?`)) return;

    try {
      // Insert into unlocked_skills
      const { error: insertError } = await supabase
        .from('unlocked_skills')
        .insert({
          user_id: user.id,
          skill_id: skill.id,
          skill_tree: treeName,
        });

      if (insertError) throw insertError;

      // Deduct skill points
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ skill_points: profile.skill_points - skill.cost })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Reload data
      loadUserData();
    } catch (error) {
      console.error('Error unlocking skill:', error);
      alert('Failed to unlock skill');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const currentTree = SKILL_TREES[activeTree];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Skill Trees</h1>
            <p className="text-gray-300">Spend skill points to unlock powerful abilities</p>
            <div className="flex items-center gap-6 mt-4">
              <div className="text-2xl font-bold text-yellow-400">
                {profile.skill_points} Skill Points Available
              </div>
              <div className="text-gray-400">
                Total Earned: {profile.total_skill_points_earned} (1 point every 5 levels)
              </div>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
            Back to Dashboard
          </button>
        </div>

        {/* Tree Tabs */}
        <div className="flex gap-2 mb-8">
          {Object.entries(SKILL_TREES).map(([key, tree]) => {
            const unlockedInTree = unlockedSkills.filter(s => s.skill_tree === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveTree(key)}
                className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all ${
                  activeTree === key
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black transform scale-105'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{tree.icon}</span>
                  <div>
                    <div>{tree.name}</div>
                    <div className="text-xs opacity-75">{unlockedInTree}/{tree.skills.length} unlocked</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Skill Tree */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
          <div className="text-center mb-8">
            <span className="text-6xl">{currentTree.icon}</span>
            <h2 className="text-3xl font-bold mt-4">{currentTree.name}</h2>
          </div>

          {/* Skills in vertical tree layout */}
          <div className="space-y-6">
            {currentTree.skills.map((skill, index) => {
              const unlocked = isSkillUnlocked(skill.id);
              const canUnlock = canUnlockSkill(skill);
              const requirementsMet = skill.requires.length === 0 ||
                skill.requires.every(reqId => isSkillUnlocked(reqId));

              return (
                <div key={skill.id} className="flex items-center gap-4">
                  {/* Connection Line */}
                  {index > 0 && (
                    <div className="w-full h-12 flex items-center justify-center -mb-12">
                      <div className={`w-1 h-12 ${
                        requirementsMet ? 'bg-green-500' : 'bg-gray-600'
                      }`} />
                    </div>
                  )}

                  {/* Skill Card */}
                  <div
                    className={`w-full border-2 rounded-xl p-6 transition-all ${
                      unlocked
                        ? `bg-${currentTree.color}-600/30 border-${currentTree.color}-500 shadow-lg shadow-${currentTree.color}-500/50`
                        : canUnlock
                        ? 'bg-gray-700/50 border-yellow-500 hover:border-yellow-400 cursor-pointer'
                        : 'bg-gray-800/30 border-gray-600 opacity-60'
                    }`}
                    onClick={() => canUnlock && unlockSkill(skill, activeTree)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">{skill.name}</h3>
                          {unlocked && (
                            <span className="px-3 py-1 bg-green-600 rounded-full text-sm font-bold">
                              UNLOCKED
                            </span>
                          )}
                          {!unlocked && !requirementsMet && (
                            <span className="px-3 py-1 bg-red-600 rounded-full text-sm font-bold">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300">{skill.description}</p>
                        {skill.requires.length > 0 && (
                          <p className="text-sm text-gray-500 mt-2">
                            Requires: {skill.requires.map(req => {
                              const reqSkill = currentTree.skills.find(s => s.id === req);
                              return reqSkill?.name;
                            }).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="ml-6 text-right">
                        <div className="text-3xl font-bold text-yellow-400">{skill.cost}</div>
                        <div className="text-sm text-gray-400">points</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Your Progress</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {Object.entries(SKILL_TREES).map(([key, tree]) => {
              const unlockedCount = unlockedSkills.filter(s => s.skill_tree === key).length;
              const totalCount = tree.skills.length;
              const percentage = (unlockedCount / totalCount) * 100;

              return (
                <div key={key} className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{tree.icon}</span>
                    <span className="font-semibold">{tree.name}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                    <div
                      className={`bg-${tree.color}-500 h-3 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-400">
                    {unlockedCount}/{totalCount} skills
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      <GlobalFooter />
      </div>
    </div>
  );
}
