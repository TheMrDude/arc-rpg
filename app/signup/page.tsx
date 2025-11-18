'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getStoredPreviewQuest, clearStoredPreviewQuest, handleFirstQuestCompletion } from '@/lib/onboarding';
import { applyReferralCode } from '@/lib/referrals';
import FirstQuestCelebration from '@/app/components/FirstQuestCelebration';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  // Check if there's a preview quest when component mounts
  const [hasPreviewQuest, setHasPreviewQuest] = useState(false);

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
      });

      if (signupError) throw signupError;

      if (data.user) {
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

        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          // Email confirmation required - show message
          router.push('/confirm-email');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-xl p-6 sm:p-8 shadow-[0_0_25px_rgba(255,107,107,0.4)]"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl sm:text-3xl font-black text-[#FF6B6B] mb-2 uppercase tracking-wide">
            Create Account
          </h1>
          <p className="text-[#00D4FF] mb-2 font-bold text-sm sm:text-base">
            {hasPreviewQuest ? 'Complete your quest and start your adventure' : 'Start your epic adventure'}
          </p>
          {hasPreviewQuest && (
            <p className="text-[#10B981] text-sm mb-4 font-semibold">
              ✨ Your preview quest is ready to be added!
            </p>
          )}
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-900/30 border-3 border-red-500 rounded-lg p-3 mb-4"
          >
            <p className="text-red-300 text-sm font-bold">{error}</p>
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSignup}
        >
          <div className="mb-4">
            <label className="block text-white mb-2 font-bold uppercase text-xs sm:text-sm tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hero@questmail.com"
              className="w-full px-4 py-3 bg-[#0F3460] text-white placeholder-gray-500 border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-200"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block text-white mb-2 font-bold uppercase text-xs sm:text-sm tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-3 bg-[#0F3460] text-white placeholder-gray-500 border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-200"
              required
              minLength={6}
            />
          </div>

          <p className="text-xs text-[#E2E8F0]/60 mb-4">
            Password must be at least 6 characters long
          </p>

          <div className="mb-6">
            <label className="block text-white mb-2 font-bold uppercase text-xs sm:text-sm tracking-wide flex items-center gap-2">
              Referral Code
              <span className="text-[#FFD93D] text-xs normal-case">(Optional)</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="FRIEND123"
              className="w-full px-4 py-3 bg-[#0F3460] text-white placeholder-gray-500 border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#FFD93D] focus:shadow-[0_0_15px_rgba(255,217,61,0.3)] transition-all duration-200 uppercase"
              maxLength={8}
            />
            {referralCode && (
              <p className="text-xs text-[#10B981] mt-1 font-semibold">
                ✓ You and your friend will both get rewards!
              </p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="w-full py-3 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide transition-all duration-200 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
          <p className="text-[#E2E8F0] text-sm">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-[#00D4FF] hover:text-[#00B8E6] font-bold transition-colors duration-200 underline"
            >
              Login
            </button>
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-[#E2E8F0] hover:text-white text-xs mt-3 transition-colors duration-200"
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
