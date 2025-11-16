import './globals.css'

export const metadata = {
  title: 'ARC RPG - Transform Your Life Into An Epic Quest',
  description: 'Gamify your life with AI-powered quests. Turn daily tasks into epic adventures with XP, levels, and character progression.',
  applicationName: 'ARC RPG',
  keywords: ['productivity', 'gamification', 'habits', 'quests', 'RPG', 'self-improvement', 'goal tracking'],
  authors: [{ name: 'ARC RPG' }],
  creator: 'ARC RPG',
  publisher: 'ARC RPG',
  verification: {
    other: {
      'p:domain_verify': '1267df7c10d6f637a50ab5a3d4d02053'
    }
  },
  manifest: '/manifest.json',
  themeColor: '#FF6B6B',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ARC RPG'
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ]
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ARC RPG" />
        <link rel="apple-touch-icon" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
