'use client';

import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useState, useRef, useEffect } from 'react';

export default function QuestCompleteButton({
  onComplete,
  disabled = false,
  questTitle = "Quest",
  xpReward = 25
}) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Preload audio
    audioRef.current = new Audio('/sounds/quest-complete.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const triggerHapticFeedback = () => {
    // Haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]); // Pattern: vibrate-pause-vibrate
    }
  };

  const triggerConfetti = () => {
    // Confetti burst from button position
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#FFC83D', '#FFB300', '#FF7B6B', '#57D7F5', '#5FD9A0']
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // Multiple bursts for dramatic effect
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const playCompletionSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        // User hasn't interacted with page yet, audio autoplay blocked
        console.log('Audio play failed:', err);
      });
    }
  };

  const handleClick = () => {
    if (disabled || isCompleted) return;

    // Trigger all feedback mechanisms
    triggerHapticFeedback();
    triggerConfetti();
    playCompletionSound();

    // Visual state change
    setIsCompleted(true);

    // Call parent callback
    onComplete();

    // Reset after animation
    setTimeout(() => {
      setIsCompleted(false);
    }, 3000);
  };

  return (
    <div className="relative inline-block">
      <motion.button
        onClick={handleClick}
        disabled={disabled || isCompleted}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        className={`
          quest-complete-button
          relative
          px-8 py-4
          font-black text-lg
          rounded-candy
          border-2
          transition-all duration-100
          ${isCompleted
            ? 'bg-emerald border-emerald text-white'
            : 'bg-gradient-to-b from-gold to-[#FFB300] border-navy/20 text-navy'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          boxShadow: isPressed
            ? '0 2px 0 #243B5A, 0 4px 8px rgba(36, 59, 90, 0.25)'
            : '0 6px 0 #243B5A, 0 8px 16px rgba(36, 59, 90, 0.3)',
          transform: isPressed ? 'translateY(4px)' : 'translateY(0)',
          textShadow: '1px 1px 0 rgba(0,0,0,0.06)',
        }}
        whileHover={!disabled && !isCompleted ? {
          scale: 1.05,
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17
          }
        } : {}}
        whileTap={!disabled && !isCompleted ? {
          scale: 0.85,
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17
          }
        } : {}}
        initial={false}
        animate={{
          scale: isCompleted ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut"
        }}
      >
        {isCompleted ? (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 17
            }}
            className="flex items-center gap-2"
          >
            <span className="text-2xl">✓</span>
            Quest Complete!
          </motion.span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            Complete Quest
            {xpReward && (
              <span className="ml-2 bg-navy text-gold px-2 py-1 rounded-full text-sm font-bold">
                +{xpReward} XP
              </span>
            )}
          </span>
        )}
      </motion.button>

      {/* Completion celebration text */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
        >
          <div className="bg-navy text-gold px-4 py-2 rounded-candy border-2 border-gold font-bold text-sm shadow-candy">
            🎉 +{xpReward} XP Earned!
          </div>
        </motion.div>
      )}
    </div>
  );
}
