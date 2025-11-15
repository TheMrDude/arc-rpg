'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ADMIN MONITORING DASHBOARD
 *
 * Comprehensive monitoring for:
 * - Rate limits and API usage
 * - API costs and projections
 * - Founder spot inventory
 * - Support tools
 *
 * Access: Admin users only (via ADMIN_EMAILS env var)
 */
export default function AdminMonitoring() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [rateLimits, setRateLimits] = useState(null);
  const [apiCosts, setApiCosts] = useState(null);
  const [founderSpots, setFounderSpots] = useState(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const token = session.access_token;

      // Load all admin data in parallel
      const [rateLimitsRes, costsRes, spotsRes] = await Promise.all([
        fetch('/api/admin/rate-limits?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/api-costs?days=7', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/founder-spots', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!rateLimitsRes.ok || !costsRes.ok || !spotsRes.ok) {
        const firstError = !rateLimitsRes.ok ? rateLimitsRes :
                          !costsRes.ok ? costsRes : spotsRes;
        const errorData = await firstError.json();
        throw new Error(errorData.error || 'Failed to load admin data');
      }

      const [rateLimitsData, costsData, spotsData] = await Promise.all([
        rateLimitsRes.json(),
        costsRes.json(),
        spotsRes.json()
      ]);

      setRateLimits(rateLimitsData);
      setApiCosts(costsData);
      setFounderSpots(spotsData);
    } catch (err) {
      console.error('Admin data load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function clearUserRateLimit(userId, endpoint) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session.access_token;

      const res = await fetch('/api/admin/clear-rate-limit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, endpoint })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to clear rate limit');
      }

      alert(`Rate limit cleared for ${endpoint}`);
      loadAllData(); // Reload data
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-400">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-red-500 font-bold text-lg mb-2">Access Denied</h3>
          <p className="text-gray-300">{error}</p>
          <p className="text-sm text-gray-400 mt-4">
            Admin access required. Contact system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Monitoring Dashboard</h1>
          <p className="text-gray-400">System health, costs, and support tools</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'costs', label: 'API Costs' },
            { id: 'limits', label: 'Rate Limits' },
            { id: 'founder', label: 'Founder Spots' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab apiCosts={apiCosts} founderSpots={founderSpots} rateLimits={rateLimits} />}
            {activeTab === 'costs' && <CostsTab data={apiCosts} />}
            {activeTab === 'limits' && <RateLimitsTab data={rateLimits} onClearLimit={clearUserRateLimit} />}
            {activeTab === 'founder' && <FounderSpotsTab data={founderSpots} />}
          </motion.div>
        </AnimatePresence>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={loadAllData}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ apiCosts, founderSpots, rateLimits }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* API Costs */}
      <StatCard
        title="API Costs (7d)"
        value={`$${apiCosts?.costs?.total || 0}`}
        subtitle={`Projected monthly: $${apiCosts?.projections?.monthly || 0}`}
        color="purple"
      />

      {/* Founder Spots */}
      <StatCard
        title="Founder Spots"
        value={`${founderSpots?.stats?.remaining || 0} / ${founderSpots?.stats?.totalCapacity || 25}`}
        subtitle={`${founderSpots?.stats?.percentageSold || 0}% sold`}
        color="green"
      />

      {/* Revenue */}
      <StatCard
        title="Monthly Revenue"
        value={`$${apiCosts?.business?.estimatedMonthlyRevenue || 0}`}
        subtitle={`${apiCosts?.business?.premiumUsers || 0} premium users`}
        color="blue"
      />

      {/* Cost/Revenue Ratio */}
      <StatCard
        title="Cost Ratio"
        value={`${apiCosts?.business?.costToRevenueRatio || 0}%`}
        subtitle={`Net profit: $${apiCosts?.business?.netMonthlyProfit || 0}`}
        color={
          (apiCosts?.business?.costToRevenueRatio || 0) > 50 ? 'red' :
          (apiCosts?.business?.costToRevenueRatio || 0) > 30 ? 'yellow' :
          'green'
        }
      />

      {/* API Requests */}
      <StatCard
        title="Total Requests (7d)"
        value={apiCosts?.usage?.totalRequests || 0}
        subtitle={`${apiCosts?.usage?.premiumPercentage || 0}% from premium`}
        color="purple"
      />

      {/* Rate Limit Status */}
      <StatCard
        title="Active Users"
        value={rateLimits?.stats?.uniqueUsers || 0}
        subtitle={`${rateLimits?.stats?.totalRequests || 0} requests tracked`}
        color="blue"
      />
    </div>
  );
}

