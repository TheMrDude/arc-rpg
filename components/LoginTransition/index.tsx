'use client';

import { useState } from 'react';
import BrokenStreakLogin from './BrokenStreakLogin';
import ActiveStreakLogin from './ActiveStreakLogin';
import FirstTimeLogin from './FirstTimeLogin';

interface LoginTransitionProps {
  streakCount: number;
  lastActivityDate: string | null;
  isFirstLogin: boolean;
}

/**
 * LoginTransition Controller
 *
 * Determines which emotional login transition to display based on user's streak status:
 * 1. Broken Streak: last activity 2+ days ago - fog clearing animation
 * 2. Active Streak: activity within 1 day AND streak > 0 - sunrise animation
 * 3. First Time User: streak === 0 AND first login - gentle dawn
 */
export default function LoginTransition({
  streakCount,
  lastActivityDate,
  isFirstLogin,
}: LoginTransitionProps) {
  const [showTransition, setShowTransition] = useState(true);

  // Hide transition when animation completes
  const handleComplete = () => {
    setShowTransition(false);
  };

  // Don't render anything if transition should be hidden
  if (!showTransition) {
    return null;
  }

  // Calculate days since last activity
  const daysSinceLastActivity = lastActivityDate
    ? Math.floor(
        (new Date().getTime() - new Date(lastActivityDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : Infinity;

  // Determine which transition to show based on user state

  // First time user (streak === 0 AND first login)
  if (isFirstLogin && streakCount === 0) {
    return <FirstTimeLogin onComplete={handleComplete} />;
  }

  // Broken streak (last activity 2+ days ago)
  if (daysSinceLastActivity >= 2) {
    return <BrokenStreakLogin onComplete={handleComplete} />;
  }

  // Active streak (activity within 1 day AND streak > 0)
  if (daysSinceLastActivity <= 1 && streakCount > 0) {
    return <ActiveStreakLogin streakCount={streakCount} onComplete={handleComplete} />;
  }

  // Default: first time login for edge cases
  return <FirstTimeLogin onComplete={handleComplete} />;
}
