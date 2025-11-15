// Analytics tracking utility
// Use this throughout the app to track user engagement events

let sessionId = null;

// Generate or retrieve session ID
function getSessionId() {
  if (sessionId) return sessionId;

  // Try to get from sessionStorage
  if (typeof window !== 'undefined') {
    sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
  }

  return sessionId;
}

// Track an analytics event
export async function trackEvent(eventType, eventData = {}) {
  try {
    // Don't track in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
      console.log('[Analytics]', eventType, eventData);
      return;
    }

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: eventType,
        event_data: eventData,
        session_id: getSessionId(),
      }),
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.error('Analytics error:', error);
  }
}

// Convenience functions for common events

export function trackPageView(page) {
  trackEvent('page_view', { page });
}

export function trackQuestCreated(difficulty, archetype) {
  trackEvent('quest_created', { difficulty, archetype });
}

export function trackQuestCompleted(questData) {
  trackEvent('quest_completed', {
    difficulty: questData.difficulty,
    xp_earned: questData.xp_earned,
    gold_earned: questData.gold_earned,
    level: questData.level,
    has_story_thread: !!questData.story_thread,
  });
}

export function trackGoldPurchaseViewed() {
  trackEvent('gold_purchase_viewed');
}

export function trackGoldPurchaseInitiated(packageType, amount) {
  trackEvent('gold_purchase_initiated', {
    package_type: packageType,
    amount_usd: amount,
  });
}

export function trackGoldPurchaseCompleted(packageType, amount, goldAmount) {
  trackEvent('gold_purchase_completed', {
    package_type: packageType,
    amount_usd: amount,
    gold_amount: goldAmount,
  });
}

export function trackEquipmentViewed() {
  trackEvent('equipment_viewed');
}

export function trackEquipmentPurchased(equipmentData) {
  trackEvent('equipment_purchased', {
    equipment_id: equipmentData.id,
    equipment_name: equipmentData.name,
    gold_price: equipmentData.gold_price,
    slot: equipmentData.slot,
  });
}

export function trackStoryMilestone(milestoneType, threadName, completion) {
  trackEvent('story_milestone', {
    milestone_type: milestoneType,
    thread_name: threadName,
    thread_completion: completion,
  });
}

export function trackLevelUp(newLevel, totalXP) {
  trackEvent('level_up', {
    new_level: newLevel,
    total_xp: totalXP,
  });
}

export function trackStreakAchieved(streakDays) {
  trackEvent('streak_achieved', {
    streak_days: streakDays,
  });
}

export function trackBossEncountered(bossName, userLevel) {
  trackEvent('boss_encountered', {
    boss_name: bossName,
    user_level: userLevel,
  });
}

export function trackBossDefeated(bossName, attempts) {
  trackEvent('boss_defeated', {
    boss_name: bossName,
    attempts: attempts,
  });
}

export function trackJournalCreated(wordCount) {
  trackEvent('journal_created', {
    word_count: wordCount,
  });
}

export function trackJournalTransformed(isPremium) {
  trackEvent('journal_transformed', {
    is_premium: isPremium,
  });
}

export function trackPremiumConversion(source) {
  trackEvent('premium_conversion', {
    source: source, // 'pricing_page', 'paywall', 'upgrade_prompt', etc.
  });
}

export function trackReferralCompleted(referralCode) {
  trackEvent('referral_completed', {
    referral_code: referralCode,
  });
}

export function trackFeatureDiscovered(featureName) {
  trackEvent('feature_discovered', {
    feature_name: featureName,
  });
}

export function trackSessionStart() {
  trackEvent('session_start');
}

export function trackSessionEnd(durationSeconds) {
  trackEvent('session_end', {
    duration_seconds: durationSeconds,
  });
}

// Track session duration automatically
if (typeof window !== 'undefined') {
  let sessionStartTime = Date.now();

  // Track session start
  trackSessionStart();

  // Track session end on page unload
  window.addEventListener('beforeunload', () => {
    const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
    trackSessionEnd(durationSeconds);
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      trackSessionEnd(durationSeconds);
    } else {
      sessionStartTime = Date.now();
      trackSessionStart();
    }
  });
}
