import { ImageResponse } from 'next/og';
import { COMPETITORS } from './page';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'HabitQuest comparison';

export async function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = COMPETITORS.find((c) => c.slug === slug);
  return new ImageResponse(
    ogCard({
      title: comp ? `HabitQuest vs ${comp.name}` : 'HabitQuest Comparisons',
      eyebrow: 'Honest comparison',
      accent: '#57D7F5',
    }),
    { ...size }
  );
}
