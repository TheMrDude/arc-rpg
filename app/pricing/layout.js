// /pricing is a client component, so it cannot export `metadata` itself.
// This segment layout supplies its title/description server-side instead of
// letting the route inherit the homepage's. Canonical/JSON-LD/robots are
// untouched and still come from the root layout.
export const metadata = {
  title: 'HabitQuest Pricing — Free to Start, No Punishment',
  description:
    'Start free forever with 3 quests, your own hero, and XP. Pro unlocks unlimited quests, boss battles, gear, and quest chains. Cancel anytime.',
  openGraph: {
    title: 'HabitQuest Pricing — Free to Start, No Punishment',
    description:
      'Start free forever with 3 quests, your own hero, and XP. Pro unlocks unlimited quests, boss battles, gear, and quest chains. Cancel anytime.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HabitQuest Pricing — Free to Start, No Punishment',
    description:
      'Start free forever with 3 quests, your own hero, and XP. Pro unlocks unlimited quests, boss battles, gear, and quest chains.',
  },
};

export default function PricingLayout({ children }) {
  return children;
}
