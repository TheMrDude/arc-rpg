'use client';

import Link from 'next/link';

interface GlobalFooterProps {
  className?: string;
}

export default function GlobalFooter({ className = '' }: GlobalFooterProps) {
  return (
    <footer className={`mt-auto py-8 px-4 border-t border-stone ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Sitewide footer nav (from the SEO work) — keeps /blog reachable from
            every page. Restyled for the current cream/navy theme; the original
            gray-400 / amber-400 classes were for the previous dark design. */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-bold mb-4">
          <Link href="/blog" className="text-navy/60 hover:text-hero-blue transition-colors">Blog</Link>
          <Link href="/pricing" className="text-navy/60 hover:text-hero-blue transition-colors">Pricing</Link>
          <Link href="/privacy" className="text-navy/60 hover:text-hero-blue transition-colors">Privacy</Link>
          <Link href="/terms" className="text-navy/60 hover:text-hero-blue transition-colors">Terms</Link>
        </nav>
        <div className="text-center text-navy/50 text-sm font-bold">
          <p>&copy; 2025-2026 HabitQuest. Turn real habits into an epic adventure.</p>
        </div>
      </div>
    </footer>
  );
}
