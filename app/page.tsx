'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import QuestInput from './components/QuestInput';
import QuestPreview from './components/QuestPreview';
import ExitIntentPopup from './components/ExitIntentPopup';
import EmailCapture from './components/EmailCapture';
import ScrollDepthTracker from './components/ScrollDepthTracker';
import CollectionBand from './components/CollectionBand';
import { PreviewQuest } from '@/lib/onboarding';
import { trackEvent } from '@/lib/analytics';
import { track } from '@/lib/track';

// ─── CONSTANTS ────────────────────────────────────────────────────────
// Presentation-only rewording for the kid-first redesign. Underlying
// entitlements, routes, and checkout wiring are UNCHANGED.
const PRIMARY_CTA_LABEL = 'Start My Adventure';
const SECONDARY_CTA_LABEL = 'See the World';
const CONTROLLING_IDEA = 'Miss a day? No problem. Your adventure always waits for you.';

// Kept for parity with the existing checkout wiring — do not remove (Stripe).
const STRIPE_LINK_PRO_MONTHLY = 'https://buy.stripe.com/fZubJ02TX5SngCc6dadZ602';
const STRIPE_LINK_PRO_YEARLY = 'https://buy.stripe.com/dRm7sK6695Sn85GgROdZ601';
const STRIPE_LINK_EARLY_BIRD = process.env.NEXT_PUBLIC_STRIPE_EARLY_BIRD_LINK || STRIPE_LINK_PRO_YEARLY;

function stripeLink(baseUrl: string, email?: string | null) {
  if (!email) return baseUrl;
  return `${baseUrl}?prefilled_email=${encodeURIComponent(email)}`;
}

type Audience = 'kids' | 'parents';

// ─── World map regions (P4) ───────────────────────────────────────────
const REGIONS = [
  { emoji: '🌳', name: 'Forest of Beginnings', status: 'done', note: 'Unlocked' },
  { emoji: '🏔️', name: 'Mountain of Courage', status: 'done', note: 'Unlocked' },
  { emoji: '❄️', name: 'Frozen Kingdom', status: 'progress', note: 'In progress' },
  { emoji: '🏜️', name: 'Crystal Desert', status: 'locked', note: 'Lvl 12' },
  { emoji: '☁️', name: 'Sky Isles', status: 'locked', note: 'Lvl 18' },
  { emoji: '🌋', name: 'Lava Forge', status: 'locked', note: 'Lvl 25' },
] as const;

// ─── Real habits ➜ epic quests (P5.1) ─────────────────────────────────
const QUESTS = [
  { habit: 'Finish homework', quest: 'Defeat the Goblin of Distraction', emoji: '👺' },
  { habit: 'Brush teeth', quest: 'Polish the Castle Gates', emoji: '🏰' },
  { habit: 'Read 20 minutes', quest: 'Unlock the Magic Library', emoji: '📚' },
  { habit: 'Exercise', quest: 'Open the Mountain Pass', emoji: '⛰️' },
] as const;

// ─── Pets / companions (P5.3) ─────────────────────────────────────────
const PETS = [
  { emoji: '🐉', name: 'Baby Dragon', tag: 'Fiery friend' },
  { emoji: '🦊', name: 'Glow Fox', tag: 'Lights the way' },
  { emoji: '🦉', name: 'Wise Owl', tag: 'Loves reading' },
  { emoji: '🐢', name: 'Backpack Turtle', tag: 'Carries treasure' },
  { emoji: '🫧', name: 'Happy Slime', tag: 'Always cheerful' },
] as const;

// ─── Collectibles (P6.2) ──────────────────────────────────────────────
const COLLECTIBLES = [
  { emoji: '🐾', name: 'Rare Pets' },
  { emoji: '⚔️', name: 'Legendary Gear' },
  { emoji: '🧑‍🎤', name: 'Hero Skins 200+' },
  { emoji: '🛡️', name: 'Epic Armor' },
  { emoji: '🏅', name: 'Badges' },
  { emoji: '🎉', name: 'Seasonal Events' },
] as const;

