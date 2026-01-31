'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import QuestInput from './components/QuestInput';
import QuestPreview from './components/QuestPreview';
import StatsBar from './components/StatsBar';
import ExitIntentPopup from './components/ExitIntentPopup';
import SocialProofNotifications from './components/SocialProofNotifications';
import EmailCapture from './components/EmailCapture';
import TestimonialsCarousel, { extendedTestimonials } from './components/TestimonialsCarousel';
import ShareToSocial from './components/ShareToSocial';
import { PreviewQuest } from '@/lib/onboarding';
import { trackEvent } from '@/lib/analytics';
import Image from 'next/image';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewQuest, setPreviewQuest] = useState<PreviewQuest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingPreviews, setRemainingPreviews] = useState<number>(3);
  const questInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent('landing_page_view', {});
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

      // Update remaining previews from API response
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
    // Scroll to quest input
    questInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const archetypes = [
    { name: 'Warrior', image: '/images/archetypes/warrior.png', trait: 'Strength & Discipline' },
    { name: 'Seeker', image: '/images/archetypes/seeker.png', trait: 'Curiosity & Growth' },
    { name: 'Builder', image: '/images/archetypes/builder.png', trait: 'Creation & Progress' },
    { name: 'Shadow', image: '/images/archetypes/shadow.png', trait: 'Strategy & Depth' },
    { name: 'Sage', image: '/images/archetypes/sage.png', trait: 'Wisdom & Balance' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white overflow-hidden">
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 w-2 h-2 bg-[#FF5733] rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-[#7C3AED] rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-[#10B981] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 right-1/3 w-3 h-3 bg-[#F59E0B] rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Stats Bar */}
      <StatsBar />

      {/* Top Navigation for Returning Users */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full border-b border-[#00D4FF]/20 backdrop-blur-sm bg-[#1E293B]/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-[#FF6B6B]">⚔️ HabitQuest</span>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="px-4 sm:px-6 py-2 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#1A1A2E] border-2 border-[#0F3460] rounded-lg font-black text-xs sm:text-sm uppercase tracking-wide transition-all duration-200 shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1"
          >
            ⚔️ Login
          </button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 uppercase tracking-wide leading-tight">
            <span className="bg-gradient-to-r from-[#FF5733] to-[#E74C3C] bg-clip-text text-transparent">
              STOP FAILING
            </span>
            <br />
            <span className="text-white">START CONQUERING</span>
          </h1>

          <p className="text-xl sm:text-3xl mb-4 font-bold text-[#4ECDC4]">
            Turn Your Boring To-Do List Into An Epic RPG Adventure
          </p>

          <p className="text-lg sm:text-xl mb-12 text-gray-300 max-w-3xl mx-auto">
            The habit tracker for people who <span className="text-[#F59E0B] font-black">hate habit trackers</span>.
            AI-powered. Ridiculously fun. <span className="text-[#10B981] font-bold">Try it free — no signup required.</span>
          </p>
        </motion.div>

        {/* Quest Input Section - THE MAGIC */}
        <div className="mb-20" ref={questInputRef}>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl sm:text-4xl font-black text-center mb-8 text-[#00D4FF]"
          >
            SEE THE MAGIC YOURSELF
          </motion.h2>

          <QuestInput
            onTransform={handleTransform}
            loading={loading}
            remainingPreviews={remainingPreviews}
          />

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-4 p-4 bg-[#E74C3C]/20 border-2 border-[#E74C3C] rounded-lg text-[#E74C3C] font-bold"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Choose Your Archetype */}
        <div className="mb-20">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-4 uppercase">
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#FF5733] bg-clip-text text-transparent">
              Choose Your Path
            </span>
          </h2>
          <p className="text-center text-gray-400 mb-12 text-lg">
            Pick the archetype that matches your personality
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {archetypes.map((archetype, i) => (
              <motion.div
                key={archetype.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
              </motion.div>
            ))}
          </div>
        </div>

        {/* Before/After Transformation */}
        <div className="grid md:grid-cols-2 gap-8 mb-20 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#0F3460]/50 border-2 border-red-500 rounded-xl p-8 text-center opacity-70"
          >
            <div className="text-6xl mb-4">😫</div>
            <h3 className="text-2xl font-black mb-4 text-red-400 uppercase">Before HabitQuest</h3>
            <ul className="text-left space-y-3 text-gray-300">
              <li>❌ Boring to-do lists you never finish</li>
              <li>❌ Zero motivation to start tasks</li>
              <li>❌ Streaks die after 3 days max</li>
              <li>❌ Productivity apps gather dust</li>
              <li>❌ Feel guilty about wasted potential</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#10B981]/20 to-[#059669]/20 border-3 border-[#10B981] rounded-xl p-8 text-center transform hover:scale-105 transition-all"
          >
            <div className="text-6xl mb-4">🔥</div>
            <h3 className="text-2xl font-black mb-4 text-[#10B981] uppercase">After HabitQuest</h3>
            <ul className="text-left space-y-3 text-white font-semibold">
              <li>✅ Epic quests you're excited to crush</li>
              <li>✅ Dopamine rush from leveling up</li>
              <li>✅ 90+ day streaks feel effortless</li>
              <li>✅ Actually look forward to daily tasks</li>
              <li>✅ Become the hero of your own story</li>
            </ul>
          </motion.div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-12 uppercase">
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#FF5733] bg-clip-text text-transparent">
              Your 3-Step Transformation
            </span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                emoji: '⚔️',
                title: 'Choose Your Archetype',
                desc: 'Warrior, Builder, Shadow, Sage, or Seeker. Your personality, your path.',
                color: 'from-[#FF5733] to-[#E74C3C]'
              },
              {
                step: 2,
                emoji: '✨',
                title: 'AI Transforms Tasks',
                desc: '"Do laundry" becomes "Purify your battle garments at the Sacred Washery"',
                color: 'from-[#7C3AED] to-[#9B59B6]'
              },
              {
                step: 3,
                emoji: '📈',
                title: 'Level Up Your Life',
                desc: 'Earn XP, unlock skills, defeat bosses, and become legendary.',
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
                <div className="text-6xl mb-4">{item.emoji}</div>
                <div className={`text-4xl font-black bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-3`}>
                  STEP {item.step}
                </div>
                <h3 className="text-2xl font-black mb-3 uppercase text-[#00D4FF]">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Social Proof - Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className="text-4xl font-black text-center mb-12 uppercase">
            HEROES ARE TALKING
          </h2>

          <TestimonialsCarousel
            testimonials={extendedTestimonials}
            autoPlay={true}
            interval={5000}
          />
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-12 uppercase text-[#00D4FF]">
            QUICK QUESTIONS
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Is it actually free?",
                a: "Yes. Free tier gives you unlimited quests and basic gamification. Premium adds AI storytelling, advanced stats, and lifetime features for a one-time $47."
              },
              {
                q: "Do I need to download anything?",
                a: "Nope. Works in your browser on any device. Install as an app on your phone if you want (it's a PWA)."
              },
              {
                q: "What if I forget to use it?",
                a: "We'll nudge you. Streak reminders, daily quest notifications, and gentle \"your character misses you\" prompts keep you coming back."
              },
              {
                q: "Is this just for gamers?",
                a: "Not at all. If you've ever wished tasks felt less boring, this is for you. The RPG layer makes habits feel rewarding instead of draining."
              }
            ].map((item, i) => (
              <div key={i} className="bg-[#16213E]/50 border-2 border-[#0F3460] rounded-xl p-6">
                <h3 className="text-lg font-black text-[#F59E0B] mb-2">{item.q}</h3>
                <p className="text-gray-300">{item.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center bg-gradient-to-br from-[#16213E] to-[#0F3460] border-4 border-[#FF6B4A] rounded-2xl p-12 max-w-4xl mx-auto mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-black mb-6 uppercase">
            READY TO MAKE HABITS ACTUALLY FUN?
          </h2>
          <p className="text-xl mb-4 text-gray-300">
            Start free. No credit card. Cancel anytime.
          </p>
          <p className="text-sm mb-8 text-gray-400">
            Built by a solo dev who got tired of boring habit apps. 🎮
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.push('/signup')}
              className="px-12 py-6 bg-gradient-to-r from-[#FF6B4A] to-[#FF5733] hover:from-[#FF5733] hover:to-[#E74C3C] text-white border-3 border-[#0F3460] rounded-xl font-black text-2xl uppercase tracking-wide shadow-lg transition-all hover:scale-105"
            >
              🚀 Start Your Quest — Free
            </button>
          </div>
          <p className="mt-6 text-gray-500 text-sm">
            Want lifetime access? <button onClick={() => router.push('/pricing')} className="text-[#7C3AED] hover:underline font-bold">See pricing →</button>
          </p>
        </motion.div>

        {/* Email Capture Section */}
        <div className="mb-12 max-w-2xl mx-auto">
          <EmailCapture
            source="landing_footer"
            title="🚀 Join The Adventure"
            description="Be the first to know about new features, power-ups, and epic updates. Join our community of heroes!"
            buttonText="Count Me In"
            tags={['newsletter', 'new_features']}
            inline={false}
          />
        </div>

        {/* Share to Social Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-2xl mx-auto"
        >
          <ShareToSocial
            content={{
              title: 'HabitQuest - Turn Your Life Into An Epic RPG! 🎮⚔️',
              description: 'Transform boring tasks into epic quests with AI. Join me on this legendary adventure!',
              hashtags: ['HabitQuest', 'Gamification', 'Productivity', 'RPG', 'AI'],
            }}
            title="Share With Fellow Heroes"
          />
        </motion.div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm border-t border-gray-700 pt-8">
          <p className="mb-4">
            <button onClick={() => router.push('/login')} className="text-[#3B82F6] hover:text-[#2563EB] font-bold">
              Already have an account? Login →
            </button>
          </p>
          <p>© 2026 HabitQuest. Transform your life, one epic quest at a time.</p>
        </div>
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

      {/* Social Proof Notifications */}
      <SocialProofNotifications />
    </div>
  );
}
