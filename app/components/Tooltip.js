'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TOOLTIP COMPONENT
 *
 * Provides helpful hints and explanations for features throughout the app.
 *
 * Usage:
 * <Tooltip content="This is a helpful tip!">
 *   <button>Hover me</button>
 * </Tooltip>
 */

export default function Tooltip({
  children,
  content,
  position = 'top', // top, bottom, left, right
  delay = 300, // ms delay before showing
  disabled = false
}) {
  const [isVisible, setIsVisible] = useState(false);
  let timeoutId;

  if (disabled || !content) {
    return <>{children}</>;
  }

  const handleMouseEnter = () => {
    timeoutId = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900'
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
          >
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-normal">
              {content}
              <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * INFO ICON WITH TOOLTIP
 *
 * A question mark icon that shows a tooltip on hover.
 * Perfect for inline help text.
 */
export function InfoTooltip({ content, className = '' }) {
  return (
    <Tooltip content={content}>
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-gray-300 text-xs cursor-help hover:bg-gray-600 transition-colors ${className}`}>
        ?
      </span>
    </Tooltip>
  );
}
