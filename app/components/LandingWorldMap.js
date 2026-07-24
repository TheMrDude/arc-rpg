'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { WORLD_REGIONS } from '@/lib/world-regions';

// Landing-page presentation of the campaign world map (/world-map.svg).
// Purely visual — no unlock logic. The real interactive map lives in
// app/components/WorldMap.js; marker positions come from the same
// hotspot data in lib/world-regions.js so the two stay in sync.

const regionCenter = (region) => ({
  left: `${region.hotspot.x + region.hotspot.w / 2}%`,
  top: `${region.hotspot.y + region.hotspot.h / 2}%`,
});

function RegionMarker({ region, revealed }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
      style={regionCenter(region)}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: 'clamp(20px, 3.5vw, 30px)',
          height: 'clamp(20px, 3.5vw, 30px)',
          fontSize: 'clamp(10px, 1.8vw, 15px)',
          background: revealed ? 'rgba(255,200,61,0.22)' : 'rgba(36,59,90,0.12)',
          border: revealed ? '1px solid rgba(255,200,61,0.8)' : '1px solid rgba(36,59,90,0.25)',
          boxShadow: revealed ? '0 0 12px rgba(255,200,61,0.35)' : 'none',
        }}
      >
        {revealed ? region.icon : '🔒'}
      </span>
    </div>
  );
}

// ─── HERO MAP ─────────────────────────────────────────────────────────
// The money shot: framed like a game artifact, priority-loaded.

export function HeroWorldMap() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px]">
      <div
        className="relative w-full overflow-hidden rounded-candy rotate-2 shadow-candy-lg"
        style={{
          aspectRatio: '3/4',
          border: '3px solid white',
        }}
      >
        <Image
          src="/world-map.svg"
          alt="The HabitQuest campaign world map — regions unlock as you complete habits"
          fill
          priority
          unoptimized
          className="object-fill"
          sizes="(max-width: 640px) 340px, 380px"
        />
        {WORLD_REGIONS.map((region, i) => (
          <RegionMarker key={region.id} region={region} revealed={i < 3} />
        ))}
        {/* Soft parchment vignette so it reads as an artifact, not a screenshot */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(36,59,90,0.2) 100%)',
          }}
        />
      </div>
      <p className="mt-4 text-center text-sm italic text-navy/60">
        Your habits, as a world you conquer.
      </p>
    </div>
  );
}

// ─── SLOW-PAN MAP ─────────────────────────────────────────────────────
// Wide cinematic frame; the portrait map drifts vertically (CSS only).

function PanningWorldMap() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-candy shadow-candy-lg"
      style={{
        aspectRatio: '16/9',
        border: '3px solid white',
      }}
    >
      <div className="absolute inset-x-0 top-0 animate-world-map-pan" style={{ aspectRatio: '3/4' }}>
        <Image
          src="/world-map.svg"
          alt="Panning across the HabitQuest world map"
          fill
          unoptimized
          className="object-fill"
          sizes="(max-width: 1024px) 100vw, 896px"
        />
        {WORLD_REGIONS.map((region, i) => (
          <RegionMarker key={region.id} region={region} revealed={i < 4} />
        ))}
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(36,59,90,0.2) 0%, transparent 20%, transparent 80%, rgba(36,59,90,0.25) 100%)',
        }}
      />
    </div>
  );
}

// ─── DAY 1 vs DAY 90 STRIP ────────────────────────────────────────────
// Fog-of-war is a CSS radial-gradient overlay — no edited image assets.

function DayPanel({ label, labelColor, fogged, sublabel }) {
  const start = WORLD_REGIONS[0]; // Aeloria Plains, the starting zone
  return (
    <div className="flex flex-col">
      <div
        className="relative w-full overflow-hidden rounded-candy shadow-candy"
        style={{
          aspectRatio: '3/4',
          border: `2px solid ${fogged ? '#ECE7DD' : '#FFC83D'}`,
        }}
      >
        <Image
          src="/world-map.svg"
          alt={fogged ? 'Day 1: the world map, unexplored and fogged' : 'Day 90: the world map, fully revealed'}
          fill
          unoptimized
          className="object-fill"
          sizes="(max-width: 640px) 100vw, 420px"
        />
        {fogged ? (
          <>
            {/* Fog of war: only the starting zone is visible */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${start.hotspot.x + start.hotspot.w / 2}% ${start.hotspot.y + start.hotspot.h / 2}%, rgba(36,59,90,0) 0%, rgba(36,59,90,0) 10%, rgba(36,59,90,0.65) 20%, rgba(36,59,90,0.9) 32%)`,
              }}
            />
            <RegionMarker region={start} revealed />
          </>
        ) : (
          WORLD_REGIONS.map((region) => (
            <RegionMarker key={region.id} region={region} revealed />
          ))
        )}
        <span
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold kq-navy"
          style={{
            color: labelColor,
          }}
        >
          {label}
        </span>
      </div>
      <p className="mt-3 text-center text-sm text-navy/60">{sublabel}</p>
    </div>
  );
}

// ─── FULL SECTION (landing target for pins 02 & 05) ───────────────────

export function TerritorySection() {
  return (
    <section className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        <h2 className="kq-display text-3xl sm:text-5xl text-center mb-6">
          <span className="bg-gradient-to-r from-hero-blue to-gold bg-clip-text text-transparent">
            Every habit you complete unlocks territory.
          </span>
        </h2>
        <p className="text-lg sm:text-xl text-navy/70 leading-relaxed text-center max-w-3xl mx-auto mb-10">
          HabitQuest isn&apos;t a checklist. It&apos;s a campaign. Complete your real-life habits
          and your character pushes deeper into the world map, unlocking regions, story beats,
          and boss battles. Miss a day? The map waits for you. No territory lost, no guilt,
          the quest just continues.
        </p>

        <PanningWorldMap />

        {/* Day 1 vs Day 90 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mt-12">
          <DayPanel
            label="Day 1"
            labelColor="#FF7B6B"
            fogged
            sublabel="One region unlocked. The rest waits in the fog."
          />
          <DayPanel
            label="Day 90"
            labelColor="#FFC83D"
            sublabel="Every region revealed. Every boss on notice."
          />
        </div>
        <p className="text-center text-lg sm:text-xl font-bold text-gold mt-6">
          This is what 90 days of showing up looks like.
        </p>

        <div className="text-center mt-10">
          <Link
            href="/signup"
            className="kq-btn kq-btn-gold inline-block px-10 py-5 text-xl transition-all hover:scale-105"
          >
            🗺️ Start Your Campaign Free
          </Link>
          <p className="mt-3 text-navy/50 text-sm">Free forever. No credit card required.</p>
        </div>
      </motion.div>
    </section>
  );
}