// Costs Tab
function CostsTab({ data }) {
  if (!data) return <p>Loading costs data...</p>;

  return (
    <div className="space-y-6">
      {/* Costs by Endpoint */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Costs by Endpoint</h2>
        <div className="space-y-3">
          {data.costs.byEndpoint.map(endpoint => (
            <div key={endpoint.endpoint} className="flex items-center justify-between p-3 bg-gray-700/30 rounded">
              <div>
                <p className="font-medium">{endpoint.endpoint}</p>
                <p className="text-sm text-gray-400">{endpoint.requests} requests</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-purple-400">${endpoint.cost}</p>
                <p className="text-xs text-gray-400">{endpoint.percentage}% of total</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Trend */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Daily Trend</h2>
        <div className="space-y-2">
          {data.costs.byDay.map(day => (
            <div key={day.day} className="flex items-center justify-between p-2 hover:bg-gray-700/20 rounded">
              <span className="text-sm">{new Date(day.day).toLocaleDateString()}</span>
              <div className="text-right">
                <span className="font-medium">${day.cost.toFixed(2)}</span>
                <span className="text-sm text-gray-400 ml-3">({day.requests} req)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Rate Limits Tab
function RateLimitsTab({ data, onClearLimit }) {
  if (!data) return <p>Loading rate limits...</p>;

  return (
    <div className="space-y-6">
      {/* Top Users */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Top Users (by requests)</h2>
        <div className="space-y-3">
          {data.stats.topUsers.map((user, idx) => (
            <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-700/30 rounded">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-600">#{idx + 1}</span>
                <div>
                  <p className="font-medium">{user.userId.substring(0, 8)}...</p>
                  <p className="text-sm text-gray-400">
                    Level {user.level} {user.archetype} | {user.isPremium ? '👑 Premium' : 'Free'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{user.totalRequests} requests</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Rate Limit Events */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.rateLimits.slice(0, 20).map((rl) => (
            <div key={rl.id} className="flex items-center justify-between p-2 bg-gray-700/20 rounded text-sm">
              <div>
                <span className="font-medium">{rl.endpoint}</span>
                <span className="text-gray-400 ml-2">({rl.request_count} req)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {new Date(rl.window_start).toLocaleString()}
                </span>
                <button
                  onClick={() => onClearLimit(rl.user_id, rl.endpoint)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Founder Spots Tab
function FounderSpotsTab({ data }) {
  if (!data) return <p>Loading founder spots...</p>;

  return (
    <div className="space-y-6">
      {/* Inventory Status */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Inventory Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400">{data.stats.remaining}</p>
            <p className="text-sm text-gray-400">Remaining</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{data.stats.claimed}</p>
            <p className="text-sm text-gray-400">Claimed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400">{data.stats.totalCapacity}</p>
            <p className="text-sm text-gray-400">Total Capacity</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-400">{data.stats.percentageSold}%</p>
            <p className="text-sm text-gray-400">Sold</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-500"
              style={{ width: `${data.stats.percentageSold}%` }}
            />
          </div>
        </div>
      </div>

      {/* Premium Users */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Premium Users ({data.premiumUsers.length})</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.premiumUsers.map((user, idx) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700/20 rounded">
              <div>
                <p className="font-medium">#{idx + 1} - Level {user.level} {user.archetype}</p>
                <p className="text-xs text-gray-400">
                  Premium since: {user.premium_since ? new Date(user.premium_since).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <span className="text-xs px-2 py-1 bg-green-600 rounded">
                {user.subscription_status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, color = 'purple' }) {
  const colors = {
    purple: 'from-purple-600 to-purple-800',
    green: 'from-green-600 to-green-800',
    blue: 'from-blue-600 to-blue-800',
    red: 'from-red-600 to-red-800',
    yellow: 'from-yellow-600 to-yellow-800'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg p-6`}>
      <h3 className="text-sm font-medium text-white/80 mb-2">{title}</h3>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm text-white/60">{subtitle}</p>
    </div>
  );
}
