'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

      if (error) throw error;

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
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-8 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
        <h1 className="text-3xl font-black text-[#FF6B6B] mb-2 uppercase tracking-wide">Welcome Back</h1>
        <p className="text-[#00D4FF] mb-6 font-bold">Login to continue your adventure</p>

        {error && (
          <div className="bg-red-900/30 border-3 border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-white mb-2 font-bold uppercase text-sm tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0F3460] text-white border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.2)] transition-all"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-white mb-2 font-bold uppercase text-sm tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0F3460] text-white border-3 border-[#1A1A2E] rounded-lg focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.2)] transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide transition-all duration-100 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-[#E2E8F0] text-center mt-6">
          Don't have an account?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-[#00D4FF] hover:text-[#00B8E6] font-bold"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
