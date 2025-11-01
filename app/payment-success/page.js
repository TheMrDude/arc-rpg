'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PaymentSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
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
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center p-8">
      <div className="max-w-xl w-full bg-[#1A1A2E] border-[3px] border-[#FFD93D] rounded-lg p-8 shadow-[0_0_30px_rgba(255,217,61,0.5)] text-center">
        <h1 className="text-4xl font-black mb-6 uppercase tracking-wide text-[#FFD93D]">Payment Status</h1>

        {status === 'verifying' && (
          <div>
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-[#00D4FF] text-xl font-bold">Verifying your payment...</p>
          </div>
        )}

        {status === 'active' && (
          <div>
            <div className="text-6xl mb-4">✅</div>
            <p className="text-[#48BB78] text-2xl font-black mb-4 uppercase tracking-wide">Your Premium Access is Active!</p>
            <p className="text-[#E2E8F0] mb-6 font-bold">Welcome to the Founder's Club!</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-[3px] border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'pending' && (
          <div>
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-[#FFD93D] text-xl font-black mb-2 uppercase tracking-wide">Payment Pending</p>
            <p className="text-[#E2E8F0] font-bold">We'll upgrade your account shortly!</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="text-6xl mb-4">❌</div>
            <p className="text-[#FF6B6B] text-xl font-black mb-4 uppercase tracking-wide">Could Not Verify Payment</p>
            <p className="text-[#E2E8F0] mb-6 font-bold">Please contact support if you were charged.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#1A1A2E] border-[3px] border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
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
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-[#1A1A2E] border-[3px] border-[#FFD93D] rounded-lg p-8 shadow-[0_0_30px_rgba(255,217,61,0.5)] text-center">
          <h1 className="text-4xl font-black mb-6 uppercase tracking-wide text-[#FFD93D]">Payment Status</h1>
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-[#00D4FF] text-xl font-bold">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
