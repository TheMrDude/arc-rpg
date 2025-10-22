import './globals.css'

export const metadata = {
  title: 'ARC RPG',
  description: 'Turn your tasks into epic quests',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
