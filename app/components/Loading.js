'use client';

import { motion } from 'framer-motion';

/**
 * LOADING COMPONENTS
 *
 * Professional loading states for different contexts.
 */

/**
 * Full-page loading spinner
 * Use for initial page loads
 */
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center">
      <div className="text-center">
        <Spinner size="large" />
        <p className="mt-4 text-gray-300 text-lg">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner
 * Use for buttons or small sections
 */
export function Spinner({ size = 'medium', className = '' }) {
  const sizes = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  };

  return (
    <div className={`inline-block ${sizes[size]} border-purple-500 border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

/**
 * Skeleton loader for content placeholders
 * Use while loading lists or cards
 */
export function Skeleton({ className = '', animate = true }) {
  return (
    <div className={`bg-gray-800 rounded ${animate ? 'animate-pulse' : ''} ${className}`} />
  );
}

/**
 * Quest card skeleton
 */
export function QuestCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213e] rounded-lg p-6 border-3 border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

/**
 * Progress bar with animation
 * Use for uploads, processing, etc.
 */
export function ProgressBar({ progress, label, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between mb-2 text-sm text-gray-300">
          <span>{label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

/**
 * Loading dots animation
 * Use for "Processing..." type messages
 */
export function LoadingDots({ className = '' }) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-purple-500 rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
}

/**
 * Button loading state
 * Replaces button content while loading
 */
export function ButtonLoading({ text = 'Loading...', className = '' }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <Spinner size="small" />
      {text}
    </span>
  );
}

/**
 * Shimmer effect for loading cards
 */
export function ShimmerCard({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-gray-800 rounded-lg ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
    </div>
  );
}
