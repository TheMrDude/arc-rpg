/**
 * The registry every blocking overlay must appear in.
 *
 * This file, not the shell, is what stops the overlay bugs recurring. A shell
 * only helps overlays that use it; the registry is how CI notices one that
 * doesn't. tests/overlays/shell.spec.js walks this list and asserts the shell
 * invariants for each entry, and a separate check asserts that every
 * full-viewport fixed overlay found in the source appears here. Add an overlay
 * without registering it and CI fails.
 *
 * `migrated: false` means it still renders its own backdrop and z-index. Those
 * are exempt from the invariant assertions but NOT from the completeness check --
 * so the list of things still on the old pattern is visible in CI rather than
 * tribal knowledge, and it has to reach zero.
 */

import { OVERLAY_PRIORITY } from './overlayQueue';

export const OVERLAY_REGISTRY = [
  // ── Priority 1: she tapped something ──────────────────────────────────────
  { id: 'journal-entry', file: 'app/components/JournalEntry.js', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'journal-timeline', file: 'app/components/JournalTimeline.js', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'template-library', file: 'app/components/TemplateLibrary.js', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'share-to-social', file: 'app/components/ShareToSocial.tsx', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'referral-modal', file: 'app/components/ReferralModal.tsx', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'quest-preview', file: 'app/components/QuestPreview.tsx', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'gold-purchase', file: 'app/components/GoldPurchasePrompt.js', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'habit-limit', file: 'app/components/HabitLimitModal.tsx', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'egg-dice', file: 'app/select-archetype/page.js', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'badges-claim', file: 'app/badges/BadgesClient.tsx', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'dm-panel', file: 'app/campaign/dm/page.js', priority: OVERLAY_PRIORITY.USER, migrated: false },
  { id: 'journey-detail', file: 'app/journey/page.js', priority: OVERLAY_PRIORITY.USER, migrated: false },

  // ── Priority 2: blocks progress, has consequences ─────────────────────────
  { id: 'companion-naming', file: 'app/components/CompanionNamingPrompt.js', priority: OVERLAY_PRIORITY.BLOCKING, migrated: true },
  { id: 'welcome-chain', file: 'app/components/WelcomeQuestChain.tsx', priority: OVERLAY_PRIORITY.BLOCKING, migrated: false },
  { id: 'onboarding-tutorial', file: 'app/components/OnboardingTutorial.js', priority: OVERLAY_PRIORITY.BLOCKING, migrated: false },

  // ── Priority 3: earned. Never silently dropped. ───────────────────────────
  { id: 'quest-celebration', file: 'app/components/QuestCompletionCelebration.js', priority: OVERLAY_PRIORITY.REWARD, migrated: false },
  { id: 'milestone-celebration', file: 'app/components/animations/MilestoneCelebration.js', priority: OVERLAY_PRIORITY.REWARD, migrated: true },
  { id: 'first-quest-celebration', file: 'app/components/FirstQuestCelebration.tsx', priority: OVERLAY_PRIORITY.REWARD, migrated: false },
  { id: 'dice-roll', file: 'app/components/DiceRoll.js', priority: OVERLAY_PRIORITY.REWARD, migrated: true },
  { id: 'chest-drop', file: 'app/components/ChestDropReveal.js', priority: OVERLAY_PRIORITY.REWARD, migrated: false },
  { id: 'daily-bonus', file: 'app/components/DailyBonus.js', priority: OVERLAY_PRIORITY.REWARD, migrated: false },
  { id: 'daily-login-reward', file: 'app/components/DailyLoginReward.tsx', priority: OVERLAY_PRIORITY.REWARD, migrated: false },

  // ── Priority 4: narrative and decoration ──────────────────────────────────
  { id: 'event-story', file: 'app/components/EventStoryModal.js', priority: OVERLAY_PRIORITY.NARRATIVE, migrated: true },
  { id: 'story-event-notification', file: 'app/components/StoryEventNotification.js', priority: OVERLAY_PRIORITY.NARRATIVE, migrated: false },
  { id: 'story-milestone', file: 'app/components/StoryMilestoneCelebration.js', priority: OVERLAY_PRIORITY.NARRATIVE, migrated: false },
  { id: 'reflection-prompt', file: 'app/components/ReflectionPrompt.js', priority: OVERLAY_PRIORITY.NARRATIVE, migrated: true },
  { id: 'comeback-moment', file: 'app/components/ComebackMoment.js', priority: OVERLAY_PRIORITY.NARRATIVE, migrated: false },
  { id: 'login-transition-active', file: 'components/LoginTransition/ActiveStreakLogin.tsx', priority: OVERLAY_PRIORITY.NARRATIVE, migrated: false },
  { id: 'login-transition-broken', file: 'components/LoginTransition/BrokenStreakLogin.tsx', priority: OVERLAY_PRIORITY.NARRATIVE, migrated: false },
  { id: 'login-transition-first', file: 'components/LoginTransition/FirstTimeLogin.tsx', priority: OVERLAY_PRIORITY.NARRATIVE, migrated: false },

  // ── Priority 5: asks. Yield to everything. ────────────────────────────────
  { id: 'upgrade-prompt', file: 'app/components/UpgradePrompt.js', priority: OVERLAY_PRIORITY.ASK, migrated: false },
  { id: 'momentum-boost', file: 'app/components/MomentumBoost.js', priority: OVERLAY_PRIORITY.ASK, migrated: false },
  { id: 'testimonial-prompt', file: 'app/components/TestimonialPrompt.js', priority: OVERLAY_PRIORITY.ASK, migrated: false },
  { id: 'premium-welcome', file: 'app/components/PremiumWelcome.js', priority: OVERLAY_PRIORITY.ASK, migrated: false },
];

/**
 * Not overlays, and deliberately exempt from the shell.
 *
 * Toasts auto-dismiss and never block, so a close control and a scroll lock would
 * be wrong. Particle effects are pointer-events:none decoration. Both move to the
 * Z_TOAST band so they can coexist with a modal without covering its buttons --
 * which is the only thing that was actually wrong with them.
 */
export const TOAST_BAND = [
  'app/components/UnlockToast.js',
  'app/components/AchievementNotification.tsx',
  'app/components/AchievementBadges.js',
  'app/components/QuestRewardBurst.js',
  'app/components/FloatingReward.js',
  'app/components/InstallPrompt.js',
  'app/components/NotificationSetup.js',
  'app/components/BottomNav.js',
];

/**
 * Approved for deletion in phase 2, and now actually deleted:
 *   - ExitIntentPopup.tsx  (a mouse-out interstitial: meaningless on a tablet,
 *     a dark pattern in a kids' app)
 *   - PWAInstallPrompt.js  (the unused duplicate of InstallPrompt.js)
 *   - the two .bak files
 * The list stays as the record of the decision; it is empty because the files
 * are gone, and the completeness check no longer needs to exempt them.
 */
export const SLATED_FOR_REMOVAL = [];

export function registryById(id) {
  return OVERLAY_REGISTRY.find((o) => o.id === id) || null;
}

export function migratedCount() {
  return OVERLAY_REGISTRY.filter((o) => o.migrated).length;
}
