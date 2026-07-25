import LandingPageClient from './LandingPageClient';

// The landing page itself is a client component (interactive demo, audience
// toggle), and client components cannot export `metadata`. This thin server
// wrapper exists solely so the homepage can declare its own canonical and
// og:url, now that the root layout no longer sets a site-wide one.
// Only `alternates` here. Next replaces a metadata field wholesale rather than
// deep-merging it, so declaring a partial `openGraph` would drop the root
// layout's og:image and siteName. The homepage inherits the root openGraph
// (which is the homepage's own), including its og:url.
export const metadata = {
  alternates: { canonical: '/' },
};

export default function Page() {
  return <LandingPageClient />;
}
