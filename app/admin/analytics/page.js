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
      <div className="min-h-screen bg-[#0F3460] flex items-center justify-center">
        <div className="text-[#00D4FF] text-2xl font-black" style={{ fontFamily: 'VT323, monospace' }}>
          ⏳ LOADING ANALYTICS...
        </div>
      </div>
    );
  }

  const summary = analyticsData?.summary || {};

  return (
    <div className="min-h-screen bg-[#0F3460] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-black text-[#FFD93D]" style={{ fontFamily: 'VT323, monospace' }}>
              📊 ADMIN ANALYTICS
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-[#FF6B6B] border-3 border-[#8B0000] rounded-lg font-black text-white hover:shadow-[0_5px_0_#8B0000] hover:-translate-y-0.5 transition-all"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              ← BACK
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${
                  days === d
                    ? 'bg-[#00D4FF] text-[#0F3460] border-[#00D4FF]'
                    : 'bg-[#1A1A2E] text-[#00D4FF] border-[#00D4FF] border-opacity-30 hover:border-opacity-100'
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
              className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-6"
            >
              <div className="text-5xl mb-2">💰</div>
              <div className="text-3xl font-black text-[#FFD93D]" style={{ fontFamily: 'VT323, monospace' }}>
                ${summary.total_revenue_usd || 0}
              </div>
              <div className="text-sm text-gray-400">Total Revenue</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6"
            >
              <div className="text-5xl mb-2">👥</div>
              <div className="text-3xl font-black text-[#00D4FF]" style={{ fontFamily: 'VT323, monospace' }}>
                {summary.avg_daily_active_users || 0}
              </div>
              <div className="text-sm text-gray-400">Avg Daily Active Users</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-6"
            >
              <div className="text-5xl mb-2">🪙</div>
              <div className="text-3xl font-black text-[#FF6B6B]" style={{ fontFamily: 'VT323, monospace' }}>
                {summary.total_gold_purchases || 0}
              </div>
              <div className="text-sm text-gray-400">Gold Purchases</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1A1A2E] border-3 border-[#00FF00] rounded-lg p-6"
            >
              <div className="text-5xl mb-2">📈</div>
              <div className="text-3xl font-black text-[#00FF00]" style={{ fontFamily: 'VT323, monospace' }}>
                {summary.avg_conversion_rate || 0}%
              </div>
              <div className="text-sm text-gray-400">Avg Conversion Rate</div>
            </motion.div>
          </div>
        )}

        {/* Metric Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['overview', 'revenue_detail', 'story_metrics', 'retention', 'users'].map(metric => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap border-2 transition-all ${
                selectedMetric === metric
                  ? 'bg-[#FFD93D] text-[#0F3460] border-[#FFD93D]'
                  : 'bg-[#1A1A2E] text-[#FFD93D] border-[#FFD93D] border-opacity-30 hover:border-opacity-100'
              }`}
            >
              {metric.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Data Display */}
        {analyticsData && (
          <div className="space-y-6">
            {/* Revenue Detail */}
            {analyticsData.package_breakdown && (
              <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6">
                <h2 className="text-2xl font-black text-[#FFD93D] mb-4" style={{ fontFamily: 'VT323, monospace' }}>
                  💰 REVENUE BY PACKAGE
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(analyticsData.package_breakdown).map(([pkg, stats]) => (
                    <div key={pkg} className="bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-50 rounded-lg p-4">
                      <div className="text-xl font-bold text-[#00D4FF] mb-2">{pkg.toUpperCase()}</div>
                      <div className="text-2xl font-black text-[#FFD93D]">${stats.revenue.toFixed(2)}</div>
                      <div className="text-sm text-gray-400">{stats.count} purchases</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story Metrics */}
            {analyticsData.story_metrics && (
              <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6">
                <h2 className="text-2xl font-black text-[#FFD93D] mb-4" style={{ fontFamily: 'VT323, monospace' }}>
                  📖 STORY ENGAGEMENT
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-black text-[#00D4FF]">
                      {analyticsData.story_metrics.total_users_in_stories}
                    </div>
                    <div className="text-sm text-gray-400">Users in Stories</div>
                  </div>
                  <div className="bg-[#0F3460] border-2 border-[#FFD93D] border-opacity-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-black text-[#FFD93D]">
                      {analyticsData.story_metrics.avg_story_completion}%
                    </div>
                    <div className="text-sm text-gray-400">Avg Completion</div>
                  </div>
                  <div className="bg-[#0F3460] border-2 border-[#FF6B6B] border-opacity-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-black text-[#FF6B6B]">
                      {Object.keys(analyticsData.story_metrics.active_stories || {}).length}
                    </div>
                    <div className="text-sm text-gray-400">Active Stories</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#00D4FF] mb-3">ACTIVE STORY THREADS</h3>
                  {Object.entries(analyticsData.story_metrics.active_stories || {}).map(([thread, stats]) => (
                    <div key={thread} className="bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-30 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{thread}</div>
                        <div className="text-sm text-gray-400">{stats.users} users</div>
                      </div>
                      <div className="text-[#FFD93D] font-black">{stats.avg_completion}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Users */}
            {analyticsData.top_users && (
              <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6">
                <h2 className="text-2xl font-black text-[#FFD93D] mb-4" style={{ fontFamily: 'VT323, monospace' }}>
                  🏆 TOP USERS BY ENGAGEMENT
                </h2>
                <div className="space-y-2">
                  {analyticsData.top_users.slice(0, 20).map((user, index) => (
                    <div key={user.user_id} className="bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-30 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-[#FFD93D]">#{index + 1}</span>
                        <div>
                          <div className="text-sm text-gray-400">{user.user_id.substring(0, 8)}...</div>
                          <div className="text-xs text-gray-500">
                            {user.quests_completed} quests • {user.gold_purchases} purchases
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#00D4FF] font-bold">{user.story_milestones} milestones</div>
                        <div className="text-xs text-gray-400">{user.level_ups} level ups</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!analyticsData && (
          <div className="text-center text-gray-400 mt-12">
            Loading analytics data...
          </div>
        )}
      </div>
    </div>
  );
}
