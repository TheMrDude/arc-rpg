import Link from 'next/link';
import GlobalFooter from '@/app/components/GlobalFooter';

export const metadata = {
  title: 'HabitQuest vs Other Habit Trackers: Honest Comparisons (2026)',
  description:
    'Honest, no-spin comparisons of HabitQuest against Habitica, Streaks, Finch, and Everyday. Every page tells you when to pick the other app.',
  alternates: { canonical: 'https://habitquest.dev/vs' },
  openGraph: {
    title: 'HabitQuest vs Other Habit Trackers',
    description: 'Honest comparisons, including when you should NOT pick HabitQuest.',
    url: 'https://habitquest.dev/vs',
    siteName: 'HabitQuest',
    type: 'website',
  },
};

const COMPARISONS = [
  { slug: 'habitica', name: 'Habitica', blurb: 'RPG vs RPG: punishment mechanics or momentum mechanics.' },
  { slug: 'streaks', name: 'Streaks', blurb: 'The chain counter vs the app with no chain to break.' },
  { slug: 'finch', name: 'Finch', blurb: 'Cozy self-care pet vs dark fantasy campaign. Same kindness, different costume.' },
  { slug: 'everyday', name: 'Everyday', blurb: 'The calendar grid vs the quest log.' },
];

export default function VsIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="pt-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-amber-400 hover:text-amber-300 transition-colors">
            ⚔️ HabitQuest
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/blog" className="text-gray-300 hover:text-white transition-colors">Blog</Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="/signup" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors">
              Start Free →
            </Link>
          </nav>
        </div>
      </header>

      <section className="pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            HabitQuest vs <span className="text-amber-400">Everyone</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Honest comparisons written by the guy who built HabitQuest. Every page tells you when you should pick the other app instead. That is the deal.
          </p>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
          {COMPARISONS.map((c) => (
            <Link
              key={c.slug}
              href={`/vs/${c.slug}`}
              className="group block bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 hover:border-amber-500/50 hover:bg-gray-800/80 transition-all duration-300"
            >
              <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                HabitQuest vs {c.name}
              </h2>
              <p className="text-gray-400 text-sm">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <GlobalFooter />
    </div>
  );
}
