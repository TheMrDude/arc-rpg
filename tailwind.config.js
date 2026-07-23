/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Kid-first design system (HabitQuest landing redesign) ───
        // NOTE: emerald / purple / stone are built-in Tailwind color SCALES
        // used elsewhere in the app (emerald-500, purple-600, stone-*).
        // Define them as { DEFAULT } so Tailwind DEEP-MERGES — the numbered
        // shades keep working everywhere; we only ADD the flat brand color
        // (bg-emerald / text-purple) for the landing page.
        'hero-blue': '#4F7DF3',
        emerald: { DEFAULT: '#2ECC71' },
        gold: '#FFC83D',
        purple: { DEFAULT: '#8B6CFF' },
        coral: '#FF7B6B',
        aqua: '#57D7F5',
        cream: '#FFF9F1', // page background — replaces white
        stone: { DEFAULT: '#ECE7DD' },
        navy: '#243B5A', // dark sections — replaces black
        ink: '#2b2b3a',
      },
      fontFamily: {
        // Display/headings: rounded + chunky. Body: friendly sans.
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Big, friendly rounding for the candy look.
        candy: '24px',
      },
      boxShadow: {
        // Soft chunky drop shadows.
        candy: '0 10px 30px rgba(36, 59, 90, 0.12)',
        'candy-lg': '0 20px 50px rgba(36, 59, 90, 0.18)',
      },
    },
  },
  // Kept as [] to match the app's prior effective config (the original file
  // had a duplicate module.exports whose last block set plugins: []). Not
  // re-enabling typography here avoids changing blog/prose pages.
  plugins: [],
}
