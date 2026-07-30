'use client';

import Image from 'next/image';
import { CAST } from '@/lib/cast';

/**
 * Time-of-day greeter: a Storybook cast character who is "awake right now"
 * says one line under the character panel. Deterministic by the device's
 * local hour -- a child who opens the app at night genuinely sees the
 * night crew, which is the point. Zero state, zero network; the greeting
 * line rotates with the weekday so a same-time-every-day routine still
 * sees some variety. Always warm, never a word about missed days.
 */
const WINDOWS = [
  {
    from: 5,
    to: 11,
    castKey: 'sunspin',
    lines: [
      'Good morning, hero! The sundial is already spinning.',
      'Morning! First light, first quest. Best kind of day.',
      "Rise and shine! I saved you a sunbeam.",
    ],
  },
  {
    from: 11,
    to: 17,
    castKey: 'gale_sprite',
    lines: [
      'Perfect questing weather. The wind is at your back!',
      'Whoosh! Midday already. Race you to the quest board.',
      'The breeze says today is a good day to finish something.',
    ],
  },
  {
    from: 17,
    to: 21,
    castKey: 'dreamfox',
    lines: [
      'Evening, hero. Even the moon is getting cozy.',
      'The stars are clocking in. One more quest before bed?',
      'Dusk already! The best dreams start with a finished quest.',
    ],
  },
  {
    from: 21,
    to: 5,
    castKey: 'stellara',
    lines: [
      'Up late? The stars are keeping watch with you.',
      'Shhh... the night crew is on duty. Welcome.',
      'The quiet hours are good hours. No rush at all.',
    ],
  },
];

export default function DailyGreeter() {
  const now = new Date();
  const hour = now.getHours();
  const window =
    WINDOWS.find((w) =>
      w.from < w.to ? hour >= w.from && hour < w.to : hour >= w.from || hour < w.to
    ) || WINDOWS[0];
  const art = CAST[window.castKey];
  if (!art) return null;
  const line = window.lines[now.getDay() % window.lines.length];

  return (
    <div className="flex items-center gap-3 mb-6 kq-card border-2 border-stone p-3">
      <Image
        src={art.src}
        alt={art.alt}
        width={56}
        height={56}
        loading="lazy"
        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      />
      <p className="text-sm text-navy/70 font-semibold">
        <span className="text-navy font-bold">{art.name}:</span> &ldquo;{line}&rdquo;
      </p>
    </div>
  );
}
