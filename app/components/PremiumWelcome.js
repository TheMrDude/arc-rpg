'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const FEATURE_SLIDES = [
  {
    icon: '🔄',
    title: 'Recurring Quests',
    description: 'Create habits that repeat automatically - daily, weekly, or custom intervals. Build consistency without manual effort.',
    color: '#4F7DF3',
  },
  {
    icon: '📜',
    title: 'Quest Templates',
    description: 'Save a set of quests once and drop the whole routine in whenever you need it.',
    color: '#FF7B6B',
  },
  {
    icon: '📚',
    title: 'Quest Templates',
    description: 'Access 15+ professionally designed quest packs. Clone entire routines with one click.',
    color: '#FFC83D',
  },
  {
    icon: '⚔️',
    title: 'Equipment & Companions',
    description: 'Collect legendary gear and companions. Boost your XP, keep your momentum, and customize your hero.',
    color: '#3DBE7C',
  },
];

export default function PremiumWelcome({ show, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (show) {
      // Epic confetti burst on open
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
          colors: ['#FFC83D', '#FF7B6B', '#4F7DF3', '#3DBE7C'],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [show]);

  const handleNext = () => {
    if (currentSlide < FEATURE_SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!show) return null;

  const currentFeature = FEATURE_SLIDES[currentSlide];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-navy/70 backdrop-blur-md" />

        {/* Welcome Modal */}
        <motion.div
          className="relative kq-card max-w-2xl w-full overflow-hidden"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          {/* Animated background sparkles */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-4xl"
                initial={{
                  x: Math.random() * 100 + '%',
                  y: Math.random() * 100 + '%',
                }}
                animate={{
                  y: ['-10%', '110%'],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              >
                ✨
              </motion.div>
            ))}
          </div>

          {/* Header */}
          <div className="relative bg-gradient-to-r from-gold to-coral p-8 text-center">
            <motion.div
              className="text-7xl mb-4"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              ⚡
            </motion.div>
            <h1 className="kq-display text-5xl text-navy mb-2">
              Welcome, Pro Member!
            </h1>
            <p className="text-navy/80 font-bold text-lg">
              You've unlocked the full HabitQuest experience
            </p>
          </div>

          {/* Content - Feature Slides */}
          <div className="relative p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <motion.div
                  className="text-8xl mb-6"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                  style={{ filter: `drop-shadow(0 0 20px ${currentFeature.color})` }}
                >
                  {currentFeature.icon}
                </motion.div>

                <h2
                  className="kq-display text-4xl mb-4"
                  style={{ color: currentFeature.color }}
                >
                  {currentFeature.title}
                </h2>

                <p className="text-navy/80 text-xl leading-relaxed max-w-lg mx-auto">
                  {currentFeature.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress Dots */}
            <div className="flex justify-center gap-3 mt-8">
              {FEATURE_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={
                    'h-3 rounded-full transition-all ' +
                    (index === currentSlide
                      ? 'w-12 bg-gold'
                      : 'w-3 bg-navy/20 hover:bg-navy/30')
                  }
                />
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="relative p-6 border-t-2 border-stone flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="kq-btn kq-btn-ghost"
            >
              Skip Tour
            </button>

            <div className="text-sm text-navy/50 font-bold">
              {currentSlide + 1} / {FEATURE_SLIDES.length}
            </div>

            <button
              onClick={handleNext}
              className="kq-btn kq-btn-gold"
            >
              {currentSlide < FEATURE_SLIDES.length - 1 ? 'Next' : "Let's Go!"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
