'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SeasonalEvent() {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('challenges');

  useEffect(() => {
    loadEventData();
  }, []);

  async function loadEventData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/seasonal-events', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (data.active) {
        setEventData(data);
      }
    } catch (error) {
      console.error('Error loading seasonal event:', error);
    } finally {
      setLoading(false);
    }
  }

  async function claimReward(rewardId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/seasonal-events/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reward_id: rewardId })
      });

      const result = await response.json();
      if (result.success) {
        // Reload event data to update points
        await loadEventData();
        alert(`🎉 You claimed: ${result.reward_name}!`);
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Failed to claim reward');
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin text-4xl mb-2">⚙️</div>
        <p className="text-gray-400">Loading seasonal event...</p>
      </div>
    );
  }

  if (!eventData || !eventData.active) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-bold text-white mb-2">No Active Events</h3>
        <p className="text-gray-400">Check back soon for limited-time seasonal events!</p>
      </div>
    );
  }

  const { event, challenges, userProgress, challengeProgress, rewards } = eventData;
  const progressMap = {};
  challengeProgress.forEach(cp => {
    progressMap[cp.challenge_id] = cp;
  });

  // Calculate days remaining
  const endDate = new Date(event.end_date);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-6">
      {/* Event Header */}
      <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg p-6 border-2 border-yellow-500">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{event.icon}</span>
              <h2 className="text-3xl font-bold text-white">{event.name}</h2>
            </div>
            <p className="text-gray-200 mb-3">{event.description}</p>
            {event.lore && (
              <p className="text-sm text-gray-300 italic">"{event.lore}"</p>
            )}
          </div>
          <div className="text-right">
            <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
              <div className="text-sm text-gray-300">Time Remaining</div>
              <div className="text-2xl font-bold text-yellow-400">{daysRemaining} days</div>
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-black bg-opacity-30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{userProgress.event_points}</div>
            <div className="text-sm text-gray-300">Event Points</div>
          </div>
          <div className="bg-black bg-opacity-30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{userProgress.challenges_completed}</div>
            <div className="text-sm text-gray-300">Challenges Done</div>
          </div>
          <div className="bg-black bg-opacity-30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{userProgress.rewards_claimed?.length || 0}</div>
            <div className="text-sm text-gray-300">Rewards Claimed</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setSelectedTab('challenges')}
          className={`px-6 py-3 font-bold transition-colors ${
            selectedTab === 'challenges'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          ⚔️ Challenges
        </button>
        <button
          onClick={() => setSelectedTab('rewards')}
          className={`px-6 py-3 font-bold transition-colors ${
            selectedTab === 'rewards'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          🎁 Rewards
        </button>
      </div>

      {/* Challenges Tab */}
      {selectedTab === 'challenges' && (
        <div className="space-y-4">
          {challenges.map(challenge => {
            const progress = progressMap[challenge.id];
            const currentProgress = progress?.progress || 0;
            const isCompleted = progress?.completed || false;
            const progressPercent = Math.min(100, (currentProgress / challenge.requirement_value) * 100);

            const difficultyColors = {
              easy: 'bg-green-900 border-green-500 text-green-300',
              medium: 'bg-yellow-900 border-yellow-500 text-yellow-300',
              hard: 'bg-red-900 border-red-500 text-red-300',
              extreme: 'bg-purple-900 border-purple-500 text-purple-300'
            };

            return (
              <div
                key={challenge.id}
                className={`rounded-lg p-4 border-2 ${
                  isCompleted
                    ? 'bg-green-900 bg-opacity-20 border-green-500'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isCompleted && <span className="text-2xl">✅</span>}
                      <h3 className="text-lg font-bold text-white">{challenge.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${difficultyColors[challenge.difficulty]}`}>
                        {challenge.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{challenge.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-yellow-400">+{challenge.points}</div>
                    <div className="text-xs text-gray-400">points</div>
                  </div>
                </div>

                {/* Progress Bar */}
                {!isCompleted && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{currentProgress} / {challenge.requirement_value}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Reward Preview */}
                <div className="mt-2 text-sm text-gray-400">
                  <span className="font-bold">Reward:</span> {challenge.reward_value} {challenge.reward_type}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rewards Tab */}
      {selectedTab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map(reward => {
            const isClaimed = userProgress.rewards_claimed?.some(r => r.reward_id === reward.id);
            const canAfford = userProgress.event_points >= reward.cost_event_points;
            const isSoldOut = reward.limited_quantity !== null && reward.remaining_quantity <= 0;

            const rarityColors = {
              common: 'border-gray-500 bg-gray-900',
              rare: 'border-blue-500 bg-blue-900 bg-opacity-20',
              epic: 'border-purple-500 bg-purple-900 bg-opacity-20',
              legendary: 'border-yellow-500 bg-yellow-900 bg-opacity-20',
              exclusive: 'border-pink-500 bg-pink-900 bg-opacity-20'
            };

            return (
              <div
                key={reward.id}
                className={`rounded-lg p-4 border-2 ${rarityColors[reward.rarity]}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {reward.name}
                      {isClaimed && <span className="text-green-400">✓</span>}
                    </h3>
                    <p className="text-sm text-gray-400">{reward.description}</p>
                  </div>
                  {reward.icon && <span className="text-3xl">{reward.icon}</span>}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-yellow-400">
                      {reward.cost_event_points} points
                    </div>
                    {reward.limited_quantity !== null && (
                      <div className="text-xs text-gray-400">
                        {reward.remaining_quantity} / {reward.limited_quantity} remaining
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => claimReward(reward.id)}
                    disabled={!canAfford || isClaimed || isSoldOut}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      isClaimed
                        ? 'bg-green-600 text-white cursor-not-allowed'
                        : isSoldOut
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : canAfford
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isClaimed ? 'Claimed' : isSoldOut ? 'Sold Out' : canAfford ? 'Claim' : 'Locked'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
