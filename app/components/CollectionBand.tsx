'use client';

import { useState } from 'react';
import Image from 'next/image';

// ─── Collection tease band (landing) ──────────────────────────────────
// Spotlights the characters that already have art, and shows a wall of
// all 47 chibi slots. Each wall tile auto-loads /images/chibi/{id}.png and
// falls back to a "mystery" tile when the art isn't there yet — so dropping
// a new PNG in reveals it with no code change.

const TOTAL_CHIBI = 47;

// Characters with finished art. `id` maps to public/images/chibi/{id}.png,
// `card` to the full-scene art in public/images/collection. Edit names/rarity
// freely — this is just the marketing spotlight.
const SPOTLIGHT = [
  { id: 1, name: 'Shadow Dragon', card: '/images/collection/shadow-dragon.png', rarity: 'Legendary' },
  { id: 3, name: 'Star Mage', card: '/images/collection/star-mage.png', rarity: 'Epic' },
  { id: 2, name: 'Acorn Explorer', card: '/images/collection/acorn-explorer.png', rarity: 'Rare' },
  { id: 4, name: 'Crystal Sleuth', card: '/images/collection/crystal-sleuth.png', rarity: 'Rare' },
  { id: 5, name: 'Bloom Sprite', card: '/images/collection/bloom-sprite.png', rarity: 'Common' },
];

const RARITY: Record<string, string> = {
  Common: 'bg-white text-navy',
  Rare: 'bg-[#57D7F5] text-[#0b3a45]',
  Epic: 'bg-[#8B6CFF] text-white',
  Legendary: 'bg-[#FFC83D] text-[#5a4300]',
};

function WallTile({ id }: { id: number }) {
  const [state, setState] = useState<'loading' | 'shown' | 'mystery'>('loading');
  const hue = Math.round(((id - 1) / TOTAL_CHIBI) * 320);
  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden shadow-candy kq-card-hover"
      style={{ background: `linear-gradient(140deg, hsl(${hue} 70% 88%), hsl(${(hue + 40) % 360} 70% 80%))` }}
      title={state === 'shown' ? `Character #${id}` : 'Undiscovered'}
    >
      {state !== 'shown' && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center kq-display text-white/85 text-lg select-none"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
        >
          ?
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/chibi/${id}.png`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onLoad={() => setState('shown')}
        onError={() => setState('mystery')}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          state === 'shown' ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

export default function CollectionBand({ onStart }: { onStart: () => void }) {
  return (
    <section className="py-14 kq-reveal">
      <div className="text-center mb-9">
        <span className="kq-chip bg-[#8B6CFF]/15 text-purple mb-3 text-sm">
          <span aria-hidden="true">🃏</span> The Collection
        </span>
        <h2 className="text-3xl sm:text-5xl text-navy mb-3">47 Characters to Discover</h2>
        <p className="text-navy/60 text-lg font-semibold max-w-2xl mx-auto">
          Heroes, creatures, and companions to meet, grow, and collect as you level up.
          Miss a day? They&rsquo;re still here when you come back.
        </p>
      </div>

      {/* Spotlight — real art */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
        {SPOTLIGHT.map((c, i) => (
          <div
            key={c.name}
            className={`kq-card kq-card-hover overflow-hidden ${i === 4 ? 'hidden md:block' : ''}`}
          >
            <div className="relative aspect-square bg-[#ECE7DD]">
              <Image
                src={c.card}
                alt={`${c.name} character art`}
                fill
                sizes="(max-width: 768px) 45vw, 20vw"
                className="object-cover"
              />
              <span className={`absolute top-2 left-2 kq-chip text-[11px] py-0.5 px-2 ${RARITY[c.rarity]}`}>
                {c.rarity}
              </span>
            </div>
            <div className="p-2.5 text-center">
              <h3 className="text-navy text-sm sm:text-base leading-tight">{c.name}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* The wall — all 47 slots, auto-revealing */}
      <div className="rounded-candy p-4 sm:p-6" style={{ background: 'linear-gradient(135deg,#eafff2 0%,#d7f0ff 100%)' }}>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 sm:gap-2.5">
          {Array.from({ length: TOTAL_CHIBI }, (_, i) => (
            <WallTile key={i + 1} id={i + 1} />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-5">
          <span className="kq-chip bg-white text-navy shadow-candy text-sm">
            <span aria-hidden="true">✨</span> 47 to collect
          </span>
          <span className="kq-chip bg-white text-navy shadow-candy text-sm">
            <span aria-hidden="true">🥚</span> Pets that grow with you
          </span>
          <span className="kq-chip bg-white text-navy shadow-candy text-sm">
            <span aria-hidden="true">👑</span> Legendary evolutions
          </span>
        </div>
      </div>

      <div className="text-center mt-8">
        <button onClick={onStart} className="kq-btn kq-btn-gold">
          <span aria-hidden="true">🚀</span> Start Collecting
        </button>
      </div>
    </section>
  );
}
