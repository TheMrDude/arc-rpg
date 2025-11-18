'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';
import { trackLead, trackEmailCaptured } from '@/lib/facebook-pixel';

interface EmailCaptureProps {
  source: string; // 'footer', 'pricing_exit', 'feature_announcement', etc.
  title?: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
  tags?: string[];
  inline?: boolean; // true = inline form, false = centered card
  onSuccess?: () => void;
}

export default function EmailCapture({
  source,
  title = '🚀 Stay Updated',
  description = 'Get notified when we launch new features, power-ups, and epic updates.',
  placeholder = 'your.email@example.com',
  buttonText = 'Notify Me',
  tags = [],
  inline = false,
  onSuccess
}: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const res = await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          tags
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to subscribe');
      }

      setStatus('success');
      setEmail('');

      trackEvent('email_captured', {
        source,
        tags: tags.join(',')
      });

      // Facebook Pixel tracking
      trackLead();
      trackEmailCaptured(source);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerClass = inline
    ? ''
    : 'bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-3 border-[#00D4FF] rounded-xl p-6 shadow-lg';

  return (
    <div className={containerClass}>
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-2xl font-black text-[#10B981] mb-2">
              You're On The List!
            </h3>
            <p className="text-gray-300">
              We'll notify you about new features and epic updates.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Title */}
            <h3 className="text-xl sm:text-2xl font-black text-[#00D4FF] mb-2">
              {title}
            </h3>

            {/* Description */}
            <p className="text-sm sm:text-base text-gray-300 mb-4">
              {description}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholder}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-[#0F3460] text-white placeholder-gray-400 border-2 border-[#00D4FF] rounded-lg focus:outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[#FF6B4A]/20 transition-all disabled:opacity-50"
                style={{ fontSize: '16px' }} // Prevent iOS zoom
              />

              <motion.button
                type="submit"
                disabled={loading || !email}
                whileHover={!loading && email ? { scale: 1.02 } : {}}
                whileTap={!loading && email ? { scale: 0.98 } : {}}
                className={`px-6 py-3 rounded-lg font-black uppercase tracking-wide transition-all ${
                  loading || !email
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-[#FF6B4A] hover:bg-[#FF5733] text-white shadow-lg'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Joining...
                  </span>
                ) : (
                  buttonText
                )}
              </motion.button>
            </form>

            {/* Error message */}
            {status === 'error' && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-[#E74C3C] mt-3"
              >
                {errorMessage}
              </motion.p>
            )}

            {/* Privacy note */}
            <p className="text-xs text-gray-500 mt-3">
              No spam, ever. Unsubscribe anytime. We respect your privacy.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
