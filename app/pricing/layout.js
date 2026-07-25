// /pricing is a client component, so it cannot export `metadata` itself.
// This segment layout supplies its title/description server-side instead of
// letting the route inherit the homepage's. Canonical/JSON-LD/robots are
// untouched and still come from the root layout.
export const metadata = {
  title: 'HabitQuest Pricing — Free to Start, No Punishment',
  // These previously opened with the quest count, which sold the free tier in
  // the search snippet, and named boss battles and quest chains as Pro when
  // both are free. All three now lead with the ad-free, kid-safe angle.
  description:
    'No ads, no data selling, no dark patterns — a habit tracker for kids funded by the people who use it. Free forever for 10 habits. Cancel anytime.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    url: '/pricing',
    title: 'HabitQuest Pricing — Free to Start, No Punishment',
    description:
      'No ads, no data selling, no dark patterns — a habit tracker for kids funded by the people who use it. Free forever for 10 habits. Cancel anytime.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HabitQuest Pricing — Free to Start, No Punishment',
    description:
      'No ads, no data selling, no dark patterns — a kids habit tracker funded by the people who use it. Free forever for 10 habits.',
  },
};

export default function PricingLayout({ children }) {
  return children;
}
