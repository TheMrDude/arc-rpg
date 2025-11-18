'use client';

import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show our custom install prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember the dismissal for 7 days
    localStorage.setItem('pwa-prompt-dismissed', Date.now() + 7 * 24 * 60 * 60 * 1000);
  };

  useEffect(() => {
    // Check if user dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed && Date.now() < parseInt(dismissed)) {
      setShowPrompt(false);
    }
  }, []);

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-purple-900 to-pink-900 border-3 border-yellow-500 rounded-lg p-6 shadow-2xl z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white hover:text-gray-300 text-2xl font-bold leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>

      <div className="flex items-start gap-4">
        <div className="text-5xl">📱</div>
        <div className="flex-1">
          <h3 className="text-xl font-black text-white mb-2">
            Install HabitQuest App
          </h3>
          <p className="text-sm text-gray-200 mb-4">
            Install the app on your device for a better experience! Access your quests offline, get notifications, and more.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg shadow-lg transition-all hover:scale-105"
            >
              Install Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
            >
              Later
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
