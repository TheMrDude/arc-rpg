'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';

function PaymentSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState('verifying');
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        // Get auth token from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.error('No auth token available for payment verification');
          setStatus('error');
          return;
        }

        // Call verify-checkout with authentication
        const res = await fetch('/api/verify-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        setStatus(data.status || 'error');
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('error');
      }
    })();
  }, [sessionId, supabase]);

  return (
    <div className="kidquest min-h-screen bg-cream flex items-center justify-center p-8">
      <div className="max-w-xl w-full kq-card p-8 text-center">
        <h1 className="kq-display text-4xl mb-6 text-navy">Payment Status</h1>

        {status === 'verifying' && (
          <div>
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-hero-blue text-xl font-bold">Verifying your payment...</p>
          </div>
        )}

        {status === 'active' && (
          <div>
            <div className="text-6xl mb-4">✅</div>
            <p className="text-emerald text-2xl font-bold mb-4">Your Premium Access is Active!</p>
            <p className="text-navy/70 mb-6 font-bold">Welcome to HabitQuest Pro!</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="kq-btn kq-btn-gold"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'pending' && (
          <div>
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gold text-xl font-bold mb-2">Payment Pending</p>
            <p className="text-navy/70 font-bold">We'll upgrade your account shortly!</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="text-6xl mb-4">❌</div>
            <p className="text-coral text-xl font-bold mb-4">Could Not Verify Payment</p>
            <p className="text-navy/70 mb-6 font-bold">Please contact support if you were charged.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="kq-btn kq-btn-blue"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center p-8">
        <div className="max-w-xl w-full kq-card p-8 text-center">
          <h1 className="kq-display text-4xl mb-6 text-navy">Payment Status</h1>
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-hero-blue text-xl font-bold">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
