import Image from 'next/image';
import Link from 'next/link';

// Painterly by design: this is the one place the spec calls for the
// evolution-stage art style outside the companion system itself.
export default function NotFound() {
  return (
    <div className="kidquest min-h-screen bg-cream flex items-center justify-center p-8">
      <div className="text-center max-w-md kq-card p-8">
        <Image
          src="/images/companions/wyrm.png"
          alt="Procrastination Wyrm, a shadowy serpent"
          width={220}
          height={220}
          loading="lazy"
          className="mx-auto mb-6 w-40 h-auto object-contain"
        />
        <h1 className="kq-display text-4xl mb-4 text-coral">Page Not Found</h1>
        <p className="text-xl text-navy/70 mb-6">
          The Procrastination Wyrm got here first and ate this page.
        </p>
        <p className="text-hero-blue mb-8">
          No rush, no guilt. Let&apos;s get you back on the trail.
        </p>
        <Link href="/dashboard" className="kq-btn kq-btn-gold px-8 py-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
