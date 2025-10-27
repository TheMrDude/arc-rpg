'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 10;
    let retryTimeout;
    let cancelled = false;

    const scheduleRetry = (baseMessage) => {
      pollCount += 1;

      if (pollCount < maxPolls) {
        setStatus('verifying');
        setMessage(`${baseMessage} (${pollCount}/${maxPolls})`);
        retryTimeout = setTimeout(() => {
          verifyWithServer();
        }, 2000);
      } else {
        setStatus('error');
        setMessage(
          "Payment processing is taking longer than expected. Your upgrade will be activated shortly. If you don't see it in 5 minutes, contact support with session ID: " +
            sessionId
        );
      }
    };

    async function verifyWithServer() {
      if (cancelled) return;

      if (!sessionId) {
        setStatus('error');
        setMessage('No payment session found.');
        return;
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          setStatus('error');
          setMessage('Please log in to complete your upgrade.');
          return;
        }

        const response = await fetch('/api/verify-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        if (cancelled) return;

        if (response.status === 401) {
          setStatus('error');
          setMessage('Please log in to complete your upgrade.');
          return;
        }

        if (response.status === 403) {
          setStatus('error');
          setMessage('This payment session belongs to a different account. Please contact support with session ID: ' + sessionId);
          return;
        }

        if (response.status === 404) {
          setStatus('error');
          setMessage('We could not find this payment session. Please contact support with session ID: ' + sessionId);
          return;
        }

        if (!response.ok) {
          console.error('Payment verification failed with status:', response.status);
          scheduleRetry('Still waiting for Stripe to confirm your payment...');
          return;
        }

        const result = await response.json();

        if (result.status === 'activated') {
          setStatus('success');
          setMessage('🎉 Welcome, Founder! You now have lifetime access.');
          return;
        }

        if (result.status === 'processing') {
          scheduleRetry('Payment received! Processing your upgrade...');
          return;
        }

        if (result.status === 'pending') {
          scheduleRetry('Waiting for Stripe to confirm your payment...');
          return;
        }

        if (result.status === 'wrong_product') {
          setStatus('error');
          setMessage(
            'This payment session is for a different product. Please make sure you completed the Founder checkout or contact support with session ID: ' +
              sessionId
          );
          return;
        }

        if (result.status === 'session_mismatch') {
          setStatus('error');
          setMessage('This payment session is associated with another account. Please contact support with session ID: ' + sessionId);
          return;
        }

        setStatus('error');
        setMessage('Unexpected verification response. Please contact support with session ID: ' + sessionId);
      } catch (error) {
        console.error('Payment verification error:', error);
        if (cancelled) return;
        scheduleRetry('Still waiting for Stripe to confirm your payment...');
      }
    }

    verifyWithServer();

    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-gray-800/50 border border-gray-700 rounded-2xl p-8 backdrop-blur-sm text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-500 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold mb-2">Verifying Payment</h1>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold mb-4">You're a Founder!</h1>
            <p className="text-gray-300 mb-2">{message}</p>
            <p className="text-sm text-gray-400 mb-8">
              You're one of the first 25 people with lifetime access to everything.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-semibold transition"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-6">⚠️</div>
            <h1 className="text-3xl font-bold mb-4">Something Went Wrong</h1>
            <p className="text-gray-300 mb-8">{message}</p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition mb-3"
            >
              Back to Pricing
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-500"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
