'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUnlockedSkills } from '@/lib/skills';
import { checkBossEncounter, getCreatureCompanion } from '@/lib/encounters';
import { getDashboardSections, getNewUnlocks } from '@/lib/dashboardVisibility';
import OnboardingTutorial from '@/app/components/OnboardingTutorial';
import NotificationSetup from '@/app/components/NotificationSetup';
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
import StoryProgress from '@/app/components/StoryProgress';
import StoryEventNotification from '@/app/components/StoryEventNotification';
import DailyBonus from '@/app/components/DailyBonus';
import SimpleDailyBonus from '@/app/components/SimpleDailyBonus';
import DailyLoginReward from '@/app/components/DailyLoginReward';
import WelcomeQuestChain from '@/app/components/WelcomeQuestChain';
import GoldPurchasePrompt from '@/app/components/GoldPurchasePrompt';
import SeasonalEvent from '@/app/components/SeasonalEvent';
import StreakProtection from '@/app/components/StreakProtection';
import AchievementBadges from '@/app/components/AchievementBadges';
import UpgradePrompt from '@/app/components/UpgradePrompt';
import HabitLimitModal from '@/app/components/HabitLimitModal';
import GlobalFooter from '@/app/components/GlobalFooter';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import CompactCharacterCard from '@/app/components/CompactCharacterCard';
import QuestInputRedesigned from '@/app/components/QuestInputRedesigned';
import FirstTimeEmptyState from '@/app/components/FirstTimeEmptyState';
import DiceRoll from '@/app/components/DiceRoll';
import ActiveEffects from '@/app/components/ActiveEffects';
import UnlockToast from '@/app/components/UnlockToast';
import { trackQuestCreated, trackQuestCompleted, trackLevelUp, trackStreakAchieved, trackStoryMilestone, trackGoldPurchaseViewed } from '@/lib/analytics';

