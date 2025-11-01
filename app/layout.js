import './globals.css'

export const metadata = {
  title: 'HabitQuest',
  description: 'Turn your tasks into epic quests',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
