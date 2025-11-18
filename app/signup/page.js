'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if email confirmation is required
        // If user.identities is empty, it means email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          // Email confirmation required - show message
          router.push('/confirm-email');
        } else {
          // No confirmation needed or auto-confirmed - proceed
          router.push('/select-archetype');
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

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
          <p className="text-[#00D4FF] mb-6 font-bold text-sm sm:text-base">
            Start your epic adventure
          </p>
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

          <p className="text-xs text-[#E2E8F0]/60 mb-6">
            Password must be at least 6 characters long
          </p>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="w-full py-3 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide transition-all duration-200 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? '⏳ Creating Account...' : '🚀 Sign Up & Begin Quest'}
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
    </div>
  );
}
