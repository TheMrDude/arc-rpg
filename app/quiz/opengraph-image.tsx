import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'HabitQuest archetype quiz';

// /quiz's segment layout declares its own openGraph block, which replaces the
// root layout's rather than merging, so the route emitted no og:image. This is
// the most shareable page on the site, so a bare link cost the most here.
export default function Image() {
  return new ImageResponse(
    ogCard({ title: 'Which Habit Archetype Are You?', eyebrow: 'Free 2-minute quiz' }),
    { ...size }
  );
}
