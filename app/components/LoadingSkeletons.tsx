'use client';

import { motion } from 'framer-motion';

// Stats Bar Loading Skeleton
export function StatsBarSkeleton() {
  return (
    <div className="bg-gradient-to-r from-[#7C3AED] to-[#FF5733] py-3 px-4 text-center">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded animate-pulse" />
          <div className="w-32 h-4 bg-white/20 rounded animate-pulse" />
        </div>
        <span className="text-white/50">•</span>
        <div className="w-40 h-4 bg-white/20 rounded animate-pulse" />
        <span className="text-white/50">•</span>
        <div className="w-48 h-4 bg-white/20 rounded animate-pulse" />
      </div>
    </div>
  );
}

// Quest Preview Loading Skeleton
export function QuestPreviewSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Input skeleton */}
      <div className="relative">
        <div className="w-full h-16 bg-[#16213E]/50 border-3 border-[#00D4FF]/30 rounded-xl animate-pulse" />
      </div>

      {/* Button skeleton */}
      <div className="w-full h-16 bg-gray-600/50 rounded-xl animate-pulse" />

      {/* Hint skeleton */}
      <div className="flex justify-center gap-4">
        <div className="w-24 h-4 bg-gray-500/30 rounded animate-pulse" />
        <div className="w-24 h-4 bg-gray-500/30 rounded animate-pulse" />
        <div className="w-32 h-4 bg-gray-500/30 rounded animate-pulse" />
      </div>
    </div>
  );
}

// Archetype Card Skeleton
export function ArchetypeCardSkeleton() {
  return (
    <div className="bg-[#16213E] border-3 border-[#00D4FF]/30 rounded-xl p-4 animate-pulse">
      <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden bg-[#0F3460]" />
      <div className="h-6 bg-[#0F3460] rounded mb-2" />
      <div className="h-4 bg-[#0F3460]/50 rounded w-3/4 mx-auto" />
    </div>
  );
}

// Generic Card Skeleton
export function CardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#16213E] border-2 border-[#00D4FF]/30 rounded-xl p-6 animate-pulse"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-[#0F3460] rounded w-32" />
        <div className="h-6 bg-[#0F3460] rounded w-16" />
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-[#0F3460] rounded w-full" />
        <div className="h-4 bg-[#0F3460] rounded w-5/6" />
        <div className="h-4 bg-[#0F3460] rounded w-4/6" />
      </div>
    </motion.div>
  );
}

// Spinner Component
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizeClasses[size]} border-4 border-[#00D4FF] border-t-transparent rounded-full`}
    />
  );
}

// Pulse Dot (for "typing" indicators)
export function PulseDots() {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2
          }}
          className="w-2 h-2 bg-[#00D4FF] rounded-full"
        />
      ))}
    </div>
  );
}

// Shimmer Effect (for images loading)
export function ShimmerEffect({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#0F3460] ${className}`}>
      <motion.div
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
    </div>
  );
}
