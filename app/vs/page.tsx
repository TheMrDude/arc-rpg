import Link from 'next/link';
import Image from 'next/image';
import GlobalFooter from '@/app/components/GlobalFooter';
import { CAST } from '@/lib/cast';

export const metadata = {
  title: 'HabitQuest vs Other Habit Trackers: Honest Comparisons (2026)',
  description:
    'Honest, no-spin comparisons of HabitQuest against Habitica, Streaks, Finch, Everyday, Fabulous, Loop, and Habitify. Every page tells you when to pick the other app.',
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
  { slug: 'fabulous', name: 'Fabulous', blurb: 'Guided routines and coaching vs a game you direct yourself.' },
  { slug: 'loop', name: 'Loop Habit Tracker', blurb: 'The free open-source favorite vs a reason to actually open the app.' },
  { slug: 'habitify', name: 'Habitify', blurb: 'The data dashboard vs the quest log. Numbers or story.' },
];

export default function VsIndex() {
  return (
    <div className="kidquest min-h-screen bg-cream text-navy">
      <header className="pt-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold kq-display text-hero-blue hover:opacity-80 transition-opacity">
            ⚔️ HabitQuest
          </Link>
          <nav className="flex gap-4 text-sm items-center">
            <Link href="/blog" className="text-navy/60 hover:text-navy transition-colors">Blog</Link>
            <Link href="/pricing" className="text-navy/60 hover:text-navy transition-colors">Pricing</Link>
            <Link href="/signup" className="kq-btn kq-btn-gold">
              Start Free →
            </Link>
          </nav>
        </div>
      </header>

      <section className="pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Image
            src={CAST.harlequin.src}
            alt={CAST.harlequin.alt}
            width={160}
            height={107}
            loading="lazy"
            className="mx-auto mb-4 h-20 w-auto object-contain"
          />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 kq-display">
            HabitQuest vs <span className="text-coral">Everyone</span>
          </h1>
          <p className="text-navy/60 text-lg max-w-2xl mx-auto">
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
              className="group block kq-card kq-card-hover p-6"
            >
              <h2 className="text-xl font-bold text-navy group-hover:text-hero-blue transition-colors mb-2 kq-display">
                HabitQuest vs {c.name}
              </h2>
              <p className="text-navy/60 text-sm">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <GlobalFooter />
    </div>
  );
}
