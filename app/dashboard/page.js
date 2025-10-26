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
  const [generating, setGenerating] = useState(false);

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

      // Get session token for auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.access_token) {
        console.error('Session error:', sessionError);
        alert('Session expired. Please log in again.');
        router.push('/login');
        setAdding(false);
        return;
      }

      const response = await fetch('/api/transform-quest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          questText: newQuestText,
          archetype: profile.archetype,
          difficulty: newQuestDifficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Transform quest API error:', data);
        alert(`Failed to transform quest: ${data.error || 'Unknown error'}`);
        setAdding(false);
        return;
      }

      if (!data.transformedText) {
        console.error('No transformed text in response:', data);
        alert('Failed to transform quest: No transformed text returned');
        setAdding(false);
        return;
      }

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

      if (error) {
        console.error('Database insert error:', error);
        alert(`Failed to save quest: ${error.message}`);
        setAdding(false);
        return;
      }

      setNewQuestText('');
      loadUserData();
    } catch (error) {
      console.error('Error adding quest:', error);
      alert(`Failed to add quest: ${error.message || 'Unknown error'}`);
    } finally {
      setAdding(false);
    }
  }

  async function completeQuest(questId, xpValue) {
    try {
      // Get session token for auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.access_token) {
        console.error('Session error:', sessionError);
        alert('Session expired. Please log in again.');
        router.push('/login');
        return;
      }

      // SECURITY: Use server-side API for quest completion
      const response = await fetch('/api/complete-quest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ quest_id: questId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to complete quest:', data.error);
        alert(data.message || 'Failed to complete quest');
        return;
      }

      // Show rewards notification
      const rewards = data.rewards;
      let rewardMessage = `Quest Complete!\n\n`;
      rewardMessage += `+${rewards.xp} XP`;
      if (rewards.equipment_bonus_xp > 0) {
        rewardMessage += ` (+${rewards.equipment_bonus_xp} equipment bonus)`;
      }
      if (rewards.comeback_bonus) {
        rewardMessage += `\n+20 Comeback Bonus!`;
      }
      rewardMessage += `\n+${rewards.gold} Gold`;
      if (rewards.level_up) {
        rewardMessage += `\n\n🎉 LEVEL UP! You are now level ${rewards.new_level}!`;
      }

      alert(rewardMessage);

      // Reload user data to reflect changes
      loadUserData();
    } catch (error) {
      console.error('Error completing quest:', error);
      alert('Failed to complete quest');
    }
  }

  async function generateQuestsFromTemplates() {
    if (generating) return;

    setGenerating(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.access_token) {
        console.error('Session error:', sessionError);
        alert('Session expired. Please log in again.');
        router.push('/login');
        setGenerating(false);
        return;
      }

      const response = await fetch('/api/generate-from-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Generate from templates error:', data);
        alert(data.message || data.error || 'Failed to generate quests');
        setGenerating(false);
        return;
      }

      if (data.questsCreated === 0) {
        alert('No new quests to generate. Templates may have already generated quests recently based on their schedule.');
      } else {
        alert(`Successfully generated ${data.questsCreated} quests!`);
        loadUserData(); // Reload to show new quests
      }
    } catch (error) {
      console.error('Error generating quests:', error);
      alert(`Failed to generate quests: ${error.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
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
        {/* Header with Character */}
        <div className="flex justify-between items-start mb-8">
          {/* Left side: Character Image + Stats */}
          <div className="flex gap-6 items-center">
            {/* Archetype Character Image */}
            {profile?.archetype && (
              <div className="flex-shrink-0">
                <img
                  src={`/images/archetypes/${profile.archetype}.png`}
                  alt={profile.archetype}
                  className="w-32 h-32 object-cover rounded-xl border-4 border-yellow-500 shadow-lg"
                />
              </div>
            )}

            {/* Stats */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold">{profile?.archetype?.toUpperCase()} - Level {profile?.level}</h1>
                {(profile?.subscription_status === 'active') && (
                  <span className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-bold text-sm">
                    ⭐ PREMIUM
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-gray-300">XP: {profile?.xp} / {(profile?.level || 0) * 100}</p>
                <p className="text-gray-300">Streak: {profile?.current_streak} days</p>
                <p className="text-yellow-400 font-semibold">💰 {profile?.gold || 0} Gold</p>
              </div>
              {profile?.skill_points > 0 && (
                <p className="text-yellow-400 font-semibold mt-1">💎 {profile.skill_points} Skill Points Available!</p>
              )}
            </div>
          </div>

          {/* Right side: Buttons */}
          <div className="flex gap-4">
            <button onClick={() => router.push('/history')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">History</button>
            {!(profile?.subscription_status === 'active') && (
              <button onClick={() => router.push('/pricing')} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-bold">
                🔥 Lifetime Access - $47
              </button>
            )}
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg">Logout</button>
          </div>
        </div>

        {/* Creature Companion */}
        {creature && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-4">
              {creature.image ? (
                <img
                  src={creature.image}
                  alt={creature.name}
                  className="w-16 h-16 object-contain rounded-lg"
                />
              ) : (
                <span className="text-4xl">{creature.emoji}</span>
              )}
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

        {/* Premium Features Navigation */}
        {(profile?.subscription_status === 'active') ? (
          <>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <button
                onClick={() => router.push('/templates')}
                className="bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500 rounded-xl p-6 text-left hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🔄</div>
                <h3 className="text-xl font-bold mb-2">Quest Templates</h3>
                <p className="text-sm text-gray-200">Auto-generate recurring quests daily, weekly, or custom schedules</p>
              </button>
              <button
                onClick={() => router.push('/equipment')}
                className="bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-purple-500 rounded-xl p-6 text-left hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">⚔️</div>
                <h3 className="text-xl font-bold mb-2">Equipment Shop</h3>
                <p className="text-sm text-gray-200">Unlock weapons, armor, and accessories to boost XP gains</p>
              </button>
              <button
                onClick={() => router.push('/skills')}
                className="bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-500 rounded-xl p-6 text-left hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🌳</div>
                <h3 className="text-xl font-bold mb-2">Skill Trees</h3>
                <p className="text-sm text-gray-200">Unlock powerful abilities with skill points earned from leveling</p>
              </button>
            </div>
            <div className="mb-8">
              <button
                onClick={generateQuestsFromTemplates}
                disabled={generating}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating Quests...' : '✨ Generate Quests from Templates Now'}
              </button>
            </div>
          </>
        ) : null}

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

        {/* Unlock Premium Section (for non-premium users) */}
        {!(profile?.subscription_status === 'active') && (
          <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-2 border-yellow-500 rounded-xl p-8 mb-8">
            <div className="text-center">
              <h3 className="text-3xl font-bold mb-4">🔥 Limited-Time Founder's Deal</h3>
              <p className="text-gray-200 mb-6">Get LIFETIME access to all premium features for a one-time payment!</p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-3xl mb-2">🔄</div>
                  <div className="font-bold">Quest Templates</div>
                  <div className="text-sm text-gray-400">Automate daily tasks</div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-3xl mb-2">⚔️</div>
                  <div className="font-bold">Equipment Shop</div>
                  <div className="text-sm text-gray-400">Boost XP gains</div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-3xl mb-2">🌳</div>
                  <div className="font-bold">Skill Trees</div>
                  <div className="text-sm text-gray-400">Unlock abilities</div>
                </div>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-bold text-lg"
              >
                🔥 Get Lifetime Access - $47 (Limited Spots!)
              </button>
            </div>
          </div>
        )}

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
