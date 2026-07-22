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
    <div className="min-h-screen bg-[#0F1424] flex items-center justify-center">
      <div className="text-[#00D4FF] text-2xl font-black" style={{ fontFamily: 'VT323, monospace' }}>
        ⏳ LOADING BADGES...
      </div>
    </div>
  ),
});

export default function BadgesPage() {
  if (!BADGES_ENABLED) {
    return (
      <div className="min-h-screen bg-[#0F1424] text-white flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="text-6xl mb-4">🛡️</div>
            <h1
              className="text-3xl font-black text-[#FFD93D] mb-3"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              LEGENDARY BADGES
            </h1>
            <p className="text-gray-300 leading-relaxed mb-6">
              Permanent trophies for real milestones are on the way. Keep earning — your
              badges will be here waiting.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-[#00D4FF] text-[#0F1424] font-black px-6 py-3 rounded-lg hover:opacity-90"
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
