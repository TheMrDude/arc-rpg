'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration);
          })
          .catch((error) => {
            console.log('SW registration failed:', error);
          });
      });
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show install prompt after 30 seconds or on second visit
      const visitCount = parseInt(localStorage.getItem('visitCount') || '0') + 1;
      localStorage.setItem('visitCount', visitCount.toString());

      const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');

      if (!hasSeenPrompt && visitCount >= 2) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 30000); // Show after 30 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showInstallPrompt && (
        <motion.div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 500 }}
        >
          <div className="bg-gradient-to-r from-[#1A1A2E] to-[#0F3460] border-3 border-[#FF6B6B] rounded-lg p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="text-4xl">📱</span>
              <div className="flex-1">
                <h3 className="text-[#FFD93D] font-black uppercase text-sm mb-1">
                  Install ARC RPG
                </h3>
                <p className="text-[#E2E8F0] text-xs mb-3">
                  Install our app for quick access, offline support, and a better experience!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 px-4 py-2 bg-[#FF6B6B] hover:bg-[#FF5252] text-white border-2 border-[#0F3460] rounded font-black uppercase text-xs tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 bg-[#0F3460] hover:bg-[#16213e] text-[#E2E8F0] border-2 border-[#1A1A2E] rounded font-bold uppercase text-xs tracking-wide transition-all"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-[#E2E8F0] hover:text-white text-xl leading-none"
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
