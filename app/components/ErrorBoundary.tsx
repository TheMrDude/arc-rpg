'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // TODO: Send error to logging service (Sentry, LogRocket, etc.)
    // if (typeof window !== 'undefined') {
    //   window.Sentry?.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full bg-[#1A1A2E] border-4 border-[#FF6B6B] rounded-2xl p-8 text-center shadow-2xl"
          >
            {/* Icon */}
            <div className="text-8xl mb-6">💥</div>

            {/* Title */}
            <h1 className="text-4xl font-black text-[#FF6B6B] uppercase tracking-wide mb-4">
              Quest Failed!
            </h1>

            {/* Message */}
            <p className="text-xl text-white mb-6">
              Something went wrong on your adventure.
            </p>

            <p className="text-gray-400 mb-8">
              Don't worry, brave hero! This happens sometimes. Let's get you back on track.
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-[#00D4FF] hover:text-[#00B8E6] font-bold mb-2">
                  🔍 Developer Info (click to expand)
                </summary>
                <div className="bg-[#0F3460] border-2 border-[#00D4FF] rounded-lg p-4 overflow-auto max-h-64">
                  <p className="text-red-400 font-mono text-sm mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-gray-300 overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-8 py-4 bg-gradient-to-r from-[#FF6B4A] to-[#FF5733] hover:from-[#FF5733] hover:to-[#E74C3C] text-white border-3 border-[#0F3460] rounded-xl font-black text-lg uppercase tracking-wide shadow-lg transition-all"
              >
                ⚔️ Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="px-8 py-4 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#1A1A2E] border-3 border-[#0F3460] rounded-xl font-black text-lg uppercase tracking-wide shadow-lg transition-all"
              >
                🏠 Return Home
              </button>
            </div>

            {/* Help text */}
            <p className="text-sm text-gray-500 mt-6">
              If this keeps happening, try refreshing the page or contact support.
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier usage
export default function ErrorBoundaryWrapper({
  children,
  fallback
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
