import Link from 'next/link';
import { notFound } from 'next/navigation';
import GlobalFooter from '@/app/components/GlobalFooter';
import EmailCapture from '@/app/components/EmailCapture';

// ─── Comparison data ────────────────────────────────────────────────
// Honest comparisons. Every page says who should NOT pick HabitQuest.
// Pricing/details current as of July 2026. No em dashes in user-facing copy.

type Row = { label: string; them: string; us: string };
type Faq = { q: string; a: string };

type Competitor = {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string[];
  verdictThem: string;
  verdictUs: string;
  table: Row[];
  theyWin: { heading: string; points: string[] };
  weWin: { heading: string; points: string[] };
  missADay: string;
  faqs: Faq[];
};

const COMPETITORS: Competitor[] = [
  {
    slug: 'habitica',
    name: 'Habitica',
    title: 'HabitQuest vs Habitica (2026): Which RPG Habit Tracker Actually Fits You?',
    description:
      'An honest comparison of HabitQuest and Habitica in 2026: punishment vs momentum mechanics, ADHD fit, pricing, and who should pick which RPG habit tracker.',
    intro: [
      "Habitica and HabitQuest look like siblings from across the room: both turn your habits into an RPG with XP, gold, and gear. I built HabitQuest, so I am not pretending to be neutral. Instead I will tell you exactly where Habitica beats my app, and when you should pick it instead.",
      "The real difference is not the pixel art. It is what happens when you miss a day.",
    ],
    verdictThem:
      'Pick Habitica if you want a big community, parties and guilds with friends, and you find losing HP for missed habits motivating rather than crushing.',
    verdictUs:
      'Pick HabitQuest if punishment mechanics are the exact reason you have quit habit apps before. Missing a day costs you nothing here; showing up again is what moves your story forward.',
    table: [
      { label: 'Core mechanic', them: 'RPG with damage: miss a habit, lose HP', us: 'RPG with momentum: misses are non-events' },
      { label: 'Miss a day', them: 'Your avatar takes damage, party can suffer', us: 'Nothing breaks; your quest continues' },
      { label: 'Social', them: 'Parties, guilds, challenges, big community', us: 'Solo-first campaign (party play in beta)' },
      { label: 'ADHD fit', them: 'Feature-dense; can overwhelm', us: 'Built ADHD-first: no shame spirals, fast wins' },
      { label: 'AI features', them: 'None built-in', us: 'AI turns boring tasks into quests' },
      { label: 'Price', them: 'Free; premium subscription for extras', us: 'Free (3 habits); Pro $5/mo or $29/yr Early Bird' },
      { label: 'Platform', them: 'iOS, Android, web', us: 'Web app (installable PWA on any device)' },
    ],
    theyWin: {
      heading: 'Where Habitica honestly beats HabitQuest',
      points: [
        'Community. Habitica has parties, guilds, and years of user-made challenges. If accountability from other humans is your fuel, Habitica does this at a scale I cannot match yet.',
        'Native mobile apps. Habitica ships iOS and Android apps; HabitQuest is a web-first PWA you install from the browser.',
        'Track record. Habitica has been around for a decade. HabitQuest is an indie app built in public by one person (me).',
      ],
    },
    weWin: {
      heading: 'Where HabitQuest wins',
      points: [
        'No punishment loop. Habitica damages your avatar when you miss. For a lot of brains (especially ADHD brains) that turns one bad day into deleting the app. HabitQuest treats a missed day as a non-event.',
        'AI quest transformation. "Do laundry" becomes a quest with story stakes. Habitica gamifies your list; HabitQuest rewrites it.',
        'Focus. Boss battles, equipment, quest chains, and a journal without the maze of menus. You are doing habits within two taps of opening the app.',
      ],
    },
    missADay:
      'On Habitica, missing your dailies damages your character, and if you are in a party your slip can hurt your friends too. Some people find that stake motivating. If instead it makes you avoid opening the app after a bad day, that is the exact failure mode HabitQuest was built to remove: in HabitQuest a miss simply does not appear as damage anywhere.',
    faqs: [
      { q: 'Is HabitQuest just a Habitica clone?', a: 'No. Both are RPG habit trackers, but they run on opposite engines. Habitica motivates with loss (miss a habit, take damage). HabitQuest motivates with momentum (progress accumulates, misses are non-events). If loss aversion works for you, Habitica is great. If it has burned you out before, that is the problem HabitQuest exists to solve.' },
      { q: 'Which is better for ADHD, Habitica or HabitQuest?', a: 'HabitQuest was designed ADHD-first: no streak punishment, instant first wins in onboarding, and AI that turns vague tasks into concrete quests. Habitica can work for ADHD users, but its damage mechanic and dense interface are common drop-off points.' },
      { q: 'Can I use HabitQuest for free?', a: 'Yes. The free plan includes 3 habits, XP and leveling, and archetype selection, with no time limit. Pro is $5/mo (or $29/yr Early Bird) and unlocks unlimited habits, boss battles, equipment, quest chains, and the journal.' },
    ],
  },
  {
    slug: 'streaks',
    name: 'Streaks',
    title: 'HabitQuest vs Streaks (2026): Chain Counting or Momentum, Which Works for You?',
    description:
      'Streaks vs HabitQuest in 2026: an honest look at don’t-break-the-chain tracking versus momentum-based gamification, and which habit app fits your brain.',
    intro: [
      "Streaks is probably the most polished habit tracker on iOS. It is beautiful, fast, and built around one idea: do not break the chain. I have used it for months, and I built HabitQuest partly because of what happened every time my chain broke.",
      "This comparison is really about one question: what does a missed day do to your motivation?",
    ],
    verdictThem:
      'Pick Streaks if you are already fairly consistent, you live on iPhone, and a growing chain number genuinely motivates you. It is the best pure streak counter there is.',
    verdictUs:
      'Pick HabitQuest if broken chains are where your habit attempts go to die. There is no chain to break here, so day 48 after a miss feels exactly as winnable as day 1.',
    table: [
      { label: 'Core mechanic', them: 'Consecutive-day streaks (do not break the chain)', us: 'Momentum and story progress; no chains' },
      { label: 'Miss a day', them: 'Streak resets to zero', us: 'Nothing resets; your progress stays' },
      { label: 'Design', them: 'Minimalist, gorgeous, Apple-native', us: 'Dark fantasy RPG with quests and loot' },
      { label: 'Health integration', them: 'Deep Apple Health integration', us: 'None yet' },
      { label: 'Platform', them: 'iOS, iPadOS, watchOS only', us: 'Web app (PWA), works on any device' },
      { label: 'Price', them: 'One-time purchase on the App Store', us: 'Free (3 habits); Pro $5/mo or $29/yr Early Bird' },
      { label: 'ADHD fit', them: 'Great for consistent brains; harsh after slips', us: 'Built for inconsistent weeks and comebacks' },
    ],
    theyWin: {
      heading: 'Where Streaks honestly beats HabitQuest',
      points: [
        'Polish. Streaks is one of the best-designed apps on iOS, full stop. Widgets, watch app, haptics, all of it.',
        'Apple Health. Streaks can auto-complete tasks from Health data (walks, workouts, mindfulness). HabitQuest has no health integration yet.',
        'One-time price. Streaks is a single App Store purchase. HabitQuest Pro is a subscription.',
      ],
    },
    weWin: {
      heading: 'Where HabitQuest wins',
      points: [
        'The miss-a-day problem. A 47-day chain resetting to zero is the single most common reason people abandon streak apps. HabitQuest has no chain, so there is nothing to lose.',
        'Story and play. Streaks gives you a counter. HabitQuest gives you a character, boss battles, gear, and a world map that fills in as you live your life.',
        'Any device. Streaks is Apple-only. HabitQuest runs in any browser and installs as an app on Android, Windows, Mac, or iPhone.',
      ],
    },
    missADay:
      'In Streaks, the entire motivational model is the unbroken chain, so a miss erases the visible proof of weeks of work. In HabitQuest, a miss is a quiet day in your story. The momentum you built is still there when you come back tomorrow, which is exactly when most people need the app to be kind instead of strict.',
    faqs: [
      { q: 'Is Streaks or HabitQuest better for iPhone users?', a: 'Streaks is Apple-native with widgets, watch support, and Health integration, so if you want a minimalist tracker deeply woven into iOS, choose Streaks. HabitQuest runs as an installable web app on iPhone and trades native polish for RPG depth and a no-streak model.' },
      { q: 'Does HabitQuest have streaks at all?', a: 'No punitive ones. HabitQuest tracks momentum and distinct active days instead of consecutive-day chains, so missing a day never resets anything or shames you on the dashboard.' },
      { q: 'Why does breaking a streak make me quit?', a: 'Loss aversion. Losing a 40-day streak feels roughly twice as bad as gaining one feels good, so after a reset the app becomes a reminder of failure. Removing the chain removes that cliff, which is the core design bet behind HabitQuest.' },
    ],
  },
  {
    slug: 'finch',
    name: 'Finch',
    title: 'HabitQuest vs Finch (2026): Self-Care Pet or RPG Campaign for Your Habits?',
    description:
      'Finch vs HabitQuest in 2026: gentle self-care pet versus dark-fantasy RPG habit tracker. An honest comparison of vibes, mechanics, pricing, and ADHD fit.',
    intro: [
      "Finch might be the kindest app ever made. You care for a little bird by taking care of yourself, and nothing about it ever punishes you. I genuinely recommend Finch to a lot of people, which is why this comparison is worth writing honestly.",
      "Finch and HabitQuest agree on the core philosophy: shame does not build habits. Where we differ is flavor and depth.",
    ],
    verdictThem:
      'Pick Finch if you want gentle, cozy, self-care energy, and a companion that celebrates tiny wins like getting out of bed. It is wonderful for mental-health-first routines.',
    verdictUs:
      'Pick HabitQuest if cozy is not your flavor and you want stakes that feel like an adventure instead of a nursery: boss battles, loot, and a campaign where your habits write the story.',
    table: [
      { label: 'Vibe', them: 'Cozy self-care companion (pet bird)', us: 'Dark fantasy RPG campaign' },
      { label: 'Core loop', them: 'Complete self-care tasks, your birb grows and travels', us: 'Complete quests, level up, fight bosses, unlock territory' },
      { label: 'Miss a day', them: 'Nothing bad happens', us: 'Nothing bad happens' },
      { label: 'Depth', them: 'Light gamification, focus on reflection and mood', us: 'Equipment, quest chains, journal, campaign layer' },
      { label: 'ADHD fit', them: 'Excellent; very low pressure', us: 'Excellent; low pressure with more game to chew on' },
      { label: 'Price', them: 'Free; Finch Plus subscription for extras', us: 'Free (3 habits); Pro $5/mo or $29/yr Early Bird' },
      { label: 'Platform', them: 'iOS and Android apps', us: 'Web app (installable PWA on any device)' },
    ],
    theyWin: {
      heading: 'Where Finch honestly beats HabitQuest',
      points: [
        'Emotional care. Finch includes mood check-ins, breathing exercises, and reflections designed with a mental-health lens. It is a self-care app that happens to track habits.',
        'Cuteness as motivation. If a small bird being proud of you melts your heart, no RPG mechanic will compete with that.',
        'Native mobile apps with reminders and widgets baked in.',
      ],
    },
    weWin: {
      heading: 'Where HabitQuest wins',
      points: [
        'Depth of play. Finch stays intentionally simple. HabitQuest gives you boss battles, gear with real XP bonuses, quest chains, and a world map that unlocks as you show up.',
        'Tone. Some of us are motivated by "slay the dragon", not "your birb went on a little trip". Same gentle mechanics underneath, very different costume.',
        'AI quests. HabitQuest rewrites your boring to-dos into story quests. Finch keeps tasks as tasks.',
      ],
    },
    missADay:
      'This is the one comparison where both apps give the same answer: nothing bad happens. Finch and HabitQuest both refuse to punish a missed day. The difference is what pulls you back. Finch pulls you back with warmth and a pet that missed you. HabitQuest pulls you back with an unfinished quest line and a boss that is not going to defeat itself.',
    faqs: [
      { q: 'Is HabitQuest as gentle as Finch?', a: 'Mechanically, yes. Neither app punishes missed days, resets progress, or uses guilt. The difference is aesthetic: Finch wraps that philosophy in a cozy pet, HabitQuest wraps it in a fantasy RPG with battles and loot.' },
      { q: 'Can I use both Finch and HabitQuest?', a: 'People do. A common split is Finch for mood, reflection, and self-care check-ins, and HabitQuest for the concrete habit list you want to feel like a game. Both have free plans, so the combo costs nothing to try.' },
      { q: 'Which is better for ADHD, Finch or HabitQuest?', a: 'Both are strong ADHD picks because neither punishes inconsistency. Choose by motivation style: nurture and cuteness (Finch) versus novelty, stakes, and story progression (HabitQuest).' },
    ],
  },
  {
    slug: 'everyday',
    name: 'Everyday',
    title: 'HabitQuest vs Everyday (2026): Calendar Grid or Quest Log for Your Habits?',
    description:
      'Everyday vs HabitQuest in 2026: the classic don’t-break-the-chain calendar grid versus a momentum-based RPG. Which habit tracker fits how your brain works?',
    intro: [
      "Everyday is the digital version of the Seinfeld calendar: a clean grid of days that fills with color every time you show up. It is simple, it works everywhere, and there is real satisfaction in watching a row fill up.",
      "I ran my habits on a grid like this for years. HabitQuest exists because of what the empty squares started doing to my head.",
    ],
    verdictThem:
      'Pick Everyday if you want the simplest possible visual tracker, you like seeing your month at a glance, and gaps in the grid motivate you to fill them rather than haunt you.',
    verdictUs:
      'Pick HabitQuest if a visible row of missed days reads like a report card of failure. HabitQuest never shows you a wall of empty squares; it shows you a story that is still going.',
    table: [
      { label: 'Core mechanic', them: 'Calendar grid, chain visualization', us: 'RPG quests, XP, momentum' },
      { label: 'Miss a day', them: 'Empty square stares at you forever', us: 'No visual record of misses at all' },
      { label: 'Simplicity', them: 'Extremely simple, near zero learning curve', us: 'Simple to start, more game as you go' },
      { label: 'Motivation style', them: 'Do not break the chain', us: 'Build momentum, advance the story' },
      { label: 'Platform', them: 'Web, iOS, Android', us: 'Web app (installable PWA on any device)' },
      { label: 'Price', them: 'Free trial; paid subscription', us: 'Free (3 habits); Pro $5/mo or $29/yr Early Bird' },
      { label: 'Extras', them: 'Stats and simple charts', us: 'Boss battles, equipment, journal, AI quests' },
    ],
    theyWin: {
      heading: 'Where Everyday honestly beats HabitQuest',
      points: [
        'Radical simplicity. Open it, tap the day, done. If any game layer feels like friction to you, Everyday is the cleaner tool.',
        'The at-a-glance month. One screen shows your whole month across every habit. HabitQuest spreads that story across quests and a map.',
        'It is everywhere, with lightweight apps and a fast web version.',
      ],
    },
    weWin: {
      heading: 'Where HabitQuest wins',
      points: [
        'No wall of shame. A grid records your misses in permanent ink. HabitQuest simply does not surface missed days, because staring at them helps nobody.',
        'A reason to come back. When the chain is broken, a grid offers no comeback story. HabitQuest always has a next quest, a boss at low health, a region about to unlock.',
        'Play. XP, loot, and story turn "check the box" into "advance the campaign".',
      ],
    },
    missADay:
      'Everyday records a miss as an empty square you will see every time you open the app for the rest of the month. For chain-motivated people, that gap is fuel. For the rest of us, three gaps in a row become proof that we "failed again" and the app quietly gets deleted. HabitQuest keeps no wall of empty squares. Yesterday is gone; the quest is still here.',
    faqs: [
      { q: 'Is a calendar grid or a gamified tracker more effective?', a: 'It depends on how you respond to visible gaps. Research on loss aversion suggests broken chains demotivate many people more than chains motivate them. If gaps fuel you, a grid like Everyday works. If gaps shame you into quitting, a no-punishment system like HabitQuest tends to survive real life better.' },
      { q: 'Does HabitQuest show a history calendar?', a: 'HabitQuest tracks your history and shows progress through XP, levels, weekly summaries, and a world map that fills in, but it deliberately never renders a grid of missed days.' },
      { q: 'Is HabitQuest free like Everyday’s trial?', a: 'HabitQuest’s free plan is permanent, not a trial: 3 habits, XP and leveling, and archetype selection for as long as you want. Pro is $5/mo or $29/yr Early Bird.' },
    ],
  },
];

