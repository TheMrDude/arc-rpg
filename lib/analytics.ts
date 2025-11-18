// Analytics tracking utility
// Integrated with PostHog for comprehensive event tracking

import { captureEvent } from './posthog';

export type AnalyticsEvent =
  | 'landing_page_view'
  | 'quest_input_started'
  | 'quest_preview_generated'
  | 'preview_modal_opened'
  | 'signup_clicked_from_preview'
  | 'first_quest_completed'
  | 'archetype_selected'
  | 'email_captured';

export function trackEvent(
  eventName: AnalyticsEvent | string,
  properties?: Record<string, any>
): void {
  // Log to console for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, properties);
  }

  // Track with PostHog
  captureEvent(eventName, properties);

  // Also send to our own endpoint for basic tracking
  if (typeof window !== 'undefined') {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, properties })
    }).catch(() => {
      // Silently fail - don't let analytics break the app
    });
  }
}

export function trackPageView(pageName: string): void {
  trackEvent('landing_page_view', { page: pageName });
}
