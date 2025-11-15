'use client';
// Force rebuild: Dashboard layout fixed - Add Quest before Active Quests

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUnlockedSkills } from '@/lib/skills';
import { checkBossEncounter, calculateStreak, checkComebackBonus, getCreatureCompanion } from '@/lib/encounters';
import OnboardingTutorial from '@/app/components/OnboardingTutorial';
import NotificationSetup from '@/app/components/NotificationSetup';
import ReferralCard from '@/app/components/ReferralCard';
import QuestCompletionCelebration from '@/app/components/QuestCompletionCelebration';
import ReflectionPrompt from '@/app/components/ReflectionPrompt';
import MilestoneCelebration from '@/app/components/animations/MilestoneCelebration';
import LoginTransition from '@/components/LoginTransition';
import JournalEntry from '@/app/components/JournalEntry';
import JournalTimeline from '@/app/components/JournalTimeline';
import OnThisDay from '@/app/components/OnThisDay';
import PremiumWelcome from '@/app/components/PremiumWelcome';
import RecurringQuests from '@/app/components/RecurringQuests';
import ArchetypeSwitcher from '@/app/components/ArchetypeSwitcher';
import TemplateLibrary from '@/app/components/TemplateLibrary';
import EquipmentShop from '@/app/components/EquipmentShop';
import RateLimitStatus from '@/app/components/RateLimitStatus';
import StoryProgress from '@/app/components/StoryProgress';

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

  // Celebration states
  const [showQuestCelebration, setShowQuestCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const [completedQuestData, setCompletedQuestData] = useState(null);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [milestoneData, setMilestoneData] = useState(null);

  // Login transition states
  const [showLoginTransition, setShowLoginTransition] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Journal states
  const [showJournalEntry, setShowJournalEntry] = useState(false);
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalOffset, setJournalOffset] = useState(0);
  const [journalTotal, setJournalTotal] = useState(0);
  const [showJournalSection, setShowJournalSection] = useState(false);

  // Premium states
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
  const [activeTab, setActiveTab] = useState('quests');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (showJournalSection && user) {
      loadJournalEntries();
    }
  }, [showJournalSection, user]);

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

      // Check if premium user should see welcome
      if (profileData.is_premium && !profileData.shown_premium_welcome) {
        setShowPremiumWelcome(true);
      }

      const { data: questsData } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setQuests(questsData || []);

      // Check if this is the user's first login to dashboard (persists across sessions)
      const hasSeenDashboard = localStorage.getItem(`dashboard_seen_${user.id}`);
      if (!hasSeenDashboard) {
        setIsFirstLogin(true);
        localStorage.setItem(`dashboard_seen_${user.id}`, 'true');
      }

      // Check if we should show login transition this session
      const hasSeenTransitionThisSession = sessionStorage.getItem(`login_transition_${user.id}`);
      if (!hasSeenTransitionThisSession) {
        setShowLoginTransition(true);
        sessionStorage.setItem(`login_transition_${user.id}`, 'true');
      } else {
        // Already seen this session, don't show transition
        setShowLoginTransition(false);
      }

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
          // Insert the quest with story continuity
          await supabase
            .from('quests')
            .insert({
              user_id: user.id,
              original_text: quest.original_text,
              transformed_text: data.transformedText,
              difficulty: quest.difficulty,
              xp_value: quest.xp_value,
              completed: false,
              story_thread: data.storyThread || null,
              narrative_impact: data.narrativeImpact || null,
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
          story_thread: data.storyThread || null,
          narrative_impact: data.narrativeImpact || null,
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

      // Get quest data before completion
      const questToComplete = quests.find(q => q.id === questId);

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

      // Store quest data for reflection prompt
      setCompletedQuestData({
        questId,
        questTitle: questToComplete?.transformed_text || 'Quest',
        originalText: questToComplete?.original_text || ''
      });

      // Show celebration modal with rewards
      const rewards = data.rewards;
      setCelebrationData({
        rewards,
        questTitle: questToComplete?.transformed_text || 'Quest Complete!'
      });
      setShowQuestCelebration(true);

      // Check for level up milestone
      if (rewards.level_up) {
        setMilestoneData({
          milestone: rewards.new_level,
          type: 'level'
        });
      }

      // Reload user data to reflect changes
      await loadUserData();
    } catch (error) {
      console.error('Error completing quest:', error);
      alert('Failed to complete quest');
    }
  }

  const handleCelebrationClose = () => {
    setShowQuestCelebration(false);

    // Show reflection prompt (optional, not every time)
    if (completedQuestData && Math.random() < 0.5) { // 50% chance
      setShowReflection(true);
    }

    // Show milestone celebration if there was a level up
    if (milestoneData) {
      setTimeout(() => {
        setShowMilestoneCelebration(true);
      }, 300);
    }
  };

  const handleReflectionSubmit = async (reflection, mood) => {
    if (!completedQuestData || !user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/reflections/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          questId: completedQuestData.questId,
          reflectionText: reflection,
          mood
        })
      });

      if (response.ok) {
        // Reload to show new XP from reflection bonus
        loadUserData();
      }
    } catch (error) {
      console.error('Error saving reflection:', error);
      throw error;
    }
  };

  async function loadJournalEntries(offset = 0) {
    try {
      setJournalLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/journals/list?limit=20&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (offset === 0) {
          setJournalEntries(data.entries || []);
        } else {
          setJournalEntries(prev => [...prev, ...(data.entries || [])]);
        }
        setJournalTotal(data.total || 0);
        setJournalOffset(offset);
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setJournalLoading(false);
    }
  }

  const handleJournalSubmit = async (journalData) => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/journals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(journalData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save journal entry');
      }

      // Reload journal entries to show the new one
      loadJournalEntries(0);
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
  };

  const handleLoadMoreJournals = () => {
    loadJournalEntries(journalOffset + 20);
  };

  const handleJournalDelete = async (entryId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/journals/delete?id=${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete journal entry');
      }

      // Remove the entry from the local state
      setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
      setJournalTotal(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      throw error;
    }
  };

  const handlePremiumWelcomeClose = async () => {
    setShowPremiumWelcome(false);

    // Mark as shown in database
    if (user) {
      await supabase
        .from('profiles')
        .update({ shown_premium_welcome: true })
        .eq('id', user.id);
    }
  };

  const handleGoldChange = (newGold) => {
    setProfile({ ...profile, gold: newGold });
  };

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
    <>
      {/* Emotional Login Transition */}
      {showLoginTransition && profile && (
        <LoginTransition
          streakCount={profile.current_streak || 0}
          lastActivityDate={profile.last_activity_date}
          isFirstLogin={isFirstLogin}
        />
      )}

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
                {(profile?.subscription_status === 'active' || profile?.is_premium) && (
                  <span className="px-4 py-2 bg-[#FFD93D] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black text-sm uppercase shadow-[0_3px_0_#0F3460]">
                    ⚡ FOUNDER
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
            {(profile?.is_premium || profile?.subscription_status === 'active') && (
              <ArchetypeSwitcher
                currentArchetype={profile.archetype}
                isPremium={true}
                onSwitch={loadUserData}
              />
            )}
            <button
              onClick={() => router.push('/history')}
              className="px-4 py-2 bg-[#0F3460] hover:bg-[#1a4a7a] text-white border-3 border-[#1A1A2E] rounded-lg font-bold uppercase text-sm tracking-wide transition-all"
            >
              History
            </button>
            <button
              onClick={() => router.push('/shop')}
              className="px-4 py-2 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
            >
              🪙 Gold Shop
            </button>
            {!(profile?.subscription_status === 'active' || profile?.is_premium) && (
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00BFFF] text-[#0F3460] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
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

        {/* Story Progress */}
        {profile && (
          <div className="mb-8">
            <StoryProgress profile={profile} />
          </div>
        )}

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

        {/* Premium Tab Navigation */}
        {(profile?.is_premium || profile?.subscription_status === 'active') && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => setActiveTab('quests')}
                className={
                  'px-6 py-3 rounded-lg font-black uppercase text-sm tracking-wide border-3 transition-all ' +
                  (activeTab === 'quests'
                    ? 'bg-[#FF6B6B] border-[#0F3460] text-white shadow-[0_5px_0_#0F3460]'
                    : 'bg-[#0F3460] border-[#1A1A2E] text-gray-300 hover:border-[#FF6B6B]')
                }
              >
                📋 Quests
              </button>
              <button
                onClick={() => setActiveTab('recurring')}
                className={
                  'px-6 py-3 rounded-lg font-black uppercase text-sm tracking-wide border-3 transition-all ' +
                  (activeTab === 'recurring'
                    ? 'bg-[#00D4FF] border-[#0F3460] text-[#0F3460] shadow-[0_5px_0_#0F3460]'
                    : 'bg-[#0F3460] border-[#1A1A2E] text-gray-300 hover:border-[#00D4FF]')
                }
              >
                🔄 Recurring
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={
                  'px-6 py-3 rounded-lg font-black uppercase text-sm tracking-wide border-3 transition-all ' +
                  (activeTab === 'templates'
                    ? 'bg-[#FFD93D] border-[#0F3460] text-[#0F3460] shadow-[0_5px_0_#0F3460]'
                    : 'bg-[#0F3460] border-[#1A1A2E] text-gray-300 hover:border-[#FFD93D]')
                }
              >
                📚 Templates
              </button>
              <button
                onClick={() => setActiveTab('equipment')}
                className={
                  'px-6 py-3 rounded-lg font-black uppercase text-sm tracking-wide border-3 transition-all ' +
                  (activeTab === 'equipment'
                    ? 'bg-[#48BB78] border-[#0F3460] text-white shadow-[0_5px_0_#0F3460]'
                    : 'bg-[#0F3460] border-[#1A1A2E] text-gray-300 hover:border-[#48BB78]')
                }
              >
                ⚔️ Equipment
              </button>
              <button
                onClick={() => setActiveTab('journal')}
                className={
                  'px-6 py-3 rounded-lg font-black uppercase text-sm tracking-wide border-3 transition-all ' +
                  (activeTab === 'journal'
                    ? 'bg-[#9333EA] border-[#0F3460] text-white shadow-[0_5px_0_#0F3460]'
                    : 'bg-[#0F3460] border-[#1A1A2E] text-gray-300 hover:border-[#9333EA]')
                }
              >
                📖 Journal
              </button>
            </div>
          </div>
        )}

        {/* Rate Limit Status */}
        {user && profile && (
          <RateLimitStatus
            userId={user.id}
            isPremium={profile.is_premium || profile.subscription_status === 'active'}
            onUpgradeClick={() => router.push('/pricing')}
          />
        )}

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

        {/* Quests Tab Content */}
        {((profile?.is_premium || profile?.subscription_status === 'active') ? activeTab === 'quests' : true) && (
          <>
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

            {/* Active Quests */}
            <div className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-6 mb-8 shadow-[0_0_20px_rgba(255,107,107,0.3)]">
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
          </>
        )}

        {/* Recurring Quests Tab Content */}
        {activeTab === 'recurring' && (profile?.is_premium || profile?.subscription_status === 'active') && (
          <RecurringQuests
            isPremium={profile.is_premium || profile.subscription_status === 'active'}
            archetype={profile.archetype}
          />
        )}

        {/* Templates Tab Content */}
        {activeTab === 'templates' && (profile?.is_premium || profile?.subscription_status === 'active') && (
          <TemplateLibrary
            isPremium={profile.is_premium || profile.subscription_status === 'active'}
            archetype={profile.archetype}
            onQuestsAdded={loadUserData}
          />
        )}

        {/* Equipment Tab Content */}
        {activeTab === 'equipment' && (profile?.is_premium || profile?.subscription_status === 'active') && (
          <EquipmentShop
            isPremium={profile.is_premium || profile.subscription_status === 'active'}
            gold={profile.gold || 0}
            onGoldChange={handleGoldChange}
          />
        )}

        {/* Journal Tab Content */}
        {((profile?.is_premium || profile?.subscription_status === 'active') ? activeTab === 'journal' : true) && (
        <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-6 mb-8 shadow-[0_0_20px_rgba(255,217,61,0.3)]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <h3 className="text-xl font-black uppercase tracking-wide text-[#FFD93D]">Hero's Journal</h3>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJournalEntry(true)}
                className="px-6 py-3 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
              >
                ✍️ Write Entry
              </button>
              <button
                onClick={() => setShowJournalSection(!showJournalSection)}
                className="px-6 py-3 bg-[#00D4FF] hover:bg-[#00BBE6] text-[#0F3460] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
              >
                {showJournalSection ? '▲ Hide' : '▼ View'} Timeline
              </button>
            </div>
          </div>

          <p className="text-[#E2E8F0] text-sm mb-4">
            Document your journey, reflect on your progress, and let the AI transform your story into an epic tale.
          </p>

          {/* On This Day Widget */}
          {showJournalSection && (
            <div className="mb-6">
              <OnThisDay />
            </div>
          )}

          {/* Journal Timeline */}
          {showJournalSection && (
            <JournalTimeline
              entries={journalEntries}
              isLoading={journalLoading}
              onLoadMore={handleLoadMoreJournals}
              onDelete={handleJournalDelete}
              hasMore={journalEntries.length < journalTotal}
            />
          )}
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

        {/* Referral Card */}
        {user && profile && (
          <div className="mb-8">
            <ReferralCard userId={user.id} profile={profile} />
          </div>
        )}
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

      {/* Quest Completion Celebration */}
      {showQuestCelebration && celebrationData && (
        <QuestCompletionCelebration
          show={showQuestCelebration}
          onClose={handleCelebrationClose}
          rewards={celebrationData.rewards}
          questTitle={celebrationData.questTitle}
        />
      )}

      {/* Reflection Prompt */}
      {showReflection && completedQuestData && (
        <ReflectionPrompt
          show={showReflection}
          onClose={() => setShowReflection(false)}
          questId={completedQuestData.questId}
          questTitle={completedQuestData.questTitle}
          onSubmit={handleReflectionSubmit}
        />
      )}

      {/* Milestone Celebration */}
      {showMilestoneCelebration && milestoneData && (
        <MilestoneCelebration
          show={showMilestoneCelebration}
          onClose={() => {
            setShowMilestoneCelebration(false);
            setMilestoneData(null);
          }}
          milestone={milestoneData.milestone}
          type={milestoneData.type}
        />
      )}

      {/* Journal Entry Modal */}
      {showJournalEntry && profile && (
        <JournalEntry
          show={showJournalEntry}
          onClose={() => setShowJournalEntry(false)}
          onSubmit={handleJournalSubmit}
          archetype={profile.archetype}
        />
      )}

      {/* Premium Welcome Modal */}
      <PremiumWelcome
        show={showPremiumWelcome}
        onClose={handlePremiumWelcomeClose}
      />
      </div>
    </>
  );
}
