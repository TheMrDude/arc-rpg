import { Metadata } from 'next';

export const landingPageMetadata: Metadata = {
  title: 'HabitQuest - Build Habits You Actually Keep By Making Them a Game',
  description: 'Most habit apps punish you for missing a day. HabitQuest turns your habits into epic RPG quests — so building consistency actually feels fun. Your habits. Your story. No guilt.',
  keywords: ['habit tracker', 'RPG', 'gamification', 'productivity', 'AI', 'task management', 'habits', 'motivation', 'anti-guilt', 'no streaks'],
  authors: [{ name: 'HabitQuest' }],
  openGraph: {
    title: 'HabitQuest - Build Habits You Actually Keep',
    description: 'Most habit apps punish you for missing a day. HabitQuest turns your habits into epic RPG quests — so building consistency actually feels fun.',
    url: 'https://habitquest.dev',
    siteName: 'HabitQuest',
    images: [
      {
        url: 'https://habitquest.dev/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HabitQuest - The Anti-Guilt Habit Tracker',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HabitQuest - Build Habits You Actually Keep',
    description: 'Most habit apps punish you for missing a day. HabitQuest turns your habits into epic RPG quests — so building consistency actually feels fun.',
    images: ['https://habitquest.dev/og-image.png'],
    creator: '@officialmrdude',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add your actual code
  },
};
