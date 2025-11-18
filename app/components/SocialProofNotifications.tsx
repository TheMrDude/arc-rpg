'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  name: string;
  action: string;
  timeAgo: string;
}

const sampleNotifications: Notification[] = [
  { id: '1', name: 'Sarah', action: 'completed their first quest', timeAgo: '2 minutes ago' },
  { id: '2', name: 'Mike', action: 'reached Level 10', timeAgo: '5 minutes ago' },
  { id: '3', name: 'Alex', action: 'started their adventure', timeAgo: '8 minutes ago' },
  { id: '4', name: 'Jordan', action: 'earned 500 XP', timeAgo: '12 minutes ago' },
  { id: '5', name: 'Taylor', action: 'completed a 7-day streak', timeAgo: '15 minutes ago' },
  { id: '6', name: 'Casey', action: 'unlocked a new skill', timeAgo: '18 minutes ago' },
  { id: '7', name: 'Morgan', action: 'chose the Warrior archetype', timeAgo: '20 minutes ago' },
  { id: '8', name: 'Riley', action: 'completed 10 quests', timeAgo: '25 minutes ago' },
];

export default function SocialProofNotifications() {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [notificationIndex, setNotificationIndex] = useState(0);

  useEffect(() => {
    // Show first notification after 10 seconds
    const initialTimeout = setTimeout(() => {
      setCurrentNotification(sampleNotifications[0]);
      setNotificationIndex(1);
    }, 10000);

    return () => clearTimeout(initialTimeout);
  }, []);

  useEffect(() => {
    if (currentNotification) {
      // Hide notification after 5 seconds
      const hideTimeout = setTimeout(() => {
        setCurrentNotification(null);
      }, 5000);

      return () => clearTimeout(hideTimeout);
    } else if (notificationIndex < sampleNotifications.length) {
      // Show next notification after 15-30 seconds
      const nextTimeout = setTimeout(() => {
        setCurrentNotification(sampleNotifications[notificationIndex]);
        setNotificationIndex(prev => (prev + 1) % sampleNotifications.length);
      }, 15000 + Math.random() * 15000); // Random interval between 15-30s

      return () => clearTimeout(nextTimeout);
    }
  }, [currentNotification, notificationIndex]);

  return (
    <AnimatePresence>
      {currentNotification && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed bottom-6 left-6 z-50 max-w-sm"
        >
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-3 border-[#00D4FF] rounded-xl p-4 shadow-2xl backdrop-blur-sm">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#FF6B4A] to-[#FF5733] rounded-full flex items-center justify-center text-white font-black text-lg">
                🔥
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm mb-1">
                  <span className="text-[#00D4FF]">{currentNotification.name}</span> {currentNotification.action}
                </p>
                <p className="text-gray-400 text-xs">
                  {currentNotification.timeAgo}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setCurrentNotification(null)}
                className="flex-shrink-0 text-gray-400 hover:text-white text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
