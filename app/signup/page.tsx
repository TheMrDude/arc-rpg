'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getStoredPreviewQuest, clearStoredPreviewQuest, handleFirstQuestCompletion } from '@/lib/onboarding';
import { applyReferralCode } from '@/lib/referrals';
import FirstQuestCelebration from '@/app/components/FirstQuestCelebration';
import { track } from '@/lib/track';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  // Email-confirmation success state (signUp returned a user but no session)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  // Check if there's a preview quest when component mounts
  const [hasPreviewQuest, setHasPreviewQuest] = useState(false);

  useEffect(() => {
    document.title = "Sign Up Free | HabitQuest";
    // First-party funnel: signup flow reached.
    track('signup_started');
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const previewQuest = getStoredPreviewQuest();
    setHasPreviewQuest(!!previewQuest);

    // Check for referral code in URL
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [searchParams]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signupError) throw signupError;

      if (data.user) {
        // First-party funnel: only a genuinely NEW account counts as a completed
        // signup. Supabase returns data.user even for the obfuscated "email
        // already exists" response, but with an empty identities array — excluding
        // that keeps repeat attempts from inflating signup/conversion metrics.
        if ((data.user.identities?.length ?? 0) > 0) {
          track('signup_completed');
        }

        // Apply referral code if provided
        if (referralCode.trim()) {
          const referralResult = await applyReferralCode(
            referralCode.trim(),
            data.user.id,
            supabase
          );
          // Don't block signup if referral code is invalid, just log it
          if (!referralResult.success) {
            console.warn('Referral code application failed:', referralResult.message);
          }
        }

        // No session means email confirmation is pending (also covers the
        // obfuscated existing-account response where identities is empty).
        // Show the success state instead of bouncing through /login.
        if (!data.session) {
          setAwaitingConfirmation(true);
          setResendCooldown(60);
          setLoading(false);
          return;
        }

        // User is signed up and confirmed - check for preview quest
        const previewQuest = getStoredPreviewQuest();

        if (previewQuest) {
          // Process the first quest
          const result = await handleFirstQuestCompletion(
            data.user.id,
            previewQuest,
            supabase
          );

          if (result.success) {
            // Clear stored quest
            clearStoredPreviewQuest();

            // Show celebration
            setEarnedXP(previewQuest.xp);
            setShowCelebration(true);
          } else {
            // Even if quest processing failed, continue to archetype selection
            router.push('/select-archetype');
          }
        } else {
          // No preview quest - go straight to archetype selection
          router.push('/select-archetype');
        }
      }
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  }

  const handleCelebrationContinue = () => {
    setShowCelebration(false);
    router.push('/select-archetype');
  };

  async function handleResendConfirmation() {
    if (resendCooldown > 0) return;
    setResendMessage('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (resendError) throw resendError;
      setResendMessage('Confirmation scroll re-sent! Check your inbox.');
      setResendCooldown(60);
    } catch (resendError: any) {
      setResendMessage(resendError.message || 'Failed to resend. Try again in a moment.');
    }
  }

  const handleStartOver = () => {
    setAwaitingConfirmation(false);
    setEmail('');
    setPassword('');
    setError('');
    setResendMessage('');
    setResendCooldown(0);
  };

  if (awaitingConfirmation) {
    return (
      <div
        className="kidquest min-h-screen flex items-center justify-center p-4 sm:p-8"
        style={{ background: 'radial-gradient(900px 500px at 15% 0%, rgba(46,204,113,.18), transparent 60%), radial-gradient(800px 500px at 100% 100%, rgba(87,215,245,.16), transparent 60%), #FFF9F1' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full kq-card p-6 sm:p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-6xl mb-4"
          >
            📜
          </motion.div>

          <h1 className="kq-display text-3xl text-emerald mb-4">
            Quest Accepted!
          </h1>

          <p className="text-navy/70 font-bold mb-6 text-sm sm:text-base">
            We sent a confirmation scroll to{' '}
            <span className="text-hero-blue font-extrabold break-all">{email}</span>.
            Click the link inside to begin your adventure.
          </p>

          {resendMessage && (
            <div className={`${
              resendMessage.includes('re-sent')
                ? 'bg-emerald/12 border-emerald'
                : 'bg-coral/12 border-coral'
            } border-2 rounded-2xl p-3 mb-4`}>
              <p className={`${
                resendMessage.includes('re-sent') ? 'text-emerald' : 'text-coral'
              } text-sm font-bold`}>
                {resendMessage}
              </p>
            </div>
          )}

          <button
            onClick={handleResendConfirmation}
            disabled={resendCooldown > 0}
            className="kq-btn kq-btn-blue w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : 'Resend Confirmation Email'}
          </button>

          <p className="text-navy/50 text-xs mt-4 font-bold">
            Didn&apos;t get it? Check your spam folder.
          </p>

          <button
            onClick={handleStartOver}
            className="text-navy/50 hover:text-navy text-xs mt-4 underline font-bold transition-colors"
          >
            Wrong email? Start over
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="kidquest min-h-screen flex items-center justify-center p-4 sm:p-8"
      style={{ background: 'radial-gradient(900px 500px at 15% 0%, rgba(255,200,61,.2), transparent 60%), radial-gradient(800px 500px at 100% 100%, rgba(87,215,245,.16), transparent 60%), #FFF9F1' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full kq-card p-6 sm:p-8"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="text-5xl mb-2 kq-bob" aria-hidden="true">🚀</div>
          <h1 className="kq-display text-3xl text-navy mb-1">Start Your Adventure</h1>
          <p className="text-navy/60 mb-2 font-bold text-sm sm:text-base">
            {hasPreviewQuest ? 'Complete your quest and create your hero' : 'Create your hero and jump in.'}
          </p>
          {hasPreviewQuest && (
            <p className="text-emerald text-sm mb-4 font-extrabold">
              ✨ Your preview quest is ready to be added!
            </p>
          )}
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-coral/12 border-2 border-coral rounded-2xl p-3 mb-4 mt-4"
          >
            <p className="text-coral text-sm font-bold">{error}</p>
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSignup}
          className="mt-4"
        >
          <div className="mb-4">
            <label className="kq-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hero@questmail.com"
              className="kq-input"
              required
            />
          </div>

          <div className="mb-2">
            <label className="kq-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="kq-input"
              required
              minLength={6}
            />
          </div>

          <p className="text-xs text-navy/50 mb-4 font-bold">
            Password must be at least 6 characters long
          </p>

          <div className="mb-6">
            <label className="kq-label flex items-center gap-2">
              Referral Code
              <span className="text-gold text-xs normal-case">(Optional)</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="FRIEND123"
              className="kq-input uppercase"
              maxLength={8}
            />
            {referralCode && (
              <p className="text-xs text-emerald mt-1 font-extrabold">
                ✓ You and your friend will both get rewards!
              </p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="kq-btn kq-btn-gold w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Creating Account...' : hasPreviewQuest ? '🎉 Complete Quest & Sign Up' : '🚀 Sign Up & Begin Quest'}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <p className="text-navy/70 text-sm font-bold">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-hero-blue hover:opacity-80 font-extrabold transition-opacity underline"
            >
              Log In
            </button>
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-navy/50 hover:text-navy text-xs mt-3 font-bold transition-colors"
          >
            ← Back to Home
          </button>
        </motion.div>
      </motion.div>

      {/* Celebration Modal */}
      {showCelebration && (
        <FirstQuestCelebration
          xp={earnedXP}
          onContinue={handleCelebrationContinue}
        />
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl font-extrabold">Loading…</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
