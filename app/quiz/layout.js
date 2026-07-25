// /quiz is a client component, so it cannot export `metadata` itself. Before
// this layout the route emitted no <title> at all server-side (it only set
// document.title after hydration). Canonical/JSON-LD/robots still come from
// the root layout and are untouched.
export const metadata = {
  title: 'Which Habit Archetype Are You? — HabitQuest',
  description:
    'Take the free 2-minute quiz to find your habit archetype — Warrior, Seeker, Builder, Sage, or Shadow — and see which way of building habits fits you.',
  openGraph: {
    title: 'Which Habit Archetype Are You? — HabitQuest',
    description:
      'Take the free 2-minute quiz to find your habit archetype — Warrior, Seeker, Builder, Sage, or Shadow.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Which Habit Archetype Are You? — HabitQuest',
    description:
      'Take the free 2-minute quiz to find your habit archetype — Warrior, Seeker, Builder, Sage, or Shadow.',
  },
};

export default function QuizLayout({ children }) {
  return children;
}
