'use client';

import GlobalFooter from '@/app/components/GlobalFooter';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { storybookEntries, ROSTER_SIZE, MEET_EVERY } from '@/lib/storybook';

/**
 * The Storybook: every cast character the player has met, rereadable
 * forever. Unmet characters are mystery tiles -- numbered so the child can
 * see the road ahead, never labelled with what they're missing. Characters
 * arrive on their own as quests are completed; this page has no buttons
 * that make anything happen, it is purely the album.
 */
export default function StorybookPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Storybook | HabitQuest';
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        const { data } = await supabase
          .from('profiles')
          .select('met_characters, quests_completed')
          .eq('id', user.id)
          .single();
        setProfile(data || {});
      } catch (err) {
        console.error('Error loading storybook:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl font-bold kq-display">Opening the Storybook...</div>
      </div>
    );
  }

  const entries = storybookEntries(profile?.met_characters);
  const metCount = entries.filter((e) => e.met).length;

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-3">
          <h1 className="text-4xl kq-display text-coral">
            <span aria-hidden="true">📖</span> Your Storybook
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="kq-btn kq-btn-blue"
          >
            ← Back to Dashboard
          </button>
        </div>
        <p className="text-hero-blue font-bold mb-1">
          {metCount} of {ROSTER_SIZE} friends met
        </p>
        <p className="text-navy/60 text-sm font-semibold mb-8">
          New friends find you as you finish quests. No rush &mdash; they&rsquo;re all
          waiting to meet you.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {entries.map((e) =>
            e.met ? (
              <div key={e.slug} className="kq-card kq-card-hover overflow-hidden">
                <div className="relative aspect-[3/2] bg-[#ECE7DD]">
                  <Image
                    src={e.src}
                    alt={e.alt}
                    fill
                    sizes="(max-width: 640px) 45vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <h2 className="kq-display text-base text-navy leading-tight">{e.name}</h2>
                  <p className="text-navy/60 text-xs italic mt-1">&ldquo;{e.beat}&rdquo;</p>
                </div>
              </div>
            ) : (
              <div
                key={e.slug}
                className="kq-card overflow-hidden opacity-70"
                title="Not met yet"
              >
                <div
                  className="relative aspect-[3/2] flex items-center justify-center"
                  style={{ background: 'linear-gradient(140deg,#ECE7DD,#DDD6C8)' }}
                >
                  <span
                    aria-hidden="true"
                    className="kq-display text-4xl text-navy/30 select-none"
                  >
                    ?
                  </span>
                </div>
                <div className="p-3">
                  <h2 className="kq-display text-base text-navy/40">Friend #{e.order}</h2>
                  <p className="text-navy/40 text-xs font-bold mt-1">
                    Keep questing to meet them
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        <p className="text-center text-navy/50 text-sm font-bold mt-8">
          A new friend appears about every {MEET_EVERY} quests.
        </p>
        <GlobalFooter />
      </div>
    </div>
  );
}
