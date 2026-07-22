'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import MyQuotes from '@/app/components/MyQuotes';
import GlobalFooter from '@/app/components/GlobalFooter';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        router.push('/login');
        return;
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    document.title = 'Settings | HabitQuest';
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center">
        <div className="text-white text-xl font-black uppercase tracking-wide">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/dashboard"
          className="text-[#00D4FF] hover:text-[#7FE7FF] transition-colors mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-black mb-8">Settings</h1>

        <MyQuotes />
      </div>
      <GlobalFooter />
    </div>
  );
}
