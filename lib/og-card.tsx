/**
 * One shared Open Graph card template, rendered at build time by
 * next/og's ImageResponse. Driven purely by each page's existing title
 * metadata, so new posts and comparison pages get a branded 1200x630 share
 * image automatically with no manual artwork.
 *
 * Kept deliberately font-agnostic: ImageResponse ships a default sans, and
 * relying on it avoids a build-time font fetch that could fail a deploy.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const CREAM = '#FFF9F1';
const NAVY = '#243B5A';
const GOLD = '#FFC83D';
const BLUE = '#4F7DF3';

/** Longer titles step down in size so they never overflow the card. */
function titleSize(title: string) {
  const n = title.length;
  if (n <= 45) return 74;
  if (n <= 70) return 62;
  if (n <= 100) return 52;
  return 44;
}

export function ogCard({
  title,
  eyebrow,
  accent = GOLD,
}: {
  title: string;
  eyebrow: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: CREAM,
        padding: '64px 72px',
        position: 'relative',
      }}
    >
      {/* Soft brand wash in the corner */}
      <div
        style={{
          position: 'absolute',
          top: -160,
          right: -160,
          width: 520,
          height: 520,
          borderRadius: 9999,
          background: accent,
          opacity: 0.18,
        }}
      />

      {/* Wordmark + section eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: NAVY,
            color: CREAM,
            fontSize: 30,
            fontWeight: 800,
          }}
        >
          HQ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>
            HabitQuest
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: BLUE,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </div>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          display: 'flex',
          fontSize: titleSize(title),
          fontWeight: 800,
          color: NAVY,
          lineHeight: 1.14,
          letterSpacing: -1,
          maxWidth: 1010,
        }}
      >
        {title}
      </div>

      {/* Accent rule + footer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', width: 190, height: 10, borderRadius: 9999, background: accent }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: NAVY, opacity: 0.65 }}>
            habitquest.dev
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: NAVY, opacity: 0.65 }}>
            No streaks. No guilt.
          </div>
        </div>
      </div>
    </div>
  );
}
