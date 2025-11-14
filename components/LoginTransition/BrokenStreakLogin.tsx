'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface BrokenStreakLoginProps {
  onComplete: () => void;
}

export default function BrokenStreakLogin({ onComplete }: BrokenStreakLoginProps) {
  // Auto-hide after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Generate 12 fog particles in a radial pattern
  const fogParticles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 360) / 12; // Evenly distribute around 360 degrees
    const radians = (angle * Math.PI) / 180;
    const distance = 800; // How far particles travel

    return {
      id: i,
      x: Math.cos(radians) * distance,
      y: Math.sin(radians) * distance,
      delay: i * 0.05, // Stagger the particle animations
      size: 150 + Math.random() * 100, // Random sizes between 150-250px
    };
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{
        duration: 0.5,
        delay: 2,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {/* Fog particles dispersing radially */}
      {fogParticles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            background: 'radial-gradient(circle, rgba(156, 163, 175, 0.8) 0%, rgba(107, 114, 128, 0.4) 50%, transparent 100%)',
          }}
          initial={{
            x: 0,
            y: 0,
            scale: 1,
            filter: 'blur(40px)',
            opacity: 0.9,
          }}
          animate={{
            x: particle.x,
            y: particle.y,
            scale: 0.3,
            filter: 'blur(0px)',
            opacity: 0,
          }}
          transition={{
            duration: 2.5,
            delay: particle.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      ))}

      {/* Central fog effect that disperses */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(156, 163, 175, 0.6) 0%, transparent 70%)',
        }}
        initial={{ scale: 1, filter: 'blur(40px)', opacity: 1 }}
        animate={{ scale: 3, filter: 'blur(0px)', opacity: 0 }}
        transition={{
          duration: 2.5,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      />

      {/* Welcome back message - fades in at 1.5s */}
      <motion.div
        className="relative z-10 text-center px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 1,
          delay: 1.5,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">
          Welcome Back
        </h1>
        <p className="text-lg text-gray-200 font-bold">
          Your journey continues.
        </p>
      </motion.div>
    </motion.div>
  );
}
