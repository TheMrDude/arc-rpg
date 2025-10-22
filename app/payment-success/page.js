'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
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

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            premium_since: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Database update error:', updateError);
          setStatus('error');
          setMessage('Payment successful, but upgrade failed. Contact support.');
          return;
        }

        setStatus('success');
        setMessage('🎉 Welcome, Founder! You now have lifetime access.');

      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please contact support.');
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
