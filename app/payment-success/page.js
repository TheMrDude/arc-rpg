'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      try {
        const response = await fetch('/api/verify-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setStatus('error');
          return;
        }

        const data = await response.json();
        setStatus(data.status ?? 'error');
      } catch (error) {
        console.error('Payment verification error:', error);
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    if (sessionId) {
      verify();
    } else {
      setStatus('error');
    }

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Payment</h1>
      {status === 'verifying' && <p>Verifying your purchase…</p>}
      {status === 'active' && <p>All set! Your premium access is active.</p>}
      {status === 'pending' && <p>Payment still pending. You’ll be upgraded once it clears.</p>}
      {status === 'error' && <p>We couldn’t verify your payment. Please contact support.</p>}
    </div>
  );
}
