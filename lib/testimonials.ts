// Shared constants + helpers for the Real-Testimonial Engine.
// Used by both client components and server routes.

export const TESTIMONIAL_MILESTONES = [
  'first_boss_win',
  'quests_30',
  'first_region_unlock',
  'quests_100',
] as const;

export type TestimonialMilestone = (typeof TESTIMONIAL_MILESTONES)[number];

export const MAX_QUOTE_LENGTH = 280;

// One prompt per milestone, and never more than one prompt per this window.
export const PROMPT_COOLDOWN_DAYS = 7;

// The capture prompt is feature-flagged. (The landing-page swap to the honest
// empty state ships UNFLAGGED — it's a copy fix, not a feature.)
export function testimonialsCaptureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TESTIMONIALS_ENABLED === 'true';
}

// Human-readable milestone label for the "My quotes" list.
export const MILESTONE_LABELS: Record<TestimonialMilestone, string> = {
  first_boss_win: 'First boss defeated',
  quests_30: '30 quests completed',
  first_region_unlock: 'First region unlocked',
  quests_100: '100 quests completed',
};

// Best-effort "First name + last initial" suggestion from whatever the profile
// has. Always editable by the user in the prompt, so this is only a default.
export function suggestDisplayName(
  characterName?: string | null,
  email?: string | null
): string {
  const clean = (s: string) => s.replace(/[<>]/g, '').trim();

  if (characterName && clean(characterName).length > 0) {
    const parts = clean(characterName).split(/\s+/);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
    }
    return parts[0];
  }

  if (email && email.includes('@')) {
    const local = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim();
    const parts = local.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      return `${first} ${parts[1].charAt(0).toUpperCase()}.`;
    }
    if (parts.length === 1 && parts[0]) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }

  return 'A quester';
}