// ─── Static generation ──────────────────────────────────────────────

export async function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = COMPETITORS.find((c) => c.slug === slug);
  if (!comp) return { title: 'Comparison Not Found | HabitQuest' };
  return {
    title: comp.title,
    description: comp.description,
    alternates: { canonical: `https://habitquest.dev/vs/${comp.slug}` },
    openGraph: {
      title: comp.title,
      description: comp.description,
      url: `https://habitquest.dev/vs/${comp.slug}`,
      siteName: 'HabitQuest',
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title: comp.title, description: comp.description },
  };
}

// ─── Page ───────────────────────────────────────────────────────────

export default async function VsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = COMPETITORS.find((c) => c.slug === slug);
  if (!comp) notFound();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: comp.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: comp.title,
    author: { '@type': 'Person', name: 'Dan', url: 'https://habitquest.dev' },
    publisher: { '@type': 'Organization', name: 'HabitQuest', url: 'https://habitquest.dev' },
    description: comp.description,
    mainEntityOfPage: `https://habitquest.dev/vs/${comp.slug}`,
  };

  const others = COMPETITORS.filter((c) => c.slug !== comp.slug);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

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

      <article className="pt-12 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/vs" className="text-amber-400 hover:text-amber-300 text-sm mb-6 inline-block transition-colors">
            ← All Comparisons
          </Link>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            HabitQuest vs <span className="text-amber-400">{comp.name}</span>
          </h1>

          {comp.intro.map((p, i) => (
            <p key={i} className="text-gray-300 text-lg leading-relaxed mb-4">{p}</p>
          ))}

          {/* Quick verdict */}
          <div className="grid md:grid-cols-2 gap-4 my-10">
            <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-2">Pick {comp.name} if…</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{comp.verdictThem}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-6">
              <h2 className="text-lg font-bold text-amber-400 mb-2">Pick HabitQuest if…</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{comp.verdictUs}</p>
            </div>
          </div>

          {/* Comparison table */}
          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-4">Side by side</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-700/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/80 text-left">
                  <th className="p-3 font-semibold text-gray-400"></th>
                  <th className="p-3 font-semibold text-white">{comp.name}</th>
                  <th className="p-3 font-semibold text-amber-400">HabitQuest</th>
                </tr>
              </thead>
              <tbody>
                {comp.table.map((row) => (
                  <tr key={row.label} className="border-t border-gray-700/50">
                    <td className="p-3 text-gray-400 font-medium">{row.label}</td>
                    <td className="p-3 text-gray-300">{row.them}</td>
                    <td className="p-3 text-gray-200">{row.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Honest sections */}
          <h2 className="text-2xl font-bold text-amber-400 mt-12 mb-4">{comp.theyWin.heading}</h2>
          <ul className="space-y-3">
            {comp.theyWin.points.map((pt, i) => (
              <li key={i} className="text-gray-300 leading-relaxed flex gap-3">
                <span className="text-gray-500 mt-1">▸</span><span>{pt}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-bold text-amber-400 mt-12 mb-4">{comp.weWin.heading}</h2>
          <ul className="space-y-3">
            {comp.weWin.points.map((pt, i) => (
              <li key={i} className="text-gray-300 leading-relaxed flex gap-3">
                <span className="text-amber-400 mt-1">▸</span><span>{pt}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-bold text-amber-400 mt-12 mb-4">The miss-a-day test</h2>
          <p className="text-gray-300 leading-relaxed">{comp.missADay}</p>

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/40 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Try the no-guilt way for free</h2>
            <p className="text-gray-300 mb-6">3 habits, full RPG mechanics, no credit card. If a missed day has ever made you delete a habit app, this one was built for you.</p>
            <Link href="/signup" className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-8 py-3 rounded-lg transition-colors">
              Start Your Quest Free →
            </Link>
            <p className="text-gray-500 text-xs mt-4">
              Want the full breakdown of every app? Read the{' '}
              <Link href="/blog/best-habit-tracking-apps-2026" className="text-amber-400 hover:underline">
                2026 habit app comparison
              </Link>.
            </p>
          </div>

          {/* FAQ */}
          <h2 className="text-2xl font-bold text-amber-400 mt-12 mb-6">Frequently asked questions</h2>
          <div className="space-y-6">
            {comp.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-lg font-semibold text-white mb-2">{f.q}</h3>
                <p className="text-gray-300 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 mb-4">
            <EmailCapture
              source={`vs-${comp.slug}`}
              title="Join the Quest"
              description="Weekly habit science and build-in-public updates from Dan. No spam, ever."
              buttonText="Join Now"
            />
          </div>

          {/* Other comparisons */}
          <div className="mt-12 pt-8 border-t border-gray-700/50">
            <h2 className="text-lg font-bold text-white mb-4">More comparisons</h2>
            <div className="flex flex-wrap gap-3">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/vs/${o.slug}`}
                  className="text-sm bg-gray-800/60 border border-gray-700/60 hover:border-amber-500/50 rounded-lg px-4 py-2 text-gray-300 hover:text-amber-400 transition-colors"
                >
                  HabitQuest vs {o.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </article>

      <GlobalFooter />
    </div>
  );
}
