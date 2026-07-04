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
          <div className="bg-[#1A1A2E] border-2 border-[#00D4FF] rounded-xl p-4 shadow-[0_0_20px_rgba(0,212,255,0.3)] flex items-start gap-3">
            <div className="text-[#00D4FF] mt-0.5">
              <Download size={22} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white mb-1">Take your quests with you</p>
              <p className="text-xs text-[#94a3b8] mb-3">
                Add HabitQuest to your home screen so your quests are one tap away.
              </p>
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00BFFF] text-[#0F3460] rounded-lg font-black uppercase text-xs tracking-wide transition-all"
              >
                Add to Home Screen
              </button>
            </div>
            <button onClick={handleDismiss} className="text-[#64748b] hover:text-white" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
