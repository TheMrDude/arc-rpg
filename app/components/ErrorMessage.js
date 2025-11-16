'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/**
 * ERROR MESSAGE COMPONENTS
 *
 * User-friendly error displays with actionable messaging.
 */

/**
 * Error types and their styling
 */
const ERROR_STYLES = {
  error: {
    bg: 'from-red-900/20 to-red-800/20',
    border: 'border-red-500',
    icon: '❌',
    iconBg: 'bg-red-500/20',
    text: 'text-red-400'
  },
  warning: {
    bg: 'from-yellow-900/20 to-yellow-800/20',
    border: 'border-yellow-500',
    icon: '⚠️',
    iconBg: 'bg-yellow-500/20',
    text: 'text-yellow-400'
  },
  info: {
    bg: 'from-blue-900/20 to-blue-800/20',
    border: 'border-blue-500',
    icon: 'ℹ️',
    iconBg: 'bg-blue-500/20',
    text: 'text-blue-400'
  },
  success: {
    bg: 'from-green-900/20 to-green-800/20',
    border: 'border-green-500',
    icon: '✅',
    iconBg: 'bg-green-500/20',
    text: 'text-green-400'
  }
};

/**
 * Inline error message
 */
export default function ErrorMessage({
  type = 'error',
  title,
  message,
  action,
  actionLabel = 'Try Again',
  onClose,
  dismissible = true,
  className = ''
}) {
  const style = ERROR_STYLES[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`bg-gradient-to-br ${style.bg} border-2 ${style.border} rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${style.iconBg} flex items-center justify-center text-xl`}>
          {style.icon}
        </div>

        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-bold ${style.text} mb-1`}>{title}</h3>
          )}
          <p className="text-gray-300 text-sm">{message}</p>

          {action && (
            <button
              onClick={action}
              className={`mt-3 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' :
                type === 'success' ? 'bg-green-500 hover:bg-green-600' :
                'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {actionLabel}
            </button>
          )}
        </div>

        {dismissible && onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Toast notification that auto-dismisses
 */
export function Toast({
  type = 'info',
  message,
  duration = 3000,
  onDismiss
}) {
  const [isVisible, setIsVisible] = useState(true);
  const style = ERROR_STYLES[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className="fixed top-4 left-1/2 z-50 min-w-[300px] max-w-md"
        >
          <div className={`bg-gradient-to-br ${style.bg} border-2 ${style.border} rounded-lg px-4 py-3 shadow-2xl flex items-center gap-3`}>
            <span className="text-xl">{style.icon}</span>
            <p className="text-white text-sm font-medium flex-1">{message}</p>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Full-page error state
 * Use for critical errors or 404s
 */
export function ErrorPage({
  code = '500',
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again.',
  action,
  actionLabel = 'Go Home'
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="text-9xl font-black text-red-500 mb-4 opacity-50">{code}</div>
        <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
        <p className="text-gray-300 mb-8">{message}</p>

        {action && (
          <button
            onClick={action}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </motion.div>
    </div>
  );
}

/**
 * API Error Parser
 * Converts API errors into user-friendly messages
 */
export function parseApiError(error) {
  // Handle different error types
  if (error.response) {
    // HTTP error response
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return data.error || 'Invalid request. Please check your input.';
      case 401:
        return 'You need to be logged in to do that.';
      case 403:
        return 'You don\'t have permission to do that.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please slow down and try again.';
      case 500:
        return 'Server error. Our team has been notified.';
      default:
        return data.error || data.message || 'An unexpected error occurred.';
    }
  }

  if (error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
