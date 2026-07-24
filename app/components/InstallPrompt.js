'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'hq_pwa_prompt_dismissed';

/**
 * Custom PWA install prompt. Only appears once the user has completed at
 * least 3 quests (never on a first visit), and never again after being
 * dismissed or after install.
 */
export default function InstallPrompt({ questsCompleted }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!deferredPrompt) return;
    if (questsCompleted < 3) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    setVisible(true);
  }, [deferredPrompt, questsCompleted]);

  const handleInstall = async () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, 'true');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50"
        >
          <div className="kq-card flex items-start gap-3 border-2 border-hero-blue/30">
            <div className="text-hero-blue mt-0.5">
              <Download size={22} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-navy mb-1">Take your quests with you</p>
              <p className="text-xs text-navy/60 mb-3">
                Add HabitQuest to your home screen so your quests are one tap away.
              </p>
              <button
                onClick={handleInstall}
                className="kq-btn kq-btn-blue text-xs"
              >
                Add to Home Screen
              </button>
            </div>
            <button onClick={handleDismiss} className="text-navy/40 hover:text-navy" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
