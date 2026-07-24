'use client';

import Link from 'next/link';

interface GlobalFooterProps {
  className?: string;
}

export default function GlobalFooter({ className = '' }: GlobalFooterProps) {
  return (
    <footer className={`mt-auto py-8 px-4 border-t border-gray-700/50 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400 mb-4">
          <Link href="/blog" className="hover:text-amber-400 transition-colors">Blog</Link>
          <Link href="/pricing" className="hover:text-amber-400 transition-colors">Pricing</Link>
          <Link href="/privacy" className="hover:text-amber-400 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-amber-400 transition-colors">Terms</Link>
        </nav>
        <div className="text-center text-gray-400 text-sm">
          <p>&copy; 2025-2026 HabitQuest. Transform your life, one epic quest at a time.</p>
        </div>
      </div>
    </footer>
  );
}
