import './globals.css'
import Script from 'next/script'
import PostHogProvider from './components/PostHogProvider'

export const metadata = {
  title: 'HabitQuest - ADHD-Friendly Gamified Habit Tracker | No Streaks, No Guilt',
  description: 'Most habit apps punish you for missing a day. HabitQuest turns your habits into epic RPG quests — so building consistency actually feels fun. Your habits. Your story. No guilt.',
  keywords: ['habit tracker', 'RPG', 'gamification', 'productivity', 'AI', 'task management', 'habits', 'motivation', 'ADHD', 'neurodivergent', 'no guilt', 'anti-guilt'],
  authors: [{ name: 'HabitQuest' }],
  verification: {
    google: 'uodx1uvhWnPVjgnrCRoa0xDdg19WCuoA5fjCA5AQS0w',
    other: {
      'p:domain_verify': '1267df7c10d6f637a50ab5a3d4d02053'
    }
  },
  manifest: '/manifest.json',
  themeColor: '#FF6B6B',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HabitQuest'
  },
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
  alternates: {
    canonical: 'https://habitquest.dev',
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF6B6B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HabitQuest" />

        {/* iOS Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />

        {/* JSON-LD moved to public/structured-data.json for security */}

        {/* Facebook Pixel */}
        {process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID && (
          <>
            <Script id="facebook-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </head>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>

        {/* Service Worker Registration */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => {
                    console.log('SW registered:', registration);
                  })
                  .catch(error => {
                    console.log('SW registration failed:', error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
