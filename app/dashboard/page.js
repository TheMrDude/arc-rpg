'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, BookOpen, ScrollText, Swords, Shield, Dices, Coins, Flame, Volume2, VolumeX, ClipboardList, Package, PartyPopper, LogOut, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSound } from '@/app/components/SoundProvider';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { getUnlockedSkills } from '@/lib/skills';
import { checkBossEncounter } from '@/lib/encounters';
import { getCompanion } from '@/lib/companions';
import { getDashboardSections, getNewUnlocks } from '@/lib/dashboardVisibility';
import { FREE_TIER_QUEST_LIMIT, countHabitsTowardLimit } from '@/lib/quest-limits';
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
import EventStoryModal from '@/app/components/EventStoryModal';
import MomentumBoost from '@/app/components/MomentumBoost';
import MomentumMeter from '@/app/components/MomentumMeter';
import WeeklyBossCard from '@/app/components/WeeklyBossCard';
import CompanionCard from '@/app/components/CompanionCard';
import CrossroadsCard from '@/app/components/CrossroadsCard';
import MapWidget from '@/app/components/MapWidget';
import BottomNav from '@/app/components/BottomNav';
import InstallPrompt from '@/app/components/InstallPrompt';
import AchievementBadges from '@/app/components/AchievementBadges';
import UpgradePrompt from '@/app/components/UpgradePrompt';
import HabitLimitModal from '@/app/components/HabitLimitModal';
import GlobalFooter from '@/app/components/GlobalFooter';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import CharacterPanel from '@/app/components/CharacterPanel';
import ChroniclePanel from '@/app/components/ChroniclePanel';
import QuestInputRedesigned from '@/app/components/QuestInputRedesigned';
import StarterQuestPicker from '@/app/components/StarterQuestPicker';
import ComebackMoment from '@/app/components/ComebackMoment';
import TomorrowQuestHook from '@/app/components/TomorrowQuestHook';
import AchievementNotification from '@/app/components/AchievementNotification';
import FirstTimeEmptyState from '@/app/components/FirstTimeEmptyState';
import EmptyState from '@/app/components/EmptyState';
import DiceRoll from '@/app/components/DiceRoll';
import ActiveEffects from '@/app/components/ActiveEffects';
import UnlockToast from '@/app/components/UnlockToast';
import QuestRewardBurst from '@/app/components/QuestRewardBurst';
import FloatingReward from '@/app/components/FloatingReward';
import ChestDropReveal from '@/app/components/ChestDropReveal';
import { trackQuestCreated, trackQuestCompleted, trackLevelUp, trackStreakAchieved, trackStoryMilestone, trackGoldPurchaseViewed, trackEvent } from '@/lib/analytics';
import { track } from '@/lib/track';
import TestimonialPrompt from '@/app/components/TestimonialPrompt';
import { testimonialsCaptureEnabled } from '@/lib/testimonials';

