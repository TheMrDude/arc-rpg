'use client';

import { useState } from 'react';
import StreakFlame, { StreakFlameMilestone, StreakFlameCompact } from './StreakFlame';

/**
 * Example usage of StreakFlame components
 *
 * Shows different variants and use cases
 */
export default function StreakFlameExample() {
  const [streakCount, setStreakCount] = useState(7);
  const [hasFreeze, setHasFreeze] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-5xl font-black text-gray-800 mb-8 text-center">
          StreakFlame Component Demo
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Controls</h2>

          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => setStreakCount(prev => Math.max(0, prev - 1))}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
            >
              - Decrease Streak
            </button>

            <button
              onClick={() => setStreakCount(prev => prev + 1)}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
            >
              + Increase Streak
            </button>

            <button
              onClick={() => setStreakCount(0)}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Reset to 0
            </button>

            <button
              onClick={() => setStreakCount(30)}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Jump to 30
            </button>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasFreeze}
                onChange={(e) => setHasFreeze(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="font-semibold text-gray-700">
                Freeze Shield Active
              </span>
            </label>
          </div>

          <div className="mt-4 text-gray-600">
            Current Streak: <span className="font-bold text-gray-800">{streakCount} days</span>
          </div>
        </div>

        {/* Variants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Standard Variant */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Standard
            </h3>
            <div className="flex justify-center">
              <StreakFlame
                streakCount={streakCount}
                hasFreeze={hasFreeze}
              />
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Default variant with full animations
            </p>
          </div>

          {/* Milestone Variant */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Milestone (7 days)
            </h3>
            <div className="flex justify-center">
              <StreakFlameMilestone
                streakCount={streakCount}
                milestone={7}
                hasFreeze={hasFreeze}
              />
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Shows milestone badge when threshold reached
            </p>
          </div>

          {/* Compact Variant */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Compact
            </h3>
            <div className="flex justify-center">
              <StreakFlameCompact
                streakCount={streakCount}
                hasFreeze={hasFreeze}
              />
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Minimal variant for headers/navigation
            </p>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Integration Examples
          </h2>

          <div className="space-y-6">
            {/* Dashboard Header */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                1. Dashboard Header (F-pattern hot spot)
              </h3>
              <div className="bg-gray-100 rounded-lg p-4 border-2 border-gray-300">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-800">
                    My Quests
                  </h1>
                  <StreakFlameCompact
                    streakCount={streakCount}
                    hasFreeze={hasFreeze}
                  />
                </div>
              </div>
              <pre className="mt-2 bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`<StreakFlameCompact
  streakCount={userStreak}
  hasFreeze={hasActiveFreeze}
/>`}
              </pre>
            </div>

            {/* Sidebar Widget */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                2. Sidebar/Stats Panel
              </h3>
              <div className="bg-gray-100 rounded-lg p-4 border-2 border-gray-300">
                <StreakFlame
                  streakCount={streakCount}
                  hasFreeze={hasFreeze}
                />
              </div>
              <pre className="mt-2 bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`<StreakFlame
  streakCount={profile.streak_count}
  hasFreeze={profile.streak_freeze_active}
/>`}
              </pre>
            </div>

            {/* Milestone Celebration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                3. Milestone Achievement Display
              </h3>
              <div className="bg-gray-100 rounded-lg p-4 border-2 border-gray-300 flex justify-center">
                <StreakFlameMilestone
                  streakCount={30}
                  milestone={30}
                  hasFreeze={false}
                />
              </div>
              <pre className="mt-2 bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`<StreakFlameMilestone
  streakCount={profile.streak_count}
  milestone={30}
  hasFreeze={profile.streak_freeze_active}
/>`}
              </pre>
            </div>
          </div>
        </div>

        {/* Props Documentation */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Props Reference
          </h2>

          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-gray-800">StreakFlame</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li><code className="bg-gray-100 px-2 py-1 rounded">streakCount: number</code> - Current streak days</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">hasFreeze?: boolean</code> - Show freeze shield badge</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">className?: string</code> - Additional CSS classes</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">showAnimation?: boolean</code> - Enable/disable flame animation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800">StreakFlameMilestone</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li><code className="bg-gray-100 px-2 py-1 rounded">streakCount: number</code> - Current streak days</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">milestone: number</code> - Milestone threshold</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">hasFreeze?: boolean</code> - Show freeze shield badge</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800">StreakFlameCompact</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li><code className="bg-gray-100 px-2 py-1 rounded">streakCount: number</code> - Current streak days</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">hasFreeze?: boolean</code> - Show freeze shield icon</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
