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
        <div className="min-h-screen bg-cream flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full kq-card border-2 border-coral rounded-candy p-8 text-center shadow-candy-lg"
          >
            {/* Icon */}
            <div className="text-8xl mb-6">💥</div>

            {/* Title */}
            <h1 className="kq-display text-4xl font-black text-coral mb-4">
              Oops, that didn't work!
            </h1>

            {/* Message */}
            <p className="text-xl text-navy mb-6">
              Something went wrong along the way.
            </p>

            <p className="text-navy/60 mb-8">
              Don't worry, this happens sometimes. Let's get you back on track.
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-hero-blue hover:text-hero-blue/80 font-bold mb-2">
                  🔍 Developer Info (click to expand)
                </summary>
                <div className="bg-cream border-2 border-hero-blue rounded-lg p-4 overflow-auto max-h-64">
                  <p className="text-coral font-mono text-sm mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-navy/60 overflow-auto">
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
                className="kq-btn kq-btn-gold"
              >
                🔄 Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="kq-btn kq-btn-blue"
              >
                🏠 Return Home
              </button>
            </div>

            {/* Help text */}
            <p className="text-sm text-navy/50 mt-6">
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
