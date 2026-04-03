'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import QuestInput from './components/QuestInput';
import QuestPreview from './components/QuestPreview';
import ExitIntentPopup from './components/ExitIntentPopup';
import EmailCapture from './components/EmailCapture';
import { PreviewQuest } from '@/lib/onboarding';
import { trackEvent } from '@/lib/analytics';
import Image from 'next/image'

// ─── CONSTANTS ────────────────────────────────────────────────────────
const PRIMARY_CTA_LABEL = 'Start Free →';
const SECONDARY_CTA_LABEL = 'Go Pro — $5/mo';
const CONTROLLING_IDEA = 'Your habits. Your story. No guilt.';
const STRIPE_LINK_PRO_MONTHLY = 'https://buy.stripe.com/fZubJ02TX5SngCc6dadZ602';
const STRIPE_LINK_PRO_YEARLY = 'https://buy.stripe.com/dRm7sK6695Sn85GgROdZ601';

function stripeLink(baseUrl: string, email?: string | null) {
  if (!email) return baseUrl;
  return `${baseUrl}?prefilled_email=${encodeURIComponent(email)}`;
}

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewQuest, setPreviewQuest] = useState<PreviewQuest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingPreviews, setRemainingPreviews] = useState<number>(3);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const questInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent('landing_page_view', {});
    // Try to get logged-in user email for Stripe prefill
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) setUserEmail(data.user.email);
      });
    }).catch(() => {});
  }, []);

  const handleTransform = async (task: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/preview-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
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
        remaining: data.remaining
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
  const goToPricing = () => router.push('/pricing');

  const archetypes = [
    { name: 'Warrior', image: '/images/archetypes/warrior.png', trait: 'Strength & Discipline', desc: 'You power through challenges with grit and determination.' },
    { name: 'Seeker', image: '/images/archetypes/seeker.png', trait: 'Curiosity & Growth', desc: 'You explore new paths and embrace every learning moment.' },
    { name: 'Builder', image: '/images/archetypes/builder.png', trait: 'Creation & Progress', desc: 'You construct systems and watch your world take shape.' },
    { name: 'Shadow', image: '/images/archetypes/shadow.png', trait: 'Strategy & Depth', desc: 'You plan in silence and strike with precision.' },
    { name: 'Sage', image: '/images/archetypes/sage.png', trait: 'Wisdom & Balance', desc: 'You seek understanding and bring harmony to every habit.' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "What makes this different from every other habit app?", "acceptedAnswer": { "@type": "Answer", "text": "Other apps punish you for missing a day. We don't. No broken streaks, no shame notifications. HabitQuest turns your habits into an RPG adventure — so you actually want to open the app. Your habits. Your story. No guilt." } },
            { "@type": "Question", "name": "Is this just for gamers?", "acceptedAnswer": { "@type": "Answer", "text": "Not at all. If you've ever wished tasks felt less boring, this is for you. You don't need to know anything about RPGs — the game layer just makes habits feel rewarding instead of draining." } },
            { "@type": "Question", "name": "What if I miss a day?", "acceptedAnswer": { "@type": "Answer", "text": "Nothing bad happens. Seriously. No streak resets, no guilt screens, no \"you failed\" messages. Your character just picks up where you left off. Because building habits shouldn't feel like punishment." } },
            { "@type": "Question", "name": "What do I get for free?", "acceptedAnswer": { "@type": "Answer", "text": "Track up to 3 habits, choose your archetype, and get AI quest transformation — completely free, forever. Pro unlocks unlimited habits, boss battles, equipment, and the full RPG experience." } },
            { "@type": "Question", "name": "Do I need to download anything?", "acceptedAnswer": { "@type": "Answer", "text": "Nope. Works in your browser on any device. You can install it as an app on your phone if you want (it's a PWA), but it's not required." } }
          ]
        }) }}
      />
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 w-2 h-2 bg-[#FF5733] rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-[#7C3AED] rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-[#10B981] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 right-1/3 w-3 h-3 bg-[#F59E0B] rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* ─── SECTION 1: NAV BAR (Z-Pattern: Logo left, Direct CTA right) ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full border-b border-[#00D4FF]/20 backdrop-blur-sm bg-[#1E293B]/50 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-[#FF6B6B]">⚔️ HabitQuest</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/blog')}
              className="px-4 py-2 text-gray-300 hover:text-white font-bold text-xs sm:text-sm uppercase tracking-wide transition-colors"
            >
              Blog
            </button>
            <button
              onClick={() => router.push('/pricing')}
              className="px-4 py-2 text-gray-300 hover:text-white font-bold text-xs sm:text-sm uppercase tracking-wide transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-gray-300 hover:text-white font-bold text-xs sm:text-sm uppercase tracking-wide transition-colors"
            >
              Login
            </button>
            {/* CTA #1 — Nav bar */}
            <button
              onClick={goToSignup}
              className="px-4 sm:px-6 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white border-2 border-[#0F3460] rounded-lg font-black text-xs sm:text-sm uppercase tracking-wide transition-all duration-200 shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1"
            >
              {PRIMARY_CTA_LABEL}
            </button>
          </div>
        </div>
      </motion.nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1: HERO / ABOVE THE FOLD
            SB7 Element: Character + Grunt Test
            5-second clarity: What you offer | How it helps | What to do
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Grunt Test Headline: What it is + how it makes life better */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
              <span className="text-white">You Don&apos;t Have a Discipline Problem.</span>
              <br />
              <span className="bg-gradient-to-r from-[#FF6B35] to-[#F59E0B] bg-clip-text text-transparent">
                You Have a Boring App Problem.
              </span>
            </h1>

            {/* Sub-headline: Addresses internal problem */}
            <p className="text-xl sm:text-2xl mb-4 text-gray-300 max-w-3xl mx-auto leading-relaxed">
              HabitQuest turns your real habits into an RPG.
              <span className="text-[#4ECDC4] font-bold"> No streaks. No guilt. Just daily quests you actually want to complete.</span>
            </p>

            {/* Controlling idea echo */}
            <p className="text-md mb-10 text-[#F59E0B]/80 font-semibold italic">
              {CONTROLLING_IDEA}
            </p>

            {/* CTA #2 — Hero center */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
              <button
                onClick={goToSignup}
                className="px-10 py-5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white border-3 border-[#0F3460] rounded-xl font-black text-xl uppercase tracking-wide shadow-lg transition-all hover:scale-105"
              >
                ⚔️ {PRIMARY_CTA_LABEL}
              </button>
              <a
                href={stripeLink(STRIPE_LINK_PRO_MONTHLY, userEmail)}
                className="px-8 py-4 bg-transparent hover:bg-[#00D4FF]/10 text-[#00D4FF] border-2 border-[#00D4FF] rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:scale-105 inline-block"
              >
                {SECONDARY_CTA_LABEL}
              </a>
            </div>
            <p className="text-gray-400 text-sm">
              Free forever. No credit card required.
            </p>

            {/* 30-Day Guarantee */}
            <div className="mt-8 max-w-xl mx-auto flex items-start gap-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4">
              <span className="text-2xl flex-shrink-0">🛡️</span>
              <p className="text-sm text-gray-300 text-left leading-relaxed">
                <span className="font-bold text-[#10B981]">30-Day No-Guilt Guarantee:</span> If HabitQuest doesn&apos;t help you build at least one consistent habit in 30 days, email us for a full refund. No forms, no questions, no guilt &mdash; we practice what we preach.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2: THE STAKES / THE VILLAIN
            SB7 Element: Villain + Problem (External, Internal, Philosophical)
            Open the story gap. Make the reader feel SEEN.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-center mb-8 text-white">
              Other Habit Apps Are Built on Shame. That&apos;s Why They Don&apos;t Work.
            </h2>

            <div className="bg-[#16213E]/60 border-2 border-red-500/30 rounded-2xl p-8 sm:p-10 space-y-6">
              {/* Name the villain */}
              <p className="text-lg sm:text-xl text-gray-200 leading-relaxed">
                You&apos;ve tried the apps. Streaks, notifications, colored squares. And every single
                time, the same thing happens: you miss a day, the streak resets, and you feel
                like garbage.
              </p>

              {/* Hit the internal problem */}
              <p className="text-lg sm:text-xl text-gray-200 leading-relaxed">
                Then the guilt kicks in. <span className="text-red-400 font-bold">&ldquo;Why can&apos;t I just
                stick with something? What&apos;s wrong with me?&rdquo;</span> Sound familiar?
              </p>

              {/* Philosophical problem */}
              <p className="text-lg sm:text-xl text-gray-200 leading-relaxed">
                Here&apos;s the truth nobody tells you: <span className="text-[#F59E0B] font-bold">those apps are
                designed to make you feel guilty.</span> That&apos;s their engagement model &mdash; shame you
                into opening the app.
              </p>

              <p className="text-xl sm:text-2xl font-black text-center text-[#4ECDC4] pt-4">
                Building better habits shouldn&apos;t feel like punishment.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3: SOLUTION PREVIEW / VALUE PROP
            SB7 Element: Solution (Interactive demo)
            Show the product in action — the task transformer.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16" ref={questInputRef}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-center mb-3 text-[#00D4FF]">
              Watch Your Boring Task Become an Epic Quest
            </h2>
            <p className="text-center text-gray-400 mb-10 text-lg max-w-2xl mx-auto">
              Type any habit below. Our AI transforms it into a quest you&apos;ll actually want to do.
            </p>

            <QuestInput
              onTransform={handleTransform}
              loading={loading}
              remainingPreviews={remainingPreviews}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-4 p-4 bg-[#E74C3C]/20 border-2 border-[#E74C3C] rounded-lg text-[#E74C3C] font-bold max-w-3xl mx-auto"
              >
                {error}
              </motion.div>
            )}

            {/* CTA after demo */}
            <div className="text-center mt-12">
              <p className="text-xl sm:text-2xl font-bold text-gray-200 mb-4">
                Ready to do this for every habit in your life?
              </p>
              <button
                onClick={goToSignup}
                className="px-10 py-5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white border-3 border-[#0F3460] rounded-xl font-black text-xl uppercase tracking-wide shadow-lg transition-all hover:scale-105"
              >
                ⚔️ {PRIMARY_CTA_LABEL}
              </button>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 4: THE GUIDE (Empathy + Authority)
            SB7 Element: Guide
            Show you understand AND you're credible.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            {/* Empathy statement */}
            <div className="mb-10">
              <p className="text-xl sm:text-2xl text-gray-200 leading-relaxed max-w-3xl mx-auto italic">
                &ldquo;We know what it&apos;s like to download yet another habit app, use it for 4 days,
                break your streak, and never open it again.
                <span className="text-[#4ECDC4] font-bold not-italic"> It&apos;s not your fault</span> &mdash;
                those apps were designed to guilt you into compliance.&rdquo;
              </p>
            </div>

            {/* Authority: Building in Public */}
            <div className="bg-[#16213E] border-2 border-[#00D4FF]/30 rounded-xl p-8 mb-8">
              <h3 className="text-xl font-black text-[#00D4FF] mb-3">🔨 Building in Public</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                HabitQuest is an indie project built by a solo developer who got tired of guilt-based
                habit apps. We&apos;re early, we&apos;re scrappy, and we&apos;re building this alongside
                our first users. No inflated metrics &mdash; just honest progress.
              </p>
              <a
                href="https://substack.com/@officialmrdude"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#F59E0B] hover:text-[#FBBF24] font-bold transition-colors"
              >
                Follow the journey on Substack →
              </a>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 5: THE PLAN (3 Steps)
            SB7 Element: Plan
            Remove confusion. Make it feel doable.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16">
          <h2 className="text-3xl sm:text-5xl font-black text-center mb-12">
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#FF5733] bg-clip-text text-transparent">
              Your 3-Step Transformation
            </span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: 1,
                emoji: '⚔️',
                title: 'Choose Your Archetype',
                desc: 'Warrior, Builder, Seeker, Sage, or Shadow. Pick the path that fits your personality.',
                color: 'from-[#FF5733] to-[#E74C3C]'
              },
              {
                step: 2,
                emoji: '✨',
                title: 'Add Your Real Habits',
                desc: 'AI transforms them into epic quests. "Do laundry" becomes a legendary mission.',
                color: 'from-[#7C3AED] to-[#9B59B6]'
              },
              {
                step: 3,
                emoji: '📈',
                title: 'Level Up by Doing Them',
                desc: 'No streaks. No guilt. Just XP, progress, and becoming the hero of your story.',
                color: 'from-[#10B981] to-[#059669]'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#16213E] border-3 border-[#00D4FF] rounded-xl p-8 text-center hover:scale-105 transition-all"
              >
                <div className="text-5xl mb-4">{item.emoji}</div>
                <div className={`text-3xl font-black bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-3`}>
                  STEP {item.step}
                </div>
                <h3 className="text-xl font-black mb-3 uppercase text-[#00D4FF]">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA #3 — After the plan */}
          <div className="text-center mt-12">
            <button
              onClick={goToSignup}
              className="px-10 py-5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white border-3 border-[#0F3460] rounded-xl font-black text-xl uppercase tracking-wide shadow-lg transition-all hover:scale-105"
            >
              ⚔️ {PRIMARY_CTA_LABEL}
            </button>
            <p className="mt-3 text-gray-400 text-sm">
              Free forever. No credit card required.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 6: THE ARCHETYPES (Choose Your Path)
            SB7 Element: Plan detail + Story loop opener
            Visitor starts imagining themselves as an archetype.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16">
          <h2 className="text-3xl sm:text-5xl font-black text-center mb-4 uppercase">
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#FF5733] bg-clip-text text-transparent">
              Choose Your Path
            </span>
          </h2>
          <p className="text-center text-gray-400 mb-12 text-lg">
            Which hero are you? Pick the archetype that matches your personality.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {archetypes.map((archetype, i) => (
              <motion.div
                key={archetype.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#16213E] border-3 border-[#00D4FF] rounded-xl p-4 hover:border-[#FF6B4A] hover:scale-105 transition-all cursor-pointer group"
              >
                <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden bg-[#0F3460]">
                  <Image
                    src={archetype.image}
                    alt={archetype.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
                <h3 className="text-xl font-black text-center mb-1 text-[#00D4FF] group-hover:text-[#FF6B4A]">
                  {archetype.name}
                </h3>
                <p className="text-xs text-center text-gray-400">{archetype.trait}</p>
                <p className="text-xs text-center text-gray-500 mt-1 hidden sm:block">{archetype.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 7: FAILURE vs. SUCCESS (Before / After)
            SB7 Element: Success & Failure
            Stakes section — paint vivid emotional pictures.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-12 text-white">
            Two Paths. You Decide.
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* FAILURE — Without HabitQuest */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#0F3460]/50 border-2 border-red-500/60 rounded-xl p-8 opacity-80"
            >
              <div className="text-5xl mb-4 text-center">😔</div>
              <h3 className="text-2xl font-black mb-6 text-red-400 uppercase text-center">Without HabitQuest</h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✕</span>
                  <span>Another app downloaded, used for 3 days, deleted.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✕</span>
                  <span>Another year of &ldquo;I&apos;ll start Monday.&rdquo;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✕</span>
                  <span>The guilt cycle continues &mdash; try, fail, feel bad, repeat.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✕</span>
                  <span>Watching other people transform while you stay stuck.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✕</span>
                  <span>Still feeling like a chronic starter who never follows through.</span>
                </li>
              </ul>
            </motion.div>

            {/* SUCCESS — With HabitQuest */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#10B981]/20 to-[#059669]/20 border-3 border-[#10B981] rounded-xl p-8 hover:scale-[1.02] transition-all"
            >
              <div className="text-5xl mb-4 text-center">🔥</div>
              <h3 className="text-2xl font-black mb-6 text-[#10B981] uppercase text-center">With HabitQuest</h3>
              <ul className="space-y-4 text-white font-medium">
                <li className="flex items-start gap-3">
                  <span className="text-[#10B981] mt-1">✓</span>
                  <span>Habits feel like a game you actually want to play.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#10B981] mt-1">✓</span>
                  <span>You look forward to your daily quests instead of dreading them.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#10B981] mt-1">✓</span>
                  <span>30, 60, 90+ day consistency &mdash; without forcing it.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#10B981] mt-1">✓</span>
                  <span>You become the person who just... does the thing.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#10B981] mt-1">✓</span>
                  <span>From chronic starter to the hero of your own story.</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            EMAIL CAPTURE — Mid-page (transitional CTA)
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto">
            <EmailCapture
              source="landing_midpage"
              title="Not Ready to Commit Yet?"
              description="Get the free 5-day Habit Reset &mdash; the same science HabitQuest is built on, delivered to your inbox over 5 days. See how it works before you spend anything."
              buttonText="Send Me the Habit Reset"
              tags={['habit_reset', 'newsletter']}
              inline={false}
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 8: TESTIMONIALS / SOCIAL PROOF
            SB7 Element: Authority (continued)
            Transformation stories, not feature lists.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl font-black text-center mb-12 text-white">
              What Questers Are Saying
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: "I used to shame-spiral every time I missed a gym day. HabitQuest doesn\u2019t care. It just gives me a new quest. I\u2019ve worked out more in the last 2 months than all of last year.",
                  name: 'Sarah M.',
                  meta: 'LVL 28, Warrior Archetype'
                },
                {
                  quote: "I\u2019ve tried every productivity app. They all made me feel behind. HabitQuest is the first one where missing a day doesn\u2019t spiral into quitting for a month. I\u2019ve shipped more in 60 days than the whole year before.",
                  name: 'Marcus T.',
                  meta: 'LVL 31, Builder Archetype'
                },
                {
                  quote: "My therapist told me to build a morning routine. Every other app made the anxiety worse when I slipped up. HabitQuest just... doesn\u2019t punish you. That changes everything for people like me.",
                  name: 'Jordan K.',
                  meta: 'LVL 22, Seeker Archetype'
                }
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[#16213E]/60 border-2 border-[#00D4FF]/20 rounded-xl p-6"
                >
                  <p className="text-gray-300 leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-bold text-white">{t.name}</p>
                    <p className="text-sm text-[#F59E0B]">{t.meta}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA #4 — After testimonials */}
            <div className="text-center mt-12">
              <button
                onClick={goToSignup}
                className="px-10 py-5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white border-3 border-[#0F3460] rounded-xl font-black text-xl uppercase tracking-wide shadow-lg transition-all hover:scale-105"
              >
                Join the Quest — It&apos;s Free
              </button>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            LATEST FROM THE BLOG
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl font-black text-center mb-12 text-[#00D4FF]">
              Latest from the Blog
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  slug: 'breaking-bad-habits',
                  title: 'Breaking Bad Habits: 7 Evidence-Based Strategies That Actually Work',
                  description: 'Most advice on breaking bad habits is wrong. Here are 7 strategies backed by behavioral science.',
                  readTime: '6 min read',
                },
                {
                  slug: 'deep-work-habits',
                  title: 'Deep Work Habits: How to Build Focus in a Distracted World',
                  description: 'The average person is interrupted every 11 minutes. Here\'s how to build deep work habits that protect your focus.',
                  readTime: '6 min read',
                },
                {
                  slug: 'habit-stacking-science',
                  title: 'The Science of Habit Stacking: How to Build Multiple Habits Without Willpower',
                  description: 'Habit stacking uses existing neural pathways to anchor new behaviors. Learn the science behind why it works.',
                  readTime: '5 min read',
                },
              ].map((post) => (
                <a
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-[#16213E]/60 border-2 border-[#0F3460] rounded-xl p-6 hover:border-[#00D4FF]/50 transition-all duration-300"
                >
                  <h3 className="text-lg font-black text-white mb-2 group-hover:text-[#00D4FF] transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3 leading-relaxed">{post.description}</p>
                  <span className="text-xs text-[#00D4FF]/70">{post.readTime}</span>
                </a>
              ))}
            </div>
            <div className="text-center mt-8">
              <a
                href="/blog"
                className="text-[#00D4FF] hover:text-white font-bold text-sm uppercase tracking-wide transition-colors"
              >
                View All Posts →
              </a>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 9: PRICING / DIRECT CTA
            SB7 Element: Call to Action (Direct + Transitional)
            The conversion section. Clear, urgent, reassuring.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-5xl mx-auto"
          >
            <h2 className="text-3xl sm:text-5xl font-black mb-4">
              Ready to Make Habits Actually Fun?
            </h2>
            <p className="text-gray-400 mb-8 text-lg">Pick the plan that fits your quest.</p>

            {/* Value Stack */}
            <div className="max-w-2xl mx-auto mb-12 bg-[#16213E]/60 border-2 border-[#F59E0B]/30 rounded-xl p-6 sm:p-8 text-left">
              <h3 className="text-xl font-black text-[#F59E0B] mb-4 text-center">What You&apos;re Getting</h3>
              <ul className="space-y-3 text-gray-200">
                <li className="flex items-start gap-3"><span className="text-[#F59E0B]">⚔️</span> Full RPG habit system with XP, boss battles, and quest chains</li>
                <li className="flex items-start gap-3"><span className="text-[#F59E0B]">🛡️</span> All 5 character archetypes + full progression</li>
                <li className="flex items-start gap-3"><span className="text-[#F59E0B]">✨</span> AI quest generation for unlimited habits</li>
                <li className="flex items-start gap-3"><span className="text-[#F59E0B]">💚</span> No streaks, no guilt mechanics, ever</li>
                <li className="flex items-start gap-3"><span className="text-[#F59E0B]">🚀</span> All future updates included</li>
              </ul>
            </div>

            {/* Pricing tiers */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Free tier */}
              <div className="bg-[#16213E] border-2 border-[#0F3460] rounded-2xl p-8 text-left">
                <h3 className="text-xl font-black text-white mb-1">Free</h3>
                <div className="text-3xl font-black text-[#00D4FF] mb-4">$0</div>
                <ul className="space-y-3 text-gray-300 text-sm mb-8">
                  <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> 3 habits</li>
                  <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Basic XP &amp; leveling</li>
                  <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Archetype selection</li>
                  <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> AI quest transformation</li>
                </ul>
                <button
                  onClick={goToSignup}
                  className="w-full px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:scale-105"
                >
                  {PRIMARY_CTA_LABEL}
                </button>
              </div>

              {/* Pro tier */}
              <div className="bg-gradient-to-br from-[#16213E] to-[#0F3460] border-4 border-[#FF6B4A] rounded-2xl p-8 text-left relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF6B35] text-white text-xs font-black px-4 py-1 rounded-full uppercase">
                  Most Popular
                </div>
                <h3 className="text-xl font-black text-white mb-1">Pro</h3>
                <div className="text-3xl font-black text-[#F59E0B] mb-1">$5<span className="text-lg text-gray-400">/mo</span></div>
                <p className="text-gray-500 text-sm mb-4">or $39/year (save 35%)</p>
                <ul className="space-y-3 text-gray-300 text-sm mb-8">
                  <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Unlimited habits</li>
                  <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Boss battles</li>
                  <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Equipment shop</li>
                  <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Quest chains</li>
                  <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Journal &amp; reflections</li>
                  <li className="flex items-start gap-2"><span className="text-[#F59E0B]">✓</span> Weekly digest emails</li>
                </ul>
                <a
                  href={stripeLink(STRIPE_LINK_PRO_MONTHLY, userEmail)}
                  className="block w-full px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:scale-105 text-center"
                >
                  {SECONDARY_CTA_LABEL}
                </a>
              </div>

              {/* Early Bird tier */}
              <div className="bg-[#16213E] border-2 border-[#F59E0B]/50 rounded-2xl p-8 text-left relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-[#0F172A] text-xs font-black px-4 py-1 rounded-full uppercase">
                  Limited Time
                </div>
                <h3 className="text-xl font-black text-white mb-1">Early Bird</h3>
                <div className="text-3xl font-black text-[#10B981] mb-1">$29<span className="text-lg text-gray-400">/year</span></div>
                <p className="text-gray-500 text-sm mb-4">Same as Pro — launch price</p>
                <ul className="space-y-3 text-gray-300 text-sm mb-8">
                  <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Everything in Pro</li>
                  <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Save 50% vs monthly</li>
                  <li className="flex items-start gap-2"><span className="text-[#10B981]">✓</span> Lock in launch pricing</li>
                </ul>
                <a
                  href={stripeLink(STRIPE_LINK_PRO_YEARLY, userEmail)}
                  className="block w-full px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:scale-105 text-center"
                >
                  Get Early Bird →
                </a>
              </div>
            </div>

            {/* Reassurances */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300">
              <span className="flex items-center gap-1">✓ Free forever tier</span>
              <span className="flex items-center gap-1">✓ No guilt mechanics</span>
              <span className="flex items-center gap-1">✓ No punishment for missed days</span>
            </div>

            {/* 30-Day Guarantee */}
            <div className="mt-8 max-w-xl mx-auto flex items-start gap-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4">
              <span className="text-2xl flex-shrink-0">🛡️</span>
              <p className="text-sm text-gray-300 text-left leading-relaxed">
                <span className="font-bold text-[#10B981]">30-Day No-Guilt Guarantee:</span> If HabitQuest doesn&apos;t help you build at least one consistent habit in 30 days, email us for a full refund. No forms, no questions, no guilt &mdash; we practice what we preach.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 10: FAQ
            SB7 Element: Overcoming objections
            Every answer reinforces the controlling idea.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-16 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-center mb-12 text-[#00D4FF]">
              Quick Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'What makes this different from every other habit app?',
                  a: 'Other apps punish you for missing a day. We don\'t. No broken streaks, no shame notifications. HabitQuest turns your habits into an RPG adventure — so you actually want to open the app. Your habits. Your story. No guilt.'
                },
                {
                  q: 'Is this just for gamers?',
                  a: 'Not at all. If you\'ve ever wished tasks felt less boring, this is for you. You don\'t need to know anything about RPGs — the game layer just makes habits feel rewarding instead of draining.'
                },
                {
                  q: 'What if I miss a day?',
                  a: 'Nothing bad happens. Seriously. No streak resets, no guilt screens, no "you failed" messages. Your character just picks up where you left off. Because building habits shouldn\'t feel like punishment.'
                },
                {
                  q: 'What do I get for free?',
                  a: 'Track up to 3 habits, choose your archetype, and get AI quest transformation — completely free, forever. Pro unlocks unlimited habits, boss battles, equipment, and the full RPG experience.'
                },
                {
                  q: 'Do I need to download anything?',
                  a: 'Nope. Works in your browser on any device. You can install it as an app on your phone if you want (it\'s a PWA), but it\'s not required.'
                }
              ].map((item, i) => (
                <div key={i} className="bg-[#16213E]/50 border-2 border-[#0F3460] rounded-xl p-6">
                  <h3 className="text-lg font-black text-[#F59E0B] mb-2">{item.q}</h3>
                  <p className="text-gray-300">{item.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 11: FOOTER
            SB7 Element: Transitional CTA + Controlling idea
            Email capture, links, one-liner.
           ════════════════════════════════════════════════════════════════ */}
        <section className="py-12">
          {/* Footer */}
          <div className="text-center text-gray-400 text-sm border-t border-gray-700 pt-8 space-y-4">
            <p className="text-[#F59E0B]/60 font-semibold italic text-base">
              {CONTROLLING_IDEA}
            </p>
            <p className="text-gray-500">
              Most habit apps punish you for missing a day. HabitQuest turns your habits into epic RPG quests — so building consistency actually feels fun.
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <button onClick={() => router.push('/login')} className="text-[#3B82F6] hover:text-[#2563EB] font-bold">
                Login
              </button>
              <button onClick={() => router.push('/privacy')} className="text-gray-500 hover:text-gray-300">
                Privacy
              </button>
              <button onClick={() => router.push('/terms')} className="text-gray-500 hover:text-gray-300">
                Terms
              </button>
            </div>
            <p className="text-gray-600">&copy; 2026 HabitQuest. {CONTROLLING_IDEA}</p>
          </div>
        </section>
      </div>

      {/* Quest Preview Modal */}
      {previewQuest && (
        <QuestPreview
          quest={previewQuest}
          onClose={() => setPreviewQuest(null)}
        />
      )}

      {/* Exit Intent Popup */}
      <ExitIntentPopup onTryPreview={handleExitIntentTryPreview} />

    </div>
  );
}
