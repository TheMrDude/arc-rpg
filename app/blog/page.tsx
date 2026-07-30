import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts } from '@/lib/blog';
import GlobalFooter from '@/app/components/GlobalFooter';
import { CAST } from '@/lib/cast';

export const metadata = {
  title: 'Blog | HabitQuest: Habits, Productivity & Gamification',
  description: 'Science-backed articles on building better habits through gamification, productivity systems for ADHD, and how RPG mechanics make habit tracking actually fun.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog | HabitQuest',
    description: 'Science-backed articles on habits, productivity, and gamification.',
    url: 'https://habitquest.dev/blog',
    siteName: 'HabitQuest',
    type: 'website',
  },
};

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="kidquest min-h-screen bg-cream text-navy">
      <header className="pt-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl kq-display font-bold text-hero-blue hover:text-coral transition-colors">
            \u2694\uFE0F HabitQuest
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/pricing" className="text-navy/60 hover:text-navy transition-colors">Pricing</Link>
            <Link href="/signup" className="kq-btn kq-btn-gold">
              Start Free \u2192
            </Link>
          </nav>
        </div>
      </header>

      <section className="pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Image
            src={CAST.inkwraith.src}
            alt={CAST.inkwraith.alt}
            width={160}
            height={107}
            loading="lazy"
            className="mx-auto mb-4 h-20 w-auto object-contain"
          />
          <h1 className="kq-display text-4xl md:text-5xl font-bold mb-4">
            The HabitQuest <span className="text-hero-blue">Blog</span>
          </h1>
          <p className="text-navy/60 text-lg max-w-2xl mx-auto">
            Science-backed strategies for building habits that actually stick, through gamification, behavioral science, and a little bit of RPG magic.
          </p>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block kq-card kq-card-hover p-6 transition-all duration-300"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="kq-chip text-xs px-2 py-1 bg-gold/10 text-navy border border-gold/30">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="kq-display text-xl md:text-2xl font-bold text-navy group-hover:text-hero-blue transition-colors mb-2">
                  {post.title}
                </h2>
                <p className="text-navy/60 text-sm mb-3 line-clamp-2">
                  {post.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-navy/50">
                  <span>{formatDate(post.date)}</span>
                  <span>\u00B7</span>
                  <span>{post.author}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  );
}
