'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentStatusContent() {
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Payment Status</h1>
        <p>Loading...</p>
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  );
}
