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
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl font-bold kq-display">Loading…</div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/dashboard"
          className="text-hero-blue hover:text-coral transition-colors mb-6 inline-block font-semibold"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="kq-display text-3xl text-navy mb-8">Settings</h1>

        <MyQuotes />
      </div>
      <GlobalFooter />
    </div>
  );
}
