'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { CAST } from '@/lib/cast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Login | HabitQuest";
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
    <div
      className="kidquest min-h-screen flex items-center justify-center p-4 sm:p-8"
      style={{ background: 'radial-gradient(900px 500px at 15% 0%, rgba(87,215,245,.18), transparent 60%), radial-gradient(800px 500px at 100% 100%, rgba(46,204,113,.16), transparent 60%), #FFF9F1' }}
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
          className="text-center mb-6"
        >
          <Image
            src={CAST.runeseeker.src}
            alt={CAST.runeseeker.alt}
            width={160}
            height={107}
            loading="lazy"
            className="mx-auto mb-2 h-16 w-auto object-contain kq-bob"
          />
          <h1 className="kq-display text-3xl text-navy mb-1">Welcome Back!</h1>
          <p className="text-navy/60 font-bold text-sm sm:text-base">
            Log in to jump back into your adventure.
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-coral/12 border-2 border-coral rounded-2xl p-3 mb-4"
          >
            <p className="text-coral text-sm font-bold">{error}</p>
            {error.toLowerCase().includes('confirm') && (
              <button
                onClick={() => router.push('/confirm-email')}
                className="text-hero-blue hover:opacity-80 text-sm font-bold mt-2 underline transition-opacity"
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

          <div className="mb-6">
            <label className="kq-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="kq-input"
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="kq-btn kq-btn-gold w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Logging in...' : '🚀 Log In'}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <p className="text-navy/70 text-sm font-bold">
            New here?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-hero-blue hover:opacity-80 font-extrabold transition-opacity underline"
            >
              Create an account
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
    </div>
  );
}
