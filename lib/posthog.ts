'use client';

import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (key) {
      // Data minimisation for a child-directed service: we only want the
      // deliberate funnel events we send ourselves, never an automatic sweep of
      // everything a child clicks or types.
      posthog.init(key, {
        api_host: host,
        loaded: (posthog: any) => {
          if (process.env.NODE_ENV === 'development') posthog.debug();
        },
        capture_pageview: false, // We'll manually track pageviews
        capture_pageleave: true,
        // Off: autocapture records every click/change on the page, which on a
        // kids' app can pick up content we have no reason to collect.
        autocapture: false,
        // Never record sessions, and never capture typed input values.
        disable_session_recording: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
      });
    }
  }
};

export { posthog };

// Helper functions for common events
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.identify(userId, traits);
  }
};

export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.capture(eventName, properties);
  }
};

export const capturePageview = () => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.capture('$pageview');
  }
};

export const resetUser = () => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.reset();
  }
};
