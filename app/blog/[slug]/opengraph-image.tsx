import { ImageResponse } from 'next/og';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'HabitQuest blog post';

// Pre-render one card per post at build time, matching the page's own params.
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p: { slug: string }) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return new ImageResponse(
    ogCard({ title: post?.title || 'HabitQuest', eyebrow: 'Blog' }),
    { ...size }
  );
}
