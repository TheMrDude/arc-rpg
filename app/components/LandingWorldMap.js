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
          background: revealed ? 'rgba(244,197,83,0.18)' : 'rgba(2,6,23,0.6)',
          border: revealed ? '1px solid rgba(244,197,83,0.7)' : '1px solid rgba(148,163,184,0.3)',
          boxShadow: revealed ? '0 0 12px rgba(244,197,83,0.45)' : 'none',
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
        className="relative w-full overflow-hidden rounded-2xl rotate-2"
        style={{
          aspectRatio: '3/4',
          border: '1px solid rgba(34,211,238,0.45)',
          boxShadow:
            '0 0 50px rgba(34,211,238,0.22), 0 0 120px rgba(244,197,83,0.08), 0 25px 50px -12px rgba(0,0,0,0.7)',
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
              'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(2,6,23,0.35) 100%)',
          }}
        />
      </div>
      <p className="mt-4 text-center text-sm italic text-gray-400">
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
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        aspectRatio: '16/9',
        border: '1px solid rgba(34,211,238,0.35)',
        boxShadow: '0 0 60px rgba(34,211,238,0.15), 0 20px 40px -12px rgba(0,0,0,0.6)',
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
            'linear-gradient(to bottom, rgba(2,6,23,0.35) 0%, transparent 20%, transparent 80%, rgba(2,6,23,0.45) 100%)',
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
        className="relative w-full overflow-hidden rounded-xl"
        style={{
          aspectRatio: '3/4',
          border: `1px solid ${fogged ? 'rgba(148,163,184,0.25)' : 'rgba(244,197,83,0.5)'}`,
          boxShadow: fogged
            ? '0 10px 30px -10px rgba(0,0,0,0.6)'
            : '0 0 40px rgba(244,197,83,0.18), 0 10px 30px -10px rgba(0,0,0,0.6)',
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
                background: `radial-gradient(circle at ${start.hotspot.x + start.hotspot.w / 2}% ${start.hotspot.y + start.hotspot.h / 2}%, rgba(2,6,23,0) 0%, rgba(2,6,23,0) 10%, rgba(2,6,23,0.7) 20%, rgba(2,6,23,0.95) 32%)`,
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
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
          style={{
            background: 'rgba(2,6,23,0.85)',
            border: `1px solid ${labelColor}`,
            color: labelColor,
          }}
        >
          {label}
        </span>
      </div>
      <p className="mt-3 text-center text-sm text-gray-400">{sublabel}</p>
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
        <h2 className="text-3xl sm:text-5xl font-black text-center mb-6">
          <span className="bg-gradient-to-r from-[#22d3ee] to-[#f4c553] bg-clip-text text-transparent">
            Every habit you complete unlocks territory.
          </span>
        </h2>
        <p className="text-lg sm:text-xl text-gray-300 leading-relaxed text-center max-w-3xl mx-auto mb-10">
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
            labelColor="#f43f5e"
            fogged
            sublabel="One region unlocked. The rest waits in the fog."
          />
          <DayPanel
            label="Day 90"
            labelColor="#f4c553"
            sublabel="Every region revealed. Every boss on notice."
          />
        </div>
        <p className="text-center text-lg sm:text-xl font-bold text-[#f4c553] mt-6">
          This is what 90 days of showing up looks like.
        </p>

        <div className="text-center mt-10">
          <Link
            href="/signup"
            className="inline-block px-10 py-5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white border-3 border-[#0F3460] rounded-xl font-black text-xl uppercase tracking-wide shadow-lg transition-all hover:scale-105"
          >
            🗺️ Start Your Campaign Free
          </Link>
          <p className="mt-3 text-gray-400 text-sm">Free forever. No credit card required.</p>
        </div>
      </motion.div>
    </section>
  );
}
