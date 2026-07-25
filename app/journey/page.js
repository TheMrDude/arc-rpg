'use client';
import GlobalFooter from '@/app/components/GlobalFooter';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { isPremium as resolveIsPremium } from '@/lib/premium';
import { getCompanion } from '@/lib/companions';

export default function JourneyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [currentWeekSummary, setCurrentWeekSummary] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileData || !profileData.archetype) {
        router.push('/select-archetype');
        return;
      }

      setProfile(profileData);

      // Check if premium
      if (!resolveIsPremium(profileData)) {
        router.push('/pricing');
        return;
      }

      await loadSummaries();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummaries() {
    try {
      // Get all past weekly summaries
      const { data: summariesData, error } = await supabase
        .from('weekly_summaries')
        .select('*')
        .eq('user_id', user?.id)
        .order('week_start_date', { ascending: false });

      if (error) {
        console.error('Error loading summaries:', error);
        return;
      }

      setSummaries(summariesData || []);
    } catch (error) {
      console.error('Error loading summaries:', error);
    }
  }

  async function generateCurrentWeekSummary() {
    if (generating) return;
    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/weekly-summary', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.summary) {
        setCurrentWeekSummary(data.summary);
        await loadSummaries(); // Reload list
      } else {
        alert(data.message || 'No completed quests this week yet');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function getWeekLabel(weekStart) {
    const today = new Date();
    const weekStartDate = new Date(weekStart);
    const daysDiff = Math.floor((today - weekStartDate) / (1000 * 60 * 60 * 24));

    if (daysDiff < 7 && daysDiff >= 0) return '📖 Current Week';
    if (daysDiff < 14) return '📚 Last Week';
    if (daysDiff < 21) return '📜 2 Weeks Ago';
    return `📰 ${Math.floor(daysDiff / 7)} Weeks Ago`;
  }

  if (loading) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl font-bold kq-display">Loading Your Journey...</div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl kq-display text-navy mb-2">
                📖 Your Epic Journey
              </h1>
              <p className="text-hero-blue text-lg font-semibold">
                {/* Was "Level 3 seeker" -- the raw archetype value as a label
                    for the player. The companion is the avatar now. */}
                Chapter {profile?.story_chapter || 1} • Level {profile?.level || 1}
                {profile ? ` • ${getCompanion(profile).name}` : ''}
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="kq-btn kq-btn-ghost"
            >
              ← Dashboard
            </button>
          </div>

          <p className="text-navy/60 mb-6">
            Every week, your quests and journal entries are woven into a fun story.
            Re-read your adventure from the beginning or generate this week's chapter.
          </p>

          {/* Generate Current Week Button */}
          <button
            onClick={generateCurrentWeekSummary}
            disabled={generating}
            className="kq-btn kq-btn-gold disabled:opacity-50"
          >
            {generating ? '✨ Crafting Your Story...' : '✨ Generate This Week\'s Chapter'}
          </button>
        </div>

        {/* Current Week Summary (if just generated) */}
        {currentWeekSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="kq-card border-2 border-gold p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">📖</span>
              <div>
                <h2 className="text-2xl kq-display text-navy">This Week's Chapter</h2>
                <p className="text-sm text-navy/50">
                  {formatDate(currentWeekSummary.week_start_date)} - {formatDate(currentWeekSummary.week_end_date)}
                </p>
              </div>
            </div>

            <div className="bg-cream border-2 border-stone rounded-candy p-6 mb-4">
              <p className="text-navy whitespace-pre-wrap leading-relaxed font-serif text-lg">
                {currentWeekSummary.summary_text}
              </p>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-hero-blue font-bold">⚔️ {currentWeekSummary.quests_completed} Quests</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-coral font-bold">⭐ {currentWeekSummary.xp_gained} XP</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Past Summaries List */}
        <div className="space-y-4">
          <h2 className="text-2xl kq-display text-navy mb-4">📚 Previous Chapters</h2>

          {summaries.length === 0 ? (
            <div className="kq-card p-8 text-center">
              <p className="text-navy/60 text-lg mb-4">
                Your journey is just beginning! Complete some quests this week and generate your first chapter.
              </p>
              <p className="text-sm text-navy/50">
                Weekly summaries are generated every Monday or on-demand for the current week.
              </p>
            </div>
          ) : (
            summaries.map((summary, index) => (
              <motion.div
                key={summary.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="kq-card kq-card-hover p-6 cursor-pointer"
                onClick={() => setSelectedSummary(summary)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getWeekLabel(summary.week_start_date).split(' ')[0]}</span>
                      <div>
                        <h3 className="text-lg font-bold text-navy">
                          {getWeekLabel(summary.week_start_date)}
                        </h3>
                        <p className="text-sm text-navy/50">
                          {formatDate(summary.week_start_date)} - {formatDate(summary.week_end_date)}
                        </p>
                      </div>
                    </div>

                    <p className="text-navy/60 line-clamp-2 mb-3">
                      {summary.summary_text}
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-hero-blue">⚔️ {summary.quests_completed} Quests</span>
                      <span className="text-coral">⭐ {summary.xp_gained} XP</span>
                    </div>
                  </div>

                  <button className="ml-4 kq-btn kq-btn-blue">
                    Read →
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Full Summary Modal */}
      <AnimatePresence>
        {selectedSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => setSelectedSummary(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="kq-card p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl kq-display text-navy mb-1">
                    {getWeekLabel(selectedSummary.week_start_date)}
                  </h2>
                  <p className="text-sm text-navy/50">
                    {formatDate(selectedSummary.week_start_date)} - {formatDate(selectedSummary.week_end_date)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSummary(null)}
                  className="kq-btn kq-btn-ghost"
                >
                  Close
                </button>
              </div>

              <div className="bg-cream border-2 border-stone rounded-candy p-8 mb-6">
                <p className="text-navy whitespace-pre-wrap leading-relaxed font-serif text-lg">
                  {selectedSummary.summary_text}
                </p>
              </div>

              <div className="flex items-center gap-6 justify-center text-lg">
                <div className="flex items-center gap-2">
                  <span className="text-hero-blue font-bold">⚔️ {selectedSummary.quests_completed} Quests Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-coral font-bold">⭐ {selectedSummary.xp_gained} XP Earned</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      <GlobalFooter />
      </AnimatePresence>
    </div>
  );
}
