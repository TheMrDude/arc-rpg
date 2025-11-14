'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ConfirmEmailPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  async function handleResendEmail() {
    setResending(true);
    setMessage('');

    try {
      // Get the current session to resend confirmation
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage('Please sign up again to receive a confirmation email.');
        return;
      }

      // Resend confirmation email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;

      setMessage('Confirmation email sent! Please check your inbox.');
    } catch (error) {
      setMessage(error.message || 'Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-8 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-[#00D4FF]/20 rounded-full flex items-center justify-center border-3 border-[#00D4FF]">
              <svg
                className="w-10 h-10 text-[#00D4FF]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-black text-[#FF6B6B] mb-4 uppercase tracking-wide">
            Check Your Email
          </h1>

          <p className="text-white mb-2 font-bold">
            We've sent you a confirmation email
          </p>

          <p className="text-[#00D4FF] mb-6 text-sm">
            Click the link in the email to verify your account and complete your registration.
          </p>

          <div className="bg-[#0F3460] border-2 border-[#00D4FF]/30 rounded-lg p-4 mb-6 text-left">
            <p className="text-white text-sm font-bold mb-2">Next Steps:</p>
            <ol className="text-[#E2E8F0] text-sm space-y-1 list-decimal list-inside">
              <li>Check your email inbox</li>
              <li>Click the confirmation link</li>
              <li>Return here to log in</li>
            </ol>
          </div>

          {message && (
            <div className={`${
              message.includes('sent') || message.includes('check')
                ? 'bg-green-900/30 border-green-500'
                : 'bg-red-900/30 border-red-500'
            } border-3 rounded-lg p-3 mb-4`}>
              <p className={`${
                message.includes('sent') || message.includes('check')
                  ? 'text-green-300'
                  : 'text-red-300'
              } text-sm font-bold`}>
                {message}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full py-3 bg-[#00D4FF] hover:bg-[#00B8E6] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide transition-all duration-100 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : 'Resend Email'}
            </button>

            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 bg-transparent hover:bg-[#0F3460] text-[#00D4FF] border-3 border-[#00D4FF] rounded-lg font-black uppercase tracking-wide transition-all"
            >
              Back to Login
            </button>
          </div>

          <p className="text-[#E2E8F0] text-sm mt-6">
            Didn't receive an email? Check your spam folder or click "Resend Email" above.
          </p>
        </div>
      </div>
    </div>
  );
}
