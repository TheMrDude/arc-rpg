'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, capturePageview } from '@/lib/posthog';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize PostHog on mount
    initPostHog();
  }, []);

  useEffect(() => {
    // Track pageviews on route change
    if (pathname) {
      capturePageview();
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
