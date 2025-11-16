'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  isPushNotificationSupported,
  subscribeToPushNotifications,
  getNotificationPreferences,
  updateNotificationPreferences
} from '@/lib/notifications';

export default function NotificationSettings({ userId }) {
  const [supported, setSupported] = useState(false);
  const [preferences, setPreferences] = useState({
    streak_reminders: true,
    daily_encouragement: true,
    achievement_unlocks: true,
    quest_chain_updates: true,
    seasonal_events: true,
    reminder_time: '09:00:00'
  });
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    setSupported(isPushNotificationSupported());
    loadPreferences();
  }, [userId]);

  async function loadPreferences() {
    const prefs = await getNotificationPreferences(userId);
    if (prefs) {
      setPreferences(prefs);
    }
  }

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const result = await subscribeToPushNotifications(userId);
      if (result.success) {
        alert('Successfully subscribed to notifications!');
      } else {
        alert(`Failed to subscribe: ${result.error}`);
      }
    } catch (error) {
      alert('Error subscribing to notifications');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleSavePreferences() {
    setSaving(true);
    try {
      const result = await updateNotificationPreferences(userId, preferences);
      if (result.success) {
        alert('Preferences saved!');
      } else {
        alert('Failed to save preferences');
      }
    } catch (error) {
      alert('Error saving preferences');
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(key) {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  function handleTimeChange(e) {
    setPreferences(prev => ({
      ...prev,
      reminder_time: e.target.value + ':00'
    }));
  }

  if (!supported) {
    return (
      <div className="bg-[#0F3460] border-2 border-[#1A1A2E] rounded-lg p-6">
        <div className="text-center">
          <span className="text-4xl mb-3 block">📱</span>
          <p className="text-[#E2E8F0] mb-2">Push notifications are not supported on this device/browser.</p>
          <p className="text-sm text-[#E2E8F0] opacity-75">Try using a modern browser like Chrome, Firefox, or Edge.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">🔔</span>
        <div>
          <h3 className="text-xl font-black text-[#FFD93D] uppercase">Notification Settings</h3>
          <p className="text-sm text-[#E2E8F0]">Customize your notification preferences</p>
        </div>
      </div>

      {/* Subscribe Button */}
      <div className="mb-6 bg-black/30 rounded-lg p-4 border-2 border-[#FFD93D]">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-[#FFD93D] mb-1">Enable Push Notifications</h4>
            <p className="text-xs text-[#E2E8F0]">Get reminders and updates directly to your device</p>
          </div>
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="px-6 py-3 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] rounded-lg font-black uppercase text-sm tracking-wide border-2 border-[#0F3460] shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all disabled:opacity-50"
          >
            {subscribing ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-3 mb-6">
        <h4 className="font-bold text-[#00D4FF] mb-3">Notification Types</h4>

        {[
          { key: 'streak_reminders', label: 'Streak Reminders', icon: '🔥', desc: 'Don\'t break your streak!' },
          { key: 'daily_encouragement', label: 'Daily Encouragement', icon: '💪', desc: 'Morning motivation' },
          { key: 'achievement_unlocks', label: 'Achievement Unlocks', icon: '🏆', desc: 'Celebrate your wins' },
          { key: 'quest_chain_updates', label: 'Quest Chain Updates', icon: '📖', desc: 'Story progression alerts' },
          { key: 'seasonal_events', label: 'Seasonal Events', icon: '🎉', desc: 'Limited-time events' }
        ].map(item => (
          <div
            key={item.key}
            className="flex items-center justify-between bg-black/30 rounded-lg p-4 border border-[#1A1A2E] hover:border-[#00D4FF]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="font-bold text-[#E2E8F0]">{item.label}</div>
                <div className="text-xs text-[#E2E8F0] opacity-75">{item.desc}</div>
              </div>
            </div>
            <button
              onClick={() => handleToggle(item.key)}
              className={`w-14 h-8 rounded-full transition-all ${
                preferences[item.key]
                  ? 'bg-[#48BB78]'
                  : 'bg-[#1A1A2E]'
              }`}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-lg"
                animate={{
                  x: preferences[item.key] ? 28 : 4
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Reminder Time */}
      <div className="bg-black/30 rounded-lg p-4 border border-[#1A1A2E] mb-6">
        <label className="block mb-2 font-bold text-[#00D4FF]">Reminder Time</label>
        <input
          type="time"
          value={preferences.reminder_time?.slice(0, 5) || '09:00'}
          onChange={handleTimeChange}
          className="w-full px-4 py-2 bg-[#1A1A2E] border-2 border-[#0F3460] rounded-lg text-[#E2E8F0] focus:border-[#00D4FF] outline-none"
        />
        <p className="text-xs text-[#E2E8F0] opacity-75 mt-2">
          When should we send you daily reminders?
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSavePreferences}
        disabled={saving}
        className="w-full bg-[#00D4FF] hover:bg-[#00BBE6] text-[#0F3460] py-3 px-6 rounded-lg font-black uppercase tracking-wide border-3 border-[#0F3460] shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
