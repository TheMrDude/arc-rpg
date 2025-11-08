import './globals.css'

export const metadata = {
  title: 'HabitQuest',
  description: 'Turn your tasks into epic quests',
  verification: {
    other: {
      'p:domain_verify': '1267df7c10d6f637a50ab5a3d4d02053'
    }
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
