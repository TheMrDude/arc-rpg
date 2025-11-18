'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if it's an email confirmation error
        if (error.message?.toLowerCase().includes('email') &&
            error.message?.toLowerCase().includes('confirm')) {
          setError('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
        } else {
          setError(error.message);
        }
        throw error;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profile || !profile.archetype) {
          router.push('/select-archetype');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      // Error already set above
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
        className="max-w-md w-full bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-xl p-6 sm:p-8 shadow-[0_0_25px_rgba(0,212,255,0.4)]"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl sm:text-3xl font-black text-[#FF6B6B] mb-2 uppercase tracking-wide">
            Welcome Back
          </h1>
          <p className="text-[#00D4FF] mb-6 font-bold text-sm sm:text-base">
            Login to continue your adventure
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-900/30 border-3 border-red-500 rounded-lg p-3 mb-4"
          >
            <p className="text-red-300 text-sm font-bold">{error}</p>
            {error.toLowerCase().includes('confirm') && (
              <button
                onClick={() => router.push('/confirm-email')}
                className="text-[#00D4FF] hover:text-[#00B8E6] text-sm font-bold mt-2 underline transition-colors duration-200"
              >
                Resend confirmation email
              </button>
            )}
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleLogin}
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

          <div className="mb-6">
            <label className="block text-white mb-2 font-bold uppercase text-xs sm:text-sm tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 bg-[#0F3460] text-white placeholder-gray-500 border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-200"
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="w-full py-3 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide transition-all duration-200 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? '⏳ Logging in...' : '⚔️ Login'}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <p className="text-[#E2E8F0] text-sm">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-[#00D4FF] hover:text-[#00B8E6] font-bold transition-colors duration-200 underline"
            >
              Sign Up
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
