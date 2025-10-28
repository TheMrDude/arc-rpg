'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await fetch('/api/verify-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        setStatus(data.status || 'error');
      } catch {
        setStatus('error');
      }
    })();
 codex/identify-security-risks-and-payment-issues-0brtde
    if (!sessionId) return;
    (async () => {
      try {
        const res = await fetch('/api/verify-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        setStatus(data.status || 'error');
      } catch {
        setStatus('error');
      }
    })();

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
 main
  }, [sessionId]);

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Payment Status</h1>
      {status === 'verifying' && <p>Verifying your payment...</p>}
      {status === 'active' && <p>✅ Your premium access is active!</p>}
      {status === 'pending' && <p>⏳ Payment pending, will upgrade soon.</p>}
      {status === 'error' && <p>❌ Could not verify your payment. Please contact support.</p>}
    </div>
  );
}
