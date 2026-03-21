'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Login \u2014 HabitQuest";
  }, []);

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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                },
              });
              if (error) console.error('Google OAuth error:', error);
            }}
            className="w-full px-6 py-3 bg-white hover:bg-gray-100 text-gray-800 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all border border-gray-300 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>
        </motion.div>

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
