'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState('verifying');
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      try {
        setDetails(null);

        const response = await fetch('/api/verify-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!isMounted) {
          return;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setStatus(data?.status ?? 'error');
          setDetails(data);
          return;
        }

        setStatus(data?.status ?? 'error');
        setDetails(data);
      } catch (error) {
        console.error('Payment verification error:', error);
        if (isMounted) {
          setStatus('error');
          setDetails(null);
        }
      }
    }

    if (sessionId) {
      verify();
    } else {
      setStatus('error');
      setDetails(null);
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
      {status === 'wrong_product' && (
        <div className="space-y-2">
          <p>
            We detected a paid session, but it wasn’t for the Founder lifetime plan.
            Please confirm you used the Founder checkout link.
          </p>
          {details?.observed && (
            <div className="text-sm text-muted-foreground">
              <p>Observed plan: {details.observed.plan ?? 'unknown'}</p>
              <p>Observed transaction: {details.observed.transaction_type ?? 'unknown'}</p>
              <p>
                Observed amount: $
                {(details.observed.amount ?? 0) / 100} {details.observed.currency?.toUpperCase?.() ?? ''}
              </p>
            </div>
          )}
        </div>
      )}
      {status === 'error' && <p>We couldn’t verify your payment. Please contact support.</p>}
    </div>
  );
}
