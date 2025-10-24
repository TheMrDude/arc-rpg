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
    const maxPolls = 10; // Poll for up to 20 seconds (10 * 2 seconds)

    async function verifyPayment() {
      if (!sessionId) {
        setStatus('error');
        setMessage('No payment session found.');
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setStatus('error');
          setMessage('Please log in to complete your upgrade.');
          return;
        }

        // SECURE: Check if user is premium (set by webhook, not by client)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_premium, stripe_session_id, premium_since')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          setStatus('error');
          setMessage('Failed to verify payment. Please contact support with session ID: ' + sessionId);
          return;
        }

        // Check if user is premium with matching session ID
        if (profile.is_premium && profile.stripe_session_id === sessionId) {
          setStatus('success');
          setMessage('🎉 Welcome, Founder! You now have lifetime access.');
        } else if (profile.is_premium) {
          // Already premium but different session (edge case)
          setStatus('success');
          setMessage('🎉 You already have Founder access!');
        } else {
          // Not premium yet - webhook might not have processed
          pollCount++;

          if (pollCount < maxPolls) {
            setStatus('verifying');
            setMessage('Payment received! Processing your upgrade... (' + pollCount + '/' + maxPolls + ')');

            // Poll again after 2 seconds
            setTimeout(() => {
              verifyPayment();
            }, 2000);
          } else {
            // Webhook still hasn't processed after 20 seconds
            setStatus('error');
            setMessage('Payment processing is taking longer than expected. Your upgrade will be activated shortly. If you don\'t see it in 5 minutes, contact support with session ID: ' + sessionId);
          }
        }

      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please contact support with session ID: ' + sessionId);
      }
    }

    verifyPayment();
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
