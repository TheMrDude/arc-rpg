import { Metadata } from 'next';

export const landingPageMetadata: Metadata = {
  title: 'HabitQuest - Turn Your To-Do List Into An Epic RPG Adventure',
  description: 'The anti-guilt habit tracker. Transform boring tasks into epic RPG quests with AI. No streak shame. No punishment. Just your personal adventure. Start free!',
  keywords: ['habit tracker', 'RPG', 'gamification', 'productivity', 'AI', 'task management', 'habits', 'motivation'],
  authors: [{ name: 'HabitQuest' }],
  openGraph: {
    title: 'HabitQuest - Turn Your Life Into An Epic RPG',
    description: 'Stop failing, start conquering. Transform mundane tasks into legendary quests with AI-powered gamification.',
    url: 'https://habitquest.dev',
    siteName: 'HabitQuest',
    images: [
      {
        url: 'https://habitquest.dev/og-image.png', // You'll need to create this
        width: 1200,
        height: 630,
        alt: 'HabitQuest - Gamified Habit Tracker',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HabitQuest - Turn Your Life Into An Epic RPG',
    description: 'Transform boring tasks into epic quests. AI-powered. Scientifically addictive. Actually fun.',
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
