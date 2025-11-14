'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface FirstTimeLoginProps {
  onComplete: () => void;
}

export default function FirstTimeLogin({ onComplete }: FirstTimeLoginProps) {
  // Auto-hide after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{
        background: 'linear-gradient(to bottom, #1e293b 0%, #0f172a 100%)',
      }}
      animate={{
        background: 'linear-gradient(to bottom, #38bdf8 0%, #60a5fa 100%)',
      }}
      transition={{
        duration: 1.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {/* Welcome message */}
      <motion.div
        className="relative z-10 text-center px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.8,
          delay: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-wide drop-shadow-lg">
          Welcome
        </h1>
        <p className="text-lg text-blue-100 font-bold drop-shadow-md">
          Your adventure begins.
        </p>
      </motion.div>

      {/* Fade out entire component */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.3,
          delay: 1.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      />
    </motion.div>
  );
}
