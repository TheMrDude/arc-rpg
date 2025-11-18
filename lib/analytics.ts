// Analytics tracking utility
// Simple console logging for now, easy to integrate PostHog/Vercel Analytics later

export type AnalyticsEvent =
  | 'landing_page_view'
  | 'quest_input_started'
  | 'quest_preview_generated'
  | 'preview_modal_opened'
  | 'signup_clicked_from_preview'
  | 'first_quest_completed'
  | 'archetype_selected';

export function trackEvent(
  eventName: AnalyticsEvent,
  properties?: Record<string, any>
): void {
  // Log to console for development
  console.log('[Analytics]', eventName, properties);

  // TODO: Add PostHog or Vercel Analytics integration
  // Example:
  // if (typeof window !== 'undefined' && window.posthog) {
  //   window.posthog.capture(eventName, properties);
  // }

  // For now, also send to our own endpoint for basic tracking
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
