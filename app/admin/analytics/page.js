'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [selectedMetric, days, user]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        router.push('/dashboard');
        return;
      }

      setUser(user);
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `/api/admin/analytics?metric=${selectedMetric}&days=${days}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  if (loading) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-hero-blue text-2xl font-black kq-display">
          ⏳ Loading analytics...
        </div>
      </div>
    );
  }

  const summary = analyticsData?.summary || {};

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-black text-navy kq-display">
              📊 Admin Analytics
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="kq-btn kq-btn-ghost"
            >
              ← Back
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-full font-bold border-2 transition-all ${
                  days === d
                    ? 'bg-hero-blue text-white border-hero-blue'
                    : 'bg-white text-hero-blue border-stone hover:border-hero-blue'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="kq-card p-6"
            >
              <div className="text-5xl mb-2">💰</div>
              <div className="text-3xl font-black text-gold kq-display">
                ${summary.total_revenue_usd || 0}
              </div>
              <div className="text-sm text-navy/60">Total Revenue</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="kq-card p-6"
            >
              <div className="text-5xl mb-2">👥</div>
              <div className="text-3xl font-black text-hero-blue kq-display">
                {summary.avg_daily_active_users || 0}
              </div>
              <div className="text-sm text-navy/60">Avg Daily Active Users</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="kq-card p-6"
            >
              <div className="text-5xl mb-2">🪙</div>
              <div className="text-3xl font-black text-coral kq-display">
                {summary.total_gold_purchases || 0}
              </div>
              <div className="text-sm text-navy/60">Gold Purchases</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="kq-card p-6"
            >
              <div className="text-5xl mb-2">📈</div>
              <div className="text-3xl font-black text-emerald kq-display">
                {summary.avg_conversion_rate || 0}%
              </div>
              <div className="text-sm text-navy/60">Avg Conversion Rate</div>
            </motion.div>
          </div>
        )}

        {/* Metric Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['overview', 'revenue_detail', 'story_metrics', 'retention', 'users'].map(metric => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 rounded-full font-bold whitespace-nowrap border-2 transition-all ${
                selectedMetric === metric
                  ? 'bg-gold text-navy border-gold'
                  : 'bg-white text-navy/60 border-stone hover:border-gold'
              }`}
            >
              {metric.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Data Display */}
        {analyticsData && (
          <div className="space-y-6">
            {/* Revenue Detail */}
            {analyticsData.package_breakdown && (
              <div className="kq-card p-6">
                <h2 className="text-2xl font-black text-navy mb-4 kq-display">
                  💰 Revenue by Package
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(analyticsData.package_breakdown).map(([pkg, stats]) => (
                    <div key={pkg} className="bg-cream border-2 border-stone rounded-candy p-4">
                      <div className="text-xl font-bold text-hero-blue mb-2">{pkg.toUpperCase()}</div>
                      <div className="text-2xl font-black text-gold">${stats.revenue.toFixed(2)}</div>
                      <div className="text-sm text-navy/60">{stats.count} purchases</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story Metrics */}
            {analyticsData.story_metrics && (
              <div className="kq-card p-6">
                <h2 className="text-2xl font-black text-navy mb-4 kq-display">
                  📖 Story Engagement
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-cream border-2 border-stone rounded-candy p-4 text-center">
                    <div className="text-3xl font-black text-hero-blue">
                      {analyticsData.story_metrics.total_users_in_stories}
                    </div>
                    <div className="text-sm text-navy/60">Users in Stories</div>
                  </div>
                  <div className="bg-cream border-2 border-stone rounded-candy p-4 text-center">
                    <div className="text-3xl font-black text-gold">
                      {analyticsData.story_metrics.avg_story_completion}%
                    </div>
                    <div className="text-sm text-navy/60">Avg Completion</div>
                  </div>
                  <div className="bg-cream border-2 border-stone rounded-candy p-4 text-center">
                    <div className="text-3xl font-black text-coral">
                      {Object.keys(analyticsData.story_metrics.active_stories || {}).length}
                    </div>
                    <div className="text-sm text-navy/60">Active Stories</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-navy mb-3">Active Story Threads</h3>
                  {Object.entries(analyticsData.story_metrics.active_stories || {}).map(([thread, stats]) => (
                    <div key={thread} className="bg-cream border-2 border-stone rounded-candy p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-navy">{thread}</div>
                        <div className="text-sm text-navy/60">{stats.users} users</div>
                      </div>
                      <div className="text-gold font-black">{stats.avg_completion}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Users */}
            {analyticsData.top_users && (
              <div className="kq-card p-6">
                <h2 className="text-2xl font-black text-navy mb-4 kq-display">
                  🏆 Top Users by Engagement
                </h2>
                <div className="space-y-2">
                  {analyticsData.top_users.slice(0, 20).map((user, index) => (
                    <div key={user.user_id} className="bg-cream border-2 border-stone rounded-candy p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-gold">#{index + 1}</span>
                        <div>
                          <div className="text-sm text-navy/60">{user.user_id.substring(0, 8)}...</div>
                          <div className="text-xs text-navy/50">
                            {user.quests_completed} quests • {user.gold_purchases} purchases
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-hero-blue font-bold">{user.story_milestones} milestones</div>
                        <div className="text-xs text-navy/60">{user.level_ups} level ups</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!analyticsData && (
          <div className="text-center text-navy/60 mt-12">
            Loading analytics data...
          </div>
        )}
      </div>
    </div>
  );
}
