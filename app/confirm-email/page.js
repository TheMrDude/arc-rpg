'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { CAST } from '@/lib/cast';

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
    <div className="kidquest min-h-screen bg-gradient-to-br from-cream via-cream to-aqua/10 flex items-center justify-center p-8">
      <div className="max-w-md w-full kq-card p-8">
        <div className="text-center">
          <div className="mb-6">
            <Image
              src={CAST.paper_wisp.src}
              alt={CAST.paper_wisp.alt}
              width={160}
              height={107}
              loading="lazy"
              className="mx-auto h-20 w-auto object-contain"
            />
          </div>

          <h1 className="kq-display text-3xl text-coral mb-4">
            Check Your Email
          </h1>

          <p className="text-navy mb-2 font-bold">
            We've sent you a confirmation email
          </p>

          <p className="text-hero-blue mb-6 text-sm">
            Click the link in the email to verify your account and complete your registration.
          </p>

          <div className="bg-cream border-2 border-stone rounded-candy p-4 mb-6 text-left">
            <p className="text-navy text-sm font-bold mb-2">Next Steps:</p>
            <ol className="text-navy/70 text-sm space-y-1 list-decimal list-inside">
              <li>Check your email inbox</li>
              <li>Click the confirmation link</li>
              <li>Return here to log in</li>
            </ol>
          </div>

          {message && (
            <div className={`${
              message.includes('sent') || message.includes('check')
                ? 'bg-emerald/12 border-emerald'
                : 'bg-coral/12 border-coral'
            } border-2 rounded-candy p-3 mb-4`}>
              <p className={`${
                message.includes('sent') || message.includes('check')
                  ? 'text-emerald'
                  : 'text-coral'
              } text-sm font-bold`}>
                {message}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="kq-btn kq-btn-blue w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : 'Resend Email'}
            </button>

            <button
              onClick={() => router.push('/login')}
              className="kq-btn kq-btn-ghost w-full"
            >
              Back to Login
            </button>
          </div>

          <p className="text-navy/60 text-sm mt-6">
            Didn't receive an email? Check your spam folder or click "Resend Email" above.
          </p>
        </div>
      </div>
    </div>
  );
}
