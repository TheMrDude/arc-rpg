'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUnlockedSkills } from '@/lib/skills';
import { checkBossEncounter, calculateStreak, checkComebackBonus, getCreatureCompanion } from '@/lib/encounters';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuestText, setNewQuestText] = useState('');
  const [newQuestDifficulty, setNewQuestDifficulty] = useState('medium');
  const [adding, setAdding] = useState(false);

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

      if (!profileData || !profileData.archetype) {
        router.push('/select-archetype');
        return;
      }

      setProfile(profileData);

      const { data: questsData } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setQuests(questsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addQuest() {
    if (!newQuestText.trim()) return;
    setAdding(true);

    try {
      const xpValues = { easy: 10, medium: 25, hard: 50 };
      const xp = xpValues[newQuestDifficulty];

      const response = await fetch('/api/transform-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questText: newQuestText,
          archetype: profile.archetype,
          difficulty: newQuestDifficulty,
        }),
      });

      const data = await response.json();

      const { error } = await supabase
        .from('quests')
        .insert({
          user_id: user.id,
          original_text: newQuestText,
          transformed_text: data.transformedText,
          difficulty: newQuestDifficulty,
          xp_value: xp,
          completed: false,
        });

      if (error) throw error;

      setNewQuestText('');
      loadUserData();
    } catch (error) {
      console.error('Error adding quest:', error);
      alert('Failed to add quest');
    } finally {
      setAdding(false);
    }
  }

  async function completeQuest(questId, xpValue) {
    try {
      await supabase
        .from('quests')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('id', questId);

      const comebackBonus = checkComebackBonus(profile.last_quest_date);
      const bonusXP = comebackBonus ? 20 : 0;
      const totalXP = xpValue + bonusXP;

      const newXP = profile.xp + totalXP;
      const newLevel = Math.floor(newXP / 100) + 1;
      const newStreak = calculateStreak(profile.last_quest_date, profile.current_streak);

      await supabase
        .from('profiles')
        .update({
          xp: newXP,
          level: newLevel,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, profile.longest_streak),
          last_quest_date: new Date().toISOString(),
        })
        .eq('id', user.id);

      loadUserData();
    } catch (error) {
      console.error('Error completing quest:', error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const unlockedSkills = profile ? getUnlockedSkills(profile.archetype, profile.level) : [];
  const bossEncounter = checkBossEncounter(quests);
  const creature = profile ? getCreatureCompanion(quests, profile.last_quest_date) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">{profile?.archetype?.toUpperCase()} - Level {profile?.level}</h1>
            <p className="text-gray-300">XP: {profile?.xp} / {(profile?.level || 0) * 100} | Streak: {profile?.current_streak} days</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/history')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">History</button>
            <button onClick={() => router.push('/pricing')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">Pricing</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg">Logout</button>
          </div>
        </div>

        {/* Creature Companion */}
        {creature && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{creature.emoji}</span>
              <div>
                <h3 className="font-bold">{creature.name}</h3>
                <p className="text-sm text-gray-400">{creature.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Boss Encounter */}
        {bossEncounter && (
          <div className="bg-red-600/20 border-2 border-red-500 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{bossEncounter.emoji}</span>
              <div>
                <h3 className="text-2xl font-bold">{bossEncounter.name}</h3>
                <p className="text-gray-300">{bossEncounter.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Skills */}
        {unlockedSkills.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">Unlocked Skills</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {unlockedSkills.map((skill, i) => (
                <div key={i} className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="font-bold">{skill.name}</div>
                  <div className="text-sm text-gray-400">{skill.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Quest */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Add New Quest</h3>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={newQuestText}
              onChange={(e) => setNewQuestText(e.target.value)}
              placeholder="Enter your task..."
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={newQuestDifficulty}
              onChange={(e) => setNewQuestDifficulty(e.target.value)}
              className="px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="easy">Easy (10 XP)</option>
              <option value="medium">Medium (25 XP)</option>
              <option value="hard">Hard (50 XP)</option>
            </select>
            <button
              onClick={addQuest}
              disabled={adding}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-semibold disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Quest'}
            </button>
          </div>
        </div>

        {/* Active Quests */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Active Quests</h3>
          <div className="space-y-4">
            {quests.filter(q => !q.completed).map((quest) => (
              <div key={quest.id} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-lg">{quest.transformed_text}</div>
                  <div className="text-sm text-gray-400 mt-1">{quest.original_text}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {quest.difficulty.toUpperCase()} | {quest.xp_value} XP
                  </div>
                </div>
                <button
                  onClick={() => completeQuest(quest.id, quest.xp_value)}
                  className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
                >
                  Complete
                </button>
              </div>
            ))}
            {quests.filter(q => !q.completed).length === 0 && (
              <p className="text-gray-400 text-center py-8">No active quests. Add one above!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
