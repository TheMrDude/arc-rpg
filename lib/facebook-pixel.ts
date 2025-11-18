'use client';

declare global {
  interface Window {
    fbq: any;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

export const pageview = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
};

export const trackEvent = (name: string, options: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', name, options);
  }
};

// Standard events
export const trackLead = () => {
  trackEvent('Lead');
};

export const trackCompleteRegistration = () => {
  trackEvent('CompleteRegistration');
};

export const trackPurchase = (value: number, currency: string = 'USD') => {
  trackEvent('Purchase', { value, currency });
};

export const trackAddToCart = () => {
  trackEvent('AddToCart');
};

export const trackInitiateCheckout = () => {
  trackEvent('InitiateCheckout');
};

// Custom events
export const trackQuestPreview = () => {
  trackEvent('QuestPreview');
};

export const trackArchetypeSelected = (archetype: string) => {
  trackEvent('ArchetypeSelected', { archetype });
};

export const trackEmailCaptured = (source: string) => {
  trackEvent('EmailCaptured', { source });
};
