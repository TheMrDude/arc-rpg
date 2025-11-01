'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUnlockedSkills } from '@/lib/skills';
import { checkBossEncounter, calculateStreak, checkComebackBonus, getCreatureCompanion } from '@/lib/encounters';
import OnboardingTutorial from '@/app/components/OnboardingTutorial';
import NotificationSetup from '@/app/components/NotificationSetup';
import ReferralCard from '@/app/components/ReferralCard';

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
  const [showOnboarding, setShowOnboarding] = useState(false);

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

      // Check if user should see onboarding
      const hasSeenOnboarding = localStorage.getItem(`onboarding_${user.id}`);
      const demoQuestsCreated = localStorage.getItem(`demo_quests_${user.id}`);

      if (!hasSeenOnboarding && questsData && questsData.length === 0) {
        // New user with no quests - show onboarding
        setShowOnboarding(true);
      }

      // Create demo quests for new users
      if (!demoQuestsCreated && questsData && questsData.length === 0) {
        // Delay demo quest creation slightly to let page load
        setTimeout(() => {
          createDemoQuests();
        }, 1000);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOnboardingComplete() {
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, 'completed');
    }
    setShowOnboarding(false);
  }

  async function handleOnboardingSkip() {
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, 'skipped');
    }
    setShowOnboarding(false);
  }

  async function createDemoQuests() {
    if (!user || !profile) return;

    // Check if demo quests already created
    const demoCreated = localStorage.getItem(`demo_quests_${user.id}`);
    if (demoCreated) return;

    const demoQuests = [
      {
        original_text: 'Make your bed',
        difficulty: 'easy',
        xp_value: 10
      },
      {
        original_text: 'Exercise for 30 minutes',
        difficulty: 'medium',
        xp_value: 25
      },
      {
        original_text: 'Complete an important project task',
        difficulty: 'hard',
        xp_value: 50
      }
    ];

    try {
      // Get session for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Transform and insert each quest
      for (const quest of demoQuests) {
        // Transform the quest
        const response = await fetch('/api/transform-quest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            questText: quest.original_text,
            archetype: profile.archetype,
            difficulty: quest.difficulty,
          }),
        });

        const data = await response.json();

        if (response.ok && data.transformedText) {
          // Insert the quest
          await supabase
            .from('quests')
            .insert({
              user_id: user.id,
              original_text: quest.original_text,
              transformed_text: data.transformedText,
              difficulty: quest.difficulty,
              xp_value: quest.xp_value,
              completed: false,
            });
        }
      }

      // Mark demo quests as created
      localStorage.setItem(`demo_quests_${user.id}`, 'created');

      // Reload quests to show the new demo quests
      loadUserData();
    } catch (error) {
      console.error('Error creating demo quests:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center">
        <div className="text-white text-xl font-black uppercase tracking-wide">Loading...</div>
      </div>
    );
  }

  const unlockedSkills = profile ? getUnlockedSkills(profile.archetype, profile.level) : [];
  const bossEncounter = checkBossEncounter(quests);
  const creature = profile ? getCreatureCompanion(quests, profile.last_quest_date) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white p-8">
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
                  className="w-32 h-32 object-cover rounded-lg border-3 border-[#FFD93D] shadow-[0_0_20px_rgba(255,217,61,0.5)]"
                />
              </div>
            )}

            {/* Stats */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black uppercase tracking-wide text-[#FF6B6B]">{profile?.archetype} - Level {profile?.level}</h1>
                {(profile?.subscription_status === 'active') && (
                  <span className="px-4 py-2 bg-[#FFD93D] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black text-sm uppercase shadow-[0_3px_0_#0F3460]">
                    ⭐ PREMIUM
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-[#00D4FF] font-bold">XP: {profile?.xp} / {(profile?.level || 0) * 100}</p>
                <p className="text-[#00D4FF] font-bold">Streak: {profile?.current_streak} days</p>
                <p className="text-[#FFD93D] font-black">💰 {profile?.gold || 0} Gold</p>
                {profile?.story_chapter && profile.story_chapter > 1 && (
                  <p className="text-[#FFD93D] font-bold">📖 Chapter {profile.story_chapter}</p>
                )}
              </div>
              {profile?.skill_points > 0 && (
                <p className="text-[#FFD93D] font-black mt-1">💎 {profile.skill_points} Skill Points Available!</p>
              )}
            </div>
          </div>

          {/* Right side: Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/history')}
              className="px-4 py-2 bg-[#0F3460] hover:bg-[#1a4a7a] text-white border-3 border-[#1A1A2E] rounded-lg font-bold uppercase text-sm tracking-wide transition-all"
            >
              History
            </button>
            {!(profile?.subscription_status === 'active') && (
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
              >
                🔥 Lifetime Access - $47
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-bold uppercase text-sm tracking-wide transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Creature Companion */}
        {creature && (
          <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-4 mb-8 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
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
                <h3 className="font-black uppercase tracking-wide text-[#00D4FF]">{creature.name}</h3>
                <p className="text-sm text-[#E2E8F0]">{creature.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Boss Encounter */}
        {bossEncounter && (
          <div className="bg-red-900/30 border-3 border-red-500 rounded-lg p-6 mb-8 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{bossEncounter.emoji}</span>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-wide text-[#FF6B6B]">{bossEncounter.name}</h3>
                <p className="text-[#E2E8F0]">{bossEncounter.description}</p>
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
                className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6 text-left hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,212,255,0.3)]"
              >
                <div className="text-4xl mb-3">🔄</div>
                <h3 className="text-xl font-black uppercase tracking-wide text-[#00D4FF] mb-2">Quest Templates</h3>
                <p className="text-sm text-[#E2E8F0]">Auto-generate recurring quests daily, weekly, or custom schedules</p>
              </button>
              <button
                onClick={() => router.push('/equipment')}
                className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-6 text-left hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,107,107,0.3)]"
              >
                <div className="text-4xl mb-3">⚔️</div>
                <h3 className="text-xl font-black uppercase tracking-wide text-[#FF6B6B] mb-2">Equipment Shop</h3>
                <p className="text-sm text-[#E2E8F0]">Unlock weapons, armor, and accessories to boost XP gains</p>
              </button>
              <button
                onClick={() => router.push('/skills')}
                className="bg-[#1A1A2E] border-3 border-[#48BB78] rounded-lg p-6 text-left hover:scale-105 transition-transform shadow-[0_0_15px_rgba(72,187,120,0.3)]"
              >
                <div className="text-4xl mb-3">🌳</div>
                <h3 className="text-xl font-black uppercase tracking-wide text-[#48BB78] mb-2">Skill Trees</h3>
                <p className="text-sm text-[#E2E8F0]">Unlock powerful abilities with skill points earned from leveling</p>
              </button>
            </div>
            <div className="mb-8">
              <button
                onClick={generateQuestsFromTemplates}
                disabled={generating}
                className="w-full px-6 py-4 bg-[#48BB78] hover:bg-[#38a169] text-white border-3 border-[#0F3460] rounded-lg font-black text-lg uppercase tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating Quests...' : '✨ Generate Quests from Templates Now'}
              </button>
            </div>
          </>
        ) : null}

        {/* Skills */}
        {unlockedSkills.length > 0 && (
          <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-6 mb-8 shadow-[0_0_20px_rgba(255,217,61,0.3)]">
            <h3 className="text-xl font-black uppercase tracking-wide text-[#FFD93D] mb-4">Unlocked Skills</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {unlockedSkills.map((skill, i) => (
                <div key={i} className="bg-[#0F3460] p-4 rounded-lg border-2 border-[#1A1A2E]">
                  <div className="font-black text-[#00D4FF]">{skill.name}</div>
                  <div className="text-sm text-[#E2E8F0]">{skill.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Quest */}
        <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6 mb-8 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
          <h3 className="text-xl font-black uppercase tracking-wide text-[#00D4FF] mb-4">Add New Quest</h3>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={newQuestText}
              onChange={(e) => setNewQuestText(e.target.value)}
              placeholder="Enter your task..."
              className="flex-1 px-4 py-3 bg-[#0F3460] text-white border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.2)] transition-all"
            />
            <select
              value={newQuestDifficulty}
              onChange={(e) => setNewQuestDifficulty(e.target.value)}
              className="px-4 py-3 bg-[#0F3460] text-white border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.2)] transition-all font-bold"
            >
              <option value="easy">Easy (10 XP)</option>
              <option value="medium">Medium (25 XP)</option>
              <option value="hard">Hard (50 XP)</option>
            </select>
            <button
              onClick={addQuest}
              disabled={adding}
              className="px-6 py-3 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Quest'}
            </button>
          </div>
        </div>

        {/* Referral Card */}
        {user && profile && (
          <div className="mb-8">
            <ReferralCard userId={user.id} profile={profile} />
          </div>
        )}

        {/* Unlock Premium Section (for non-premium users) */}
        {!(profile?.subscription_status === 'active') && (
          <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-8 mb-8 shadow-[0_0_30px_rgba(255,217,61,0.4)]">
            <div className="text-center">
              <h3 className="text-3xl font-black mb-4 uppercase tracking-wide text-[#FFD93D]">🔥 Limited-Time Founder's Deal</h3>
              <p className="text-[#E2E8F0] mb-6 font-bold">Get LIFETIME access to all premium features for a one-time payment!</p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#0F3460] p-4 rounded-lg border-2 border-[#1A1A2E]">
                  <div className="text-3xl mb-2">🔄</div>
                  <div className="font-black text-[#00D4FF]">Quest Templates</div>
                  <div className="text-sm text-[#E2E8F0]">Automate daily tasks</div>
                </div>
                <div className="bg-[#0F3460] p-4 rounded-lg border-2 border-[#1A1A2E]">
                  <div className="text-3xl mb-2">⚔️</div>
                  <div className="font-black text-[#FF6B6B]">Equipment Shop</div>
                  <div className="text-sm text-[#E2E8F0]">Boost XP gains</div>
                </div>
                <div className="bg-[#0F3460] p-4 rounded-lg border-2 border-[#1A1A2E]">
                  <div className="text-3xl mb-2">🌳</div>
                  <div className="font-black text-[#48BB78]">Skill Trees</div>
                  <div className="text-sm text-[#E2E8F0]">Unlock abilities</div>
                </div>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="px-8 py-4 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black text-lg uppercase tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
              >
                🔥 Get Lifetime Access - $47 (Limited Spots!)
              </button>
            </div>
          </div>
        )}

        {/* Active Quests */}
        <div className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-6 shadow-[0_0_20px_rgba(255,107,107,0.3)]">
          <h3 className="text-xl font-black uppercase tracking-wide text-[#FF6B6B] mb-4">Active Quests</h3>
          <div className="space-y-4">
            {quests.filter(q => !q.completed).map((quest) => (
              <div key={quest.id} className="bg-[#0F3460] p-4 rounded-lg border-2 border-[#1A1A2E] flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-black text-lg text-[#00D4FF]">{quest.transformed_text}</div>
                  <div className="text-sm text-[#E2E8F0] mt-1">{quest.original_text}</div>
                  <div className="text-xs text-[#FFD93D] mt-2 font-bold uppercase">
                    {quest.difficulty} | {quest.xp_value} XP
                  </div>
                </div>
                <button
                  onClick={() => completeQuest(quest.id, quest.xp_value)}
                  className="ml-4 px-4 py-2 bg-[#48BB78] hover:bg-[#38a169] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
                >
                  Complete
                </button>
              </div>
            ))}
            {quests.filter(q => !q.completed).length === 0 && (
              <p className="text-[#00D4FF] text-center py-8 font-bold">No active quests. Add one above!</p>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Tutorial */}
      {showOnboarding && profile && (
        <OnboardingTutorial
          profile={profile}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Notification Setup Prompt */}
      {user && <NotificationSetup userId={user.id} />}
    </div>
  );
}
