import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'HabitQuest blog';

// /blog declares its own openGraph block, which replaces the root layout's
// wholesale rather than merging into it -- so the index page inherited no
// og:image and shared as a bare link. Same shared template as the per-post
// cards, so the index matches the posts it lists.
export default function Image() {
  return new ImageResponse(
    ogCard({ title: 'Habits, Productivity & Gamification', eyebrow: 'Blog' }),
    { ...size }
  );
}
