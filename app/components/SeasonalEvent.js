'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SeasonalEvent({ onEventComplete }) {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('challenges');
  const [eventCompleteChecked, setEventCompleteChecked] = useState(false);

  useEffect(() => {
    loadEventData();
  }, []);

  async function loadEventData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('SeasonalEvent: No session found');
        return;
      }

      console.log('SeasonalEvent: Fetching event data...');
      const response = await fetch('/api/seasonal-events', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      console.log('SeasonalEvent: API response:', data);

      if (data.active) {
        setEventData(data);

        // Check if all challenges are completed
        if (!eventCompleteChecked && data.challenges && data.challenges.length > 0 && data.challengeProgress) {
          const progressMap = {};
          data.challengeProgress.forEach(cp => { progressMap[cp.challenge_id] = cp; });
          const allComplete = data.challenges.every(c => progressMap[c.id]?.completed);
          if (allComplete && onEventComplete) {
            setEventCompleteChecked(true);
            onEventComplete(data.event.id, data.event.name, data.event.icon);
          }
        }
      } else {
        console.log('SeasonalEvent: No active event found');
      }
    } catch (error) {
      console.error('SeasonalEvent: Error loading event:', error);
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
        <p className="text-navy/60">Loading seasonal event...</p>
      </div>
    );
  }

  if (!eventData || !eventData.active) {
    return (
      <div className="kq-card p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="kq-display text-xl font-bold text-navy mb-2">No Active Events</h3>
        <p className="text-navy/60">Check back soon for limited-time seasonal events!</p>
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
      <div className="kq-navy rounded-candy p-6 border-2 border-gold">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{event.icon}</span>
              <h2 className="kq-display text-3xl font-bold text-cream">{event.name}</h2>
            </div>
            <p className="text-cream/80 mb-3">{event.description}</p>
            {event.lore && (
              <p className="text-sm text-cream/60 italic">"{event.lore}"</p>
            )}
          </div>
          <div className="text-right">
            <div className="bg-white/10 rounded-candy px-4 py-2">
              <div className="text-sm text-cream/70">Time Remaining</div>
              <div className="text-2xl font-bold text-gold">{daysRemaining} days</div>
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-candy p-4 text-center">
            <div className="text-3xl font-bold text-gold">{userProgress.event_points}</div>
            <div className="text-sm text-cream/70">Event Points</div>
          </div>
          <div className="bg-white/10 rounded-candy p-4 text-center">
            <div className="text-3xl font-bold text-emerald">{userProgress.challenges_completed}</div>
            <div className="text-sm text-cream/70">Challenges Done</div>
          </div>
          <div className="bg-white/10 rounded-candy p-4 text-center">
            <div className="text-3xl font-bold text-purple">{userProgress.rewards_claimed?.length || 0}</div>
            <div className="text-sm text-cream/70">Rewards Claimed</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone">
        <button
          onClick={() => setSelectedTab('challenges')}
          className={`px-6 py-3 font-bold transition-colors ${
            selectedTab === 'challenges'
              ? 'text-hero-blue border-b-2 border-hero-blue'
              : 'text-navy/50 hover:text-navy/80'
          }`}
        >
          ⚔️ Challenges
        </button>
        <button
          onClick={() => setSelectedTab('rewards')}
          className={`px-6 py-3 font-bold transition-colors ${
            selectedTab === 'rewards'
              ? 'text-hero-blue border-b-2 border-hero-blue'
              : 'text-navy/50 hover:text-navy/80'
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
              easy: 'bg-emerald/15 border border-emerald text-emerald',
              medium: 'bg-gold/15 border border-gold text-gold',
              hard: 'bg-coral/15 border border-coral text-coral',
              extreme: 'bg-purple/15 border border-purple text-purple'
            };

            return (
              <div
                key={challenge.id}
                className={`rounded-candy p-4 border-2 ${
                  isCompleted
                    ? 'bg-emerald/10 border-emerald'
                    : 'kq-card border-stone'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isCompleted && <span className="text-2xl">✅</span>}
                      <h3 className="text-lg font-bold text-navy">{challenge.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${difficultyColors[challenge.difficulty]}`}>
                        {challenge.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-navy/60 text-sm">{challenge.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-gold">+{challenge.points}</div>
                    <div className="text-xs text-navy/50">points</div>
                  </div>
                </div>

                {/* Progress Bar */}
                {!isCompleted && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-navy/60 mb-1">
                      <span>Progress</span>
                      <span>{currentProgress} / {challenge.requirement_value}</span>
                    </div>
                    <div className="w-full bg-stone rounded-full h-2">
                      <div
                        className="bg-hero-blue h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Reward Preview */}
                <div className="mt-2 text-sm text-navy/60">
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
              common: 'border-stone bg-white',
              rare: 'border-hero-blue bg-hero-blue/10',
              epic: 'border-purple bg-purple/10',
              legendary: 'border-gold bg-gold/10',
              exclusive: 'border-coral bg-coral/10'
            };

            return (
              <div
                key={reward.id}
                className={`rounded-candy p-4 border-2 shadow-candy ${rarityColors[reward.rarity]}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                      {reward.name}
                      {isClaimed && <span className="text-emerald">✓</span>}
                    </h3>
                    <p className="text-sm text-navy/60">{reward.description}</p>
                  </div>
                  {reward.icon && <span className="text-3xl">{reward.icon}</span>}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-gold">
                      {reward.cost_event_points} points
                    </div>
                    {reward.limited_quantity !== null && (
                      <div className="text-xs text-navy/50">
                        {reward.remaining_quantity} / {reward.limited_quantity} remaining
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => claimReward(reward.id)}
                    disabled={!canAfford || isClaimed || isSoldOut}
                    className={
                      isClaimed
                        ? 'kq-btn kq-btn-emerald opacity-80 cursor-not-allowed'
                        : isSoldOut
                        ? 'kq-btn kq-btn-ghost opacity-50 cursor-not-allowed'
                        : canAfford
                        ? 'kq-btn kq-btn-gold'
                        : 'kq-btn kq-btn-ghost opacity-50 cursor-not-allowed'
                    }
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
