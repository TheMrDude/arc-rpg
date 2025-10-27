'use client';

import { useState, useEffect } from 'react';

export default function NotificationSetup({ userId }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);

      // Check if user has been asked before
      const hasBeenAsked = localStorage.getItem(`notifications_asked_${userId}`);

      // Show prompt if permission is default and hasn't been asked
      if (Notification.permission === 'default' && !hasBeenAsked) {
        // Delay showing prompt slightly so user sees dashboard first
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }

      // Set up daily reminder if permission granted
      if (Notification.permission === 'granted') {
        setupDailyReminder();
      }
    }
  }, [userId]);

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      localStorage.setItem(`notifications_asked_${userId}`, 'true');

      if (result === 'granted') {
        // Show success notification
        new Notification('ARC RPG', {
          body: 'You\'ll now get daily reminders to complete your quests!',
          icon: '/favicon.ico',
          tag: 'welcome'
        });

        // Set up daily reminder
        setupDailyReminder();
      }

      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(`notifications_asked_${userId}`, 'true');
    setShowPrompt(false);
  };

  const setupDailyReminder = () => {
    // Set up a daily check using localStorage
    const lastReminderDate = localStorage.getItem(`last_reminder_${userId}`);
    const today = new Date().toDateString();

    if (lastReminderDate !== today) {
      // Schedule reminder for later today if not sent yet
      const now = new Date();
      const reminderTime = new Date();
      reminderTime.setHours(9, 0, 0, 0); // 9 AM reminder

      // If 9 AM has passed, schedule for tomorrow
      if (now > reminderTime) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      const timeUntilReminder = reminderTime.getTime() - now.getTime();

      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('ARC RPG - Your Quests Await!', {
            body: 'Time to level up! Complete today\'s quests to maintain your streak.',
            icon: '/favicon.ico',
            tag: 'daily-reminder',
            requireInteraction: false
          });

          localStorage.setItem(`last_reminder_${userId}`, new Date().toDateString());
        }
      }, timeUntilReminder);
    }
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 max-w-sm animate-slide-up">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-2xl p-6 border-2 border-yellow-400">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🔔</div>
          <div className="flex-1">
            <h3 className="text-white font-bold mb-2">Never Miss Your Quests!</h3>
            <p className="text-white/90 text-sm mb-4">
              Get daily reminders to maintain your streak and level up faster.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnableNotifications}
                className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-semibold text-sm transition"
              >
                Enable Reminders
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
