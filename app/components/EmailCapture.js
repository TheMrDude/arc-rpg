'use client';

import { useState } from 'react';

/**
 * @typedef {Object} EmailCaptureProps
 * @property {string} [source]
 * @property {'inline' | 'banner'} [variant]
 */

/** @param {EmailCaptureProps} props */
export default function EmailCapture({ source = 'blog', variant = 'inline' }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      setState('error');
      return;
    }

    setIsLoading(true);
    setState('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrorMessage('You are already subscribed!');
          setState('error');
        } else if (response.status === 429) {
          setErrorMessage('Too many requests. Please try again in a minute.');
          setState('error');
        } else {
          setErrorMessage(data.message || 'Something went wrong. Please try again.');
          setState('error');
        }
        return;
      }

      setState('success');
      setEmail('');
      setErrorMessage('');
      setTimeout(() => { setState('idle'); }, 4000);
    } catch (error) {
      console.error('Subscription error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setState('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'banner') {
    return <BannerVariant email={email} setEmail={setEmail} state={state} isLoading={isLoading} errorMessage={errorMessage} onSubmit={handleSubmit} />;
  }

  return <InlineVariant email={email} setEmail={setEmail} state={state} isLoading={isLoading} errorMessage={errorMessage} onSubmit={handleSubmit} />;
}

function InlineVariant({ email, setEmail, state, isLoading, errorMessage, onSubmit }) {
  return (
    <div className="w-full py-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={isLoading || state === 'success'}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Email address"
          />
          <button
            type="submit"
            disabled={isLoading || state === 'success'}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoading && 'Subscribing...'}
            {!isLoading && state === 'success' && 'Subscribed!'}
            {!isLoading && state !== 'success' && 'Subscribe'}
          </button>
        </div>

        {state === 'success' && (
          <div className="text-green-400 text-sm font-medium animate-pulse">
            You're in! Check your inbox.
          </div>
        )}

        {state === 'error' && errorMessage && (
          <div className="text-red-400 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <p className="text-slate-400 text-xs">
          No spam. <button type="button" className="text-amber-400 hover:text-amber-300 underline">Unsubscribe</button> anytime.
        </p>
      </form>
    </div>
  );
}

function BannerVariant({ email, setEmail, state, isLoading, errorMessage, onSubmit }) {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 opacity-5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-600 opacity-5 rounded-full blur-3xl" />

        <div className="relative z-10 p-8 sm:p-12">
          <div className="max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
              Join the Quest
            </h3>

            <p className="text-slate-300 mb-6 leading-relaxed">
              Get weekly habit science, productivity tactics, and exclusive HabitQuest updates. Become part of a community leveling up their life.
            </p>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isLoading || state === 'success'}
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  aria-label="Email address"
                />
                <button
                  type="submit"
                  disabled={isLoading || state === 'success'}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-base shadow-lg hover:shadow-amber-500/50"
                >
                  {isLoading && 'Subscribing...'}
                  {!isLoading && state === 'success' && 'Subscribed!'}
                  {!isLoading && state !== 'success' && 'Join Now'}
                </button>
              </div>

              {state === 'success' && (
                <div className="p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg text-green-300 text-sm font-medium animate-pulse">
                  You're in! Check your inbox.
                </div>
              )}

              {state === 'error' && errorMessage && (
                <div className="p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg text-red-300 text-sm font-medium">
                  {errorMessage}
                </div>
              )}

              <p className="text-slate-400 text-sm">
                No spam. <button type="button" className="text-amber-400 hover:text-amber-300 underline">Unsubscribe</button> anytime.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
