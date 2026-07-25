import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'HabitQuest pricing';

// /pricing's segment layout declares its own openGraph block, which replaces
// the root layout's rather than merging, so the route emitted no og:image.
export default function Image() {
  return new ImageResponse(
    ogCard({ title: 'Free to Start, No Punishment', eyebrow: 'Pricing' }),
    { ...size }
  );
}
