import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import GlobalFooter from '@/app/components/GlobalFooter';

export const metadata = {
  title: 'Blog \u2014 HabitQuest | Habits, Productivity & Gamification',
  description: 'Science-backed articles on building better habits through gamification, productivity systems for ADHD, and how RPG mechanics make habit tracking actually fun.',
  openGraph: {
    title: 'Blog \u2014 HabitQuest',
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="pt-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-amber-400 hover:text-amber-300 transition-colors">
            \u2694\uFE0F HabitQuest
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="/signup" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors">
              Start Free \u2192
            </Link>
          </nav>
        </div>
      </header>

      <section className="pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            The HabitQuest <span className="text-amber-400">Blog</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Science-backed strategies for building habits that actually stick \u2014 through gamification, behavioral science, and a little bit of RPG magic.
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
                className="group block bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 hover:border-amber-500/50 hover:bg-gray-800/80 transition-all duration-300"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                  {post.title}
                </h2>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                  {post.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
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
