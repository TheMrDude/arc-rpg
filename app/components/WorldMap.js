'use client';

import { useState } from 'react';
import { WORLD_REGIONS, getUnlockStatus, getUnlockProgress } from '@/lib/world-regions';
import { getDiscoveriesForRegion, isDiscovered, discoveryHint, getDiscoveryCounts } from '@/lib/discoveries';
import { journeyDistance } from '@/lib/journeys';
import { generateFrontierRegion, nextFrontierIndex, reachedFrontiers } from '@/lib/frontier';
import { supabase } from '@/lib/supabase';

// ─── REGION PANEL ───────────────────────────────────────────────────────────

function RegionPanel({ region, locked, playerData, onClose, onJourneyChange }) {
  const [settingCourse, setSettingCourse] = useState(false);
  const progress = locked ? getUnlockProgress(region, playerData) : null;
  const journeyState = playerData?.journeyState || null;
  const isDestination = journeyState?.destination === region.id;
  const distance = journeyDistance(region.id);

  const setCourse = async () => {
    setSettingCourse(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ destination_id: region.id }),
      });
      if (res.ok && onJourneyChange) onJourneyChange();
    } catch (err) {
      console.error('Set course failed:', err);
    } finally {
      setSettingCourse(false);
    }
  };
  const pct = progress ? Math.round((progress.current / progress.required) * 100) : 0;

  return (
    <div
      className="flex flex-col gap-4 p-5 kq-card"
      style={{ minWidth: 0 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{region.icon}</span>
            <span
              className="kq-chip text-xs font-bold px-2 py-0.5"
              style={{
                background: locked ? 'rgba(255,123,107,0.15)' : 'rgba(46,196,140,0.15)',
                color: locked ? '#FF7B6B' : '#2ec48c',
              }}
            >
              {locked ? '🔒 Locked' : '✓ Unlocked'}
            </span>
          </div>
          <h3 className="text-lg kq-display text-navy leading-tight">{region.name}</h3>
          <p className="text-xs italic" style={{ color: region.color }}>{region.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="text-navy/40 hover:text-navy transition-colors text-lg leading-none flex-shrink-0 mt-1"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Lore */}
      <div>
        {locked ? (
          <div className="relative">
            <p
              className="text-sm text-navy/60 leading-relaxed italic"
              style={{ filter: 'blur(4px)', userSelect: 'none' }}
            >
              {region.lore}
            </p>
            <div
              className="absolute inset-0 flex items-center justify-center rounded-candy"
              style={{ background: 'rgba(255,255,255,0.75)' }}
            >
              <p className="text-xs text-navy/60 text-center px-2">
                Complete your quest to reveal the lore of this region.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-navy/70 leading-relaxed italic">{region.lore}</p>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-navy/50 text-xs">Theme</span>
          <span className="text-navy/70">{region.habitTheme}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-navy/50 text-xs">Unlock</span>
          <span className="text-navy/70 text-xs">{region.unlockCondition}</span>
        </div>
      </div>

      {/* Discoveries: hidden landmarks that reveal with quest progress */}
      {!locked && (
        <div>
          <p className="text-xs text-navy/50 mb-2">Discoveries</p>
          <div className="space-y-2">
            {getDiscoveriesForRegion(region.id).map((d) => {
              const found = isDiscovered(d, playerData);
              return found ? (
                <div key={d.id} className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{d.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy leading-tight">{d.name}</p>
                    <p className="text-[11px] text-navy/50 italic leading-snug">{d.lore}</p>
                  </div>
                </div>
              ) : (
                <div key={d.id} className="flex items-start gap-2 opacity-70">
                  <span className="text-base leading-none mt-0.5">❓</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy/50 leading-tight">Undiscovered</p>
                    <p className="text-[11px] text-navy/40 italic leading-snug">
                      {discoveryHint(d, playerData)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress bar for locked regions */}
      {locked && progress && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-navy/50">Progress</span>
            <span className="text-xs font-bold text-gold" style={{ color: '#E8A800' }}>
              {progress.current} / {progress.required} {progress.label}
            </span>
          </div>
          <div className="w-full rounded-full h-1.5 bg-stone">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(to right, #FFC83D, #FF7B6B)',
              }}
            />
          </div>
        </div>
      )}

      {/* Journey: choose this region as your heading */}
      {locked && distance && (
        isDestination ? (
          <div className="kq-chip px-3 py-2 text-xs font-bold text-center bg-hero-blue/12 text-hero-blue">
            🧭 En route — {journeyState.progress}/{journeyState.distance} quests traveled
          </div>
        ) : (
          <button
            onClick={setCourse}
            disabled={settingCourse}
            className="kq-btn kq-btn-gold text-xs"
            style={{ cursor: settingCourse ? 'wait' : 'pointer' }}
          >
            {settingCourse ? 'Charting course…' : `🧭 Set Course — ${distance} quests of travel`}
          </button>
        )
      )}
    </div>
  );
}

// ─── THE ENDLESS FRONTIER ───────────────────────────────────────────────────

function FrontierSection({ playerData, onJourneyChange }) {
  const [settingCourse, setSettingCourse] = useState(false);
  const traveled = playerData?.traveled || [];
  const reached = reachedFrontiers(traveled);
  const next = generateFrontierRegion(nextFrontierIndex(traveled));
  const journeyState = playerData?.journeyState || null;
  const enRoute = journeyState?.destination === next.id;

  const setCourse = async () => {
    setSettingCourse(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ destination_id: next.id }),
      });
      if (res.ok && onJourneyChange) onJourneyChange();
    } catch (err) {
      console.error('Frontier course failed:', err);
    } finally {
      setSettingCourse(false);
    }
  };

  return (
    <div className="mt-4 kq-card p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <h3 className="text-sm kq-display text-purple">
          🌌 Beyond the Edge
        </h3>
        <span className="text-[10px] text-navy/40">
          The world never ends
        </span>
      </div>

      {reached.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {reached.map((r) => (
            <span
              key={r.id}
              className="kq-chip text-[11px] font-bold px-2.5 py-1"
              style={{ background: `${r.color}22`, color: r.color }}
            >
              {r.icon} {r.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy">
            {next.icon} {next.name}
          </p>
          <p className="text-xs italic mt-0.5" style={{ color: next.color }}>{next.subtitle}</p>
          <p className="text-xs text-navy/50 mt-1">{next.lore}</p>
        </div>
        {enRoute ? (
          <div className="kq-chip px-3 py-2 text-xs font-bold text-center flex-shrink-0 bg-hero-blue/12 text-hero-blue">
            🧭 En route — {journeyState.progress}/{journeyState.distance}
          </div>
        ) : (
          <button
            onClick={setCourse}
            disabled={settingCourse}
            className="kq-btn kq-btn-ghost text-xs flex-shrink-0"
            style={{ cursor: settingCourse ? 'wait' : 'pointer' }}
          >
            {settingCourse ? 'Charting course…' : `🧭 Set Course — ${next.distance} quests`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── WORLD MAP ──────────────────────────────────────────────────────────────

export default function WorldMap({ playerData, isDM, onJourneyChange }) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [dmView, setDmView] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isRegionLocked = (region) => {
    if (isDM && dmView) return false;
    return !getUnlockStatus(region, playerData);
  };

  // Endowed progress: the starting region (unlockKey 'always') is never
  // fogged, and the NEXT locked region renders with lighter fog and a
  // visible name + icon, so a brand-new player's map is never fully dark.
  const nextLockedId = WORLD_REGIONS.find((r) => isRegionLocked(r))?.id || null;

  const handleRegionClick = (region) => {
    setSelectedRegion(prev => prev?.id === region.id ? null : region);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">

      {/* ── MAP CONTAINER ───────────────────────────────────────────────── */}
      <div className="w-full md:flex-1 min-w-0">

        {/* DM Toggle */}
        {isDM && (
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setDmView(v => !v)}
              className={`kq-btn text-xs ${dmView ? 'kq-btn-gold' : 'kq-btn-ghost'}`}
            >
              👁 {dmView ? 'DM View ON' : 'DM View OFF'}
            </button>
            {dmView && (
              <span className="kq-chip text-xs font-bold px-2 py-1 bg-gold/15 text-navy">
                DM ONLY
              </span>
            )}
          </div>
        )}

        {/* Map image + hotspot overlay */}
        {/* aspect-ratio ~3:4 matches a portrait fantasy map */}
        <div
          className="relative w-full overflow-hidden rounded-xl"
          style={{ aspectRatio: '3/4' }}
        >
          {/* Parchment placeholder (only if the map asset fails to load) */}
          {imgError && (
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at 30% 20%, #2d1f0e 0%, #1a1208 40%, #0f0a05 100%)',
              }}
            >
              {/* Parchment texture overlay */}
              <div className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `
                    radial-gradient(ellipse at 70% 80%, rgba(139,90,43,0.4) 0%, transparent 60%),
                    radial-gradient(ellipse at 20% 60%, rgba(74,55,28,0.3) 0%, transparent 50%),
                    radial-gradient(ellipse at 50% 30%, rgba(101,68,32,0.2) 0%, transparent 60%)
                  `
                }}
              />
              {/* Map grid lines */}
              <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                {[10,20,30,40,50,60,70,80,90].map(n => (
                  <g key={n}>
                    <line x1={n} y1="0" x2={n} y2="100" stroke="#c8a96e" strokeWidth="0.3" />
                    <line x1="0" y1={n} x2="100" y2={n} stroke="#c8a96e" strokeWidth="0.3" />
                  </g>
                ))}
              </svg>
              {/* Compass rose */}
              <div className="absolute bottom-4 right-4 text-4xl opacity-30">🧭</div>
            </div>
          )}

          {/* Map art — SVG drawn to match the hotspot coordinates in lib/world-regions.js */}
          <img
            src="/world-map.svg"
            alt="World of HabitQuest"
            className="absolute inset-0 w-full h-full object-fill"
            onLoad={() => setImgError(false)}
            onError={() => setImgError(true)}
            style={{ display: imgError ? 'none' : 'block' }}
          />

          {/* Hotspot + fog overlay — percentage positioned divs */}
          {WORLD_REGIONS.map((region) => {
            const { x, y, w, h } = region.hotspot;
            const locked = isRegionLocked(region);
            const hovered = hoveredRegion === region.id;
            const selected = selectedRegion?.id === region.id;

            return (
              <div
                key={region.id}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  cursor: 'pointer',
                  zIndex: selected || hovered ? 10 : 5,
                }}
                onClick={() => handleRegionClick(region)}
                onMouseEnter={() => setHoveredRegion(region.id)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                {/* Fog layer. The next region on the road gets lighter fog
                    (a partial reveal) so the map always shows where the
                    story goes next. */}
                {locked && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{
                      background: region.id === nextLockedId ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.75)',
                      borderRadius: '3px',
                      backdropFilter: region.id === nextLockedId ? 'none' : 'blur(1px)',
                    }}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.8vw, 18px)', lineHeight: 1 }}>
                      {region.id === nextLockedId ? region.icon : '🔒'}
                    </span>
                    <span
                      className="text-center leading-tight"
                      style={{
                        fontSize: 'clamp(5px, 0.9vw, 9px)',
                        color: region.id === nextLockedId ? '#c8a96e' : '#6b7280',
                        maxWidth: '90%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {region.name}
                    </span>
                  </div>
                )}

                {/* Hover/selected highlight for unlocked regions */}
                {!locked && (
                  <div
                    className="absolute inset-0 transition-all duration-150"
                    style={{
                      borderRadius: '3px',
                      border: selected
                        ? '2px solid #FFC83D'
                        : hovered
                        ? '1px solid rgba(255,200,61,0.6)'
                        : '1px solid transparent',
                      background: selected
                        ? 'rgba(255,200,61,0.18)'
                        : hovered
                        ? 'rgba(255,200,61,0.08)'
                        : 'transparent',
                      boxShadow: selected ? '0 0 12px rgba(255,200,61,0.3)' : 'none',
                    }}
                  />
                )}

                {/* Region name label on hover (unlocked only) */}
                {!locked && (hovered || selected) && (
                  <div
                    className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-white z-20 pointer-events-none"
                    style={{
                      fontSize: 'clamp(7px, 1vw, 11px)',
                      background: 'rgba(36,59,90,0.92)',
                      border: '1px solid rgba(255,200,61,0.4)',
                    }}
                  >
                    {region.icon} {region.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-navy/50">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(255,200,61,0.3)', border: '1px solid #FFC83D' }} />
            Unlocked region
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(36,59,90,0.55)' }} />
            Locked. Click to see unlock condition
          </span>
          <span className="ml-auto text-navy/40 italic">
            LVL {playerData?.level || 1} · {playerData?.totalCheckins || 0} check-ins · 🧭 {getDiscoveryCounts(playerData).found}/{getDiscoveryCounts(playerData).total} discoveries
          </span>
        </div>

        {/* The Endless Frontier — there is always a next horizon */}
        <FrontierSection playerData={playerData} onJourneyChange={onJourneyChange} />
      </div>

      {/* ── REGION PANEL (desktop: right side; mobile: below map) ─────── */}
      <div
        className="w-full md:w-72 flex-shrink-0"
        style={{ minHeight: selectedRegion ? 0 : undefined }}
      >
        {selectedRegion ? (
          <RegionPanel
            region={selectedRegion}
            locked={isRegionLocked(selectedRegion)}
            playerData={playerData}
            onJourneyChange={onJourneyChange}
            onClose={() => setSelectedRegion(null)}
          />
        ) : (
          <div className="kq-card p-5 text-center">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm text-navy/60">
              Click any region on the map to explore it.
            </p>
            <p className="text-xs text-navy/40 mt-2">
              Unlock new territories by building your habits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
