'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BADGES_ENABLED } from '@/lib/badges';
import GlobalFooter from '@/app/components/GlobalFooter';

// Wallet libraries (wagmi/viem) load ONLY here, client-side, and never touch
// the core app. When the feature flag is off, this chunk is never imported.
const BadgesClient = dynamic(() => import('./BadgesClient'), {
  ssr: false,
  loading: () => (
    <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
      <div className="text-hero-blue text-2xl font-black kq-display">
        ⏳ Loading badges...
      </div>
    </div>
  ),
});

export default function BadgesPage() {
  if (!BADGES_ENABLED) {
    return (
      <div className="kidquest min-h-screen bg-cream text-navy flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center kq-card p-8">
            <div className="text-6xl mb-4">🛡️</div>
            <h1 className="text-3xl font-black text-gold mb-3 kq-display">
              Legendary Badges
            </h1>
            <p className="text-navy/60 leading-relaxed mb-6">
              Permanent trophies for real milestones are on the way. Keep earning — your
              badges will be here waiting.
            </p>
            <Link
              href="/dashboard"
              className="kq-btn kq-btn-blue inline-block"
            >
              ← Back to your quest
            </Link>
          </div>
        </div>
        <GlobalFooter />
      </div>
    );
  }

  return <BadgesClient />;
}
