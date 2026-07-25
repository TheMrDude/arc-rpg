'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const STRIPE_LINK_PRO_MONTHLY = 'https://buy.stripe.com/fZubJ02TX5SngCc6dadZ602';
const STRIPE_LINK_PRO_YEARLY = 'https://buy.stripe.com/14A3cu9il0y3adObxudZ603'; // $29 CAD/yr Early Bird (fixed 2026-07-11: old link was $29/mo, deactivated)
const STRIPE_LINK_EARLY_BIRD = process.env.NEXT_PUBLIC_STRIPE_EARLY_BIRD_LINK || STRIPE_LINK_PRO_YEARLY;

function stripeLink(baseUrl, email, userId) {
  const params = new URLSearchParams();
  if (email) params.set('prefilled_email', email);
  // client_reference_id round-trips onto the Stripe Checkout Session so the
  // webhook can identify which Supabase user just paid.
  if (userId) params.set('client_reference_id', userId);
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Title/description now come from app/pricing/layout.js metadata (server-side),
  // so we no longer overwrite document.title after hydration.

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, subscription_status, is_premium, subscription_tier, trial_ends_at')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const [startingTrial, setStartingTrial] = useState(false);
  // Billing period toggle. Yearly = the Early Bird plan (same entitlements as
  // Pro, 50% cheaper). Defaults to yearly so the better value leads.
  const [isYearly, setIsYearly] = useState(true);

  const isPro = profile?.subscription_tier === 'pro' && profile?.subscription_status === 'active';
  const isInTrial = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const hadTrial = !!profile?.trial_ends_at;
  const isFreeUser = user && !isPro && !isInTrial;

  async function handleStartTrial() {
    if (!user) {
      router.push('/signup');
      return;
    }
    setStartingTrial(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/trial/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Your 7-day Pro trial has started!');
        router.push('/dashboard');
      } else {
        alert(data.error || 'Could not start trial');
      }
    } catch (err) {
      console.error('Trial start error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setStartingTrial(false);
    }
  }

  if (loading) {
    // Render the real page heading even while user/profile data loads. This is
    // the server-rendered HTML crawlers see, so it must contain the page's
    // single h1 rather than a bare spinner.
    return (
      <div className="kidquest min-h-screen bg-cream p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="kq-display text-4xl sm:text-5xl lg:text-6xl text-navy mb-4 mt-8">
            Pick Your <span className="text-hero-blue">Adventure Pass</span>
          </h1>
          <p className="text-navy/60 text-lg font-semibold mb-10">
            Start free. Upgrade when you&apos;re ready for the full adventure.
          </p>
          <div className="text-navy/50 text-lg font-extrabold">Loading plans…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push(user ? '/dashboard' : '/')}
          className="kq-btn kq-btn-ghost mb-8 text-sm px-4 py-2 min-h-0"
        >
          ← {user ? 'Dashboard' : 'Home'}
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="kq-display text-4xl sm:text-5xl lg:text-6xl text-navy mb-4">
            Pick Your <span className="text-hero-blue">Adventure Pass</span>
          </h1>
          <p className="text-navy/60 text-lg font-semibold max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready for the full adventure.
          </p>
        </motion.div>

        {isPro && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="kq-card border-2 border-emerald p-6 mb-8 text-center"
          >
            <p className="text-emerald text-lg font-extrabold">
              You&apos;re a Pro member! Full access unlocked.
            </p>
          </motion.div>
        )}

        {/* Pricing Cards */}
        {/* Billing period toggle */}
        <div className="flex justify-center mb-10">
          <div
            className="inline-flex items-center gap-1 bg-white rounded-full p-1 shadow-candy border-2 border-stone"
            role="group"
            aria-label="Choose billing period"
          >
            <button
              onClick={() => setIsYearly(false)}
              aria-pressed={!isYearly}
              className={`kq-chip text-sm px-4 py-2 transition-colors ${!isYearly ? 'bg-hero-blue text-white' : 'text-navy/70'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              aria-pressed={isYearly}
              className={`kq-chip text-sm px-4 py-2 transition-colors ${isYearly ? 'bg-emerald text-white' : 'text-navy/70'}`}
            >
              Yearly <span className={isYearly ? 'text-white/90' : 'text-emerald'}>&middot; save 50%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
          {/* Free Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="kq-card p-8 flex flex-col"
          >
            <h3 className="kq-display text-xl text-navy mb-1">Free</h3>
            <div className="kq-display text-4xl text-hero-blue mb-1">$0</div>
            <p className="text-navy/50 text-sm font-bold mb-6">Free forever</p>

            <ul className="space-y-3 text-navy/80 text-sm font-semibold mb-8 flex-1">
              <li className="flex items-start gap-2"><span className="text-emerald">✓</span> 3 quests (habits)</li>
              <li className="flex items-start gap-2"><span className="text-emerald">✓</span> XP &amp; leveling</li>
              <li className="flex items-start gap-2"><span className="text-emerald">✓</span> Pick your hero</li>
              <li className="flex items-start gap-2"><span className="text-emerald">✓</span> Turn habits into quests</li>
              <li className="flex items-start gap-2"><span className="text-navy/30">—</span> <span className="text-navy/40">Boss battles</span></li>
              <li className="flex items-start gap-2"><span className="text-navy/30">—</span> <span className="text-navy/40">Gear &amp; equipment shop</span></li>
              <li className="flex items-start gap-2"><span className="text-navy/30">—</span> <span className="text-navy/40">Quest chains</span></li>
              <li className="flex items-start gap-2"><span className="text-navy/30">—</span> <span className="text-navy/40">Hero journal</span></li>
            </ul>

            <button
              onClick={() => router.push('/signup')}
              className="kq-btn kq-btn-blue w-full"
            >
              Start Free →
            </button>
          </motion.div>

          {/* Pro Monthly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="kq-card p-8 flex flex-col relative md:-translate-y-4"
            style={{ boxShadow: '0 0 0 4px #FFC83D, 0 20px 45px rgba(36,59,90,0.2)' }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 kq-chip bg-gold text-[#5a4300] text-xs py-1 px-4 whitespace-nowrap">
              ⭐ Most Popular
            </div>
            <h3 className="kq-display text-xl text-navy mb-1">Pro</h3>
            {isYearly ? (
              <>
                <div className="kq-display text-4xl text-navy mb-1">
                  $29<span className="text-lg text-navy/40">/year</span>
                </div>
                <p className="text-navy/50 text-sm font-bold mb-6">
                  Just <strong className="text-emerald">$2.42/mo</strong> &mdash; launch price, locked in
                </p>
              </>
            ) : (
              <>
                <div className="kq-display text-4xl text-navy mb-1">
                  $5<span className="text-lg text-navy/40">/mo</span>
                </div>
                <p className="text-navy/50 text-sm font-bold mb-6">Billed monthly</p>
              </>
            )}

            <ul className="space-y-3 text-navy/80 text-sm font-semibold mb-8 flex-1">
              <li className="flex items-start gap-2"><span className="text-gold">★</span> <strong className="text-navy">Unlimited</strong> quests</li>
              <li className="flex items-start gap-2"><span className="text-gold">★</span> Boss battles &amp; raids</li>
              <li className="flex items-start gap-2"><span className="text-gold">★</span> Gear &amp; equipment shop</li>
              <li className="flex items-start gap-2"><span className="text-gold">★</span> Quest chains</li>
              <li className="flex items-start gap-2"><span className="text-gold">★</span> Hero journal</li>
              <li className="flex items-start gap-2"><span className="text-gold">★</span> Weekly digest emails</li>
              <li className="flex items-start gap-2"><span className="text-gold">★</span> Priority support</li>
              {isYearly && (
                <li className="flex items-start gap-2"><span className="text-emerald">✓</span> <strong className="text-navy">Save 50%</strong> vs monthly</li>
              )}
            </ul>

            {isPro ? (
              <div className="kq-btn kq-btn-gold w-full opacity-50 cursor-not-allowed">
                Current Plan
              </div>
            ) : (
              <div className="space-y-3">
                {/* Checkout link is chosen by the billing toggle. Both Stripe
                    links and the email/client_reference_id prefill are unchanged. */}
                <a
                  href={
                    isYearly
                      ? stripeLink(STRIPE_LINK_EARLY_BIRD, user?.email, user?.id)
                      : stripeLink(STRIPE_LINK_PRO_MONTHLY, user?.email, user?.id)
                  }
                  className="kq-btn kq-btn-gold w-full"
                >
                  {isYearly ? 'Get Early Bird for $29/yr' : 'Go Pro for $5/mo'}
                </a>
                {!user && !hadTrial && (
                  <button
                    onClick={() => router.push('/signup')}
                    className="kq-btn kq-btn-ghost w-full text-sm py-2 min-h-0"
                  >
                    7-Day Free Trial
                  </button>
                )}
                {isFreeUser && !hadTrial && (
                  <button
                    onClick={handleStartTrial}
                    disabled={startingTrial}
                    className="kq-btn kq-btn-ghost w-full text-sm py-2 min-h-0 disabled:opacity-50"
                  >
                    {startingTrial ? 'Starting...' : 'Start 7-Day Pro Trial'}
                  </button>
                )}
              </div>
            )}
          </motion.div>

        </div>

        {/* Comparison: Anti-guilt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <h2 className="kq-display text-2xl sm:text-3xl text-center mb-8 text-hero-blue">
            The No-Guilt Habit Adventure
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="kq-card p-6" style={{ background: 'color-mix(in srgb, #FF7B6B 10%, #fff)' }}>
              <h3 className="kq-display text-xl text-coral mb-4">Other Habit Apps</h3>
              <ul className="space-y-2 text-navy/70 font-semibold">
                <li>• Shame you when you break streaks</li>
                <li>• Penalize missed days with lost progress</li>
                <li>• Compare you to other users</li>
                <li>• Make productivity feel like punishment</li>
              </ul>
            </div>

            <div className="kq-card p-6" style={{ background: 'color-mix(in srgb, #2ECC71 12%, #fff)' }}>
              <h3 className="kq-display text-xl text-emerald mb-4">HabitQuest</h3>
              <ul className="space-y-2 text-navy/70 font-semibold">
                <li>• <strong className="text-navy">No streak penalties</strong>, ever</li>
                <li>• Miss a day? Your story continues</li>
                <li>• Solo journey, no leaderboards</li>
                <li>• Tasks become adventures you want to do</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Reassurances */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center space-y-4 pb-12"
        >
          <div className="flex flex-wrap justify-center items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-hero-blue">
              <span className="text-2xl">🔒</span>
              <span className="font-extrabold">Secure via Stripe</span>
            </div>
            <div className="flex items-center gap-2 text-emerald">
              <span className="text-2xl">✓</span>
              <span className="font-extrabold">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-gold">
              <span className="text-2xl">♾️</span>
              <span className="font-extrabold">Free tier forever</span>
            </div>
          </div>

          <p className="text-sm text-navy/50 font-bold">
            Built by a solo dev who got tired of apps that make you feel bad.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