export default function DashboardPage() {
  const router = useRouter();
  const questInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuestText, setNewQuestText] = useState('');
  // difficulty is now AI-assigned, no user selection needed
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

  // Gold purchase prompt states
  const [showGoldPrompt, setShowGoldPrompt] = useState(false);
  const [goldPromptTrigger, setGoldPromptTrigger] = useState(null);

  // Seasonal event badge states
  const [eventBadgeCount, setEventBadgeCount] = useState(0);

  // Upgrade prompt states
  const [upgradePromptTrigger, setUpgradePromptTrigger] = useState(null);
  const [questsCompletedToday, setQuestsCompletedToday] = useState(0);

  // Habit limit modal state
  const [showHabitLimitModal, setShowHabitLimitModal] = useState(false);

  // D10 Encounter states
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [encounterData, setEncounterData] = useState(null);
  const encounterRef = useRef(null); // ref to avoid stale closures
  const [activeEffects, setActiveEffects] = useState([]);

  // Unlock toast states
  const [newUnlocks, setNewUnlocks] = useState([]);

  useEffect(() => {
    document.title = "Dashboard — HabitQuest";
    loadUserData();
  }, []);

  useEffect(() => {
    if (showJournalSection && user) {
      loadJournalEntries();
    }
  }, [showJournalSection, user]);

  useEffect(() => {
    if (user && (profile?.is_premium || profile?.subscription_status === 'active')) {
      loadEventBadge();
      const interval = setInterval(loadEventBadge, 30000);
      return () => clearInterval(interval);
    }
  }, [user, profile]);

  // Load active effects
  useEffect(() => {
    if (user) {
      loadActiveEffects();
    }
  }, [user]);

  // Check for new unlocks when profile changes
  useEffect(() => {
    if (profile && user) {
      const sections = getDashboardSections(profile);
      const unlocks = getNewUnlocks(sections, user.id);
      if (unlocks.length > 0) {
        setNewUnlocks(unlocks);
      }
    }
  }, [profile?.level, profile?.quests_completed]);

  async function loadActiveEffects() {
    try {
      const { data } = await supabase
        .from('active_effects')
        .select('*')
        .eq('user_id', user.id)
        .gt('quests_remaining', 0);
      setActiveEffects(data || []);
    } catch (err) {
      // Table may not exist yet
      setActiveEffects([]);
    }
  }

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

      // Check if this is the user's first login to dashboard
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
        setShowLoginTransition(false);
      }

      // Check if user should see onboarding
      const hasSeenOnboarding = localStorage.getItem(`onboarding_${user.id}`);
      const demoQuestsCreated = localStorage.getItem(`demo_quests_${user.id}`);

      if (!hasSeenOnboarding && questsData && questsData.length === 0) {
        setShowOnboarding(true);
      }

      // Create demo quests for new users
      if (!demoQuestsCreated && questsData && questsData.length === 0) {
        setTimeout(() => {
          createDemoQuests();
        }, 1000);
      }

      // Load active effects
      try {
        const { data: effects } = await supabase
          .from('active_effects')
          .select('*')
          .eq('user_id', user.id)
          .gt('quests_remaining', 0);
        setActiveEffects(effects || []);
      } catch (err) {
        setActiveEffects([]);
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

    const demoCreated = localStorage.getItem(`demo_quests_${user.id}`);
    if (demoCreated) return;

    const demoQuests = [
      { original_text: 'Make your bed', difficulty: 'easy', xp_value: 10 },
      { original_text: 'Exercise for 30 minutes', difficulty: 'medium', xp_value: 25 },
      { original_text: 'Complete an important project task', difficulty: 'hard', xp_value: 50 },
    ];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      for (const quest of demoQuests) {
        const response = await fetch('/api/transform-quest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            questText: quest.original_text,
            archetype: profile.archetype,
          }),
        });

        const data = await response.json();

        if (response.ok && data.transformedText) {
          await supabase
            .from('quests')
            .insert({
              user_id: user.id,
              original_text: quest.original_text,
              transformed_text: data.transformedText,
              difficulty: data.difficulty || quest.difficulty,
              xp_value: data.xpValue || quest.xp_value,
              completed: false,
              story_thread: data.storyThread || null,
              narrative_impact: data.narrativeImpact || null,
            });
        }
      }

      localStorage.setItem(`demo_quests_${user.id}`, 'created');
      loadUserData();
    } catch (error) {
      console.error('Error creating demo quests:', error);
    }
  }

  async function addQuest() {
    if (!newQuestText.trim()) return;

    // Check habit limit for free users
    const isPro = profile?.is_premium || profile?.subscription_status === 'active' || profile?.subscription_tier === 'pro';
    if (!isPro && quests.filter(q => !q.completed).length >= 3) {
      setShowHabitLimitModal(true);
      return;
    }

    setAdding(true);

    try {
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

      // Use AI-assigned difficulty and XP
      const aiDifficulty = data.difficulty || 'medium';
      const aiXp = data.xpValue || 25;

      const { error } = await supabase
        .from('quests')
        .insert({
          user_id: user.id,
          original_text: newQuestText,
          transformed_text: data.transformedText,
          difficulty: aiDifficulty,
          xp_value: aiXp,
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

      trackQuestCreated(aiDifficulty, profile.archetype);
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.access_token) {
        console.error('Session error:', sessionError);
        alert('Session expired. Please log in again.');
        router.push('/login');
        return;
      }

      const questToComplete = quests.find(q => q.id === questId);

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

      // Track quest completion
      trackQuestCompleted({
        difficulty: questToComplete?.difficulty,
        xp_earned: rewards.xp,
        gold_earned: rewards.gold,
        level: rewards.new_level,
        story_thread: questToComplete?.story_thread,
      });

      // Check for level up milestone
      if (rewards.level_up) {
        setMilestoneData({
          milestone: rewards.new_level,
          type: 'level'
        });
        trackLevelUp(rewards.new_level, data.profile.xp);
      }

      // Track story milestones
      if (data.story) {
        if (data.story.story_completed) {
          trackStoryMilestone('story_completed', profile.current_story_thread, 100);
          if (Math.random() < 0.25) {
            setTimeout(() => {
              setGoldPromptTrigger('story_completion');
              setShowGoldPrompt(true);
              trackGoldPurchaseViewed();
            }, 8000);
          }
        } else if (data.story.new_story_started) {
          trackStoryMilestone('new_story', data.story.current_thread, data.story.thread_completion);
        } else if (data.story.thread_completion >= 50 && data.story.thread_completion < 65) {
          trackStoryMilestone('major_progress', data.story.current_thread, data.story.thread_completion);
        }
      }

      // Track streak achievements
      if (data.profile.current_streak >= 7 && data.profile.current_streak % 7 === 0) {
        trackStreakAchieved(data.profile.current_streak);
        if (Math.random() < 0.2) {
          setTimeout(() => {
            setGoldPromptTrigger('quest_streak');
            setShowGoldPrompt(true);
            trackGoldPurchaseViewed();
          }, 7000);
        }
      }

      // Store encounter for later — will show AFTER celebration/reflection modals close
      if (data.encounter) {
        setEncounterData(data.encounter);
        encounterRef.current = data.encounter;
      }

      // Reload user data
      await loadUserData();

      // Refresh event badge
      if (profile?.is_premium || profile?.subscription_status === 'active') {
        loadEventBadge();
      }

      // Trigger upgrade prompts for non-premium users
      if (!(profile?.is_premium || profile?.subscription_status === 'active')) {
        const newCount = questsCompletedToday + 1;
        setQuestsCompletedToday(newCount);

        if (rewards.new_level === 10) {
          setTimeout(() => setUpgradePromptTrigger('level_10'), 3000);
        }
        if (newCount === 5) {
          setTimeout(() => setUpgradePromptTrigger('quest_limit'), 2000);
        }
        if (data.profile.current_streak >= 7 &&
            [7, 14, 21, 30].includes(data.profile.current_streak)) {
          setTimeout(() => setUpgradePromptTrigger('streak_milestone'), 4000);
        }
      }
    } catch (error) {
      console.error('Error completing quest:', error);
      alert('Failed to complete quest');
    }
  }

  const handleCelebrationClose = () => {
    setShowQuestCelebration(false);

    const showsReflection = completedQuestData && Math.random() < 0.5;

    if (showsReflection) {
      setShowReflection(true);
      // Dice roll will show when reflection closes (see handleReflectionClose)
    } else {
      // No reflection — show dice roll now if one is pending
      if (encounterRef.current) {
        setTimeout(() => setShowDiceRoll(true), 300);
      }
    }

    if (milestoneData) {
      setTimeout(() => {
        setShowMilestoneCelebration(true);
      }, 300);

      if (Math.random() < 0.3) {
        setTimeout(() => {
          setGoldPromptTrigger('level_milestone');
          setShowGoldPrompt(true);
          trackGoldPurchaseViewed();
        }, 6000);
      }
    }
  };

  const handleDiceClaimReward = () => {
    setShowDiceRoll(false);
    setEncounterData(null);
    encounterRef.current = null;
    // Rewards already applied server-side, just reload
    loadUserData();
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
        headers: { 'Authorization': `Bearer ${session.access_token}` }
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

  async function loadEventBadge() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/seasonal-events', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const data = await response.json();

      if (data.active) {
        const affordableRewards = data.rewards.filter(reward => {
          const isClaimed = data.userProgress.rewards_claimed?.some(r => r.reward_id === reward.id);
          const canAfford = data.userProgress.event_points >= reward.cost_event_points;
          const notSoldOut = reward.limited_quantity === null || reward.remaining_quantity > 0;
          return !isClaimed && canAfford && notSoldOut;
        });
        setEventBadgeCount(affordableRewards.length);
      } else {
        setEventBadgeCount(0);
      }
    } catch (error) {
      console.error('Error loading event badge:', error);
      setEventBadgeCount(0);
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
      loadJournalEntries(0);
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
  };

  const handleLoadMoreJournals = () => { loadJournalEntries(journalOffset + 20); };

  const handleJournalDelete = async (entryId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/journals/delete?id=${entryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete journal entry');
      }

      setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
      setJournalTotal(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      throw error;
    }
  };

  const handlePremiumWelcomeClose = async () => {
    setShowPremiumWelcome(false);
    if (user) {
      await supabase.from('profiles').update({ shown_premium_welcome: true }).eq('id', user.id);
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
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || data.error || 'Failed to generate quests');
        setGenerating(false);
        return;
      }

      if (data.questsCreated === 0) {
        alert('No new quests to generate. Templates may have already generated quests recently.');
      } else {
        alert(`Successfully generated ${data.questsCreated} quests!`);
        loadUserData();
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

  function scrollToQuestInput() {
    questInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus the input after scroll
    setTimeout(() => {
      const input = questInputRef.current?.querySelector('input[type="text"]');
      input?.focus();
    }, 500);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center">
        <div className="text-white text-xl font-black uppercase tracking-wide">Loading...</div>
      </div>
    );
  }

  const isPremium = profile?.is_premium || profile?.subscription_status === 'active';
  const sections = getDashboardSections(profile);
  const unlockedSkills = profile ? getUnlockedSkills(profile.archetype, profile.level) : [];
  const bossEncounter = checkBossEncounter(quests);
  const creature = sections.companion ? getCreatureCompanion(quests, profile?.last_quest_date) : null;
  const activeQuestsList = quests.filter(q => !q.completed);
  const isNewUser = (profile?.level || 1) <= 2 && activeQuestsList.length === 0;

  return (
    <ErrorBoundary>
    <>
      {/* Daily Login Reward */}
      {user && <DailyLoginReward userId={user.id} onRewardClaimed={() => loadUserData()} />}

      {/* Emotional Login Transition */}
      {showLoginTransition && profile && (
        <LoginTransition
          streakCount={profile.current_streak || 0}
          lastActivityDate={profile.last_activity_date}
          isFirstLogin={isFirstLogin}
        />
      )}

      {/* Unlock Toast Notifications */}
      <UnlockToast unlocks={newUnlocks} />

      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {sections.switchArchetype && isPremium && (
              <ArchetypeSwitcher
                currentArchetype={profile.archetype}
                isPremium={true}
                onSwitch={loadUserData}
              />
            )}
            {sections.skillTree && isPremium && (
              <button
                onClick={() => router.push('/skills')}
                className={`px-3 py-1.5 border-2 rounded-lg font-black uppercase text-xs tracking-wide transition-all ${
                  profile?.skill_points > 0
                    ? 'bg-[#9333EA] hover:bg-[#7E22CE] text-white border-[#0F3460] animate-pulse'
                    : 'bg-[#4C1D95] hover:bg-[#5B21B6] text-white border-[#1A1A2E]'
                }`}
              >
                💎 Skills {profile?.skill_points > 0 && `(${profile.skill_points})`}
              </button>
            )}
            {sections.journeyNav && isPremium && (
              <button
                onClick={() => router.push('/journey')}
                className="px-3 py-1.5 bg-[#9333EA] hover:bg-[#7E22CE] text-white border-2 border-[#0F3460] rounded-lg font-black uppercase text-xs tracking-wide transition-all"
              >
                📖 Journey
              </button>
            )}
            {sections.historyNav && (
              <button
                onClick={() => router.push('/history')}
                className="px-3 py-1.5 bg-[#0F3460] hover:bg-[#1a4a7a] text-white border-2 border-[#1A1A2E] rounded-lg font-bold uppercase text-xs tracking-wide transition-all"
              >
                📜 History
              </button>
            )}
            <button
              onClick={() => router.push('/shop')}
              className="px-3 py-1.5 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-2 border-[#0F3460] rounded-lg font-black uppercase text-xs tracking-wide transition-all"
            >
              🪙 Gold Shop
            </button>
            {!isPremium && (
              <button
                onClick={() => router.push('/pricing')}
                className="px-3 py-1.5 bg-[#00D4FF] hover:bg-[#00BFFF] text-[#0F3460] border-2 border-[#0F3460] rounded-lg font-black uppercase text-xs tracking-wide transition-all"
              >
                🔥 Go Pro
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-2 border-[#0F3460] rounded-lg font-bold uppercase text-xs tracking-wide transition-all"
            title="Logout"
          >
            Logout
          </button>
        </div>

        {/* Compact Character Card */}
        <CompactCharacterCard
          profile={profile}
          creature={creature}
          isPremium={isPremium}
        />

        {/* Active Effects Bar */}
        <ActiveEffects effects={activeEffects} />

        {/* Boss Encounter Alert */}
        {bossEncounter && (
          <div className="bg-red-900/30 border-3 border-red-500 rounded-lg p-4 mb-6 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{bossEncounter.emoji}</span>
              <div>
                <h3 className="text-xl font-black uppercase tracking-wide text-[#FF6B6B]">{bossEncounter.name}</h3>
                <p className="text-sm text-[#E2E8F0]">{bossEncounter.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Trial Status Banner */}
        {profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date() && !profile?.is_premium && (
          <div className="bg-gradient-to-r from-[#7C3AED]/20 to-[#FF6B35]/20 border-2 border-[#7C3AED] rounded-xl p-3 mb-4 text-center">
            <p className="text-[#7C3AED] font-black text-sm uppercase">
              Pro Trial — {Math.ceil((new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
            </p>
            <p className="text-gray-400 text-xs mt-1">
              <a href="/pricing" className="text-[#FF6B35] hover:underline font-bold">Upgrade now</a> to keep Pro features
            </p>
          </div>
        )}

        {/* Welcome Quest Chain — first thing new users see */}
        {user && <WelcomeQuestChain userId={user.id} />}

        {/* Tab Bar — Only at Level 10+ */}
        {sections.tabBar && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'quests', icon: '📋', label: 'Quests', color: '#FF6B6B' },
                { key: 'recurring', icon: '🔄', label: 'Recurring', color: '#00D4FF' },
                { key: 'templates', icon: '📦', label: 'Templates', color: '#FFD93D' },
                { key: 'equipment', icon: '⚔️', label: 'Equipment', color: '#48BB78' },
                { key: 'journal', icon: '📖', label: 'Journal', color: '#9333EA' },
                { key: 'events', icon: '🎉', label: 'Events', color: '#ec4899', badge: eventBadgeCount },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full font-black uppercase text-xs tracking-wide border-2 transition-all relative ${
                    activeTab === tab.key
                      ? 'text-white shadow-[0_3px_0_#0F3460]'
                      : 'bg-[#0F3460] border-[#1A1A2E] text-gray-400 hover:text-white'
                  }`}
                  style={
                    activeTab === tab.key
                      ? { backgroundColor: tab.color, borderColor: tab.color }
                      : {}
                  }
                >
                  {tab.icon} {tab.label}
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-[#0F3460] animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── QUESTS TAB (or always visible if no tab bar) ── */}
        {(sections.tabBar ? activeTab === 'quests' : true) && (
          <>
            {/* Quest Input — THE HERO */}
            <div ref={questInputRef}>
              <QuestInputRedesigned
                onAddQuest={addQuest}
                adding={adding}
                questText={newQuestText}
                setQuestText={setNewQuestText}
              />
            </div>

            {/* Active Quests */}
            <div className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-6 mb-6 shadow-[0_0_20px_rgba(255,107,107,0.3)]">
              <h3 className="text-xl font-black uppercase tracking-wide text-[#FF6B6B] mb-4">Active Quests</h3>
              <div className="space-y-4">
                {activeQuestsList.map((quest) => (
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
                {activeQuestsList.length === 0 && (
                  isNewUser ? (
                    <FirstTimeEmptyState onTryQuest={scrollToQuestInput} />
                  ) : (
                    <p className="text-[#00D4FF] text-center py-8 font-bold">No active quests. Add one above!</p>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {/* ── PROGRESSIVE SECTIONS ── */}

        {/* Story Progress — Level 7+ */}
        {sections.yourStory && profile && (sections.tabBar ? activeTab === 'quests' : true) && (
          <div className="mb-6">
            <StoryProgress profile={profile} />
          </div>
        )}

        {/* Unlocked Skills — Level 5+ */}
        {sections.unlockedSkills && unlockedSkills.length > 0 && (sections.tabBar ? activeTab === 'quests' : true) && (
          <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-6 mb-6 shadow-[0_0_20px_rgba(255,217,61,0.3)]">
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

        {/* Daily Bonus — Simple (Level 3-9) */}
        {sections.dailyBonusSimple && !sections.fullDailyBonus && profile && (sections.tabBar ? activeTab === 'quests' : true) && (
          <SimpleDailyBonus profile={profile} onClaim={loadUserData} />
        )}

        {/* Daily Bonus — Full 7-day grid (Level 10+) */}
        {sections.fullDailyBonus && profile && (sections.tabBar ? activeTab === 'quests' : true) && (
          <div className="mb-6">
            <DailyBonus profile={profile} onClaim={loadUserData} />
          </div>
        )}

        {/* Achievement Badges — Level 5+ */}
        {sections.achievementsEarned && profile && quests && (sections.tabBar ? activeTab === 'quests' : true) && (
          <AchievementBadges profile={profile} quests={quests} />
        )}

        {/* ── TAB CONTENT (Level 10+) ── */}

        {/* Recurring Quests Tab */}
        {sections.tabBar && activeTab === 'recurring' && (
          <RecurringQuests
            isPremium={isPremium}
            archetype={profile.archetype}
          />
        )}

        {/* Templates Tab */}
        {sections.tabBar && activeTab === 'templates' && (
          <TemplateLibrary
            isPremium={isPremium}
            archetype={profile.archetype}
            onQuestsAdded={loadUserData}
          />
        )}

        {/* Equipment Tab */}
        {sections.tabBar && activeTab === 'equipment' && (
          <EquipmentShop
            isPremium={isPremium}
            gold={profile.gold || 0}
            onGoldChange={handleGoldChange}
          />
        )}

        {/* Journal Tab */}
        {sections.tabBar && activeTab === 'journal' && (
          <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-6 mb-6 shadow-[0_0_20px_rgba(255,217,61,0.3)]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📖</span>
                <h3 className="text-xl font-black uppercase tracking-wide text-[#FFD93D]">Hero&apos;s Journal</h3>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJournalEntry(true)}
                  className="px-4 py-2 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_4px_0_#0F3460] hover:shadow-[0_6px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
                >
                  ✍️ Write
                </button>
                <button
                  onClick={() => setShowJournalSection(!showJournalSection)}
                  className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00BBE6] text-[#0F3460] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_4px_0_#0F3460] hover:shadow-[0_6px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
                >
                  {showJournalSection ? '▲ Hide' : '▼ View'} Timeline
                </button>
              </div>
            </div>
            <p className="text-[#E2E8F0] text-sm mb-4">
              Document your journey, reflect on your progress, and let the AI transform your story into an epic tale.
            </p>
            {showJournalSection && (
              <div className="mb-6">
                <OnThisDay />
              </div>
            )}
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

        {/* Seasonal Events Tab */}
        {sections.tabBar && activeTab === 'events' && (
          <SeasonalEvent />
        )}

        {/* Unlock Premium Section (for non-premium users) */}
        {!isPremium && (
          <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-8 mb-6 shadow-[0_0_30px_rgba(255,217,61,0.4)]">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-4 uppercase tracking-wide text-[#FFD93D]">🔥 Unlock the Full RPG Experience</h3>
              <p className="text-[#E2E8F0] mb-6 font-bold">Go Pro to access all premium features — starting at just $5/month.</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#0F3460] p-3 rounded-lg border-2 border-[#1A1A2E]">
                  <div className="text-2xl mb-1">🔄</div>
                  <div className="font-black text-[#00D4FF] text-sm">Templates</div>
                </div>
                <div className="bg-[#0F3460] p-3 rounded-lg border-2 border-[#1A1A2E]">
                  <div className="text-2xl mb-1">⚔️</div>
                  <div className="font-black text-[#FF6B6B] text-sm">Equipment</div>
                </div>
                <div className="bg-[#0F3460] p-3 rounded-lg border-2 border-[#1A1A2E]">
                  <div className="text-2xl mb-1">🌳</div>
                  <div className="font-black text-[#48BB78] text-sm">Skill Trees</div>
                </div>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="px-8 py-3 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black text-lg uppercase tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
              >
                🔥 Go Pro — $5/mo or $29/yr
              </button>
            </div>
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
          onClose={() => {
            setShowReflection(false);
            // Show dice roll AFTER reflection closes
            if (encounterRef.current) {
              setTimeout(() => setShowDiceRoll(true), 300);
            }
          }}
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

      {/* D10 Random Encounter Dice Roll */}
      <DiceRoll
        show={showDiceRoll}
        encounter={encounterData}
        onClaim={handleDiceClaimReward}
      />

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

      {/* Story Event Notification */}
      {user && <StoryEventNotification userId={user.id} />}

      {/* Gold Purchase Prompt */}
      <GoldPurchasePrompt
        show={showGoldPrompt}
        onClose={() => setShowGoldPrompt(false)}
        trigger={goldPromptTrigger}
        currentGold={profile?.gold || 0}
      />

      {/* Streak Protection */}
      {profile && (
        <StreakProtection
          streak={profile.current_streak || 0}
          lastActivityDate={profile.last_activity_date}
          isPremium={isPremium}
        />
      )}

      {/* Upgrade Prompt */}
      {profile && upgradePromptTrigger && (
        <UpgradePrompt
          trigger={upgradePromptTrigger}
          profile={profile}
        />
      )}

      {/* Habit Limit Modal */}
      <HabitLimitModal
        isOpen={showHabitLimitModal}
        onClose={() => setShowHabitLimitModal(false)}
        onUpgrade={() => { setShowHabitLimitModal(false); router.push('/pricing'); }}
        currentHabits={quests.filter(q => !q.completed).length}
      />

      {/* Footer */}
      <GlobalFooter />
      </div>
    </>
    </ErrorBoundary>
  );
}