// ─── Testimonials (P7) — placeholder copy, safe to edit anytime ───────
const QUOTES = [
  {
    quote: 'I actually WANT to do my homework now so I can beat the boss this week. My dragon is level 9!',
    name: 'Maya, age 9',
    who: 'kid',
    emoji: '🧒',
  },
  {
    quote: 'Mornings used to be a battle. Now my son checks off his own routine to level up. No nagging from me.',
    name: 'Jordan P.',
    who: 'parent',
    emoji: '👨',
  },
  {
    quote: 'I love that missing a day doesn’t punish her. It celebrates effort, and it’s completely ad-free.',
    name: 'Priya S.',
    who: 'parent',
    emoji: '👩',
  },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewQuest, setPreviewQuest] = useState<PreviewQuest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingPreviews, setRemainingPreviews] = useState<number>(3);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Audience toggle (P3) — React state only, NEVER browser storage. Default: kids.
  const [audience, setAudience] = useState<Audience>('kids');
  const questInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent('landing_page_view', {});
    // First-party funnel: landing view (anonymous, no PII).
    track('landing_view');
    // Try to get logged-in user email for Stripe prefill (auth wiring — untouched)
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }: any) => {
        if (data?.user?.email) setUserEmail(data.user.email);
      });
    }).catch(() => {});
  }, []);

  // Scroll-reveal (P9): fade/slide-up major sections via IntersectionObserver.
  // Reduced-motion is handled in CSS (elements render visible), so this only
  // adds progressive enhancement.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const els = Array.from(document.querySelectorAll('.kq-reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('kq-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const handleTransform = async (task: string) => {
    setLoading(true);
    setError(null);

    // First-party funnel: demo submitted. Length only — never the habit text.
    track('demo_transform_submitted', { input_length: task.length });

    try {
      const res = await fetch('/api/preview-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong');
        setLoading(false);
        return;
      }

      if (data.remaining !== undefined) {
        setRemainingPreviews(data.remaining);
      }

      trackEvent('quest_preview_generated', {
        xp: data.xp,
        difficulty: data.difficulty,
        remaining: data.remaining,
      });

      setPreviewQuest(data);
    } catch (err) {
      setError('Connection lost. Check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExitIntentTryPreview = () => {
    questInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const goToSignup = () => router.push('/signup');
  const scrollToWorld = () => {
    document.getElementById('world')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Heroes (P5.2) — reuse the EXISTING archetypes, restyled as collectible cards.
  const archetypes = [
    { name: 'Warrior', image: '/images/archetypes/warrior.png', trait: 'Strength & Discipline', rarity: 'Epic', accent: 'coral' },
    { name: 'Seeker', image: '/images/archetypes/seeker.png', trait: 'Curiosity & Growth', rarity: 'Rare', accent: 'aqua' },
    { name: 'Builder', image: '/images/archetypes/builder.png', trait: 'Creation & Progress', rarity: 'Rare', accent: 'emerald' },
    { name: 'Shadow', image: '/images/archetypes/shadow.png', trait: 'Strategy & Depth', rarity: 'Epic', accent: 'purple' },
    { name: 'Sage', image: '/images/archetypes/sage.png', trait: 'Wisdom & Balance', rarity: 'Legendary', accent: 'gold' },
  ];

  const rarityStyles: Record<string, string> = {
    Rare: 'bg-[#57D7F5] text-[#0b3a45]',
    Epic: 'bg-[#8B6CFF] text-white',
    Legendary: 'bg-[#FFC83D] text-[#5a4300]',
  };

  return (
    <div
      className="kidquest min-h-screen overflow-hidden"
      data-audience={audience}
    >
      <ScrollDepthTracker />

      {/* FAQ structured data (SEO) — unchanged */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'What makes this different from every other habit app?', acceptedAnswer: { '@type': 'Answer', text: 'Other apps punish you for missing a day. We don\'t. No broken streaks, no shame notifications. HabitQuest turns real habits into an RPG adventure kids actually want to open. Miss a day? Your adventure just waits for you.' } },
              { '@type': 'Question', name: 'What age is HabitQuest for?', acceptedAnswer: { '@type': 'Answer', text: 'It\'s designed for kids roughly 4–14. The game world is bright and friendly enough for little ones and deep enough (worlds, pets, boss battles) that older kids and teens still find it fun.' } },
              { '@type': 'Question', name: 'What if my kid misses a day?', acceptedAnswer: { '@type': 'Answer', text: 'Nothing bad happens. No streak resets, no guilt screens, no "you failed" messages. Their hero just picks up where they left off. Building habits should feel encouraging, not like punishment.' } },
              { '@type': 'Question', name: 'Is it safe and ad-free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. HabitQuest is ad-free and built to be a calm, safe place for kids to build routines and independence.' } },
              { '@type': 'Question', name: 'What do I get for free?', acceptedAnswer: { '@type': 'Answer', text: 'Track up to 3 habits, pick your hero, and turn habits into quests — free forever. Pro unlocks unlimited quests, boss battles, pets, gear, and every world.' } },
              { '@type': 'Question', name: 'Do I need to download anything?', acceptedAnswer: { '@type': 'Answer', text: 'Nope. It works in any browser on any device. You can install it as an app on a phone if you like (it\'s a PWA), but it\'s not required.' } },
            ],
          }),
        }}
      />

      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-40 border-b border-[#ECE7DD] bg-cream/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <span className="kq-display text-xl sm:text-2xl text-navy">
            <span aria-hidden="true">⚔️</span> HabitQuest
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => router.push('/blog')} className="hidden sm:inline-block px-3 py-2 text-navy/70 hover:text-navy font-bold text-sm rounded-full transition-colors">Blog</button>
            <button onClick={() => router.push('/pricing')} className="px-3 py-2 text-navy/70 hover:text-navy font-bold text-sm rounded-full transition-colors">Pricing</button>
            <button onClick={() => router.push('/login')} className="px-3 py-2 text-navy/70 hover:text-navy font-bold text-sm rounded-full transition-colors">Login</button>
            <button onClick={goToSignup} className="kq-btn kq-btn-gold text-xs sm:text-sm px-3 sm:px-4 py-2 min-h-0 whitespace-nowrap">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">{PRIMARY_CTA_LABEL}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ════════════════ HERO (P2) ════════════════ */}
        <section className="py-8 sm:py-14">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Left — copy */}
            <div className="text-center lg:text-left">
              <span className="kq-chip bg-[#8B6CFF]/15 text-purple mb-5 text-sm">
                <span aria-hidden="true">✨</span> For heroes ages 4&ndash;14
              </span>

              {/* Kid headline */}
              <h1 className="kid-only text-[2.6rem] sm:text-6xl lg:text-[3.6rem] xl:text-6xl text-navy mb-5">
                Turn Your Day Into an{' '}
                <span className="text-hero-blue">Epic Quest</span>
              </h1>
              {/* Parent headline */}
              <h1 className="parent-only text-[2.6rem] sm:text-6xl lg:text-[3.6rem] xl:text-6xl text-navy mb-5">
                Mornings Without the{' '}
                <span className="text-hero-blue">Nagging</span>
              </h1>

              {/* Kid subcopy */}
              <p className="kid-only text-lg sm:text-2xl text-navy/70 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold">
                Level up, unlock new worlds, collect pets, and battle bosses &mdash;
                just by doing your real-life habits.
              </p>
              {/* Parent subcopy */}
              <p className="parent-only text-lg sm:text-2xl text-navy/70 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold">
                HabitQuest helps kids build routines and independence they actually
                want to keep. It celebrates effort, not perfection &mdash; and it&rsquo;s
                ad-free and safe.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                <button onClick={goToSignup} className="kq-btn kq-btn-gold w-full sm:w-auto">
                  <span aria-hidden="true">🚀</span> {PRIMARY_CTA_LABEL}
                </button>
                <button onClick={scrollToWorld} className="kq-btn kq-btn-ghost w-full sm:w-auto">
                  <span aria-hidden="true">🗺️</span> {SECONDARY_CTA_LABEL}
                </button>
              </div>
              <p className="mt-4 text-navy/50 text-sm font-bold">
                Free forever &middot; No credit card &middot; Ad-free
              </p>
            </div>

            {/* Right — illustrated hero scene (CSS/emoji placeholders) */}
            {/* TODO: swap emoji for illustrated mascot art */}
            <div
              className="relative rounded-candy overflow-hidden shadow-candy-lg aspect-[4/3] sm:aspect-[16/11]"
              style={{ background: 'linear-gradient(180deg,#9fdcff 0%,#c9efff 45%,#eafff2 100%)' }}
              role="img"
              aria-label="A young hero standing on a green hill with baby dragon, fox, and owl companions, a castle and volcano in the distance"
            >
              {/* Sun */}
              <div className="absolute top-6 right-8 w-16 h-16 rounded-full bg-[#FFC83D] kq-bob" aria-hidden="true" style={{ boxShadow: '0 0 40px rgba(255,200,61,0.7)' }} />
              {/* Clouds */}
              <div className="absolute top-8 left-6 text-5xl kq-drift" aria-hidden="true">☁️</div>
              <div className="absolute top-20 left-1/2 text-4xl kq-drift-slow" aria-hidden="true">☁️</div>
              {/* Distant map markers */}
              <div className="absolute top-16 right-10 text-3xl kq-float" aria-hidden="true">🏰</div>
              <div className="absolute top-24 left-10 text-2xl kq-bob" aria-hidden="true">🌋</div>
              {/* Sparkles */}
              <div className="absolute top-1/3 left-1/4 text-xl kq-twinkle" aria-hidden="true">✨</div>
              <div className="absolute top-1/2 right-1/4 text-lg kq-twinkle" aria-hidden="true" style={{ animationDelay: '0.8s' }}>✨</div>
              <div className="absolute bottom-1/3 left-1/3 text-base kq-twinkle" aria-hidden="true" style={{ animationDelay: '1.4s' }}>⭐</div>

              {/* Rolling hills */}
              <div className="absolute -bottom-10 -left-10 -right-10 h-40 rounded-[50%] bg-[#3fb56b]" aria-hidden="true" />
              <div className="absolute -bottom-6 -left-16 w-3/4 h-36 rounded-[50%] bg-[#2ECC71]" aria-hidden="true" />

              {/* Hero + companions on the hill */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 sm:gap-2">
                <span className="text-4xl sm:text-5xl kq-bob" aria-hidden="true" style={{ animationDelay: '0.3s' }}>🦊</span>
                <span className="text-5xl sm:text-7xl kq-hop" aria-hidden="true">🧒</span>
                <span className="text-4xl sm:text-5xl kq-hop" aria-hidden="true" style={{ animationDelay: '0.5s' }}>🐉</span>
                <span className="text-3xl sm:text-4xl kq-bob" aria-hidden="true" style={{ animationDelay: '0.7s' }}>🦉</span>
              </div>

              {/* Animated LVL / XP chip */}
              <div className="absolute bottom-4 left-4 bg-white/90 rounded-2xl px-3 py-2 shadow-candy backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="kq-chip bg-[#FFC83D] text-[#5a4300] text-xs py-0.5 px-2">LVL 7</span>
                  <span className="text-navy/70 text-xs font-extrabold">XP</span>
                </div>
                <div className="w-28 h-2.5 rounded-full bg-[#ECE7DD] overflow-hidden">
                  <div className="h-full rounded-full bg-[#2ECC71] kq-xp-fill" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ WORLD MAP (P4) ════════════════ */}
        <section id="world" className="py-14 kq-reveal scroll-mt-20">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-5xl text-navy mb-3">A Whole World to Explore</h2>
            <p className="text-navy/60 text-lg font-semibold max-w-2xl mx-auto">
              Every habit you finish helps you unlock the next region. New lands are always waiting.
            </p>
          </div>

          <div className="rounded-candy p-5 sm:p-8" style={{ background: 'linear-gradient(135deg,#eafff2 0%,#d7f0ff 100%)' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {REGIONS.map((r) => {
                const locked = r.status === 'locked';
                return (
                  <div
                    key={r.name}
                    className={`kq-card kq-card-hover p-5 text-center relative ${locked ? 'opacity-60' : ''}`}
                  >
                    {r.status === 'done' && (
                      <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-emerald text-white flex items-center justify-center text-sm font-black" aria-label="Unlocked">✓</span>
                    )}
                    {r.status === 'progress' && (
                      <span className="absolute top-3 right-3 kq-chip bg-[#57D7F5] text-[#0b3a45] text-xs py-0.5 px-2">In progress</span>
                    )}
                    {locked && (
                      <span className="absolute top-3 right-3 kq-chip bg-navy/10 text-navy text-xs py-0.5 px-2" aria-label={`Locked until level ${r.note.replace('Lvl ', '')}`}>
                        <span aria-hidden="true">🔒</span> {r.note}
                      </span>
                    )}
                    <div className="text-4xl sm:text-5xl mb-3 kq-float" aria-hidden="true">{r.emoji}</div>
                    <h3 className="text-navy text-base sm:text-lg leading-tight">{r.name}</h3>
                    {!locked && <p className="text-navy/50 text-sm font-bold mt-1">{r.note}</p>}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-navy/60 font-bold mt-6 text-sm sm:text-base">
              &hellip;and beyond: <span aria-hidden="true">🌌</span> Star Realm &middot; <span aria-hidden="true">🌙</span> Moon Kingdom &middot; <span aria-hidden="true">🏝️</span> Hidden Regions
            </p>
          </div>
        </section>

        {/* ════════════════ HABITS ➜ QUESTS (P5.1) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl text-navy mb-3">Real Habits Become Epic Quests</h2>
            <p className="text-navy/60 text-lg font-semibold">The boring stuff turns into missions worth doing.</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {QUESTS.map((q) => (
              <div key={q.habit} className="kq-card kq-card-hover flex items-center gap-3 sm:gap-5 p-4 sm:p-5">
                <span className="text-3xl sm:text-4xl flex-shrink-0" aria-hidden="true">{q.emoji}</span>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span className="text-navy/60 font-bold text-sm sm:text-base sm:w-40 flex-shrink-0">{q.habit}</span>
                  <span className="text-hero-blue text-xl" aria-hidden="true">➜</span>
                  <span className="kq-display text-navy text-base sm:text-xl">{q.quest}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive demo — turn any habit into a quest (wired to /api/preview-quest) */}
          <div className="mt-10 max-w-3xl mx-auto kq-card p-5 sm:p-7" ref={questInputRef}>
            <h3 className="text-center text-navy text-xl sm:text-2xl mb-2">Try it &mdash; type any habit</h3>
            <p className="text-center text-navy/60 font-semibold mb-5 text-sm">Watch it turn into a quest right now.</p>
            <QuestInput onTransform={handleTransform} loading={loading} remainingPreviews={remainingPreviews} />
            {error && (
              <div className="text-center mt-4 p-4 bg-coral/15 border-2 border-coral rounded-2xl text-coral font-bold">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* ════════════════ MEET YOUR HERO (P5.2) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl text-navy mb-3">Meet Your Hero</h2>
            <p className="text-navy/60 text-lg font-semibold">Pick the hero that matches you. Collect them all as you level up.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {archetypes.map((a) => (
              <button
                key={a.name}
                onClick={goToSignup}
                className="kq-card kq-card-hover p-4 text-center group relative overflow-hidden"
              >
                <span className={`absolute top-3 left-3 kq-chip text-xs py-0.5 px-2 z-10 ${rarityStyles[a.rarity]}`}>{a.rarity}</span>
                {/* TODO: swap archetype PNG for illustrated mascot art */}
                <div className="relative w-full aspect-square mb-3 rounded-2xl overflow-hidden bg-[#ECE7DD]">
                  <Image src={a.image} alt={`${a.name} hero character`} fill className="object-cover group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-navy text-lg mb-0.5">{a.name}</h3>
                <p className="text-navy/50 text-xs font-bold">{a.trait}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ════════════════ MEET YOUR PET (P5.3) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="text-center mb-4">
            <h2 className="text-3xl sm:text-5xl text-navy mb-3">Meet Your Pet</h2>
            <p className="text-navy/60 text-lg font-semibold">A companion that grows with you on every quest.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {PETS.map((p) => (
              <div key={p.name} className="kq-card kq-card-hover p-5 text-center">
                {/* TODO: swap pet emoji for illustrated mascot art */}
                <div className="text-5xl sm:text-6xl mb-3 kq-bob" aria-hidden="true">{p.emoji}</div>
                <h3 className="text-navy text-base sm:text-lg leading-tight">{p.name}</h3>
                <p className="text-navy/50 text-xs font-bold mt-1">{p.tag}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 kq-display text-lg text-emerald">
            <span aria-hidden="true">💚</span> Miss a day? Your pet waits happily.
          </p>
        </section>

        {/* ════════════════ COLLECTION TEASE (47 characters) ════════════════ */}
        <CollectionBand onStart={goToSignup} />

        {/* ════════════════ BOSS BATTLE (P6.1) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="kq-navy rounded-candy p-6 sm:p-10 relative overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 items-center relative z-10">
              {/* Boss scene */}
              <div className="relative rounded-candy h-56 sm:h-72 flex items-center justify-center" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(139,108,255,0.35), rgba(36,59,90,0) 70%)' }}>
                <span className="absolute top-6 left-8 text-2xl kq-twinkle" aria-hidden="true">⭐</span>
                <span className="absolute bottom-8 right-10 text-xl kq-twinkle" aria-hidden="true" style={{ animationDelay: '0.6s' }}>✨</span>
                <div className="text-7xl sm:text-8xl kq-float" aria-hidden="true">🐲</div>
                <span className="absolute bottom-6 left-6 text-4xl kq-hop" aria-hidden="true">🧒</span>
                {/* Boss HP bar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4/5">
                  <div className="flex justify-between text-xs font-extrabold text-cream mb-1">
                    <span>Weekly Boss</span><span>HP</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/20 overflow-hidden" role="img" aria-label="Boss health bar, roughly one third defeated">
                    <div className="h-full rounded-full bg-coral kq-xp-fill" style={{ maxWidth: '65%' }} />
                  </div>
                </div>
              </div>

              {/* Copy */}
              <div>
                <h2 className="text-3xl sm:text-4xl text-cream mb-5">Battle the Boss</h2>
                <ul className="space-y-3">
                  {[
                    { e: '⚔️', t: 'Every habit you finish damages the weekly boss.' },
                    { e: '🤝', t: 'Team up and raid with friends and family.' },
                    { e: '🎁', t: 'Win rare loot when the boss goes down.' },
                    { e: '💤', t: 'Miss a day? The boss just waits. No penalty, ever.' },
                  ].map((b) => (
                    <li key={b.t} className="flex items-start gap-3 text-cream/90 font-semibold">
                      <span className="text-2xl flex-shrink-0" aria-hidden="true">{b.e}</span>
                      <span>{b.t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ COLLECTIBLES (P6.2) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl text-navy mb-3">Treasures Waiting to Be Unlocked</h2>
            <p className="text-navy/60 text-lg font-semibold">Keep showing up and your collection keeps growing.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {COLLECTIBLES.map((c) => (
              <div key={c.name} className="kq-card p-6 text-center transition-transform duration-200 hover:scale-105">
                <div className="text-4xl sm:text-5xl mb-3 kq-bob" aria-hidden="true">{c.emoji}</div>
                <h3 className="text-navy text-base sm:text-lg leading-tight">{c.name}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════ PARENT TRUST (P7) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="rounded-candy p-6 sm:p-10" style={{ background: 'linear-gradient(135deg, rgba(46,204,113,0.14), rgba(87,215,245,0.14))' }}>
            <div className="text-center mb-9">
              <span className="kq-chip bg-emerald/20 text-emerald mb-3 text-sm">For grown-ups</span>
              <h2 className="text-3xl sm:text-5xl text-navy mb-3">Screen Time With a Purpose</h2>
              <p className="text-navy/60 text-lg font-semibold max-w-2xl mx-auto">
                The fun kids feel is real habit-building underneath &mdash; without the guilt.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {[
                { e: '🌅', t: 'Easier mornings', d: 'Kids run their own routine to level up — less reminding from you.' },
                { e: '🌱', t: 'Builds independence', d: 'They own their habits, and feel proud doing it.' },
                { e: '💛', t: 'Celebrates effort', d: 'Rewards showing up, not perfection. No streak shaming.' },
                { e: '🛡️', t: 'Safe & ad-free', d: 'A calm, private space with no ads and no dark patterns.' },
              ].map((b) => (
                <div key={b.t} className="kq-card p-5 text-center">
                  <div className="text-4xl mb-3" aria-hidden="true">{b.e}</div>
                  <h3 className="text-navy text-lg mb-1">{b.t}</h3>
                  <p className="text-navy/60 text-sm font-semibold">{b.d}</p>
                </div>
              ))}
            </div>

            {/* Parent quote */}
            <div className="kq-card p-6 sm:p-8 max-w-2xl mx-auto text-center mb-6">
              <div className="text-4xl mb-3" aria-hidden="true">💬</div>
              <p className="text-navy text-lg sm:text-xl font-bold leading-relaxed mb-3">
                &ldquo;For the first time, getting ready in the morning isn&rsquo;t a fight. She wants
                to check off her routine to help her hero level up.&rdquo;
              </p>
              <p className="text-navy/50 font-bold text-sm">&mdash; Placeholder parent quote (edit in QUOTES)</p>
            </div>

            {/* Reassurance pills */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {['Less arguing', 'Less reminding', 'More independence', 'Ad-free & private'].map((p) => (
                <span key={p} className="kq-chip bg-white text-navy shadow-candy text-sm">
                  <span aria-hidden="true">✓</span> {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════ TESTIMONIALS (P7) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl text-navy mb-3">Loved by Kids and Parents</h2>
            <p className="text-navy/60 text-lg font-semibold">Placeholder quotes &mdash; swap in real ones anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
            {QUOTES.map((q) => (
              <div key={q.name} className="kq-card p-6 flex flex-col">
                <div className="text-4xl mb-3" aria-hidden="true">{q.emoji}</div>
                <p className="text-navy font-bold leading-relaxed flex-1">&ldquo;{q.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`kq-chip text-xs py-0.5 px-2 ${q.who === 'kid' ? 'bg-[#FFC83D] text-[#5a4300]' : 'bg-[#57D7F5] text-[#0b3a45]'}`}>
                    {q.who === 'kid' ? 'Kid' : 'Parent'}
                  </span>
                  <span className="text-navy/60 font-bold text-sm">{q.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════ PRICING (P8 — re-skin only, logic unchanged) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl text-navy mb-3">Pick Your Adventure Pass</h2>
            <p className="text-navy/60 text-lg font-semibold">Start free forever. Upgrade any time.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto items-stretch">
            {/* Free */}
            <div className="kq-card p-6 flex flex-col">
              <h3 className="kq-display text-2xl text-navy mb-1">Free</h3>
              <div className="kq-display text-4xl text-hero-blue mb-1">$0</div>
              <p className="text-navy/50 text-sm font-bold mb-5">forever</p>
              <ul className="space-y-2.5 text-navy/80 text-sm font-semibold mb-6 flex-1">
                <li className="flex gap-2"><span className="text-emerald" aria-hidden="true">✓</span> 3 quests (habits)</li>
                <li className="flex gap-2"><span className="text-emerald" aria-hidden="true">✓</span> Pick your hero</li>
                <li className="flex gap-2"><span className="text-emerald" aria-hidden="true">✓</span> Turn habits into quests</li>
                <li className="flex gap-2"><span className="text-emerald" aria-hidden="true">✓</span> Level up &amp; earn XP</li>
              </ul>
              <button onClick={goToSignup} className="kq-btn kq-btn-blue w-full">Start Free</button>
            </div>

            {/* Pro Monthly — Most Popular, gold border, lifted */}
            <div className="kq-card p-6 flex flex-col relative -translate-y-0 md:-translate-y-4 shadow-candy-lg" style={{ boxShadow: '0 0 0 4px #FFC83D, 0 20px 45px rgba(36,59,90,0.2)' }}>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 kq-chip bg-gold text-[#5a4300] text-xs py-1 px-4 whitespace-nowrap">⭐ Most Popular</span>
              <h3 className="kq-display text-2xl text-navy mb-1">Pro</h3>
              <div className="kq-display text-4xl text-navy mb-1">$5<span className="text-lg text-navy/40">/mo</span></div>
              <p className="text-navy/50 text-sm font-bold mb-5">billed monthly</p>
              <ul className="space-y-2.5 text-navy/80 text-sm font-semibold mb-6 flex-1">
                <li className="flex gap-2"><span className="text-gold" aria-hidden="true">★</span> Unlimited quests</li>
                <li className="flex gap-2"><span className="text-gold" aria-hidden="true">★</span> Boss battles &amp; raids</li>
                <li className="flex gap-2"><span className="text-gold" aria-hidden="true">★</span> Unlock every world</li>
                <li className="flex gap-2"><span className="text-gold" aria-hidden="true">★</span> Collect pets &amp; gear</li>
                <li className="flex gap-2"><span className="text-gold" aria-hidden="true">★</span> Hero journal</li>
                <li className="flex gap-2"><span className="text-gold" aria-hidden="true">★</span> Campaign adventures</li>
              </ul>
              <button onClick={() => router.push('/signup?plan=pro_monthly')} className="kq-btn kq-btn-gold w-full">Get Pro</button>
            </div>

            {/* Early Bird */}
            <div className="kq-card p-6 flex flex-col relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 kq-chip bg-emerald text-white text-xs py-1 px-4 whitespace-nowrap">50% off</span>
              <h3 className="kq-display text-2xl text-navy mb-1">Early Bird</h3>
              <div className="kq-display text-4xl text-emerald mb-1">$29<span className="text-lg text-navy/40">/yr</span></div>
              <p className="text-navy/50 text-sm font-bold mb-5">launch price</p>
              <ul className="space-y-2.5 text-navy/80 text-sm font-semibold mb-6 flex-1">
                <li className="flex gap-2"><span className="text-emerald" aria-hidden="true">✓</span> Everything in Pro</li>
                <li className="flex gap-2"><span className="text-emerald" aria-hidden="true">✓</span> Save 50% vs monthly</li>
                <li className="flex gap-2"><span className="text-emerald" aria-hidden="true">✓</span> Lock in launch price</li>
              </ul>
              <button onClick={() => router.push('/signup?plan=early_bird')} className="kq-btn kq-btn-emerald w-full">Get Early Bird</button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-8">
            {['No credit card to start', 'No streaks, no guilt', 'Cancel Pro anytime'].map((p) => (
              <span key={p} className="kq-chip bg-white text-navy shadow-candy text-sm">
                <span aria-hidden="true">✓</span> {p}
              </span>
            ))}
          </div>
        </section>

        {/* ════════════════ EMAIL CAPTURE (kept, wired) ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="max-w-2xl mx-auto kq-card p-6 sm:p-8">
            <EmailCapture
              source="landing_midpage"
              title="Not ready to start the adventure yet?"
              description="Get the free 5-day Habit Reset for families — simple, guilt-free ways to build routines that stick."
              buttonText="Send Me the Habit Reset"
              tags={['habit_reset', 'newsletter']}
              inline={false}
            />
          </div>
        </section>

        {/* ════════════════ FAQ ════════════════ */}
        <section className="py-14 max-w-3xl mx-auto kq-reveal">
          <h2 className="text-3xl sm:text-4xl text-navy text-center mb-10">Quick Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'What makes this different from other habit apps?', a: 'Other apps punish you for missing a day. We don’t. No broken streaks, no shame. HabitQuest turns real habits into an RPG adventure kids actually want to open.' },
              { q: 'What age is it for?', a: 'Built for roughly ages 4–14 — bright and friendly for littles, deep enough (worlds, pets, boss battles) that older kids still love it.' },
              { q: 'What if my kid misses a day?', a: 'Nothing bad happens. No streak resets, no guilt screens. Their hero just picks up where they left off.' },
              { q: 'Is it safe and ad-free?', a: 'Yes — ad-free, private, and designed to be a calm, safe place to build routines.' },
              { q: 'What do I get for free?', a: 'Track up to 3 habits, pick your hero, and turn habits into quests — free forever. Pro unlocks unlimited quests, boss battles, pets, gear, and every world.' },
              { q: 'Do I need to download anything?', a: 'Nope. Works in any browser on any device. You can install it as an app on a phone (it’s a PWA), but it’s not required.' },
            ].map((item) => (
              <div key={item.q} className="kq-card p-6">
                <h3 className="kq-display text-lg text-navy mb-1.5">{item.q}</h3>
                <p className="text-navy/70 font-semibold">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════ FINAL CTA ════════════════ */}
        <section className="py-14 kq-reveal">
          <div className="kq-navy rounded-candy p-8 sm:p-12 text-center">
            <div className="text-5xl mb-4 kq-hop" aria-hidden="true">🚀</div>
            <h2 className="text-3xl sm:text-5xl text-cream mb-4">Ready to Start Your Adventure?</h2>
            <p className="text-cream/70 text-lg font-semibold mb-8 max-w-xl mx-auto">
              Free forever. No credit card. No guilt &mdash; ever.
            </p>
            <button onClick={goToSignup} className="kq-btn kq-btn-gold text-lg">
              <span aria-hidden="true">⚔️</span> {PRIMARY_CTA_LABEL}
            </button>
          </div>
        </section>

        {/* ════════════════ FOOTER ════════════════ */}
        <footer className="py-10 border-t border-[#ECE7DD] text-center">
          <p className="kq-display text-emerald text-lg mb-2">{CONTROLLING_IDEA}</p>
          <p className="text-navy/50 font-semibold text-sm max-w-xl mx-auto mb-4">
            HabitQuest turns real habits into an epic adventure, so building routines actually feels fun.
          </p>
          <div className="flex justify-center gap-5 text-sm font-bold mb-3">
            <button onClick={() => router.push('/login')} className="text-hero-blue hover:underline">Login</button>
            <button onClick={() => router.push('/privacy')} className="text-navy/50 hover:text-navy">Privacy</button>
            <button onClick={() => router.push('/terms')} className="text-navy/50 hover:text-navy">Terms</button>
          </div>
          <p className="text-navy/40 text-xs font-bold">&copy; 2026 HabitQuest. {CONTROLLING_IDEA}</p>
        </footer>
      </main>

      {/* ═══ AUDIENCE TOGGLE (P3) — floating pill, React state only, no storage ═══ */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 bg-white rounded-full p-1 shadow-candy-lg border border-[#ECE7DD]" role="group" aria-label="Choose view">
        <button
          onClick={() => setAudience('kids')}
          aria-pressed={audience === 'kids'}
          className={`kq-chip text-sm px-3 py-2 transition-colors ${audience === 'kids' ? 'bg-hero-blue text-white' : 'text-navy/70'}`}
        >
          <span aria-hidden="true">🎮</span> For Kids
        </button>
        <button
          onClick={() => setAudience('parents')}
          aria-pressed={audience === 'parents'}
          className={`kq-chip text-sm px-3 py-2 transition-colors ${audience === 'parents' ? 'bg-emerald text-white' : 'text-navy/70'}`}
        >
          <span aria-hidden="true">👨‍👩‍👧</span> For Parents
        </button>
      </div>

      {/* Quest Preview Modal */}
      {previewQuest && <QuestPreview quest={previewQuest} onClose={() => setPreviewQuest(null)} />}

      {/* Exit Intent Popup */}
      <ExitIntentPopup onTryPreview={handleExitIntentTryPreview} />
    </div>
  );
}