export default function DashboardPage() {
  const router = useRouter();
  const questInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuestText, setNewQuestText] = useState('');
  // Daily by default: a habit that returns on its own is the point of the app,
  // and requiring a child to opt in would hide it behind a decision.
  const [recurrence, setRecurrence] = useState('daily');
  // difficulty is now AI-assigned, no user selection needed
  const [adding, setAdding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Celebration states
  const [showQuestCelebration, setShowQuestCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const [completedQuestData, setCompletedQuestData] = useState(null);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [milestoneData, setMilestoneData] = useState(null);

  // Tomorrow-quest hook (suggestion card after a celebration closes) and
  // newly unlocked achievement toasts (shown one at a time from a queue)
  const [showTomorrowHook, setShowTomorrowHook] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState([]);

  // Reward juice states
  const [showRewardBurst, setShowRewardBurst] = useState(false);
  const [burstOrigin, setBurstOrigin] = useState({ x: null, y: null });
  const [goldFloat, setGoldFloat] = useState({ show: false, amount: 0 });
  const [showChestDrop, setShowChestDrop] = useState(false);
  const [chestDropData, setChestDropData] = useState(null);
  const [momentumToast, setMomentumToast] = useState(false);
  const chestDropRef = useRef(null);
  const { play: playSound, enabled: soundEnabled, setEnabled: setSoundEnabled } = useSound();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [equipmentVersion, setEquipmentVersion] = useState(0);

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

  // Milestone testimonial prompt (feature-flagged). pendingTestimonialRef holds
  // a milestone detected during quest completion so it can be surfaced AFTER the
  // celebration closes (a moment of earned pride, shown once).
  const [testimonialPrompt, setTestimonialPrompt] = useState(null);
  const pendingTestimonialRef = useRef(null);
  const [activeEffects, setActiveEffects] = useState([]);

  // Event story states
  const [showEventStory, setShowEventStory] = useState(false);
  const [eventStoryData, setEventStoryData] = useState(null);
  const [eventStoryMeta, setEventStoryMeta] = useState({ name: '', icon: '' });

  // Unlock toast states
  const [newUnlocks, setNewUnlocks] = useState([]);

  // Welcome Quest chain refresh (bumped after completions/reflections so the
  // chain card re-fetches and shows newly advanced steps)
  const [chainRefresh, setChainRefresh] = useState(0);

  useEffect(() => {
    document.title = "Dashboard | HabitQuest";
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (['quests', 'templates', 'equipment', 'journal', 'events'].includes(tab)) {
      setActiveTab(tab);
    }
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
        .eq('status', 'active')
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

      if (!hasSeenOnboarding && questsData && questsData.length === 0) {
        setShowOnboarding(true);
      }

      // NOTE: demo quests were removed in favor of the StarterQuestPicker —
      // the first quest should be a deliberate one-tap choice, not three
      // silently auto-created tasks that hide the first-win fast path.

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

  // textOverride lets the StarterQuestPicker create a quest with one tap;
  // it must be a string check because button onClick passes a click event.
  async function addQuest(textOverride) {
    const questText = typeof textOverride === 'string' ? textOverride : newQuestText;
    if (!questText.trim()) return;

    // First-party funnel: is this the user's very first habit? (no PII)
    const isFirstHabit = quests.length === 0;

    // Check habit limit for free users.
    // Auto-generated recurring instances are excluded: a daily habit produces a
    // new instance every morning without being asked, so counting them would
    // lock a free user out of adding habits because of quests they never
    // created. Superseded rows are excluded by the loader's status filter.
    const isPro = profile?.is_premium || profile?.subscription_status === 'active' || profile?.subscription_tier === 'pro';
    if (!isPro && countHabitsTowardLimit(quests) >= FREE_TIER_QUEST_LIMIT) {
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
          questText,
          archetype: profile.archetype,
          recurrence,
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

      // A recurring habit is already saved server-side, rule and first instance
      // together. Only a one-off still needs inserting from here.
      if (!data.firstQuest) {
        const { error } = await supabase
          .from('quests')
          .insert({
            user_id: user.id,
            original_text: questText,
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
      }

      trackQuestCreated(aiDifficulty, profile.archetype);
      if (isFirstHabit) {
        track('first_habit_created');
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

  // Stops a habit from coming back. Deliberately pause (is_active = false)
  // rather than delete: the rule keeps its history, today's already-generated
  // quest stays completable, and nothing the child earned disappears.
  async function stopRecurring(recurringQuestId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/recurring-quests/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ quest_id: recurringQuestId, is_active: false }),
      });

      if (response.ok) loadUserData();
    } catch (error) {
      console.error('Error stopping recurring quest:', error);
    }
  }

  async function completeQuest(questId, xpValue, clickEvent) {
    try {
      if (clickEvent) {
        setBurstOrigin({ x: clickEvent.clientX, y: clickEvent.clientY });
      }

      // First-party funnel: is this the user's first-ever completion? (no PII)
      const isFirstCompletion = quests.filter((q) => q.completed).length === 0;

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

      // Show celebration modal with rewards. If the server has no story
      // beat, a boss hit line can stand in — never both stacked.
      const rewards = data.rewards;
      const bossHitLine =
        data.boss?.just_hit && !data.boss?.just_defeated ? data.boss.hit_line : null;
      setCelebrationData({
        rewards,
        questTitle: questToComplete?.transformed_text || 'Quest Complete!',
        storyBeat: data.story_beat || bossHitLine || null
      });
      setShowQuestCelebration(true);

      // Newly unlocked achievements (best-effort server check). Mapped to the
      // AchievementNotification prop shape once, so queue items stay stable.
      if (Array.isArray(data.newly_unlocked_achievements) && data.newly_unlocked_achievements.length > 0) {
        const mapped = data.newly_unlocked_achievements.map((a) => ({
          title: a.name,
          description: a.description,
          icon: a.icon,
          rarity: a.rarity,
          xp_reward: a.xp_reward || 0,
        }));
        setAchievementQueue((q) => [...q, ...mapped]);
      }

      // Juice: orb flight to XP bar, floating gold text, completion chime
      playSound('quest-complete');
      setShowRewardBurst(true);
      setGoldFloat({ show: true, amount: rewards.gold });
      setTimeout(() => setGoldFloat({ show: false, amount: 0 }), 700);

      // Chest drop reveal (mutually exclusive with encounter) shows after
      // celebration/reflection close, same sequencing as the dice roll below.
      if (rewards.chest_drop) {
        setChestDropData(rewards.chest_drop);
        chestDropRef.current = rewards.chest_drop;
      }

      // Momentum meter filled this week — small toast + analytics, no modal
      if (rewards.momentum_filled) {
        setMomentumToast(true);
        setTimeout(() => setMomentumToast(false), 2500);
        trackEvent('momentum_meter_filled', { week: new Date().toISOString() });
      }

      // Track quest completion
      trackQuestCompleted({
        difficulty: questToComplete?.difficulty,
        xp_earned: rewards.xp,
        gold_earned: rewards.gold,
        level: rewards.new_level,
        story_thread: questToComplete?.story_thread,
      });

      // First-party funnel: first-ever quest completion (activation). No PII.
      if (isFirstCompletion) {
        track('first_quest_completed');
      }

      // Milestone testimonial triggers — queued here, surfaced after the
      // celebration closes (see handleCelebrationClose). Boss win takes
      // precedence if it coincides with a count milestone.
      const newLifetimeCount = (profile?.quests_completed || 0) + 1;
      if (newLifetimeCount === 100) {
        pendingTestimonialRef.current = 'quests_100';
      } else if (newLifetimeCount === 30) {
        pendingTestimonialRef.current = 'quests_30';
      }
      if (data.boss?.just_defeated) {
        pendingTestimonialRef.current = 'first_boss_win';
      }

      // Check for level up milestone
      if (rewards.level_up) {
        setMilestoneData({
          milestone: rewards.new_level,
          type: 'level'
        });
        trackLevelUp(rewards.new_level, data.profile.xp);
      }

      // Weekly boss defeated: queue a milestone celebration that shows
      // after the quest celebration closes (same flow as region unlocks)
      if (data.boss?.just_defeated) {
        setMilestoneData({
          milestone: data.boss.boss_name,
          type: 'achievement',
          unlocks: [
            `${data.boss.boss_icon} ${data.boss.defeat_line}`,
            `💰 +${data.boss.reward?.gold || 0} gold`,
            ...(data.boss.reward?.equipment
              ? [`${data.boss.reward.equipment.emoji} ${data.boss.reward.equipment.name} added to your armory`]
              : []),
            ...(data.boss.reward?.bonus_gold
              ? [`💰 +${data.boss.reward.bonus_gold} bonus gold`]
              : []),
          ],
        });
        trackEvent('weekly_boss_defeated', { boss: data.boss.boss_name });
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
      setChainRefresh((v) => v + 1);

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

  // Asks the server whether to show the testimonial prompt for this milestone
  // (feature flag + once-per-milestone + 7-day global cooldown all enforced
  // server-side). Fails silent — brand law is no nagging.
  async function maybePromptTestimonial(milestone) {
    if (!testimonialsCaptureEnabled()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/testimonials/prompt-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ milestone }),
      });
      const data = await res.json();
      if (data?.show) {
        setTestimonialPrompt({ milestone, suggestion: data.suggestion || {} });
      }
    } catch {
      /* silent */
    }
  }

  const handleCelebrationClose = () => {
    setShowQuestCelebration(false);

    // Tomorrow-quest hook: the component itself guards once-per-day and
    // skips if tomorrow is already planned.
    setShowTomorrowHook(true);

    const showsReflection = completedQuestData && Math.random() < 0.5;

    if (showsReflection) {
      setShowReflection(true);
      // Dice roll / chest reveal will show when reflection closes (see handleReflectionClose)
    } else {
      // No reflection — show dice roll or chest reveal now if one is pending
      if (encounterRef.current) {
        setTimeout(() => setShowDiceRoll(true), 300);
      } else if (chestDropRef.current) {
        setTimeout(() => setShowChestDrop(true), 300);
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

    // Surface the milestone testimonial prompt (if any) once the celebration
    // has cleared — a moment of earned pride, shown at most once.
    if (pendingTestimonialRef.current) {
      const milestone = pendingTestimonialRef.current;
      pendingTestimonialRef.current = null;
      setTimeout(() => maybePromptTestimonial(milestone), 1200);
    }
  };

  // Stable callback so AchievementNotification's auto-dismiss timer is not
  // reset by unrelated dashboard re-renders.
  const handleAchievementClose = useCallback(() => {
    setAchievementQueue((q) => q.slice(1));
  }, []);

  const handleDiceClaimReward = () => {
    setShowDiceRoll(false);
    setEncounterData(null);
    encounterRef.current = null;
    // Rewards already applied server-side, just reload
    loadUserData();
  };

  // Seasonal event completion handler
  const handleEventComplete = async (eventId, eventName, eventIcon) => {
    // Check if story was already generated (stored in story_progress.completed_events)
    const completedEvents = profile?.story_progress?.completed_events || [];
    if (completedEvents.some(e => e.event === eventName)) return;

    setEventStoryMeta({ name: eventName, icon: eventIcon });
    setShowEventStory(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/generate-event-story', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      const data = await response.json();
      if (data.success && data.story) {
        setEventStoryData(data.story);
      } else {
        // API returned error — close after brief delay
        setTimeout(() => setShowEventStory(false), 3000);
      }
    } catch (error) {
      console.error('Failed to generate event story:', error);
      setTimeout(() => setShowEventStory(false), 3000);
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
        loadUserData();
        setChainRefresh((v) => v + 1);
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
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl font-bold kq-display">Loading...</div>
      </div>
    );
  }

  const isPremium = profile?.is_premium || profile?.subscription_status === 'active';
  const sections = getDashboardSections(profile);
  const unlockedSkills = profile ? getUnlockedSkills(profile.archetype, profile.level) : [];
  const bossEncounter = checkBossEncounter(quests);
  const creature = sections.companion ? getCompanion(profile, quests) : null;
  const activeQuestsList = quests.filter(q => !q.completed);
  const isNewUser = (profile?.level || 1) <= 2 && activeQuestsList.length === 0;
  // First-win fast path: brand-new account, nothing completed, nothing created
  const showStarterPicker = (profile?.quests_completed || 0) === 0 && quests.length === 0;

  return (
    <ErrorBoundary>
    <>
      {/* Daily Login Reward */}
      {user && <DailyLoginReward userId={user.id} onRewardClaimed={() => loadUserData()} />}

      {/* Comeback moment: warm full-screen return after 3+ quiet days.
          Guards itself via localStorage 'hq_comeback_ack'. */}
      {profile && (
        <ComebackMoment
          profile={profile}
          onPick={(text) => addQuest(text)}
          creating={adding}
        />
      )}

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

      <div className="kidquest min-h-screen bg-cream text-navy p-4 sm:p-8 pb-24 md:pb-8">
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
            {/* Ungated. /skills has no level or tier check of its own, and the
                tree is worth seeing before you can spend on it -- it shows what
                the next points unlock. Previously this was the only entry point
                and it needed level 10 plus Pro. */}
            {(
              <button
                onClick={() => router.push('/skills')}
                className={`kq-chip font-bold text-xs transition-all ${
                  profile?.skill_points > 0
                    ? 'bg-purple text-white animate-pulse'
                    : 'bg-purple/80 text-white'
                }`}
              >
                <Gem size={13} className="inline -mt-0.5 mr-1" /> Skills {profile?.skill_points > 0 && `(${profile.skill_points})`}
              </button>
            )}
            {sections.journeyNav && isPremium && (
              <button
                onClick={() => router.push('/journey')}
                className="kq-chip bg-purple text-white font-bold text-xs transition-all"
              >
                <BookOpen size={13} className="inline -mt-0.5 mr-1" /> Journey
              </button>
            )}
            {sections.historyNav && (
              <button
                onClick={() => router.push('/history')}
                className="kq-chip bg-navy text-cream font-bold text-xs transition-all"
              >
                <ScrollText size={13} className="inline -mt-0.5 mr-1" /> History
              </button>
            )}
            {/* Below level 10 there is no journal tab, and the bottom nav is
                mobile-only, so desktop had no way in at all. */}
            {!sections.tabBar && (
              <button
                onClick={() => router.push('/journal')}
                className="kq-chip bg-purple text-white font-bold text-xs transition-all"
              >
                <BookOpen size={13} className="inline -mt-0.5 mr-1" /> Journal
              </button>
            )}
            {/* Legendary Badges — quiet entry point, only shown when the flag is on */}
            {process.env.NEXT_PUBLIC_BADGES_ENABLED === 'true' && (
              <button
                onClick={() => router.push('/badges')}
                className="kq-chip bg-gold/15 text-gold border-2 border-gold/40 font-bold text-xs transition-all"
              >
                <Award size={13} className="inline -mt-0.5 mr-1" /> Badges
              </button>
            )}
            <button
              onClick={() => router.push('/settings')}
              className="kq-chip bg-navy text-cream font-bold text-xs transition-all"
            >
              Settings
            </button>
            {profile?.active_campaign_id ? (
              <button
                onClick={() => router.push(profile.campaign_role === 'dm' ? '/campaign/dm' : '/campaign/player')}
                className="kq-chip bg-aqua/20 text-hero-blue border-2 border-aqua/40 font-bold text-xs transition-all"
              >
                {profile.campaign_role === 'dm' ? <Swords size={13} className="inline -mt-0.5 mr-1" /> : <Shield size={13} className="inline -mt-0.5 mr-1" />} My Campaign
              </button>
            ) : (
              <button
                onClick={() => router.push('/campaign/setup')}
                className="kq-chip bg-aqua/10 text-hero-blue border-2 border-aqua/30 font-bold text-xs transition-all"
              >
                <Dices size={13} className="inline -mt-0.5 mr-1" /> Join Campaign
              </button>
            )}
            <button
              onClick={() => router.push('/shop')}
              className="kq-btn kq-btn-gold text-xs"
            >
              <Coins size={13} className="inline -mt-0.5 mr-1" /> Gold Shop
            </button>
            {!isPremium && (
              <button
                onClick={() => router.push('/pricing')}
                className="kq-btn kq-btn-blue text-xs"
              >
                <Flame size={13} className="inline -mt-0.5 mr-1" /> Go Pro
              </button>
            )}
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="kq-chip bg-navy/10 text-navy/60 font-bold text-sm transition-all"
            title={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={handleLogout}
            className="kq-btn kq-btn-ghost text-xs"
            title="Logout"
          >
            Logout
          </button>
        </div>

        {/* First-win fast path — three one-tap starter quests, above the fold */}
        {showStarterPicker && (
          <StarterQuestPicker onPick={(text) => addQuest(text)} creating={adding} />
        )}

        {/* Character Panel — archetype art, XP ring, level, equipped gear */}
        <div id="character-panel">
          <CharacterPanel
            profile={profile}
            creature={creature}
            isPremium={isPremium}
            equipmentVersion={equipmentVersion}
            reducedMotion={prefersReducedMotion}
          />
        </div>

        {/* Living Companion — grows with total quests, never guilts */}
        {creature && <CompanionCard companion={creature} reducedMotion={prefersReducedMotion} />}

        {/* Chronicle — narrative recap, daily "previously on", weekly chapter card */}
        <ChroniclePanel profile={profile} userId={user?.id} />

        {/* Momentum meter — anti-streak weekly engagement loop */}
        <MomentumMeter quests={quests} profile={profile} reducedMotion={prefersReducedMotion} />

        {/* World map teaser — current region + next unlock curiosity gap */}
        <MapWidget
          profile={profile}
          quests={quests}
          userId={user?.id}
          onRegionUnlocked={(region) => {
            setMilestoneData({
              milestone: region.name,
              type: 'achievement',
              unlocks: [
                `${region.icon} ${region.name}: ${region.subtitle}`,
                `New territory: ${region.habitTheme}`,
              ],
            });
            setShowMilestoneCelebration(true);
            // First map region unlocked — offer a reflection after the reveal.
            setTimeout(() => maybePromptTestimonial('first_region_unlock'), 1500);
          }}
        />

        {/* Active Effects Bar */}
        <ActiveEffects effects={activeEffects} />

        {/* Boss Encounter Alert */}
        {bossEncounter && (
          <div className="bg-coral/10 border-2 border-coral rounded-candy p-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{bossEncounter.emoji}</span>
              <div>
                <h3 className="text-xl font-bold kq-display text-coral">{bossEncounter.name}</h3>
                <p className="text-sm text-navy/70">{bossEncounter.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Trial Status Banner */}
        {profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date() && !profile?.is_premium && (
          <div className="bg-gradient-to-r from-purple/10 to-coral/10 border-2 border-purple rounded-candy p-3 mb-4 text-center">
            <p className="text-purple font-bold text-sm">
              Pro Trial: {Math.ceil((new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
            </p>
            <p className="text-navy/60 text-xs mt-1">
              <a href="/pricing" className="text-coral hover:underline font-bold">Upgrade now</a> to keep Pro features
            </p>
          </div>
        )}

        {/* Welcome Quest Chain — first thing new users see */}
        {user && <WelcomeQuestChain userId={user.id} refreshKey={chainRefresh} />}

        {/* Tab Bar — Only at Level 10+ */}
        {sections.tabBar && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'quests', Icon: ClipboardList, label: 'Quests', color: '#FF7B6B' },
                { key: 'templates', Icon: Package, label: 'Templates', color: '#FFC83D' },
                { key: 'equipment', Icon: Swords, label: 'Equipment', color: '#4CAF7D' },
                { key: 'journal', Icon: BookOpen, label: 'Journal', color: '#9B6BE0' },
                { key: 'events', Icon: PartyPopper, label: 'Events', color: '#ec4899', badge: eventBadgeCount },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`kq-chip font-bold text-xs transition-all relative ${
                    activeTab === tab.key
                      ? 'text-white'
                      : 'bg-white text-navy/60 hover:text-navy'
                  }`}
                  style={
                    activeTab === tab.key
                      ? { backgroundColor: tab.color, borderColor: tab.color }
                      : {}
                  }
                >
                  <tab.Icon size={13} className="inline -mt-0.5 mr-1" /> {tab.label}
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-coral text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white animate-pulse">
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
            {/* Tomorrow-quest hook: banner for a planned quest that is due,
                plus the post-celebration "choose tomorrow's quest" card */}
            <TomorrowQuestHook
              showSuggest={showTomorrowHook}
              archetype={profile?.archetype}
              onPick={(text) => addQuest(text)}
              creating={adding}
            />

            {/* Quest Input — THE HERO */}
            <div ref={questInputRef}>
              <QuestInputRedesigned
                onAddQuest={addQuest}
                adding={adding}
                questText={newQuestText}
                setQuestText={setNewQuestText}
                recurrence={recurrence}
                setRecurrence={setRecurrence}
              />
            </div>

            {/* Weekly Boss Battle — every completed quest deals 1 damage */}
            {user && <WeeklyBossCard refreshKey={chainRefresh} />}

            {/* Crossroads — every 5th quest, a d20 story choice */}
            {user && <CrossroadsCard profile={profile} userId={user.id} onResolved={loadUserData} />}

            {/* Active Quests */}
            <div className="kq-card p-6 mb-6">
              <h3 className="text-xl font-bold kq-display text-coral mb-4">Active Quests</h3>
              <div className="space-y-4">
                {activeQuestsList.map((quest) => (
                  <div key={quest.id} className="bg-cream p-4 rounded-candy border-2 border-stone flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-lg text-hero-blue">{quest.transformed_text}</div>
                      <div className="text-sm text-navy/70 mt-1">{quest.original_text}</div>
                      <div className="text-xs text-gold mt-2 font-bold">
                        {quest.difficulty} | {quest.xp_value} XP
                      </div>
                      {/* Recurring controls live on the quest itself now that
                          there is no separate management tab. Stopping a habit
                          leaves today's quest alone -- only tomorrow changes. */}
                      {quest.recurring_quest_id && (
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className="kq-chip bg-aqua/10 text-hero-blue border border-aqua/20 text-[10px] font-black">
                            🔄 COMES BACK
                          </span>
                          <button
                            type="button"
                            onClick={() => stopRecurring(quest.recurring_quest_id)}
                            style={{ minHeight: 44, touchAction: 'manipulation' }}
                            className="px-3 text-xs font-bold text-navy/50 hover:text-coral underline"
                          >
                            Stop repeating
                          </button>
                        </div>
                      )}
                    </div>
                    <motion.button
                      onClick={(e) => completeQuest(quest.id, quest.xp_value, e)}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="kq-btn kq-btn-emerald ml-4 text-sm"
                    >
                      Complete
                    </motion.button>
                  </div>
                ))}
                {activeQuestsList.length === 0 && (
                  showStarterPicker ? null : isNewUser ? (
                    <FirstTimeEmptyState onTryQuest={scrollToQuestInput} />
                  ) : (
                    <EmptyState
                      icon="🍺"
                      title="The tavern is quiet"
                      description="Too quiet. Post a quest on the board and get back to your adventure."
                      actionLabel="Post a Quest"
                      onAction={scrollToQuestInput}
                    />
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
          <div className="kq-card p-6 mb-6">
            <h3 className="text-xl font-bold kq-display text-gold mb-4">Unlocked Skills</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {unlockedSkills.map((skill, i) => (
                <div key={i} className="bg-cream p-4 rounded-candy border-2 border-stone">
                  <div className="font-bold text-hero-blue">{skill.name}</div>
                  <div className="text-sm text-navy/70">{skill.description}</div>
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
            onEquipmentChange={() => setEquipmentVersion((v) => v + 1)}
          />
        )}

        {/* Journal Tab */}
        {sections.tabBar && activeTab === 'journal' && (
          <div className="kq-card p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📖</span>
                <h3 className="text-xl font-bold kq-display text-gold">Hero&apos;s Journal</h3>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJournalEntry(true)}
                  className="kq-btn kq-btn-gold text-sm"
                >
                  ✍️ Write
                </button>
                <button
                  onClick={() => setShowJournalSection(!showJournalSection)}
                  className="kq-btn kq-btn-blue text-sm"
                >
                  {showJournalSection ? '▲ Hide' : '▼ View'} Timeline
                </button>
              </div>
            </div>
            <p className="text-navy/70 text-sm mb-4">
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
                onNewEntry={() => setShowJournalEntry(true)}
              />
            )}
          </div>
        )}

        {/* Seasonal Events Tab */}
        {sections.tabBar && activeTab === 'events' && (
          <SeasonalEvent onEventComplete={handleEventComplete} />
        )}

        {/* Unlock Premium Section (for non-premium users) */}
        {!isPremium && (
          <div className="kq-card p-8 mb-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 kq-display text-gold">🔥 Unlock the Full Adventure</h3>
              <p className="text-navy/70 mb-6 font-bold">Go Pro to access all premium features, starting at just $5/month.</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-cream p-3 rounded-candy border-2 border-stone">
                  <div className="text-2xl mb-1">🔄</div>
                  <div className="font-bold text-hero-blue text-sm">Templates</div>
                </div>
                <div className="bg-cream p-3 rounded-candy border-2 border-stone">
                  <div className="text-2xl mb-1">⚔️</div>
                  <div className="font-bold text-coral text-sm">Equipment</div>
                </div>
                <div className="bg-cream p-3 rounded-candy border-2 border-stone">
                  <div className="text-2xl mb-1">🌳</div>
                  <div className="font-bold text-emerald text-sm">Skill Trees</div>
                </div>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="kq-btn kq-btn-gold text-lg px-8 py-3"
              >
                🔥 Go Pro, $5/mo or $29/yr
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
          storyBeat={celebrationData.storyBeat}
        />
      )}

      {/* Newly unlocked achievements, shown one at a time */}
      <AchievementNotification
        achievement={achievementQueue[0] || null}
        onClose={handleAchievementClose}
      />

      {/* Reflection Prompt */}
      {showReflection && completedQuestData && (
        <ReflectionPrompt
          show={showReflection}
          onClose={() => {
            setShowReflection(false);
            // Show dice roll or chest reveal AFTER reflection closes
            if (encounterRef.current) {
              setTimeout(() => setShowDiceRoll(true), 300);
            } else if (chestDropRef.current) {
              setTimeout(() => setShowChestDrop(true), 300);
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
          unlocks={milestoneData.unlocks}
          isPremium={isPremium}
        />
      )}

      {/* D10 Random Encounter Dice Roll */}
      <DiceRoll
        show={showDiceRoll}
        encounter={encounterData}
        onClaim={handleDiceClaimReward}
      />

      {/* Chest drop reveal (mutually exclusive with dice roll encounter) */}
      <ChestDropReveal
        show={showChestDrop}
        gold={chestDropData?.gold || 0}
        reducedMotion={prefersReducedMotion}
        onClose={() => {
          setShowChestDrop(false);
          setChestDropData(null);
          chestDropRef.current = null;
          loadUserData();
        }}
      />

      {/* XP orb flight from quest card to XP bar */}
      <QuestRewardBurst
        show={showRewardBurst}
        originX={burstOrigin.x}
        originY={burstOrigin.y}
        reducedMotion={prefersReducedMotion}
        onComplete={() => setShowRewardBurst(false)}
      />

      {/* Floating +gold text near the gold counter */}
      <FloatingReward
        show={goldFloat.show}
        text={`+${goldFloat.amount} Gold`}
        color="#FFC83D"
        targetId="gold-counter-target"
        reducedMotion={prefersReducedMotion}
      />

      {/* Momentum bonus toast */}
      <AnimatePresence>
        {momentumToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-6 z-50 bg-emerald text-white px-4 py-3 rounded-candy font-bold text-sm shadow-candy"
          >
            ✨ Momentum filled! +25 bonus XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Story Modal */}
      <EventStoryModal
        show={showEventStory}
        eventName={eventStoryMeta.name}
        eventIcon={eventStoryMeta.icon}
        story={eventStoryData}
        onClose={() => {
          setShowEventStory(false);
          setEventStoryData(null);
          loadUserData();
        }}
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

      {/* Momentum Boost prompt (replaces streak-freeze upsell) */}
      {profile && (
        <MomentumBoost
          quests={quests}
          profile={profile}
          isPremium={isPremium}
          onBoostUsed={loadUserData}
        />
      )}

      {/* Mobile bottom tab navigation */}
      <BottomNav
        active={activeTab === 'journal' ? 'journal' : activeTab === 'quests' ? 'quests' : undefined}
        onQuests={() => {
          if (sections.tabBar) setActiveTab('quests');
          scrollToQuestInput();
        }}
        onMap={() => router.push('/campaign/world')}
        onCharacter={() => document.getElementById('character-panel')?.scrollIntoView({ behavior: 'smooth' })}
        onJournal={() => {
          if (sections.tabBar) {
            setActiveTab('journal');
          } else {
            // setShowJournalSection only drives a block that lives inside the
            // level-10 journal tab, so below level 10 this button did nothing
            // at all. The standalone page has no level check.
            router.push('/journal');
          }
        }}
      />

      {/* PWA install prompt — only after the 3rd completed quest */}
      <InstallPrompt questsCompleted={quests.filter((q) => q.completed).length} />

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
        currentHabits={countHabitsTowardLimit(quests)}
      />

      {/* Milestone testimonial prompt (feature-flagged) */}
      {testimonialPrompt && (
        <TestimonialPrompt
          milestone={testimonialPrompt.milestone}
          suggestion={testimonialPrompt.suggestion}
          onClose={() => setTestimonialPrompt(null)}
        />
      )}

      {/* Footer */}
      <GlobalFooter />
      </div>
    </>
    </ErrorBoundary>
  );
}
